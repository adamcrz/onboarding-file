const mongoose = require('mongoose');

const contractReviewSchema = new mongoose.Schema({
  templateId:   { type: String, required: true },
  templateName: { type: String },
  lang:         { type: String },

  clientName:  { type: String, required: true },
  clientEmail: { type: String, required: true, lowercase: true, trim: true },
  fieldValues: { type: mongoose.Schema.Types.Mixed, default: {} },

  kycDelegation: { type: String, default: 'none' },
  rmName:        { type: String },
  rmEmail:       { type: String },

  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },

  submittedAt:     { type: Date, default: Date.now },
  reviewedAt:      { type: Date },
  rejectionReason: { type: String },
  otp:             { type: String },
}, { timestamps: true });

module.exports = mongoose.model('ContractReview', contractReviewSchema);
