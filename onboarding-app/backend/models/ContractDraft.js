const mongoose = require('mongoose');

// A contract left half-finished in the Contract Builder.
//
// Kept in the database rather than the browser deliberately: the app now runs
// in more than one place — the hosted instance and any number of local copies —
// and a draft that only exists in one browser's storage is lost the moment
// somebody switches machine, clears their history, or hands the case to a
// colleague. Nothing here is sent to a client; a draft becomes real only when
// the contract is actually sent.
const contractDraftSchema = new mongoose.Schema({
  draftId:      { type: String, required: true, unique: true },

  // What the draft is called in the list. Defaults to the client's name as far
  // as it has been typed, because "Untitled" three times over helps nobody.
  name:         { type: String, default: 'Untitled draft' },

  templateId:   { type: String },
  templateName: { type: String },

  // Who was working on it. rmCode is what scopes an RM to their own drafts,
  // the same rule the client list uses; ownerEmail is for showing a name
  // against a draft somebody else is holding.
  ownerEmail:   { type: String, lowercase: true, trim: true },
  ownerName:    { type: String },
  rmCode:       { type: String, uppercase: true, trim: true },

  // The whole Contract Builder state — chosen template, language, currency,
  // allocations, fees, the typed field values, the document checklist. Stored
  // opaquely because the builder owns its own shape, and pinning a schema here
  // would mean a migration every time a field is added to the form.
  state:        { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

module.exports = mongoose.model('ContractDraft', contractDraftSchema);
