const KycTask = require('../models/KycTask');
const { KYC_SCHEMA_VERSION, getKycFieldDefinitions } = require('../config/kycRequiredFields');

const normalizedEmail = (value) => String(value || '').trim().toLowerCase();

function effectiveKycStatus(client) {
  if (['draft', 'under_review', 'approved'].includes(client?.kycStatus)) {
    return client.kycStatus;
  }
  if (!client?.kycSubmittedBy) return 'draft';
  return client.kycAwaitingVerification ? 'under_review' : 'approved';
}

function taskStatusForClient(client) {
  const state = effectiveKycStatus(client);
  return state === 'draft' ? 'pending' : state;
}

async function setKycTaskStatus(clientOrId, status, at = new Date()) {
  const clientId = clientOrId?._id || clientOrId;
  if (!clientId) return null;
  const set = { status };
  const unset = {};

  if (status === 'pending') {
    unset.submittedAt = 1;
    unset.approvedAt = 1;
    unset.completedAt = 1;
  } else if (status === 'under_review') {
    set.submittedAt = at;
    unset.approvedAt = 1;
    unset.completedAt = 1;
  } else if (status === 'approved') {
    set.approvedAt = at;
    set.completedAt = at;
  } else {
    throw new Error(`Unsupported KYC task workflow status "${status}"`);
  }

  return KycTask.findOneAndUpdate(
    { clientRef: clientId, linkStatus: 'linked' },
    { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { returnDocument: 'after' }
  );
}

// A Client owns at most one KYC workflow task. Identity, type, and ownership
// are copied from the Client only for convenient listing; clientRef remains
// the stable relationship and Client.kyc remains the only answer record.
async function ensureKycTaskForClient(client, rmName) {
  // Email is deliberately not required: a contract can be prepared without a
  // portal account, and that client has no address on file. Identity comes from
  // the persisted _id and the public clientId, never from the email.
  if (!client?._id || !client.clientId || !client.type) {
    throw new Error('A persisted client with an id and type is required to create a KYC task');
  }
  if (!getKycFieldDefinitions(client.type).length) {
    throw new Error(`No KYC schema is configured for client type "${client.type}"`);
  }

  const desiredStatus = taskStatusForClient(client);

  const task = await KycTask.findOneAndUpdate(
    { clientRef: client._id },
    {
      $set: {
        clientId: client.clientId,
        clientType: client.type,
        clientName: client.name,
        clientEmail: normalizedEmail(client.email),
        rmName: rmName || client.rm || '',
        schemaVersion: KYC_SCHEMA_VERSION,
        linkStatus: 'linked',
        status: desiredStatus,
      },
    },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
  );

  // Client is the authoritative workflow record. Canonicalize timestamps on
  // every touch, including clearing stale approval dates after a reopen.
  const workflowAt = desiredStatus === 'under_review'
    ? client.kycSubmittedAt || task.submittedAt || task.completedAt || client.updatedAt || new Date()
    : desiredStatus === 'approved'
      ? client.kycApprovedAt || task.approvedAt || task.completedAt || client.updatedAt || new Date()
      : new Date();
  return setKycTaskStatus(client._id, desiredStatus, workflowAt) || task;
}

module.exports = {
  effectiveKycStatus,
  taskStatusForClient,
  setKycTaskStatus,
  ensureKycTaskForClient,
};
