// "Fragebogen zum Mandatsrisiko" — the mandate-risk questionnaire that forms
// part of every Vertrag. Field keys/labels follow the printed form's own
// numbering so a completed record maps 1:1 onto the PDF.
//
// Markers from the form itself:
//   required: true  -> (*)  Pflichtfrage
//   affectsRisk     -> (*r) feeds the mandate-risk calculation
//   complianceOnly  -> filled by Compliance / Geschäftsleitung, not the RM
const MANDATE_RISK_FIELDS = [
  { key: 'mandateProfile',        no: '1a',  label: 'Mandatsprofil',                                   page: '1. Mandatsprofil', type: 'select', options: ['Komplett', 'Offene Punkte'], required: false },
  { key: 'mandateProfileNotes',   no: '1b',  label: 'Bemerkungen zum Mandatsprofil',                   page: '1. Mandatsprofil', type: 'textarea', required: false },
  { key: 'mandatePurpose',        no: '2',   label: 'Beschreibung des Mandatszwecks',                  page: '1. Mandatsprofil', type: 'textarea' },
  { key: 'contactNotes',          no: '3',   label: 'Bemerkungen zum Kontakt',                         page: '1. Mandatsprofil', type: 'textarea', required: false },

  { key: 'assetsCurrency',        no: '4a',  label: 'Währung der eingebrachten Vermögenswerte',        page: '2. Vermögenswerte', type: 'select', options: ['CHF', 'EUR', 'USD', 'GBP', 'JPY', 'SGD'], required: false },
  { key: 'assetsAmount',          no: '4b',  label: 'Höhe der eingebrachten Vermögenswerte',           page: '2. Vermögenswerte', type: 'select', options: ['< 25 Mio.', '25 Mio. - 50 Mio.', '> 50 Mio.'], affectsRisk: true },
  { key: 'expectedAum',           no: '5',   label: 'Erwartetes verwaltetes Vermögen nach 2 Jahren',   page: '2. Vermögenswerte', type: 'text', required: false },
  { key: 'assetsCountry',         no: '6a',  label: 'Land der Erwirtschaftung',                        page: '2. Vermögenswerte', type: 'text', affectsRisk: true },
  { key: 'assetsHowEarned',       no: '6b',  label: 'Wie wurden sie erwirtschaftet?',                  page: '2. Vermögenswerte', type: 'textarea' },
  { key: 'assetsIndustry',        no: '6c',  label: 'Branche',                                         page: '2. Vermögenswerte', type: 'text', affectsRisk: true },
  { key: 'assetsIndustryOther',   no: '6d',  label: 'Falls Anderes, welche Industrie?',                page: '2. Vermögenswerte', type: 'text', required: false },
  { key: 'assetsKind',            no: '6e',  label: 'Art der Vermögenswerte (Überweisung, Titellieferung, physische Einlieferung, Anderes)', page: '2. Vermögenswerte', type: 'text', required: false },

  { key: 'serviceType',           no: '7',   label: 'Art der verlangten Dienstleistung und Produkte',  page: '3. Dienstleistung & Aktivität', type: 'select', affectsRisk: true,
    options: ['Gewöhnliche Tätigkeiten', 'Anspruchsvolle Tätigkeiten, welche eine besondere Überwachung erfordern', 'Komplexe Tätigkeiten, welche die Unterstützung externer Spezialisten erfordern'] },
  { key: 'plannedTransactions',   no: '8a',  label: 'Geplante Anzahl Transaktionen in den nächsten 12 Monaten', page: '3. Dienstleistung & Aktivität', type: 'text', required: false },
  { key: 'plannedActivityNotes',  no: '8b',  label: 'Beschreibung der geplanten Kontoaktivitäten',     page: '3. Dienstleistung & Aktivität', type: 'textarea', required: false },

  { key: 'flowsCurrency',         no: '9a',  label: 'Währung der Mittelflüsse',                        page: '4. Mittelflüsse', type: 'select', options: ['CHF', 'EUR', 'USD', 'GBP', 'JPY', 'SGD'], required: false },
  { key: 'flowsAmount',           no: '9b',  label: 'Höhe der Zu- und Abflüsse über 30 Tage',          page: '4. Mittelflüsse', type: 'select', options: ['Normal (< 0.5 Mio)', 'Überdurchschnittlich (0.5-1.0 Mio)', 'Sehr hoch (> 1 Mio)'], affectsRisk: true },
  { key: 'flowsNotes',            no: '9c',  label: 'Bemerkungen zu den Zu- und Abflüssen',            page: '4. Mittelflüsse', type: 'textarea', required: false },
  { key: 'flowsOriginCountry',    no: '9d',  label: 'Herkunftsland häufiger Zahlungen',                page: '4. Mittelflüsse', type: 'text', required: false, affectsRisk: true },
  { key: 'flowsTargetCountry',    no: '9e',  label: 'Zielland häufiger Zahlungen',                     page: '4. Mittelflüsse', type: 'text', required: false, affectsRisk: true },

  { key: 'potentialCurrency',     no: '10a', label: 'Währung des Neugeldpotenzials',                   page: '5. Potenzial & Personen', type: 'select', options: ['CHF', 'EUR', 'USD', 'GBP', 'JPY', 'SGD'], required: false },
  { key: 'potentialAmount',       no: '10b', label: 'Neugeldpotenzial',                                page: '5. Potenzial & Personen', type: 'select', options: ['Kein Potenzial', '<1 Mio.', '1 - 5 Mio.', '> 5 Mio.'], required: false },
  { key: 'potentialNotes',        no: '10c', label: 'Kommentar zum Neugeldpotenzial (Zeitraum etc.)',  page: '5. Potenzial & Personen', type: 'textarea', required: false },
  { key: 'relationshipToParties', no: '11a', label: 'Verhältnis zwischen Mandatsinhaber und Wirtschaftlich Berechtigten / Bevollmächtigten / Kontrollinhabern', page: '5. Potenzial & Personen', type: 'textarea' },
  { key: 'otherPartiesNotes',     no: '11b', label: 'Bemerkungen zu den weiteren Personen',            page: '5. Potenzial & Personen', type: 'textarea', required: false },

  { key: 'structureComplexity',   no: '12',  label: 'Komplexität der Strukturen (Sitzgesellschaften)', page: '6. Struktur', type: 'select', options: ['tief', 'mittel', 'hoch'], affectsRisk: true },
  { key: 'structureExplanation',  no: '12a', label: 'Erläuterung der komplexen Struktur',              page: '6. Struktur', type: 'textarea', required: false },

  { key: 'riskRatingComment',     no: '13',  label: 'Kommentar zur Risikoeinstufung',                  page: '7. Compliance & Geschäftsleitung', type: 'textarea', required: false, complianceOnly: true },
  { key: 'complianceComments',    no: '14',  label: 'Kommentare des Compliance Officers',              page: '7. Compliance & Geschäftsleitung', type: 'textarea', required: false, complianceOnly: true },
  { key: 'complianceVisa',        no: '15',  label: 'Visum des Compliance Officers (Ort und Datum)',   page: '7. Compliance & Geschäftsleitung', type: 'text', complianceOnly: true },
  { key: 'managementComments',    no: '16',  label: 'Kommentare der Geschäftsleitung',                 page: '7. Compliance & Geschäftsleitung', type: 'textarea', required: false, complianceOnly: true },
  { key: 'managementVisa',        no: '17',  label: 'Visum der Geschäftsleitung (Ort und Datum)',      page: '7. Compliance & Geschäftsleitung', type: 'text', complianceOnly: true },
];

