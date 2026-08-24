// Connects straight to the backend's MongoDB (reusing its models/env) to
// clean up throwaway accounts the auth-email-role spec creates via the API.
// Scoped to the @e2e.local domain so it can never touch real data.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });
// Reuse the backend's own mongoose install (its models are only resolvable
// against that copy) rather than adding a second one as an e2e devDependency.
const mongoose = require(path.join(__dirname, '../../backend/node_modules/mongoose'));
const User = require('../../backend/models/User');
const Client = require('../../backend/models/Client');
const KycTask = require('../../backend/models/KycTask');
const KycCorrection = require('../../backend/models/KycCorrection');
const DocumentCorrection = require('../../backend/models/DocumentCorrection');
const Notification = require('../../backend/models/Notification');

async function deleteClientRecords(clients) {
  if (!clients.length) return;
  const refs = clients.map((client) => client._id);
  const clientIds = clients.map((client) => client.clientId).filter(Boolean);
  const taskFilters = [{ clientRef: { $in: refs } }];
  clients.forEach((client) => {
    if (client.clientId && client.email) {
      taskFilters.push({ clientId: client.clientId, clientEmail: String(client.email).toLowerCase() });
    }
  });
  await Promise.all([
    KycTask.deleteMany({ $or: taskFilters }),
    KycCorrection.deleteMany({ clientId: { $in: clientIds } }),
    DocumentCorrection.deleteMany({ clientId: { $in: clientIds } }),
    // Notifications are keyed by the same clientId as the corrections above,
    // so they orphan the same way if they are not cleaned up with them.
    Notification.deleteMany({ clientId: { $in: clientIds } }),
    mongoose.connection.db.collection('kyctaskmigrationarchives').deleteMany({ clientRef: { $in: refs } }),
    mongoose.connection.db.collection('kycmigrationmanualreviews').deleteMany({ clientRef: { $in: refs } }),
  ]);
  await Client.deleteMany({ _id: { $in: refs } });
}

async function deleteE2eTestUsers() {
  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find({ email: /@e2e\.local$/ });
  const ids = users.map((u) => u._id);
  if (ids.length) {
    await deleteClientRecords(await Client.find({ userId: { $in: ids } }));
    await User.deleteMany({ _id: { $in: ids } });
  }
  await mongoose.disconnect();
  return ids.length;
}

// Deletes one specific (email, role) account — used when a test has to reuse
// a real seeded email (e.g. rm@demo.com) to prove cross-category behavior,
// so it can remove just the extra account it created without touching the
// seeded one.
async function deleteAccountByEmailAndRole(email, role) {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email: email.toLowerCase(), role });
  if (user) {
    await deleteClientRecords(await Client.find({ userId: user._id }));
    await User.deleteOne({ _id: user._id });
  }
  await mongoose.disconnect();
  return !!user;
}

// Deletes clients whose email matches a given pattern (used by the file-
// storage/document-upload spec, which creates real client cases + real files
// on disk via /contracts/invite rather than mocking anything) — also removes
// whatever it uploaded under backend/uploads/<clientId> so test runs don't
// leave real files behind. Also deletes their KYC tasks/corrections:
// clientId (e.g. "CLT-0003") is a display identifier, not a stable foreign
// key, so task cleanup uses the unique test email and the Client's
// stable Mongo _id (`clientRef`) instead. This prevents an orphaned task from
// silently attaching to whichever future client inherits the same clientId.
async function deleteClientsByEmailPattern(pattern) {
  const fs = require('fs');
  await mongoose.connect(process.env.MONGO_URI);
  const clients = await Client.find({ email: pattern });
  for (const c of clients) {
    const uploadDir = path.join(__dirname, '../../backend/uploads', c.clientId);
    if (fs.existsSync(uploadDir)) fs.rmSync(uploadDir, { recursive: true, force: true });
  }
  const ids = clients.map((c) => c._id);
  const clientIds = clients.map((c) => c.clientId);
  const taskFilters = [{ clientEmail: pattern }];
  if (ids.length) taskFilters.push({ clientRef: { $in: ids } });
  await KycTask.deleteMany({ $or: taskFilters });
  if (clientIds.length) {
    await Promise.all([
      KycCorrection.deleteMany({ clientId: { $in: clientIds } }),
      DocumentCorrection.deleteMany({ clientId: { $in: clientIds } }),
      Notification.deleteMany({ clientId: { $in: clientIds } }),
    ]);
  }
  if (ids.length) {
    await Promise.all([
      mongoose.connection.db.collection('kyctaskmigrationarchives').deleteMany({ clientRef: { $in: ids } }),
      mongoose.connection.db.collection('kycmigrationmanualreviews').deleteMany({ clientRef: { $in: ids } }),
    ]);
    await Client.deleteMany({ _id: { $in: ids } });
  }
  await mongoose.disconnect();
  return ids.length;
}

module.exports = { deleteE2eTestUsers, deleteAccountByEmailAndRole, deleteClientsByEmailPattern };
