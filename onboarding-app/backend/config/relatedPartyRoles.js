// Some required documents identify a *person connected to the mandate* rather
// than the mandate itself — a Form A/K for the settlor, a trustee's ID copy,
// and so on. Each such document implies that person needs their own KYC on
// top of the client's, so the required-documents checklist chosen during
// Vertragserstellung is what drives which related-party KYCs exist.
//
// Matching is on the document name, deliberately loose (case-insensitive
// substring) so a renamed or re-worded checklist entry still resolves. Order
// matters: the first matching pattern wins, so more specific roles come first.
const PARTY_ROLE_PATTERNS = [
  { role: 'Settlor',                 match: ['settlor'] },
  { role: 'Trustee',                 match: ['trustee'] },
  { role: 'Protector',               match: ['protector'] },
  { role: 'Founder',                 match: ['founder'] },
  { role: 'Beneficial Owner',        match: ['beneficial owner', 'form a —', 'form a -', 'formular a'] },
  { role: 'Controlling Person',      match: ['controlling person', 'form k', 'formular k'] },
  { role: 'Authorized Signatory',    match: ['authorized signator', 'authorised signator', 'signing authority'] },
  { role: 'Director',                match: ['director'] },
  { role: 'Beneficiary',             match: ['beneficiar'] },
];

// A document only implies a person KYC if it is an identification document —
// a trust deed mentions the settlor but does not itself identify them.
const IDENTIFYING_HINTS = ['form a', 'form k', 'formular', 'copy of id', 'identification', 'passport', 'id —', 'id -'];

function partyRoleForDocument(docName) {
  const name = String(docName || '').toLowerCase();
  if (!name) return null;
  if (!IDENTIFYING_HINTS.some((hint) => name.includes(hint))) return null;
  const entry = PARTY_ROLE_PATTERNS.find((p) => p.match.some((m) => name.includes(m)));
  return entry ? entry.role : null;
}

// Distinct roles implied by a checklist, in a stable order.
function partyRolesForDocuments(docNames = []) {
  const roles = [];
  for (const name of docNames) {
    const role = partyRoleForDocument(name);
    if (role && !roles.includes(role)) roles.push(role);
  }
  return roles;
}

module.exports = { partyRoleForDocument, partyRolesForDocuments, PARTY_ROLE_PATTERNS };