const MANDATE_RISK_DOCUMENT_NAME = 'Fragebogen zum Mandatsrisiko';

// `fields` lets a caller pass the schema as it currently stands — the printed
// form's questions plus whatever Compliance has since added, minus whatever
// they removed (see services/mandateRiskSchema.service.js). Omitting it gives
// the printed form exactly as shipped.
function mandateRiskFieldDefinitions(fields = MANDATE_RISK_FIELDS) {
  return fields.map((f) => ({
    ...f,
    type: f.type || 'text',
    required: f.required !== false,
    options: f.options || [],
    label: `${f.no}) ${f.label}`,
  }));
}

// Everything the RM is expected to answer (Compliance/GL sections excluded).
function missingMandateRiskFields(answers = {}, fields = MANDATE_RISK_FIELDS) {
  return mandateRiskFieldDefinitions(fields).filter((f) =>
    f.required && !f.complianceOnly && !String(answers?.[f.key] ?? '').trim());
}

// Carries across what the client's KYC and the contract already state, so the
// same fact is never typed twice. Only fills blanks — anything already
// answered is left exactly as it is — and returns which keys it touched so
// the UI can show them as prefilled rather than hand-entered.
function prefillMandateRisk({ client = {}, contract = {}, existing = {} } = {}) {
  const kyc = client.kyc || {};
  const answers = { ...existing };
  const filled = [];
  const set = (key, value) => {
    if (value === undefined || value === null || String(value).trim() === '') return;
    if (String(answers[key] ?? '').trim()) return;
    answers[key] = String(value);
    filled.push(key);
  };

  const currency = contract.currency || 'CHF';
  set('assetsCurrency', currency);
  set('flowsCurrency', currency);
  set('potentialCurrency', currency);

  // Keys follow the Personenprofil questionnaire, falling back to the earlier
  // schema's names so a client whose KYC predates the change still prefills.
  const fullName = [kyc.firstName, kyc.lastName].filter(Boolean).join(' ').trim();
  set('mandatePurpose', kyc.relationshipDescription || kyc.purpose);
  set('assetsHowEarned', kyc.wealthGeneration || kyc.wealthOriginDetail || kyc.sourceOfWealth);
  set('assetsCountry', kyc.placeOfBusiness || kyc.residentialCountry || kyc.registrationCountry || kyc.jurisdiction);
  set('assetsIndustry', kyc.industry);
  set('relationshipToParties', fullName
    ? `Vertragspartei: ${fullName}${kyc.nationality ? ` (${kyc.nationality})` : ''}`
    : kyc.beneficialOwnerName
      ? `Wirtschaftlich Berechtigter: ${kyc.beneficialOwnerName}${kyc.beneficialOwnerNationality ? ` (${kyc.beneficialOwnerNationality})` : ''}`
      : '');

  // Structural complexity follows the legal form: a Sitzgesellschaft/Trust/
  // Foundation is inherently more layered than a natural person. This is a
  // starting point for the reviewer, never a final rating.
  const byLegalForm = { Individual: 'tief', Corporate: 'mittel', Domiciliary: 'hoch', Foundation: 'hoch', Trust: 'hoch' };
  set('structureComplexity', byLegalForm[client.type]);

  return { answers, prefilledKeys: filled };
}

