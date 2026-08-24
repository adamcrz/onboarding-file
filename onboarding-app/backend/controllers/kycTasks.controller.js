const KycTask = require('../models/KycTask');
const KycCorrection = require('../models/KycCorrection');
const Client  = require('../models/Client');
const {
  KYC_SCHEMA_VERSION,
  REQUIRED_KYC_FIELDS,
  buildKycSections,
  canonicalKycValues,
  validateKycSubmission,
  missingKycFieldDefinitions,
} = require('../config/kycRequiredFields');
const { refreshKycSchema } = require('../services/kycSchema.service');
const {
  syncKycCorrectionsForClient,
  saveKycFields,
  markBlankKycFields,
  submitKycFields,
  OPEN_CORRECTION_STATUSES,
} = require('../services/kycGapCheck.service');
const {
  effectiveKycStatus,
  setKycTaskStatus,
  ensureKycTaskForClient,
} = require('../services/kycTask.service');
const { prefillMandateRisk, deriveRiskRating } = require('../config/mandateRiskFields');
const {
  missingFields: missingMandateRiskFields,
  refreshMandateRiskSchema,
} = require('../services/mandateRiskSchema.service');
const { writeKycExcelDocument } = require('../services/kycHandover.service');

// Tops up the mandate-risk questionnaire from the client's current KYC.
// Only blanks are filled, and a questionnaire already submitted or approved
// is never touched — that record belongs to whoever submitted it.
async function syncMandateRiskFromKyc(client) {
  try {
    const risk = client.mandateRisk || {};
    if (['under_review', 'approved'].includes(risk.status)) return;
    const { answers, prefilledKeys } = prefillMandateRisk({
      client, contract: {}, existing: risk.answers || {},
    });
    if (!prefilledKeys.length) return;
    await Client.findByIdAndUpdate(client._id, {
      $set: {
        'mandateRisk.answers': answers,
        'mandateRisk.prefilledKeys': Array.from(new Set([...(risk.prefilledKeys || []), ...prefilledKeys])),
        'mandateRisk.status': 'saved',
      },
    });
  } catch (err) {
    console.error('⚠  Could not carry KYC values into the mandate-risk questionnaire:', err.message);
  }
}

// The authenticated role, collapsed to the three that matter for KYC
// submission/verification semantics — never trust a client-supplied
// "completedBy" for this, the JWT identity is authoritative.
const submitterRoleFor = (user) => (user.role === 'rm' ? 'rm' : user.role === 'client' ? 'client' : 'compliance');
const normalizedEmail = (value) => String(value || '').trim().toLowerCase();

function sameTaskIdentity(task, client) {
  return String(task.clientRef || '') === String(client._id);
}

async function resolveLinkedClient(task) {
  // Migration quarantine is terminal. Never use the legacy public-id/email
  // fallback to resurrect a duplicate or orphaned questionnaire.
  if (task.linkStatus === 'orphaned') return null;

  let client = task.clientRef ? await Client.findById(task.clientRef) : null;

  // One-time compatibility for a task created before stable ObjectId links
  // were added. Relink only when BOTH the public id and email identify the
  // same client; a recycled CLT-* id alone must never attach stale data to a
  // different person.
  if (!client && task.clientId && task.clientEmail) {
    client = await Client.findOne({
      clientId: task.clientId,
      email: normalizedEmail(task.clientEmail),
    });
    if (client) {
      // Do not guess which legacy task is authoritative when more than one
      // could link to the same client. The offline migration ranks and
      // archives those records deterministically; the runtime simply hides
      // them until that safe migration is run.
      const competingTask = await KycTask.exists({
        _id: { $ne: task._id },
        linkStatus: { $ne: 'orphaned' },
        $or: [
          { clientRef: client._id },
          {
            clientRef: { $exists: false },
            clientId: task.clientId,
            clientEmail: normalizedEmail(task.clientEmail),
          },
        ],
      });
      if (competingTask) return null;

      try {
        task.clientRef = client._id;
        task.clientName = client.name;
        task.clientEmail = client.email;
        task.clientType = client.type;
        task.schemaVersion = KYC_SCHEMA_VERSION;
        task.linkStatus = 'linked';
        await task.save();
      } catch (err) {
        if (err?.code === 11000) return null;
        throw err;
      }
    }
  }

  if (!client || !sameTaskIdentity(task, client)) return null;

  // ObjectId is the stable relationship. Keep duplicated display fields in
  // sync with Client so an email/name edit cannot make a legitimate task look
  // orphaned, while recycled public ids still cannot relink a stale task.
  const needsSync = task.clientId !== client.clientId
    || normalizedEmail(task.clientEmail) !== normalizedEmail(client.email)
    || task.clientName !== client.name
    || task.clientType !== client.type
    || task.linkStatus !== 'linked';
  if (needsSync) {
    task.clientId = client.clientId;
    task.clientEmail = normalizedEmail(client.email);
    task.clientName = client.name;
    task.clientType = client.type;
    task.schemaVersion = KYC_SCHEMA_VERSION;
    task.linkStatus = 'linked';
    await task.save();
  }
  return client;
}

