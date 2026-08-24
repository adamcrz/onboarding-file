// The mandate's completion percentage.
//
// A mandate is a checklist of documents: the contract package plus every
// supporting document the Vertrag asked for, all created up-front as empty
// slots when the contract is sent. Completion is simply how much of that
// checklist is in — n documents, each completed one worth an equal 1/n — so
// the number on the dashboard means the same thing as the rows the RM sees in
// Contract Tasks, rather than a hand-set figure that drifts out of step.
//
// Derived on read, never stored: a document uploaded, flagged or replaced
// changes the percentage on the next request with nothing to keep in sync.

// The KYC and mandate-risk sheets are generated output of their questionnaires
// (reviewed in KYC & Mandate Risk Tasks), not contract paperwork anybody
// uploads. Contract Tasks already leaves them out of its document list, so
// they stay out of the denominator too — otherwise submitting a questionnaire
// would silently move the goalposts.
const GENERATED_SHEETS = new Set(['Fragebogen zum Mandatsrisiko', 'KYC Questionnaire']);

const countsTowardCompletion = (doc) => Boolean(doc) && !GENERATED_SHEETS.has(doc.name);

// Done means the file is in and nobody has sent it back. A document Compliance
// flagged with `info-requested` is outstanding work again, so it stops
// counting until the replacement arrives — the percentage can go down, which
// is the point.
const isDocumentComplete = (doc) => Boolean(doc.filePath) && doc.status !== 'info-requested';

function mandateProgress(client) {
  const docs = (client?.documents || []).filter(countsTowardCompletion);
  const total = docs.length;
  const completed = docs.filter(isDocumentComplete).length;
  return {
    total,
    completed,
    outstanding: total - completed,
    // A mandate with no checklist yet has nothing to have completed — 0%,
    // never a misleading 100% from dividing by nothing.
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
}

// Serialisation helper: the client as a plain object carrying its derived
// progress, so every screen reads one number from one definition. Also exposes
// the raw counts, which is what lets the UI say "3 of 7 documents" instead of
// only a bare percentage.
// Serialised with toJSON, never toObject: the Client model's toJSON transform
// is what attaches `kycSchema` and derives `kycStatus`, so serialising any
// other way silently strips both from every client the API returns.
function withMandateProgress(client) {
  if (!client) return client;
  const plain = typeof client.toJSON === 'function' ? client.toJSON() : { ...client };
  const progress = mandateProgress(plain);
  return { ...plain, progress: progress.percent, documentProgress: progress };
}

module.exports = { mandateProgress, withMandateProgress, isDocumentComplete };
