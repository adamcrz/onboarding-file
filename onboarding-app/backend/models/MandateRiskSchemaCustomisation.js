const mongoose = require('mongoose');

// Compliance's edits to the Fragebogen zum Mandatsrisiko, held as a delta
// against the printed form rather than a full copy of it: the shipped questions
// stay in config/mandateRiskFields.js (one authoritative source, versioned with
// the code), and this record only says what was added on top and what was
// retired. A restored built-in therefore comes back exactly as printed.
const addedFieldSchema = new mongoose.Schema({
  key:      { type: String, required: true },
  no:       { type: String, required: true },  // the form's own numbering, e.g. "18"
  label:    { type: String, required: true },
  page:     { type: String, required: true },  // section heading it belongs under
  type:     { type: String, enum: ['text', 'textarea', 'select', 'date', 'number'], default: 'text' },
  options:  { type: [String], default: [] },
  required: { type: Boolean, default: true },
  affectsRisk:    { type: Boolean, default: false },
  complianceOnly: { type: Boolean, default: false },
  addedBy:  { type: String },
  addedAt:  { type: Date, default: Date.now },
}, { _id: false });

const mandateRiskSchemaCustomisationSchema = new mongoose.Schema({
  // Single record; the fixed key makes that structural rather than conventional.
  singleton: { type: String, default: 'default', unique: true, immutable: true },
  added:     { type: [addedFieldSchema], default: [] },
  // Keys of shipped questions Compliance has removed from the questionnaire.
  removed:   { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('MandateRiskSchemaCustomisation', mandateRiskSchemaCustomisationSchema);