function taskResponse(task, client) {
  const raw = task.toObject ? task.toObject() : { ...task };
  delete raw.clientRef;
  delete raw.linkStatus;
  delete raw.sections;
  delete raw.answers;

  const values = canonicalKycValues(client.kyc || {}, client.type, { includeEmpty: true });
  const kycStatus = effectiveKycStatus(client);
  const risk = client.mandateRisk || {};
  return {
    ...raw,
    status: kycStatus === 'draft' ? 'pending' : kycStatus,
    kycStatus,
    // The mandate-risk questionnaire lives alongside the KYC in the Tasks
    // screen, so its state travels with the task rather than needing a
    // second round trip per mandate.
    mandateRiskStatus: risk.status || 'draft',
    mandateRiskMissing: missingMandateRiskFields(risk.answers || {}).length,
    // The individual unanswered questions, so Corrections can list them one
    // per row exactly like a KYC gap rather than as a single bulk count.
    mandateRiskMissingFields: missingMandateRiskFields(risk.answers || {})
      .map((f) => ({ key: f.key, label: f.label, page: f.page })),
    // The answers and Compliance's per-question decisions, so the Tasks screen
    // can review a submitted questionnaire the same way it reviews a KYC —
    // question by question — without a round trip per mandate.
    mandateRiskAnswers: risk.answers || {},
    mandateRiskReviews: risk.reviews || {},
    clientRef: String(client._id),
    clientId: client.clientId,
    clientType: client.type,
    clientName: client.name,
    clientEmail: client.email,
    schemaVersion: KYC_SCHEMA_VERSION,
    sections: buildKycSections(client.type, values),
    answers: values,
  };
}

