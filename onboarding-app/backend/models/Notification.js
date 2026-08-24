const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['info', 'warning', 'success'], default: 'info' },
  read: { type: Boolean, default: false },
  // Who this is for. An empty list means everyone — which is what every
  // notification written before this field existed is, so old rows keep
  // showing rather than silently vanishing.
  roles: { type: [String], default: [] },
  // A notification about one RM's own mandate follows the same scoping rule
  // the client list does: only that Kundenberater sees it, Compliance/admin
  // see everything. Unset means it is not RM-specific.
  rmCode: { type: String },
  // What it is about, so the bell can take you straight there.
  clientId: { type: String },
  page: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
