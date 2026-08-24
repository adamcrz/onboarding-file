const mongoose = require('mongoose');

// A flagged document issue on a client case (often auto-flagged by upload-time
// validation — missing signature stamp, failed checkbox/initials check, etc.)
// that the RM must fix and resubmit, and Compliance then confirms as corrected.
const documentCorrectionSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  docId:    { type: String }, // links to the specific Client.documents[] entry, when known
  docName:  { type: String, required: true },
  issue:    { type: String, required: true },
  page:     { type: String }, // e.g. "Page 18" — which physical page the flagged region is on
  status:   { type: String, enum: ['pending', 'resubmitted', 'corrected'], default: 'pending' },

  // Which contract this belongs to and which requirement rule produced it.
  // templateId + ruleId together let a re-check re-evaluate exactly this one
  // requirement, so fixing one page can never re-report or duplicate an issue
  // that lives elsewhere in the same document.
  templateId:   { type: String },
  contractType: { type: String },  // human label, e.g. "Discretionary All-In (EN)"
  documentType: { type: String },  // e.g. "Auftragsvertrag", "Advisory Contract"
  ruleId:       { type: String },
  // 'manual' = raised by a Compliance reviewer rather than an automatic rule.
  ruleKind:     { type: String, enum: ['region', 'page-count', 'attachment', 'field', 'manual'] },

  // Numeric page range backing the `page` display string. A region rule is a
  // single page (from === to); a structural rule has none. This is what the
  // partial-download endpoint slices, and what the merge writes back to.
  pageFrom: { type: Number },
  pageTo:   { type: Number },

  // What the reviewer must actually do, kept separate from `issue` so the UI
  // can show the defect and the remedy as distinct lines.
  remedy:   { type: String },

  // Append-only trail: every download, upload, re-validation and status change
  // on this correction, so the full history survives alongside the document's
  // own versions[] file history.
  history: [new mongoose.Schema({
    action:     { type: String, required: true },
    actor:      { type: String },
    detail:     { type: String },
    validation: { type: String }, // 'passed' | 'failed' | null
    at:         { type: Date, default: Date.now },
  }, { _id: false })],
}, { timestamps: true });

module.exports = mongoose.model('DocumentCorrection', documentCorrectionSchema);
