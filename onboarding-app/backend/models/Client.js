const mongoose = require('mongoose');
const { getKycFieldDefinitions } = require('../config/kycRequiredFields');
const { toStoredPath, toAbsolutePath } = require('../config/paths');

// Uploaded files are recorded relative to the uploads root and handed back to
// application code as real, absolute paths. Doing it here rather than at each
// of the ~30 places that read filePath means every existing caller keeps
// working, while what lands in the database stays portable between the
// machine a file was uploaded on and wherever the app happens to run.
const filePathField = {
  type: String,
  set: toStoredPath,
  get: toAbsolutePath,
};

// A prior upload for this same document slot, kept so the full history of
// what was originally submitted vs. what replaced it stays reconstructable —
// a corrected re-upload replaces `filePath` on the parent but pushes the
// version it's replacing here first, it never creates an unrelated document.
const documentVersionSchema = new mongoose.Schema({
  filePath:   filePathField,
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
  filePath:          filePathField,
  expiryDate:        { type: String },
  versions:          [documentVersionSchema],
}, { timestamps: true });

const auditSchema = new mongoose.Schema({
  action: { type: String },
  user:   { type: String },
  time:   { type: String },
  type:   { type: String },
});

// Provenance for submissions recovered from the pre-canonical task store.
// The old task schema did not record the actor, so `kycSubmittedBy` uses the
// historical RM workflow owner while this object makes that assumption and
// the original source explicit for audit/review purposes.
const kycLegacySubmissionSchema = new mongoose.Schema({
  sourceTaskId:     { type: mongoose.Schema.Types.ObjectId },
  taskCompletedAt:  { type: Date },
  recoveredAt:      { type: Date },
  migrationVersion:{ type: Number },
  actorWasRecorded: { type: Boolean, default: false },
}, { _id: false });

// A person connected to the mandate who needs their own KYC (settlor,
// trustee, protector, ...). `kyc` uses the same shared questionnaire as the
// client's own, so nothing here is a second schema to maintain.
const relatedPartySchema = new mongoose.Schema({
  partyId:      { type: String, required: true },
  role:         { type: String, required: true },
  name:         { type: String, default: '' },
  sourceDocument: { type: String },
  kyc:          { type: mongoose.Schema.Types.Mixed, default: {} },
  status:       { type: String, enum: ['draft', 'under_review', 'approved'], default: 'draft' },
  submittedBy:  { type: String },
  submittedAt:  { type: Date },
  approvedAt:   { type: Date },
  approvedBy:   { type: String },
}, { timestamps: true });

const clientSchema = new mongoose.Schema({
  clientId:   { type: String, required: true, unique: true },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
  email:      { type: String, lowercase: true, trim: true },
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
  // is still awaiting Compliance's sign-off. Every submitter, including
  // Compliance, enters under-review; only the explicit verification action
  // writes approval provenance.
  kycSubmittedBy:          { type: String, enum: ['rm', 'compliance', 'client'] },
  kycAwaitingVerification: { type: Boolean, default: false },
  // Explicit workflow state. Older rows may not have this property, so API
  // projections derive it from the two legacy flags below until a workflow
  // transition writes the canonical state.
  kycStatus:               { type: String, enum: ['draft', 'under_review', 'approved'] },
  kycSubmittedAt:          { type: Date },
  kycApprovedAt:           { type: Date },
  kycApprovedBy:           { type: String },
  kycLegacySubmission:     { type: kycLegacySubmissionSchema },
  // A mandate can require KYC for people connected to it (settlor, trustee,
  // protector, ...), derived from the required-documents checklist chosen at
  // contract creation. Each carries its own answers against the same shared
  // questionnaire the client itself uses.
  relatedParties:          [relatedPartySchema],
  // Fragebogen zum Mandatsrisiko — part of every Vertrag. `prefilledKeys`
  // records which answers were carried over from the KYC/contract rather than
  // typed, so the form can show them as pre-populated and still saved.
  mandateRisk: {
    answers:       { type: mongoose.Schema.Types.Mixed, default: {} },
    prefilledKeys: { type: [String], default: [] },
    status:        { type: String, enum: ['draft', 'saved', 'under_review', 'approved'], default: 'draft' },
    submittedBy:   { type: String },
    submittedAt:   { type: Date },
    approvedAt:    { type: Date },
    approvedBy:    { type: String },
    // Compliance's decision per question, keyed by field key:
    //   { status: 'approved' | 'flagged', reason, by, at }
    // The same shape the KYC gets from its per-field corrections, so a reviewer
    // can tick what is right and send back only what is wrong instead of
    // rejecting a whole questionnaire.
    reviews:       { type: mongoose.Schema.Types.Mixed, default: {} },
  },
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, ret) => {
      // The browser receives the schema beside the shared KYC values, so the
      // Client Detail and KYC Task views render the exact same field list from
      // the backend's single canonical definition.
      ret.kyc = ret.kyc || {};
      ret.kycSchema = getKycFieldDefinitions(ret.type);
      if (!ret.kycStatus) {
        ret.kycStatus = ret.kycSubmittedBy
          ? ret.kycAwaitingVerification ? 'under_review' : 'approved'
          : 'draft';
      }
      return ret;
    },
  },
});

clientSchema.statics.generateClientId = async function () {
  const ClientCounter = require('./ClientCounter');
  const ids = await this.find({ clientId: /^CLT-\d+$/ }).distinct('clientId');
  const currentMax = ids.reduce((max, id) => Math.max(max, Number(String(id).slice(4)) || 0), 0);
  await ClientCounter.updateOne(
    { _id: 'clientId' },
    { $max: { seq: currentMax } },
    { upsert: true }
  );
  const counter = await ClientCounter.findOneAndUpdate(
    { _id: 'clientId' },
    { $inc: { seq: 1 } },
    { returnDocument: 'after' }
  );
  return `CLT-${String(counter.seq).padStart(4, '0')}`;
};

module.exports = mongoose.model('Client', clientSchema);
