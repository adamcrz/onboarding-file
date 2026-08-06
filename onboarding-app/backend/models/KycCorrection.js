const mongoose = require('mongoose');

// A flagged KYC data issue on a client's mandate that the RM must fix and
// resubmit, and Compliance then confirms as corrected.
const kycCorrectionSchema = new mongoose.Schema({
  mandateId: { type: String },
  clientId:  { type: String, required: true },
  issue:     { type: String, required: true },
  page:      { type: String },
  status:    { type: String, enum: ['pending', 'resubmitted', 'corrected'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('KycCorrection', kycCorrectionSchema);