// The mandate's risk rating, derived from the KYC's own regulatory answers
// (section 7: PEP, sanctions, adverse media) plus the structural complexity of
// the legal form. These are the questions that actually drive risk, so the
// rating follows them rather than being set by hand and drifting out of step.
//
// Any sanctions hit is decisive on its own — that is a hard High regardless of
// anything else. PEP or adverse media raise it; a layered structure
// (Sitzgesellschaft/Trust/Foundation) raises it one further step.
function deriveRiskRating(client = {}) {
  const kyc = client.kyc || {};
  const yes = (v) => ['yes', 'ja'].includes(String(v || '').trim().toLowerCase());
  const reasons = [];

  // The Personenprofil asks a single "Exponierung" question rather than the
  // separate PEP / sanctions / adverse-media flags the earlier schema used.
  // A PEP in person is decisive; being close to one is material but not the
  // same thing. Records answered under the old schema are still read, so a
  // client approved before the change keeps the rating it was given.
  const exposure = String(kyc.exposure || '').trim().toLowerCase();
  if (exposure.includes('politisch exponierte person') || yes(kyc.sanctions)) {
    return {
      rating: 'High',
      reasons: [yes(kyc.sanctions)
        ? 'Subject to sanctions (KYC)'
        : 'Politically exposed person (Exponierung)'],
    };
  }

  let score = 0;
  if (exposure.includes('nahestehende')) { score += 2; reasons.push('Close associate of a politically exposed person (Exponierung)'); }
  else if (exposure.includes('anderweitig')) { score += 1; reasons.push('Otherwise exposed person (Exponierung)'); }
  if (yes(kyc.pep)) { score += 2; reasons.push('Politically Exposed Person (KYC)'); }
  if (yes(kyc.adverse)) { score += 2; reasons.push('Adverse media or legal proceedings (KYC)'); }
  // Someone else's money in the account is a materially different risk than
  // the account holder's own.
  if (yes(kyc.closeExposedPersons)) { score += 1; reasons.push('Exposed persons among close contacts (KYC section 8)'); }

  const layered = ['Domiciliary', 'Foundation', 'Trust'].includes(client.type);
  if (layered) { score += 1; reasons.push(`Layered structure (${client.type})`); }

  const rating = score >= 3 ? 'High' : score >= 1 ? 'Medium' : 'Low';
  if (!reasons.length) reasons.push('No exposure recorded in the KYC');
  return { rating, reasons };
}

module.exports = {
  deriveRiskRating,
  MANDATE_RISK_FIELDS,
  MANDATE_RISK_DOCUMENT_NAME,
  mandateRiskFieldDefinitions,
  missingMandateRiskFields,
  prefillMandateRisk,
};
