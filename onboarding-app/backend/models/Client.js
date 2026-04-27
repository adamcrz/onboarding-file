const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  docId:             { type: String },
  clientId:          { type: String },
  name:              { type: String },
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

const auditSchema = new mongoose.Schema({
  action: { type: String },
  user:   { type: String },
  time:   { type: String },
  type:   { type: String },
});

const clientSchema = new mongoose.Schema({
  clientId:   { type: String, required: true, unique: true },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
  email:      { type: String },
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
  kyc:        { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

clientSchema.statics.generateClientId = async function () {
  const count = await this.countDocuments();
  return `CLT-${String(count + 1).padStart(4, '0')}`;
};

module.exports = mongoose.model('Client', clientSchema);