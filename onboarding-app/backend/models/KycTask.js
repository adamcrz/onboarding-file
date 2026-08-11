const mongoose = require('mongoose');

// A KYC questionnaire created for a client during Contract Building — visible to
// and completable by the Kundenberater (RM), the client, and Compliance alike;
// there's no single delegate, whoever gets to it first fills it in.
const kycTaskSchema = new mongoose.Schema({
  rmName:      { type: String },
  clientName:  { type: String, required: true },
  clientEmail: { type: String, required: true, lowercase: true, trim: true },
  clientId:    { type: String }, // links to Client.clientId, when known

  status:      { type: String, enum: ['pending', 'completed'], default: 'pending' },
  sections:    { type: mongoose.Schema.Types.Mixed, default: [] }, // snapshot of KYC_TEMPLATE.sections at creation time
  answers:     { type: mongoose.Schema.Types.Mixed, default: {} },
  completedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('KycTask', kycTaskSchema);
