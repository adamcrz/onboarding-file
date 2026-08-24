const mongoose = require('mongoose');

// A KYC questionnaire created for a client during Contract Building — visible to
// and completable by the Kundenberater (RM), the client, and Compliance alike;
// there's no single delegate, whoever gets to it first fills it in.
const kycTaskSchema = new mongoose.Schema({
  clientRef:   { type: mongoose.Schema.Types.ObjectId, ref: 'Client', unique: true, sparse: true },
  rmName:      { type: String },
  clientName:  { type: String, required: true },
  // Not required: a mandate prepared without a portal account has no email to
  // record. clientRef is the stable link (see resolveLinkedClient); this is a
  // duplicated display field and a fallback for relinking pre-ObjectId tasks.
  clientEmail: { type: String, lowercase: true, trim: true },
  clientId:    { type: String },
  clientType:  { type: String },
  schemaVersion: { type: Number, default: 2 },
  linkStatus:  { type: String, enum: ['linked', 'orphaned'], default: 'linked' },
  // `orphaned` is a terminal quarantine state. Runtime compatibility linking
  // and future migration runs must never promote one of these records again.
  quarantineReason: { type: String },
  quarantinedAt:    { type: Date },
  migrationVersion:{ type: Number },

  // `completed` remains readable for pre-workflow data. New writes use the
  // explicit pending -> under_review -> approved lifecycle, and completedAt
  // now records final Compliance approval rather than questionnaire submit.
  status:      { type: String, enum: ['pending', 'under_review', 'approved', 'completed'], default: 'pending' },
  submittedAt: { type: Date },
  approvedAt:  { type: Date },
  completedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('KycTask', kycTaskSchema);
