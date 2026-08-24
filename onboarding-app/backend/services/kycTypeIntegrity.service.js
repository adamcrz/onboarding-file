const KycTask = require('../models/KycTask');

const normalizedEmail = (value) => String(value || '').trim().toLowerCase();

async function assertKycTypeChangeAllowed(client, nextType) {
  if (!client?.type || !nextType || client.type === nextType) return;

  const hasClientKyc = Boolean(client.kycSubmittedBy || client.kycAwaitingVerification || client.kycStatus)
    || Object.values(client.kyc || {}).some((value) => String(value ?? '').trim());
  const hasCompletedTask = hasClientKyc ? false : await KycTask.exists({
    status: { $in: ['under_review', 'approved', 'completed'] },
    $or: [
      { clientRef: client._id },
      {
        clientRef: { $exists: false },
        clientId: client.clientId,
        clientEmail: normalizedEmail(client.email),
      },
    ],
  });

  if (hasClientKyc || hasCompletedTask) {
    const error = new Error(
      'Client legal form cannot be changed after KYC data has been submitted. Create a separate case for the new legal form.'
    );
    error.status = 409;
    throw error;
  }
}

module.exports = { assertKycTypeChangeAllowed };
