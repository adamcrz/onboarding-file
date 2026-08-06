const mongoose = require('mongoose');

// A KYC questionnaire delegated by an RM — either to themselves (filling it out
// on behalf of the client) or to the client (to complete on their own portal).
const kycTaskSchema = new mongoose.Schema({
  delegateTo:  { type: String, enum: ['rm', 'client'], required: true },
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
