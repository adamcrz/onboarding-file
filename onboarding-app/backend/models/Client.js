const mongoose = require('mongoose');

// A prior upload for this same document slot, kept so the full history of
// what was originally submitted vs. what replaced it stays reconstructable —
// a corrected re-upload replaces `filePath` on the parent but pushes the
// version it's replacing here first, it never creates an unrelated document.
const documentVersionSchema = new mongoose.Schema({
  filePath:   { type: String },
  uploadedBy: { type: String },
  date:       { type: String },
  size:       { type: String },
  status:     { type: String },
}, { _id: false, timestamps: true });

const documentSchema = new mongoose.Schema({
  docId:             { type: String },
  clientId:          { type: String },
  name:              { type: String },
  type:              { type: String },
  status:            { type: String, default: 'pending' },
  uploadedBy:        { type: String },
  date:              { type: String },
  size:              { type: String },
  required:          { type: Boolean, default: false },
  templateAvailable: { type: Boolean, default: false },
  signedVersion:     { type: Boolean, default: false },
  missingNote:       { type: String },
  filePath:          { type: String },
  expiryDate:        { type: String },
  versions:          [documentVersionSchema],
}, { timestamps: true });

const auditSchema = new mongoose.Schema({
  action: { type: String },
  user:   { type: String },
  time:   { type: String },
  type:   { type: String },
});

const clientSchema = new mongoose.Schema({
  clientId:   { type: String, required: true, unique: true },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
  email:      { type: String },
  name:       { type: String, required: true },
  type:       { type: String },
  risk:       { type: String, default: 'Medium' },
  status:     { type: String, default: 'pending' },
  rm:         { type: String },
  progress:   { type: Number, default: 0 },
  country:    { type: String },
  industry:   { type: String },
  documents:  [documentSchema],
  auditTrail: [auditSchema],
  // The single shared KYC record — RM, Compliance and the client (if they
  // have portal access) all read/write the same object, never separate copies.
  kyc:        { type: mongoose.Schema.Types.Mixed, default: {} },
  // Who last submitted/resubmitted the KYC data, and whether that submission
  // is still awaiting Compliance's sign-off. A Compliance submission never
  // needs a separate verification step (self-verifying); an RM or client
  // submission does.
  kycSubmittedBy:          { type: String, enum: ['rm', 'compliance', 'client'] },
  kycAwaitingVerification: { type: Boolean, default: false },
}, { timestamps: true });

clientSchema.statics.generateClientId = async function () {
  const count = await this.countDocuments();
  return `CLT-${String(count + 1).padStart(4, '0')}`;
};

module.exports = mongoose.model('Client', clientSchema);