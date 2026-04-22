const mongoose = require('mongoose');


const auditSchema = new mongoose.Schema({
  action:  { type: String },
  user:    { type: String },
  time:    { type: String },
  type:    { type: String },
});

const clientSchema = new mongoose.Schema({
  clientId:   { type: String, required: true, unique: true },
  name:       { type: String, required: true },
  type:       { type: String },
  risk:       { type: String, default: 'Medium' },
  status:     { type: String, default: 'pending' },
  rm:         { type: String },
  progress:   { type: Number, default: 0 },
  country:    { type: String },
  industry:   { type: String },
  documents:  [documentSchema],
  auditTrail: [auditSchema],
  documents: [documentSchema],
  kyc:        { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema);
