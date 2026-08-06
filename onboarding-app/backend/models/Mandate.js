const mongoose = require('mongoose');

const pendingDocSchema = new mongoose.Schema({
  name:     { type: String },
  issue:    { type: String },
  page:     { type: String },
  priority: { type: String, default: 'Medium' },
  owner:    { type: String },
  dueDate:  { type: String },
  status:   { type: String, default: 'pending' },
});

// A Mandate Risk Profile — a per-relationship compliance review case, distinct
// from (but usually linked to) a Client onboarding case via `clientId`.
const mandateSchema = new mongoose.Schema({
  mandateId:   { type: String, required: true, unique: true }, // e.g. "mandate-co-a" — kept as a stable string id
  clientId:    { type: String }, // links to Client.clientId, when known
  category:    { type: String }, // Foundations / Trusts / Private Clients / Companies
  mandateName: { type: String },
  country:     { type: String },
  rm:          { type: String },
  risk:        { type: String, default: 'Medium' },
  docsApproved: { type: Number, default: 0 },
  docsTotal:    { type: Number, default: 0 },
  status:      { type: String, default: 'pending' },
  pendingDocs: [pendingDocSchema],
}, { timestamps: true });

module.exports = mongoose.model('Mandate', mandateSchema);