exports.createKycTask = async (req, res) => {
  const { clientId } = req.body;
  if (!clientId) return res.status(400).json({ error: 'clientId is required' });

  try {
    const client = await Client.findOne({ clientId });
    if (!client) return res.status(404).json({ error: 'Client not found' });
    if (!client.type || !buildKycSections(client.type).length) {
      return res.status(400).json({ error: `No KYC schema is configured for client type "${client.type || 'unknown'}"` });
    }
    if (req.user.role === 'rm' && client.rm !== req.user.rmCode) {
      return res.status(403).json({ error: 'Not authorised to create a task for this client' });
    }
    if (req.user.role === 'client' && String(client.userId || '') !== req.user.id) {
      return res.status(403).json({ error: 'Not authorised to create a task for this client' });
    }

    // The server derives identity and schema from Client. Browser-supplied
    // sections/name/email are deliberately ignored so a second form shape can
    // never be persisted beside Client.kyc.
    const rmName = req.user.role === 'rm' ? req.user.rmCode : (client.rm || req.body.rmName);
    const task = await ensureKycTaskForClient(client, rmName);

    res.json(taskResponse(task, client));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listKycTasks = async (req, res) => {
  // Another instance may have edited the questionnaire since this process
  // last looked; the form and the checks against it must agree.
  await refreshKycSchema().catch(() => {});
  try {
    // Mandate-risk counts below are read against the current schema, so pick up
    // any question Compliance has added or removed since the last request.
    await refreshMandateRiskSchema();
    const tasks = await KycTask.find({}).sort({ createdAt: -1 });
    const result = [];

    for (const task of tasks) {
      const client = await resolveLinkedClient(task);
      // Listing is read-only for unresolved legacy rows. The offline migration
      // performs deterministic matching/quarantine with an archive; a GET must
      // never permanently classify a candidate simply because another legacy
      // task currently competes for the same client.
      if (!client) continue;
      if (req.user.role === 'rm' && client.rm !== req.user.rmCode) continue;
      if (req.user.role === 'client' && String(client.userId || '') !== req.user.id) continue;
      result.push(taskResponse(task, client));
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.completeKycTask = async (req, res) => {
  // Another instance may have edited the questionnaire since this process
  // last looked; the form and the checks against it must agree.
  await refreshKycSchema().catch(() => {});
  try {
    const task = await KycTask.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'KYC task not found' });

    const client = await resolveLinkedClient(task);
    if (!client) return res.status(409).json({ error: 'KYC task is no longer linked to this client' });
    if (req.user.role === 'rm' && client.rm !== req.user.rmCode) {
      return res.status(403).json({ error: 'Not authorised to complete this task' });
    }
    if (req.user.role === 'client' && String(client.userId || '') !== req.user.id) {
      return res.status(403).json({ error: 'Not authorised to complete this task' });
    }

    // Capture the legal form that selected this schema. The actual write below
    // predicates on the same value, so a concurrent legal-form update cannot
    // land Individual answers in a Corporate record (or vice versa).
    const resolvedClientType = client.type;
    const submitted = req.body.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
    const { values: mapped, errors } = validateKycSubmission(submitted, resolvedClientType, { includeEmpty: true });
    if (errors.length) {
      return res.status(400).json({ error: 'Invalid KYC field values', details: errors });
    }
    const allFields = REQUIRED_KYC_FIELDS[resolvedClientType] || [];
    if (!allFields.length) {
      return res.status(409).json({ error: 'No KYC schema is configured for this legal form' });
    }

    // Submit never writes questionnaire answers. Every field must already be
    // present in Client.kyc from Save Progress, and the full form submitted by
    // the browser must exactly match that persisted snapshot. This prevents a
    // direct/partial request from bypassing the deliberate save step.
    const missingFields = missingKycFieldDefinitions(client.kyc, resolvedClientType).map((field) => field.key);
    const unsavedFields = allFields
      .filter((field) => !Object.prototype.hasOwnProperty.call(mapped, field.key)
        || mapped[field.key] !== String(client.kyc?.[field.key] ?? '').trim())
      .map((field) => field.key);
    if (missingFields.length || unsavedFields.length) {
      return res.status(409).json({
        error: missingFields.length
          ? 'Save a non-empty value for every KYC field before submitting'
          : 'KYC contains unsaved changes; save the latest values before submitting',
        details: { missingFields, unsavedFields },
      });
    }

    const submittedBy = submitterRoleFor(req.user);
    const submittedAt = new Date();
    // Compliance is the reviewer, so a Compliance-authored submission has no
    // one left to review it — it self-verifies straight to approved, the
    // same shortcut Compliance already gets on a per-field Save/Confirm.
    // Submitting is never approving, whoever does it. A completed
    // questionnaire always goes to Compliance review; only the explicit
    // verify/approve action records sign-off.
    const selfVerifies = false;
    const approvedBy = selfVerifies ? String(req.user.email || req.user.name || req.user.id || 'Compliance') : undefined;
    const auditEntry = selfVerifies
      ? {
          action: 'KYC submitted and approved by Compliance',
          user: 'Compliance',
          time: new Date().toLocaleString(),
          type: 'approved',
        }
      : {
          action: 'KYC submitted for Compliance review',
          user: submittedBy === 'rm' ? (task.rmName || 'RM') : task.clientName,
          time: new Date().toLocaleString(),
          type: 'submitted',
        };
    const savedValueFilter = { _id: client._id, type: resolvedClientType };
    for (const field of allFields) savedValueFilter[`kyc.${field.key}`] = mapped[field.key];
    const clientUpdate = {
      $set: {
        kycSubmittedBy: submittedBy,
        kycSubmittedAt: submittedAt,
        ...(selfVerifies
          ? { kycAwaitingVerification: false, kycStatus: 'approved', kycApprovedAt: submittedAt, kycApprovedBy: approvedBy }
          : { kycAwaitingVerification: true, kycStatus: 'under_review' }),
      },
      $push: { auditTrail: auditEntry },
    };
    if (!selfVerifies) clientUpdate.$unset = { kycApprovedAt: 1, kycApprovedBy: 1 };
    const updatedClient = await Client.findOneAndUpdate(
      savedValueFilter,
      clientUpdate,
      { new: true, runValidators: true }
    );
    if (!updatedClient) {
      return res.status(409).json({ error: 'KYC changed while it was being submitted; save and review the latest values' });
    }

    task.status = selfVerifies ? 'approved' : 'under_review';
    task.submittedAt = submittedAt;
    task.approvedAt = selfVerifies ? submittedAt : undefined;
    task.completedAt = undefined;
    task.clientType = updatedClient.type;
    task.schemaVersion = KYC_SCHEMA_VERSION;
    await task.save();

    await submitKycFields(updatedClient._id, Object.keys(mapped), submittedBy);
    // A submitted KYC is the authoritative source for several mandate-risk
    // answers (purpose, source of wealth, country, beneficial owner). Carry
    // them across now so the questionnaire reflects what was just confirmed.
    await syncMandateRiskFromKyc(updatedClient);
    // The mandate's risk rating follows the KYC's own regulatory answers, so
    // recompute it from what was just submitted rather than leaving whatever
    // default the case was created with.
    try {
      const { rating, reasons } = deriveRiskRating(updatedClient);
      if (rating !== updatedClient.risk) {
        await Client.findByIdAndUpdate(updatedClient._id, {
          $set: { risk: rating },
          $push: {
            auditTrail: {
              action: `Risk rating set to ${rating} — ${reasons.join('; ')}`,
              user: 'System', time: new Date().toLocaleString(), type: 'requested',
            },
          },
        });
      }
    } catch (err) {
      console.error('⚠  Could not derive the mandate risk rating:', err.message);
    }
    await syncKycCorrectionsForClient(updatedClient._id);
    // Handing the questionnaire to Compliance produces the KYC sheet on the
    // case, so the reviewer opens a finished document rather than reading the
    // answers off a screen. Never fatal: a failed export must not lose a
    // submission that has already been recorded.
    try {
      await writeKycExcelDocument(updatedClient._id, submittedBy === 'rm' ? (task.rmName || 'RM') : task.clientName);
    } catch (err) {
      console.error('⚠  Could not write the KYC export document:', err.message);
    }

    res.json(taskResponse(task, updatedClient));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Draft save — persists whatever's currently filled in without submitting it
// for Compliance review. Unlike completeKycTask (Submit KYC), this never
// touches kycSubmittedBy/kycAwaitingVerification and never marks the task
// 'completed': a Save must only persist data and move an open correction to
// 'saved', never resolve/approve/resubmit it.
exports.saveKycTask = async (req, res) => {
  // Another instance may have edited the questionnaire since this process
  // last looked; the form and the checks against it must agree.
  await refreshKycSchema().catch(() => {});
  try {
    const task = await KycTask.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'KYC task not found' });

    const client = await resolveLinkedClient(task);
    if (!client) return res.status(409).json({ error: 'KYC task is no longer linked to this client' });
    if (req.user.role === 'rm' && client.rm !== req.user.rmCode) {
      return res.status(403).json({ error: 'Not authorised to save this task' });
    }
    if (req.user.role === 'client' && String(client.userId || '') !== req.user.id) {
      return res.status(403).json({ error: 'Not authorised to save this task' });
    }

    const resolvedClientType = client.type;
    const submitted = req.body.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
    const { values: mapped, errors } = validateKycSubmission(submitted, resolvedClientType, { includeEmpty: true });
    if (errors.length) {
      return res.status(400).json({ error: 'Invalid KYC field values', details: errors });
    }
    if (!Object.keys(mapped).length) {
      return res.status(400).json({ error: 'At least one configured KYC field is required' });
    }

    const savedBy = submitterRoleFor(req.user);
    const changed = Object.entries(mapped).some(
      ([key, value]) => value !== String(client.kyc?.[key] ?? '').trim()
    );
    const kycFieldUpdates = Object.fromEntries(
      Object.entries(mapped).map(([key, value]) => [`kyc.${key}`, value])
    );
    if (changed) {
      kycFieldUpdates.kycStatus = 'draft';
      kycFieldUpdates.kycAwaitingVerification = false;
    }
    const updatedClient = await Client.findOneAndUpdate(
      { _id: client._id, type: resolvedClientType },
      {
        $set: kycFieldUpdates,
        ...(changed ? {
          $unset: {
            kycSubmittedAt: 1,
            kycApprovedAt: 1,
            kycApprovedBy: 1,
          },
        } : {}),
      },
      { new: true, runValidators: true }
    );
    if (!updatedClient) {
      return res.status(409).json({ error: 'Client legal form changed while the KYC task was being saved' });
    }

    await saveKycFields(updatedClient._id, Object.keys(mapped), savedBy);
    await markBlankKycFields(
      updatedClient._id,
      Object.keys(mapped).filter((key) => !mapped[key]),
      savedBy
    );
    await syncKycCorrectionsForClient(updatedClient._id);
    if (changed) await setKycTaskStatus(updatedClient._id, 'pending');

    const currentTask = changed ? await KycTask.findById(task._id) : task;
    res.json(taskResponse(currentTask || task, updatedClient));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Compliance signs off a complete, gap-free RM/client submission. The
// persisted Client flag and audit entry are the durable approval record; task
// answers remain projected from the same Client.kyc object as every other KYC
// view. Per-field corrections must be resolved first.
exports.verifyKycTask = async (req, res) => {
  // Another instance may have edited the questionnaire since this process
  // last looked; the form and the checks against it must agree.
  await refreshKycSchema().catch(() => {});
  try {
    let task;
    if (req.params.clientId) {
      const targetClient = await Client.findOne({ clientId: req.params.clientId }).select('_id');
      if (!targetClient) return res.status(404).json({ error: 'Client not found' });
      task = await KycTask.findOne({ clientRef: targetClient._id, linkStatus: 'linked' });
    } else {
      task = await KycTask.findById(req.params.id);
    }
    if (!task) return res.status(404).json({ error: 'KYC task not found' });

    const client = await resolveLinkedClient(task);
    if (!client) return res.status(409).json({ error: 'KYC task is no longer linked to this client' });
    if (!client.kycSubmittedBy) {
      return res.status(409).json({ error: 'KYC has not been submitted yet' });
    }
    if (!client.kycAwaitingVerification || effectiveKycStatus(client) !== 'under_review') {
      return res.status(409).json({ error: 'KYC is not awaiting Compliance verification' });
    }

    await syncKycCorrectionsForClient(client._id);
    const current = await Client.findById(client._id);
    if (!current) return res.status(409).json({ error: 'Client was removed before KYC verification' });

    const resolvedClientType = current.type;
    const allFields = REQUIRED_KYC_FIELDS[resolvedClientType] || [];
    if (!allFields.length) {
      return res.status(409).json({ error: 'No KYC schema is configured for this legal form' });
    }

    const missingFields = allFields.filter(
      (field) => field.required !== false && !String(current.kyc?.[field.key] ?? '').trim()
    );
    if (missingFields.length) {
      return res.status(409).json({
        error: 'KYC cannot be verified while configured fields are missing',
        details: missingFields.map((field) => field.key),
      });
    }

    const { errors: storedValueErrors } = validateKycSubmission(
      current.kyc,
      resolvedClientType,
      { includeEmpty: true }
    );
    if (storedValueErrors.length) {
      return res.status(409).json({
        error: 'KYC cannot be verified while stored field values are invalid',
        details: storedValueErrors,
      });
    }

    const openCorrectionCount = await KycCorrection.countDocuments({
      clientId: current.clientId,
      autoGenerated: true,
      status: { $in: OPEN_CORRECTION_STATUSES },
    });
    if (openCorrectionCount) {
      return res.status(409).json({ error: 'KYC corrections must be resolved before verification' });
    }

    // Match the exact values that were inspected as well as the legal form.
    // A concurrent edit/clear therefore converts this into a 409 instead of
    // approving data Compliance did not review.
    const verifyFilter = {
      _id: current._id,
      type: resolvedClientType,
      kycAwaitingVerification: true,
      ...(current.kycStatus
        ? { kycStatus: 'under_review' }
        : { kycStatus: { $exists: false } }),
    };
    for (const field of allFields) {
      const path = `kyc.${field.key}`;
      if (Object.prototype.hasOwnProperty.call(current.kyc || {}, field.key)) {
        verifyFilter[path] = current.kyc[field.key];
      } else {
        verifyFilter[path] = { $exists: false };
      }
    }

    const approvedAt = new Date();
    const approvedBy = String(req.user.email || req.user.name || req.user.id || 'Compliance');
    const verifiedClient = await Client.findOneAndUpdate(
      verifyFilter,
      {
        $set: {
          kycAwaitingVerification: false,
          kycStatus: 'approved',
          kycApprovedAt: approvedAt,
          kycApprovedBy: approvedBy,
        },
        $push: {
          auditTrail: {
            action: 'KYC submission verified by Compliance',
            user: 'Compliance',
            time: new Date().toLocaleString(),
            type: 'approved',
          },
        },
      },
      { new: true, runValidators: true }
    );
    if (!verifiedClient) {
      return res.status(409).json({ error: 'KYC changed while Compliance was verifying it; review the latest values' });
    }


    const approvedTask = await setKycTaskStatus(verifiedClient._id, 'approved', approvedAt);

    res.json(taskResponse(approvedTask || task, verifiedClient));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};
