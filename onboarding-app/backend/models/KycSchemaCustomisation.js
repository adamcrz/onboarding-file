const mongoose = require('mongoose');

// Compliance's edits to the KYC questionnaire, held as a delta against the
// shipped questions rather than a full copy of them: the originals stay in
// config/kycRequiredFields.js (one authoritative source, versioned with the
// code), and this record only says what was added on top and what was retired.
// A restored built-in therefore comes back exactly as it was written.
//
// Deliberately the same shape as MandateRiskSchemaCustomisation — the two
// questionnaires are edited the same way, and one pattern is easier to reason
// about than two that merely resemble each other.
const addedFieldSchema = new mongoose.Schema({
  key:      { type: String, required: true },
  label:    { type: String, required: true },
  page:     { type: String, required: true },  // section heading it belongs under
  type:     { type: String, enum: ['text', 'textarea', 'select', 'date', 'number'], default: 'text' },
  options:  { type: [String], default: [] },
  required: { type: Boolean, default: true },
  addedBy:  { type: String },
  addedAt:  { type: Date, default: Date.now },
}, { _id: false });

const kycSchemaCustomisationSchema = new mongoose.Schema({
  // Single record; the fixed key makes that structural rather than conventional.
  singleton: { type: String, default: 'default', unique: true, immutable: true },
  added:     { type: [addedFieldSchema], default: [] },
  // Keys of shipped questions Compliance has removed from the questionnaire.
  removed:   { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('KycSchemaCustomisation', kycSchemaCustomisationSchema);
