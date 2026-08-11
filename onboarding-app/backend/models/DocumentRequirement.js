const mongoose = require('mongoose');

// Master catalog of documents a client may be asked to upload, scoped by legal
// form — the same shape the Contract Builder's Required Documents checklist
// used to hardcode client-side. Individual client cases still store their own
// document instances on Client.documents; this is the selectable catalog those
// entries get created from.
const documentRequirementSchema = new mongoose.Schema({
  clientType: { type: String, required: true, enum: ['individual', 'company', 'foundation', 'trust'] },
  name:       { type: String, required: true },
  type:       { type: String, default: 'Supporting Document' },
  required:   { type: Boolean, default: true },
  order:      { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('DocumentRequirement', documentRequirementSchema);
