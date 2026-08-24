/**
 * Idempotent KYC task repair.
 *
 * Legacy task documents are linked by stable ObjectId when available, or by
 * BOTH public client id and normalized email. Task-owned sections/answers are
 * archived before removal. Existing Client.kyc values always win over stale
 * task answers. The sole exception is an exact legacy joined-address match:
 * that old representation is safely split back into its original fields.
 *
 * Ambiguous/orphan/duplicate/mismatched tasks are terminally quarantined,
 * never deleted or re-attached on a later run. Conflicting addresses and
 * values that cannot be represented by the canonical controls are written to
 * kycmigrationmanualreviews for an explicit human decision.
 *
 * Run: npm run migrate-kyc-tasks
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { isDeepStrictEqual } = require('node:util');
const Client = require('../models/Client');
const KycTask = require('../models/KycTask');
const KycCorrection = require('../models/KycCorrection');
const {
  KYC_SCHEMA_VERSION,
  getKycFieldDefinitions,
  mapTaskAnswersToKyc,
} = require('../config/kycRequiredFields');
const { ensureKycTaskForClient } = require('../services/kycTask.service');
const {
  reconcileKycCorrectionDefinitions,
  syncKycCorrectionsForClient,
} = require('../services/kycGapCheck.service');

const MIGRATION_VERSION = 2;
const TERMINAL_LINK_STATUS = 'orphaned';
const LEGACY_ADDRESS_KEYS = ['f_addr1', 'f_addr2', 'f_city', 'f_zip', 'f_ctry'];
const CANONICAL_ADDRESS_KEYS = ['address', 'addressLine2', 'city', 'postalCode', 'addressCountry'];

const normalizedEmail = (value) => String(value || '').trim().toLowerCase();
const hasOwnValues = (value) => value && typeof value === 'object' && Object.keys(value).length > 0;
const taskDate = (task) => new Date(task.updatedAt || task.createdAt || 0).getTime() || 0;

function isPlainRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isRealIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return parsed.getUTCFullYear() === Number(match[1])
    && parsed.getUTCMonth() === Number(match[2]) - 1
    && parsed.getUTCDate() === Number(match[3]);
}

// Migration input is already persisted and therefore cannot be rejected like
// a normal API request. Split it instead: canonical, normalized strings are
// safe to activate; everything else is preserved in a pending manual review.
function validateMigratedKycValues(input, clientType, { reportUnknown = false } = {}) {
  if (!isPlainRecord(input)) {
    return {
      values: {},
      invalid: input === undefined || input === null
        ? []
        : [{ fieldKey: '$record', value: input, validationError: 'KYC data must be an object' }],
    };
  }

  const definitions = new Map(
    getKycFieldDefinitions(clientType).map((field) => [field.key, field])
  );
  const values = {};
  const invalid = [];

  for (const [fieldKey, rawValue] of Object.entries(input)) {
    const field = definitions.get(fieldKey);
    if (!field) {
      if (reportUnknown) {
        invalid.push({ fieldKey, value: rawValue, validationError: 'Field is not in the canonical KYC schema' });
      }
      continue;
    }
    if (rawValue === undefined || rawValue === null || rawValue === '') continue;
    if (typeof rawValue !== 'string') {
      invalid.push({ fieldKey, value: rawValue, validationError: `${field.label} must be a text value` });
      continue;
    }

    const value = rawValue.trim();
    if (!value) continue;
    if (field.type === 'select' && Array.isArray(field.options) && !field.options.includes(value)) {
      invalid.push({
        fieldKey,
        value: rawValue,
        validationError: `${field.label} must be one of: ${field.options.join(', ')}`,
      });
      continue;
    }
    if (field.type === 'date' && !isRealIsoDate(value)) {
      invalid.push({
        fieldKey,
        value: rawValue,
        validationError: `${field.label} must be a real date in YYYY-MM-DD format`,
      });
      continue;
    }
    values[fieldKey] = value;
  }

  return { values, invalid };
}

function primaryTaskOrder(a, b) {
  const submittedStatuses = new Set(['under_review', 'approved', 'completed']);
  const completed = Number(submittedStatuses.has(b.status)) - Number(submittedStatuses.has(a.status));
  if (completed) return completed;
  const withAnswers = Number(hasOwnValues(b.answers)) - Number(hasOwnValues(a.answers));
  if (withAnswers) return withAnswers;
  return taskDate(b) - taskDate(a) || String(b._id).localeCompare(String(a._id));
}

function chronologicalTaskOrder(a, b) {
  return taskDate(a) - taskDate(b) || String(a._id).localeCompare(String(b._id));
}

function addressSignature(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s,;|]+/g, ' ')
    .trim();
}

function legacyAddressCandidate(task) {
  const answers = task.answers && typeof task.answers === 'object' ? task.answers : {};
  const presentValues = LEGACY_ADDRESS_KEYS
    .map((key) => answers[key])
    .filter((value) => value !== undefined && value !== null && value !== '');
  if (presentValues.some((value) => typeof value !== 'string')) return null;
  const values = Object.fromEntries(
    LEGACY_ADDRESS_KEYS.map((key) => [key, (answers[key] || '').trim()])
  );
  if (!values.f_addr1) return null;
  const joined = LEGACY_ADDRESS_KEYS.map((key) => values[key]).filter(Boolean).join(', ');
  return {
    taskId: task._id,
    address: values.f_addr1,
    addressLine2: values.f_addr2,
    city: values.f_city,
    postalCode: values.f_zip,
    addressCountry: values.f_ctry,
    joined,
  };
}

function reconcileLegacyAddress(clientKyc, tasks, legacyValues) {
  const currentAddress = String(clientKyc?.address ?? '').trim();
  const malformedTask = [...tasks]
    .sort(chronologicalTaskOrder)
    .reverse()
    .find((task) => {
      const answers = isPlainRecord(task.answers) ? task.answers : {};
      const presentKeys = LEGACY_ADDRESS_KEYS.filter((key) => (
        answers[key] !== undefined && answers[key] !== null && answers[key] !== ''
      ));
      if (!presentKeys.length) return false;
      return !String(typeof answers.f_addr1 === 'string' ? answers.f_addr1 : '').trim()
        || presentKeys.some((key) => typeof answers[key] !== 'string');
    });

  const withoutLegacyAddress = { ...legacyValues };
  for (const key of CANONICAL_ADDRESS_KEYS) delete withoutLegacyAddress[key];
  if (malformedTask) {
    return {
      values: withoutLegacyAddress,
      manualReview: {
        reason: 'invalid_legacy_address_bundle',
        sourceTaskId: malformedTask._id,
        legacyComponents: Object.fromEntries(
          LEGACY_ADDRESS_KEYS.map((key) => [key, malformedTask.answers?.[key]])
        ),
      },
      normalizeJoined: false,
    };
  }

  const candidates = [...tasks]
    .sort(chronologicalTaskOrder)
    .map(legacyAddressCandidate)
    .filter(Boolean)
    .reverse();
  if (!candidates.length) return { values: legacyValues, manualReview: null, normalizeJoined: false };

  const valuesForCandidate = (candidate) => ({
    ...withoutLegacyAddress,
    address: candidate.address,
    addressLine2: candidate.addressLine2,
    city: candidate.city,
    postalCode: candidate.postalCode,
    addressCountry: candidate.addressCountry,
  });

  if (!currentAddress) {
    return { values: valuesForCandidate(candidates[0]), manualReview: null, normalizeJoined: false };
  }

  const currentSignature = addressSignature(currentAddress);
  const joinedMatch = candidates.find((candidate) => (
    addressSignature(candidate.joined) === currentSignature
    && addressSignature(candidate.joined) !== addressSignature(candidate.address)
  ));

  if (joinedMatch) {
    // The old mapper generated Client.kyc.address by joining these exact raw
    // fields. Replacing only that generated representation is safe; all other
    // current Client.kyc values still win during the merge below.
    return {
      values: valuesForCandidate(joinedMatch),
      manualReview: null,
      normalizeJoined: true,
    };
  }

  const firstLineMatch = candidates.find((candidate) => addressSignature(candidate.address) === currentSignature);
  if (firstLineMatch) {
    return { values: valuesForCandidate(firstLineMatch), manualReview: null, normalizeJoined: false };
  }

  const latest = candidates[0];
  return {
    // A reviewed/current address conflicts with every recoverable legacy
    // bundle. Quarantine the WHOLE bundle for review; merging even the city or
    // postcode here would create an unreviewed hybrid address.
    values: withoutLegacyAddress,
    manualReview: {
      reason: 'legacy_address_conflict',
      currentAddress,
      legacyAddress: latest.address,
      legacyJoinedAddress: latest.joined,
      legacyComponents: Object.fromEntries(
        CANONICAL_ADDRESS_KEYS.map((key) => [key, latest[key]])
      ),
      sourceTaskId: latest.taskId,
    },
    normalizeJoined: false,
  };
}

function legacyIdentityKey(clientId, email) {
  const id = String(clientId || '').trim();
  const normalized = normalizedEmail(email);
  return id && normalized ? `${id}\u0000${normalized}` : '';
}

function reviewIdentity(client, review) {
  return [
    review.reason,
    review.fieldKey || '',
    review.sourceKind || '',
    String(review.sourceTaskId || ''),
  ].join('|');
}

async function upsertManualReview(manualReviews, client, review, now) {
  const result = await manualReviews.updateOne(
    { clientRef: client._id, reviewKey: reviewIdentity(client, review) },
    {
      $setOnInsert: {
        clientRef: client._id,
        clientId: client.clientId,
        reviewKey: reviewIdentity(client, review),
        status: 'pending',
        detectedAt: now,
        migrationVersion: MIGRATION_VERSION,
      },
      $set: { ...review, lastSeenAt: now },
    },
    { upsert: true }
  );
  return result.upsertedCount || 0;
}

async function recordInvalidValues(manualReviews, client, invalid, source, now) {
  let created = 0;
  for (const item of invalid) {
    created += await upsertManualReview(manualReviews, client, {
      reason: 'invalid_kyc_value',
      fieldKey: item.fieldKey,
      quarantinedValue: item.value === undefined ? null : item.value,
      validationError: item.validationError,
      sourceKind: source.kind,
      ...(source.taskId ? { sourceTaskId: source.taskId } : {}),
    }, now);
  }
  return created;
}

async function quarantineTask(task, reason, now = new Date()) {
  await KycTask.collection.updateOne(
    { _id: task._id },
    {
      $set: {
        linkStatus: TERMINAL_LINK_STATUS,
        quarantineReason: reason,
        quarantinedAt: task.quarantinedAt || now,
        migrationVersion: MIGRATION_VERSION,
      },
      $unset: { clientRef: '' },
    }
  );
}

async function archiveLegacyPayload(archive, task, clientRef) {
  if (task.sections === undefined && task.answers === undefined) return;
  await archive.updateOne(
    { sourceTaskId: task._id },
    {
      $setOnInsert: {
        sourceTaskId: task._id,
        clientRef,
        sections: task.sections,
        answers: task.answers,
        archivedAt: new Date(),
        migrationVersion: MIGRATION_VERSION,
      },
    },
    { upsert: true }
  );
}

const correctionStatusPriority = {
  needs_correction: 4,
  resubmitted: 3,
  pending: 2,
  corrected: 1,
};

async function deduplicateAutoCorrections(now = new Date()) {
  const raw = await KycCorrection.collection.find({
    autoGenerated: true,
    fieldKey: { $type: 'string' },
  }).toArray();
  const groups = new Map();
  for (const correction of raw) {
    const key = `${correction.clientId || ''}\u0000${correction.fieldKey}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(correction);
  }

  let deduplicated = 0;
  for (const corrections of groups.values()) {
    if (corrections.length < 2) continue;
    corrections.sort((a, b) => (
      (correctionStatusPriority[b.status] || 0) - (correctionStatusPriority[a.status] || 0)
      || Number(Boolean(b.everFilled)) - Number(Boolean(a.everFilled))
      || taskDate(b) - taskDate(a)
      || String(b._id).localeCompare(String(a._id))
    ));
    const primary = corrections[0];
    const everFilled = corrections.some((correction) => correction.everFilled);
    let primaryStatus = primary.status;
    if (primaryStatus === 'pending' && everFilled) primaryStatus = 'needs_correction';
    await KycCorrection.collection.updateOne(
      { _id: primary._id },
      { $set: { everFilled, status: primaryStatus } }
    );

    for (const duplicate of corrections.slice(1)) {
      await KycCorrection.collection.updateOne(
        { _id: duplicate._id, autoGenerated: true },
        {
          $set: {
            autoGenerated: false,
            status: 'corrected',
            issue: `Archived duplicate: ${duplicate.issue || duplicate.fieldKey}`,
            deduplicatedInto: primary._id,
            deduplicatedAt: now,
            migrationVersion: MIGRATION_VERSION,
          },
        }
      );
      deduplicated += 1;
    }
  }
  return deduplicated;
}

async function migrateKycTasksToCanonical({ mongoUri = process.env.MONGO_URI, logger = console } = {}) {
  const ownsConnection = mongoose.connection.readyState === 0;
  if (ownsConnection) {
    if (!mongoUri) throw new Error('MONGO_URI is not set');
    // Legacy collections may contain duplicate clientRef values. Do not let
    // Mongoose try to build the new unique index until after they are repaired.
    await mongoose.connect(mongoUri, { autoIndex: false });
  } else if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB connection is not ready');
  }

  const stats = {
    clientsNormalized: 0,
    clientEmailsNormalized: 0,
    clientEmailCollisionGroups: 0,
    tasksQuarantined: 0,
    alreadyQuarantined: 0,
    tasksCreated: 0,
    emptyCompletedTasksReset: 0,
    legacySubmissionsRecovered: 0,
    invalidValuesQuarantined: 0,
    manualReviews: 0,
    partialClientsWithGaps: 0,
    correctionsReconciled: 0,
    correctionsDeduplicated: 0,
  };

  try {
    const database = mongoose.connection.db;
    const archive = database.collection('kyctaskmigrationarchives');
    const manualReviews = database.collection('kycmigrationmanualreviews');
    const clients = await Client.find({});

    // Normalize every persisted string email, but deliberately do not add a
    // unique email index or collapse records. Separate clients can already
    // share the same case-insensitive address; task fallback still requires
    // BOTH the public client id and normalized email.
    const clientsByNormalizedEmail = new Map();
    for (const client of clients) {
      if (typeof client.email !== 'string') continue;
      const canonicalEmail = normalizedEmail(client.email);
      if (client.email !== canonicalEmail) {
        await Client.collection.updateOne({ _id: client._id }, { $set: { email: canonicalEmail } });
        client.email = canonicalEmail;
        stats.clientEmailsNormalized += 1;
      }
      if (!canonicalEmail) continue;
      if (!clientsByNormalizedEmail.has(canonicalEmail)) clientsByNormalizedEmail.set(canonicalEmail, []);
      clientsByNormalizedEmail.get(canonicalEmail).push(client);
    }
    stats.clientEmailCollisionGroups = [...clientsByNormalizedEmail.values()]
      .filter((group) => group.length > 1).length;

    const clientByObjectId = new Map(clients.map((client) => [String(client._id), client]));
    const clientsByLegacyIdentity = new Map();
    for (const client of clients) {
      const key = legacyIdentityKey(client.clientId, client.email);
      if (!key) continue;
      if (!clientsByLegacyIdentity.has(key)) clientsByLegacyIdentity.set(key, []);
      clientsByLegacyIdentity.get(key).push(client);
    }

    const rawTasks = await KycTask.collection.find({}).toArray();
    const tasksByClient = new Map();
    const now = new Date();

    for (const task of rawTasks) {
      // Quarantine is deliberately terminal. A matching email/id appearing in
      // the future must not promote stale data on a migration rerun.
      if (task.linkStatus === TERMINAL_LINK_STATUS || task.quarantinedAt) {
        // Older quarantine attempts may have left a clientRef behind. Clear
        // it without reconsidering identity, preserving the one-way state and
        // freeing the unique clientRef slot for a legitimate canonical task.
        await quarantineTask(task, task.quarantineReason || 'previously_quarantined', task.quarantinedAt || now);
        stats.alreadyQuarantined += 1;
        continue;
      }

      let client = task.clientRef ? clientByObjectId.get(String(task.clientRef)) : null;
      let quarantineReason = 'orphaned_client';

      if (!client) {
        const identityMatches = clientsByLegacyIdentity.get(
          legacyIdentityKey(task.clientId, task.clientEmail)
        ) || [];
        if (identityMatches.length === 1) client = identityMatches[0];
        else if (identityMatches.length > 1) quarantineReason = 'ambiguous_legacy_identity';
        else quarantineReason = 'legacy_identity_not_found';
      }

      if (!client || !getKycFieldDefinitions(client.type).length) {
        if (client && !getKycFieldDefinitions(client.type).length) quarantineReason = 'unknown_client_type';
        await quarantineTask(task, quarantineReason, now);
        stats.tasksQuarantined += 1;
        continue;
      }

      // A declared historical type/version is part of the meaning of every
      // stored answer. Never reinterpret that payload through today's schema
      // when its contract disagrees with the linked Client.
      const historicalType = String(task.clientType || '').trim();
      const typeMismatch = Boolean(historicalType) && historicalType !== client.type;
      const hasHistoricalSchema = task.schemaVersion !== undefined && task.schemaVersion !== null;
      const schemaMismatch = hasHistoricalSchema && Number(task.schemaVersion) !== KYC_SCHEMA_VERSION;
      if (typeMismatch || schemaMismatch) {
        const quarantineReason = typeMismatch
          ? 'historical_client_type_mismatch'
          : 'historical_schema_version_mismatch';
        stats.manualReviews += await upsertManualReview(manualReviews, client, {
          reason: quarantineReason,
          sourceKind: 'task_contract',
          sourceTaskId: task._id,
          historicalClientType: task.clientType ?? null,
          currentClientType: client.type,
          historicalSchemaVersion: task.schemaVersion ?? null,
          currentSchemaVersion: KYC_SCHEMA_VERSION,
          rawPayloadRetainedOnTask: true,
        }, now);
        await quarantineTask(task, quarantineReason, now);
        stats.tasksQuarantined += 1;
        continue;
      }

      const key = String(client._id);
      if (!tasksByClient.has(key)) tasksByClient.set(key, { client, tasks: [] });
      tasksByClient.get(key).tasks.push(task);
    }

    for (const { client, tasks } of tasksByClient.values()) {
      tasks.sort(primaryTaskOrder);
      const primary = tasks[0];

      // Merge task answers in actual chronological order. Primary selection
      // (completed/answered/newest) is intentionally independent of answer
      // precedence. Current reviewed Client.kyc values are spread last.
      const legacyValues = {};
      const validatedValuesByTask = new Map();
      for (const task of [...tasks].sort(chronologicalTaskOrder)) {
        const mapped = mapTaskAnswersToKyc(task.answers || {}, client.type);
        const validated = validateMigratedKycValues(mapped, client.type);
        validatedValuesByTask.set(String(task._id), validated.values);
        Object.assign(legacyValues, validated.values);
        stats.invalidValuesQuarantined += validated.invalid.length;
        stats.manualReviews += await recordInvalidValues(
          manualReviews,
          client,
          validated.invalid,
          { kind: 'legacy_task', taskId: task._id },
          now
        );
      }

      const originalCurrentKyc = isPlainRecord(client.kyc) ? { ...client.kyc } : client.kyc;
      const currentValidation = validateMigratedKycValues(client.kyc, client.type, { reportUnknown: true });
      const currentKyc = currentValidation.values;
      stats.invalidValuesQuarantined += currentValidation.invalid.length;
      stats.manualReviews += await recordInvalidValues(
        manualReviews,
        client,
        currentValidation.invalid,
        { kind: 'client_record' },
        now
      );
      const addressResult = client.type === 'Individual'
        ? reconcileLegacyAddress(currentKyc, tasks, legacyValues)
        : { values: legacyValues, manualReview: null, normalizeJoined: false };
      const merged = { ...addressResult.values, ...currentKyc };

      // An exact old joined address is generated data, not a reviewed value;
      // replace it after the normal "Client wins" merge to avoid displaying
      // the same city/postcode/country twice in the new granular form.
      if (addressResult.normalizeJoined) merged.address = addressResult.values.address;

      if (!isDeepStrictEqual(merged, originalCurrentKyc)) {
        await Client.collection.updateOne({ _id: client._id }, { $set: { kyc: merged } });
        client.kyc = merged;
        stats.clientsNormalized += 1;
      }

      if (addressResult.manualReview) {
        stats.manualReviews += await upsertManualReview(
          manualReviews,
          client,
          { ...addressResult.manualReview, sourceKind: 'legacy_task' },
          now
        );
      }

      const recoveredCompletionTask = tasks.find((task) => (
        task.status === 'completed'
        && hasOwnValues(validatedValuesByTask.get(String(task._id)))
      ));
      const priorCanonicalCompletionTask = tasks.find((task) => (
        task.status === 'completed'
        && task.migrationVersion === MIGRATION_VERSION
        && task.schemaVersion === KYC_SCHEMA_VERSION
        && hasOwnValues(currentKyc)
      ));
      const submissionSource = recoveredCompletionTask || priorCanonicalCompletionTask;

      // Old tasks had no actor column. Mark the recovered submission as the
      // historical RM workflow owner, while preserving the source and the fact
      // that the actor itself was not recorded in explicit provenance.
      if (!client.kycSubmittedBy && submissionSource) {
        const rawCompletedAt = submissionSource.completedAt
          || submissionSource.updatedAt
          || submissionSource.createdAt;
        const parsedCompletedAt = rawCompletedAt ? new Date(rawCompletedAt) : now;
        const taskCompletedAt = Number.isNaN(parsedCompletedAt.getTime()) ? now : parsedCompletedAt;
        const legacySubmission = {
          sourceTaskId: submissionSource._id,
          taskCompletedAt,
          recoveredAt: now,
          migrationVersion: MIGRATION_VERSION,
          actorWasRecorded: false,
        };
        await Client.collection.updateOne(
          { _id: client._id },
          {
            $set: {
              kycSubmittedBy: 'rm',
              kycAwaitingVerification: true,
              kycStatus: 'under_review',
              kycLegacySubmission: legacySubmission,
            },
          }
        );
        client.kycSubmittedBy = 'rm';
        client.kycAwaitingVerification = true;
        client.kycStatus = 'under_review';
        client.kycLegacySubmission = legacySubmission;
        stats.legacySubmissionsRecovered += 1;
      }

      const workflowCompleted = Boolean(client.kycSubmittedBy);
      if (!workflowCompleted && primary.status === 'completed') {
        stats.emptyCompletedTasksReset += 1;
      }

      // Quarantine duplicates before assigning the stable ref to the selected
      // primary, so the unique clientRef index cannot force destructive data
      // deletion. Their legacy payload remains intact and recoverable.
      for (const duplicate of tasks.slice(1)) {
        await quarantineTask(duplicate, 'duplicate_client_task', now);
        stats.tasksQuarantined += 1;
      }

      await archiveLegacyPayload(archive, primary, client._id);
      const primarySet = {
        clientRef: client._id,
        clientId: client.clientId,
        clientType: client.type,
        clientName: client.name,
        clientEmail: normalizedEmail(client.email),
        schemaVersion: KYC_SCHEMA_VERSION,
        linkStatus: 'linked',
        migrationVersion: MIGRATION_VERSION,
        status: workflowCompleted ? 'under_review' : 'pending',
      };
      if (workflowCompleted) {
        primarySet.submittedAt = primary.submittedAt
          || primary.completedAt
          || client.kycLegacySubmission?.taskCompletedAt
          || now;
      }
      await KycTask.collection.updateOne(
        { _id: primary._id, linkStatus: { $ne: TERMINAL_LINK_STATUS } },
        {
          $set: primarySet,
          $unset: {
            sections: '',
            answers: '',
            quarantineReason: '',
            quarantinedAt: '',
            completedAt: '',
            approvedAt: '',
            ...(!workflowCompleted ? { submittedAt: '' } : {}),
          },
        }
      );
    }

    // Repair historical duplicate gap rows before building the model's new
    // partial unique index. Duplicate documents stay preserved as closed,
    // non-auto-generated history instead of being deleted.
    stats.correctionsDeduplicated = await deduplicateAutoCorrections(now);
    await KycCorrection.createIndexes();
    await KycTask.createIndexes();

    // Backfill every known client exactly once. Workflow state is driven by an
    // explicit submission marker, not merely by a partially populated profile.
    // This prevents empty completed legacy tasks (and draft values) from being
    // presented as submitted work.
    for (const client of clients) {
      if (!client.email || !getKycFieldDefinitions(client.type).length) continue;

      const reconcileStats = await reconcileKycCorrectionDefinitions(client);
      stats.correctionsReconciled += reconcileStats.updated;

      const hasSubmission = Boolean(client.kycSubmittedBy);
      if (hasSubmission) {
        const gapStats = await syncKycCorrectionsForClient(client);
        if (gapStats.missing > 0) stats.partialClientsWithGaps += 1;
      }

      const exists = await KycTask.exists({ clientRef: client._id, linkStatus: 'linked' });
      const task = await ensureKycTaskForClient(client, client.rm);
      const desiredStatus = hasSubmission ? 'under_review' : 'pending';
      if (task.status !== desiredStatus || task.completedAt || task.approvedAt) {
        const update = { $set: { status: desiredStatus } };
        if (hasSubmission) {
          update.$set.submittedAt = task.submittedAt
            || task.completedAt
            || client.kycLegacySubmission?.taskCompletedAt
            || client.updatedAt
            || now;
          update.$unset = { completedAt: '', approvedAt: '' };
        } else {
          update.$unset = { submittedAt: '', completedAt: '', approvedAt: '' };
        }
        await KycTask.collection.updateOne({ _id: task._id }, update);
      }
      if (!exists) stats.tasksCreated += 1;
    }

    logger.log(
      `KYC task migration complete: ${stats.clientsNormalized} Client.kyc records normalized, `
      + `${stats.clientEmailsNormalized} client emails normalized (${stats.clientEmailCollisionGroups} collision groups retained), `
      + `${stats.tasksQuarantined} tasks quarantined (${stats.alreadyQuarantined} already quarantined), `
      + `${stats.tasksCreated} canonical tasks created, ${stats.partialClientsWithGaps} partial clients flagged, `
      + `${stats.correctionsReconciled} corrections reconciled, ${stats.correctionsDeduplicated} duplicate corrections archived, `
      + `${stats.legacySubmissionsRecovered} legacy submissions recovered, ${stats.emptyCompletedTasksReset} empty completed tasks reset, `
      + `${stats.invalidValuesQuarantined} invalid values quarantined, ${stats.manualReviews} items need manual review.`
    );
    return stats;
  } finally {
    if (ownsConnection) await mongoose.disconnect();
  }
}

if (require.main === module) {
  migrateKycTasksToCanonical().catch((err) => {
    console.error('KYC task migration failed:', err.message);
    process.exitCode = 1;
  });
}

module.exports = {
  addressSignature,
  migrateKycTasksToCanonical,
  reconcileLegacyAddress,
};
