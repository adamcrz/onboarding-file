const mongoose = require('mongoose');

// A flagged document issue on a client case (often auto-flagged by upload-time
// validation — missing signature stamp, failed checkbox/initials check, etc.)
// that the RM must fix and resubmit, and Compliance then confirms as corrected.
const documentCorrectionSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  docName:  { type: String, required: true },
  issue:    { type: String, required: true },
  status:   { type: String, enum: ['pending', 'resubmitted', 'corrected'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('DocumentCorrection', documentCorrectionSchema);
