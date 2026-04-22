const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  docId:             { type: String },
  clientId:          { type: String, required: true },
  name:              { type: String, required: true },
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
}, { timestamps: true });

module.exports = mongoose.model('Document', documentSchema);
module.exports.documentSchema = documentSchema; // exports schema for Client.js