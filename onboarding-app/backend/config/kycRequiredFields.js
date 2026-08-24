// The canonical KYC schema used by the task, Client.kyc, Client Details,
// corrections and exports. `required: false` fields are displayed/stored but
// do not create automatic missing-field corrections.
// One canonical KYC questionnaire, used for every legal form. Previously each
// legal form had its own field list (Individual/Corporate/Domiciliary/
// Foundation/Trust), which meant the same screen asked different questions
// depending on the client type. There is now a single shared schema so the
// questionnaire is identical everywhere in the system.
//
// Answers recorded under fields that only existed on an old per-type schema
// (settlorName, trusteeName, passportNumber, ...) are NOT deleted — they stay
// in Client.kyc, they are simply no longer part of the questionnaire.
// The canonical KYC questionnaire: the "Personenprofil" form for the natural
// person in focus, transcribed from the bank's own export
// (Export-KYC-…pdf) so a completed record maps 1:1 onto the printed form.
//
// The form's own legend drives the flags below:
//   (*)     Pflichtfrage für alle Mandatsrollen        -> required: true
//   (**)    Pflichtfrage, jedoch nur falls zutreffend  -> ifApplicable: true
//   (r)     fliesst in die Mandatsrisikoberechnung     -> affectsRisk: true
//   (VP/WB) nur Vertragspartei / Wirtschaftlich Ber.   -> vpwb: true
//
// Only (*) questions are `required`. An (**) question cannot be demanded by the
// system — whether it applies is a judgement about the person, not something
// the app can know — so it is shown and stored but never creates an automatic
// missing-field correction. Making all ~100 mandatory would make the
// questionnaire unsubmittable in every real case.
//
// Answers recorded under fields from an earlier schema are NOT deleted — they
// stay in Client.kyc, they are simply no longer asked.
const YES_NO = ['Ja', 'Nein'];
const CURRENCIES = ['CHF', 'EUR', 'USD', 'GBP', 'JPY', 'SGD'];

const SHARED_KYC_FIELDS = [
  // ─── 1. Personenprofil ─────────────────────────────────────────────────────
  { key: 'profileQuality',        label: 'Qualität des Personenprofils',        page: '1. Personenprofil', type: 'select', options: ['Komplett', 'Offene Punkte'], required: false },
  { key: 'profileRemarks',        label: 'Bemerkungen zum Personenprofil',      page: '1. Personenprofil', type: 'textarea', required: false },
  { key: 'title',                 label: 'Titel',                               page: '1. Personenprofil', type: 'select', options: ['Herr', 'Frau', 'Dr.', 'Prof.'], required: false },
  { key: 'firstName',             label: 'Vorname(n) (*)',                      page: '1. Personenprofil' },
  { key: 'lastName',              label: 'Nachname (*)',                        page: '1. Personenprofil' },
  { key: 'maidenName',            label: 'Lediger Name',                        page: '1. Personenprofil', required: false },
  { key: 'passportFullName',      label: 'Kompletter Name gemäss Pass',         page: '1. Personenprofil', required: false },
  { key: 'gender',                label: 'Geschlecht',                      page: '1. Personenprofil', type: 'select', options: ['Männlich', 'Weiblich', 'Divers'], required: false },
  { key: 'dateOfBirth',           label: 'Geburtsdatum (*)',                    page: '1. Personenprofil', type: 'date' },
  { key: 'countryOfBirth',        label: 'Geburtsland',                         page: '1. Personenprofil', required: false },
  { key: 'dateOfDeath',           label: 'Todestag',                            page: '1. Personenprofil', type: 'date', required: false },

  // ─── 2. Nationalität, Wohnsitz & Steuern ───────────────────────────────────
  { key: 'nationality',           label: 'Nationalität (*r)',                   page: '2. Nationalität & Domizil', affectsRisk: true },
  { key: 'nationalitySecond',     label: 'Allfällig zweite Nationalität (**r)', page: '2. Nationalität & Domizil', required: false, ifApplicable: true, affectsRisk: true },
  { key: 'nationalityThird',      label: 'Allfällig dritte Nationalität (**r)', page: '2. Nationalität & Domizil', required: false, ifApplicable: true, affectsRisk: true },
  { key: 'nationalityFurther',    label: 'Allfällige weitere Nationalitäten (**)', page: '2. Nationalität & Domizil', required: false, ifApplicable: true },
  { key: 'legalDomicile',         label: 'Rechtlicher Wohnsitz (*r)',           page: '2. Nationalität & Domizil', affectsRisk: true },
  { key: 'legalDomicileSecond',   label: 'Allfällig zweiter rechtlicher Wohnsitz (**r)', page: '2. Nationalität & Domizil', required: false, ifApplicable: true, affectsRisk: true },
  { key: 'taxDomicile',           label: 'Steuerliches Domizil (*r)',           page: '2. Nationalität & Domizil', affectsRisk: true },
  { key: 'taxConfirmation',       label: 'Steuerbestätigung',                   page: '2. Nationalität & Domizil', type: 'select', options: ['Vorhanden', 'Ausstehend', 'Nicht erforderlich'], required: false },
  { key: 'correspondenceLanguage', label: 'Korrespondenzsprache (VP/WB)',       page: '2. Nationalität & Domizil', type: 'select', options: ['Deutsch', 'Englisch', 'Französisch', 'Italienisch'], required: false, vpwb: true },

  // ─── 3. Beziehung & Akquisition ────────────────────────────────────────────
  { key: 'relationshipDescription', label: 'Beschreibung der bisherigen Beziehung', page: '3. Beziehung & Akquisition', type: 'textarea', required: false },
  { key: 'knownSince',            label: 'Bekannt seit',                        page: '3. Beziehung & Akquisition', type: 'date', required: false },
  { key: 'acquisitionComment',    label: 'Kommentar zur Akquisition',           page: '3. Beziehung & Akquisition', type: 'textarea', required: false },
  { key: 'personalContact',       label: 'Persönlicher Kontakt (VP/WB, r)',     page: '3. Beziehung & Akquisition', type: 'select', options: YES_NO, required: false, vpwb: true, affectsRisk: true },
  { key: 'personalContactPlaceDate', label: 'Falls ja, Ort und Datum (VP/WB)',  page: '3. Beziehung & Akquisition', required: false, vpwb: true },
  { key: 'exposure',              label: 'Exponierung (*r)',                    page: '3. Beziehung & Akquisition', type: 'select', affectsRisk: true,
    options: ['Keine', 'Politisch exponierte Person (PEP)', 'Nahestehende Person einer PEP', 'Anderweitig exponiert'] },
  { key: 'exposureComment',       label: 'Kommentar zur Exponierung',           page: '3. Beziehung & Akquisition', type: 'textarea', required: false },
  { key: 'usPerson',              label: 'US Person (gemäss Selbstdeklarationsformular) (*)', page: '3. Beziehung & Akquisition', type: 'select', options: YES_NO },

  // ─── 4. Identifikation ─────────────────────────────────────────────────────
  { key: 'idDocumentType',        label: 'Art des Identifikationsausweises (*)', page: '4. Identifikation', type: 'select', options: ['Reisepass', 'Identitätskarte', 'Führerausweis', 'Anderes'] },
  { key: 'idDocumentTypeOther',   label: 'Falls Anderes, was (**)',             page: '4. Identifikation', required: false, ifApplicable: true },
  { key: 'copyAuthentication',    label: 'Echtheitsbestätigung der Kopie',      page: '4. Identifikation', type: 'select', options: ['Vorhanden', 'Ausstehend'], required: false },

  // ─── 5. Kontaktangaben ─────────────────────────────────────────────────────
  { key: 'phonePrivate',          label: 'Telefonnummer Privat',            page: '5. Kontaktangaben', required: false },
  { key: 'phoneMobile',           label: 'Mobile',                              page: '5. Kontaktangaben', required: false },
  { key: 'phoneOffice',           label: 'Telefonnummer Büro',                  page: '5. Kontaktangaben', required: false },
  { key: 'phoneOther',            label: 'Weitere Telefonnummer',               page: '5. Kontaktangaben', required: false },
  { key: 'fax',                   label: 'Fax',                                 page: '5. Kontaktangaben', required: false },
  { key: 'emailAddress',          label: 'Email',                               page: '5. Kontaktangaben', type: 'email', required: false },
  { key: 'preferredChannel',      label: 'Bevorzugter Kommunikationskanal mit der Person', page: '5. Kontaktangaben', type: 'select', options: ['Telefon', 'E-Mail', 'Post', 'Persönlich'], required: false },
  { key: 'correspondenceRetained', label: 'Korrespondenz zurückbehalten',   page: '5. Kontaktangaben', type: 'select', options: YES_NO, required: false },
  { key: 'correspondenceTarget',  label: 'Korrespondenzadresse',            page: '5. Kontaktangaben', type: 'select', options: ['Wohnadresse', 'Zweitadresse', 'Separate Korrespondenzadresse'], required: false },

  // ─── 6. Adressen ───────────────────────────────────────────────────────────
  { key: 'residentialStreet',     label: 'Wohnadresse (Strasse, Hausnummer) (*)', page: '6. Adressen' },
  { key: 'residentialCity',       label: 'Wohnadresse (Stadt) (*)',             page: '6. Adressen' },
  { key: 'residentialCountry',    label: 'Wohnadresse (Land) (*r)',             page: '6. Adressen', affectsRisk: true },
  { key: 'residentialPostcode',   label: 'Wohnadresse (PLZ)',                   page: '6. Adressen', required: false },
  { key: 'secondStreet',          label: 'Zweitadresse / Ferienhaus (Strasse, Hausnummer)', page: '6. Adressen', required: false },
  { key: 'secondCity',            label: 'Zweitadresse (Stadt)',                page: '6. Adressen', required: false },
  { key: 'secondCountry',         label: 'Zweitadresse (Land) (**r)',           page: '6. Adressen', required: false, ifApplicable: true, affectsRisk: true },
  { key: 'secondPostcode',        label: 'Zweitadresse (PLZ)',                  page: '6. Adressen', required: false },
  { key: 'correspondenceStreet',  label: 'Korrespondenzadresse (Strasse, Hausnummer)', page: '6. Adressen', required: false },
  { key: 'correspondenceCity',    label: 'Korrespondenzadresse (Stadt)',        page: '6. Adressen', required: false },
  { key: 'correspondenceCountry', label: 'Korrespondenzadresse (Land)',         page: '6. Adressen', required: false },
  { key: 'correspondencePostcode', label: 'Korrespondenzadresse (PLZ)',         page: '6. Adressen', required: false },

  // ─── 7. Weitere Kontakte & Insider ─────────────────────────────────────────
  { key: 'furtherContactPerson',  label: 'Weitere Kontaktperson',               page: '7. Weitere Kontakte & Insider', required: false },
  { key: 'furtherContactComment', label: 'Kommentar',                           page: '7. Weitere Kontakte & Insider', type: 'textarea', required: false },
  { key: 'insiderRelation',       label: 'Hat die Person Beziehungen zu einem Corporate Insider?', page: '7. Weitere Kontakte & Insider', type: 'select', options: YES_NO, required: false },
  { key: 'isInsider',             label: 'Ist die Person ein Corporate Insider?', page: '7. Weitere Kontakte & Insider', type: 'select', options: YES_NO, required: false },
  { key: 'insiderCompanies',      label: 'Falls ja, zu welchen kotierten Unternehmen', page: '7. Weitere Kontakte & Insider', type: 'textarea', required: false, ifApplicable: true },

  // ─── 8. Familiensituation ──────────────────────────────────────────────────
  { key: 'maritalStatus',         label: 'Zivilstand',                          page: '8. Familiensituation', type: 'select', options: ['Ledig', 'Verheiratet', 'Eingetragene Partnerschaft', 'Getrennt', 'Geschieden', 'Verwitwet'], required: false },
  { key: 'familyDescription',     label: 'Beschreibung der Familiensituation (VP/WB)', page: '8. Familiensituation', type: 'textarea', required: false, vpwb: true },
  { key: 'partnerDetails',        label: 'Vor-/Nachname, Geburtsdatum, Nationalität(en), Wohnsitz/e, Branche, Exponierung des (Ehe)Partners', page: '8. Familiensituation', type: 'textarea', required: false },
  { key: 'childrenDetails',       label: 'Vor-/Nachname, Geburtsdatum, Nationalität(en), Wohnsitz/e, Branche, Exponierung der Kinder', page: '8. Familiensituation', type: 'textarea', required: false },
  { key: 'closeExposedPersons',   label: 'Aus familiären, persönlichen oder geschäftlichen Gründen nahestehende exponierte Personen', page: '8. Familiensituation', type: 'select', options: YES_NO, required: false },
  { key: 'closeExposedDetails',   label: 'Falls Exponierung von nahestehenden Personen: Vor-/Nachname, Geburtsdatum, …', page: '8. Familiensituation', type: 'textarea', required: false, ifApplicable: true },

  // ─── 9. Erwerbssituation ───────────────────────────────────────────────────
  { key: 'employmentStatusDe',    label: 'Erwerbssituation',                    page: '9. Erwerbssituation', type: 'select', options: ['Angestellt', 'Selbständig', 'Pensioniert', 'Student', 'Ohne Erwerbstätigkeit', 'Anderes'], required: false },
  { key: 'industry',              label: 'Branche (aktuelle oder letzte Arbeitstelle) (*r)', page: '9. Erwerbssituation', affectsRisk: true },
  { key: 'industryOther',         label: 'Falls Anderes, was (**)',             page: '9. Erwerbssituation', required: false, ifApplicable: true },
  { key: 'occupationDe',          label: 'Beruf (aktuelle oder letzte Arbeitsstelle)', page: '9. Erwerbssituation', required: false },
  { key: 'employerDe',            label: 'Arbeitgeber (aktuelle oder letzte Arbeitsstelle)', page: '9. Erwerbssituation', required: false },
  { key: 'placeOfBusiness',       label: 'Ort der Geschäftstätigkeit (VP/WB, r)', page: '9. Erwerbssituation', required: false, vpwb: true, affectsRisk: true },
  { key: 'selfEmployedDetails',   label: 'Falls selbständig: Anzahl Angestellte, Gründungsdatum, Umsatz, Erträge, persönlicher Bezug, Sonstiges', page: '9. Erwerbssituation', type: 'textarea', required: false, ifApplicable: true },
  { key: 'companyNameAddressWeb', label: 'Wenn ja, wie lautet der Name, die Adresse und die Website des Unternehmens?', page: '9. Erwerbssituation', type: 'textarea', required: false, ifApplicable: true },
  { key: 'companyPersonallyKnown', label: 'Ist das Unternehmen der Person persönlich bekannt?', page: '9. Erwerbssituation', type: 'select', options: YES_NO, required: false },
  { key: 'employmentFurtherInfo', label: 'Weitere Informationen zur Beschäftigung', page: '9. Erwerbssituation', type: 'textarea', required: false },

  // ─── 10. Einnahmen ─────────────────────────────────────────────────────────
  { key: 'incomeCurrency',        label: 'Angabe Einnahmen in folgender Währung', page: '10. Einnahmen', type: 'select', options: CURRENCIES, required: false },
  { key: 'annualIncomeAmount',    label: 'Höhe des durchschnittlichen jährlichen Einkommens', page: '10. Einnahmen', type: 'number', required: false },
  { key: 'otherRegularIncome',    label: 'Weitere regelmässige Erträge',        page: '10. Einnahmen', type: 'textarea', required: false },
  { key: 'mainIncomeSource',      label: 'Hauptquelle des regelmässigen Einkommens', page: '10. Einnahmen', required: false },
  { key: 'incomeComment',         label: 'Kommentar zu den Einnahmen',          page: '10. Einnahmen', type: 'textarea', required: false },

  // ─── 11. Ausgaben ──────────────────────────────────────────────────────────
  { key: 'expensesCurrency',      label: 'Angabe Ausgaben in folgender Währung', page: '11. Ausgaben', type: 'select', options: CURRENCIES, required: false },
  { key: 'livingCosts',           label: 'Lebenshaltungskosten (jährlich) (Wert)', page: '11. Ausgaben', type: 'number', required: false },
  { key: 'plannedExpenses',       label: 'Geplante Ausgaben (jährlich) (Wert)', page: '11. Ausgaben', type: 'number', required: false },
  { key: 'financialDependants',   label: 'Gibt es Personen, welche finanziell abhängig sind von der Person?', page: '11. Ausgaben', type: 'select', options: YES_NO, required: false },
  { key: 'dependantsExpenses',    label: 'Falls ja, wie hoch sind die erwarteten Ausgaben (Wert)', page: '11. Ausgaben', type: 'number', required: false, ifApplicable: true },
  { key: 'dependantsDetails',     label: 'Vor-/Nachname, Geburtsdatum, Nationalität(en) der abhängigen Personen', page: '11. Ausgaben', type: 'textarea', required: false, ifApplicable: true },
  { key: 'expensesComment',       label: 'Kommentar zu den Ausgaben',           page: '11. Ausgaben', type: 'textarea', required: false },

  // ─── 12. Vermögen ──────────────────────────────────────────────────────────
  { key: 'wealthGeneration',      label: 'Erwirtschaftung des Vermögens (VP/WB)', page: '12. Vermögen', type: 'textarea', required: false, vpwb: true },
  { key: 'wealthOriginDetail',    label: 'Detaillierte Beschreibung der Vermögensherkunft (VP/WB)', page: '12. Vermögen', type: 'textarea', required: false, vpwb: true },
  { key: 'assetsCurrencyKyc',     label: 'Angabe Vermögenswerte in folgender Währung (VP/WB)', page: '12. Vermögen', type: 'select', options: CURRENCIES, required: false, vpwb: true },
  { key: 'totalNetAssets',        label: 'Gesamtvermögen (Netto) (VP/WB)',      page: '12. Vermögen', type: 'number', required: false, vpwb: true },
  { key: 'bankableAssets',        label: 'Bankfähige Vermögenswerte (Wert)',    page: '12. Vermögen', type: 'number', required: false },
  { key: 'lifeInsuranceValue',    label: 'Lebensversicherung (Wert)',           page: '12. Vermögen', type: 'number', required: false },
  { key: 'realEstateValue',       label: 'Immobilien (Wert)',                   page: '12. Vermögen', type: 'number', required: false },
  { key: 'ownCompanyValue',       label: 'Eigene Unternehmung / Private Equity (Wert)', page: '12. Vermögen', type: 'number', required: false },
  { key: 'commercialAssetsValue', label: 'Gewerbliche Vermögenswerte (Wert)',   page: '12. Vermögen', type: 'number', required: false },
  { key: 'otherHoldings',         label: 'Beteiligungen oder Anteile an weiteren Gesellschaften', page: '12. Vermögen', type: 'select', options: YES_NO, required: false },
  { key: 'otherHoldingsDetails',  label: 'Wenn ja, in welche Gesellschaften',   page: '12. Vermögen', type: 'textarea', required: false, ifApplicable: true },
  { key: 'otherAssetsValue',      label: 'Anderes (Schmuck, Kunst, …) (Wert)',  page: '12. Vermögen', type: 'number', required: false },
  { key: 'otherAssetsDetail',     label: 'Präzisierung Anderes (falls zutreffend)', page: '12. Vermögen', type: 'textarea', required: false, ifApplicable: true },
  { key: 'liabilitiesValue',      label: 'Verbindlichkeiten (Wert)',            page: '12. Vermögen', type: 'number', required: false },
  { key: 'wealthRemarks',         label: 'Bemerkungen zum Vermögen und dessen Zusammensetzung', page: '12. Vermögen', type: 'textarea', required: false },

  // ─── 13. Abschluss ─────────────────────────────────────────────────────────
  { key: 'educationCareer',       label: 'Ausbildung, Karrierenmeilensteine',   page: '13. Abschluss', type: 'textarea', required: false },
  { key: 'generalRemarks',        label: 'Allgemeine Bemerkungen',              page: '13. Abschluss', type: 'textarea', required: false },
  { key: 'placeDate',             label: 'Ort, Datum',                      page: '13. Abschluss', required: false },
  { key: 'advisorSignature',      label: 'Name / Unterschrift des Kundenbetreuers', page: '13. Abschluss', required: false },
];

// The questionnaire as it currently stands: the list above, minus anything
// Compliance retired, plus anything they added. services/kycSchema.service.js
// does the merging and calls setActiveKycFields() whenever it changes.
//
// It is held here, behind the same names the rest of the app already reads,
// because about forty places look questions up through REQUIRED_KYC_FIELDS or
// getKycFieldDefinitions. Routing the merge through one variable means every
// one of them — the task form, the gap check, the exports, the submission
// gate, the PDF — reflects an edit without being touched, and none of them can
// be forgotten.
let activeFields = SHARED_KYC_FIELDS;

// Replaces the effective list. Passing nothing restores the shipped questions,
// which is what a schema-store outage falls back to.
function setActiveKycFields(fields) {
  activeFields = Array.isArray(fields) && fields.length ? fields : SHARED_KYC_FIELDS;
  return activeFields;
}

// The questions as shipped, for anyone who needs to tell an addition from an
// original — the schema screen, and restoring a retired built-in.
const BUILT_IN_KYC_FIELDS = SHARED_KYC_FIELDS;

// Every legal form maps to the same list. Kept as a per-type map so the rest
// of the app (which looks schemas up by Client.type) needs no changes, and so
// a genuinely type-specific question could be reintroduced later.
//
// Getters rather than fixed arrays: consumers hold on to this object, and a
// property read has to give the list as it stands now, not as it stood when
// the module was first required.
const REQUIRED_KYC_FIELDS = {
  get Individual()  { return activeFields; },
  get Corporate()   { return activeFields; },
  get Domiciliary() { return activeFields; },
  get Foundation()  { return activeFields; },
  get Trust()       { return activeFields; },
};

// This is the only persisted/rendered KYC schema. KycTask records reference a
// Client but do not keep their own copy of either the field list or the
// answers; both the task API and the client profile are projected from this
// definition plus Client.kyc.
const KYC_SCHEMA_VERSION = 4;

const FIELD_INPUT_META = {
  dob:              { type: 'date' },
  passportExpiry:   { type: 'date' },
  registrationDate:{ type: 'date' },
  trustDeedDate:    { type: 'date' },
  address:          { type: 'textarea' },
  addressLine2:     { type: 'textarea' },
  sourceOfWealth:   { type: 'textarea' },
  beneficiaries:    { type: 'textarea' },
  title: {
    type: 'select',
    options: ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'],
  },
  employmentStatus: {
    type: 'select',
    options: ['Employed', 'Self-Employed / Director', 'Retired', 'Student', 'Other'],
  },
  annualIncome: {
    type: 'select',
    options: ['< CHF 100K', 'CHF 100K – 500K', 'CHF 500K – 1M', '> CHF 1M'],
  },
  netAssets: {
    type: 'select',
    options: ['< CHF 500K', 'CHF 500K – 2M', 'CHF 2M – 10M', '> CHF 10M'],
  },
  pep:       { type: 'select', options: ['No', 'Yes'] },
  sanctions: { type: 'select', options: ['No', 'Yes'] },
  adverse:   { type: 'select', options: ['No', 'Yes'] },
};

// The schema now carries its own control type and options per question, so a
// field's own definition wins; FIELD_INPUT_META below is only a fallback for
// keys that don't state one. (Spread the other way round and the legacy map
// silently replaced the questionnaire's own answer options — e.g. the German
// "Titel" choices reverting to Mr/Mrs/Ms.)
function getKycFieldDefinitions(clientType) {
  return (REQUIRED_KYC_FIELDS[clientType] || []).map((field) => ({
    ...(FIELD_INPUT_META[field.key] || {}),
    ...field,
    required: field.required !== false,
  }));
}

function buildKycSections(clientType, values = {}) {
  const sections = [];
  const byPage = new Map();

  for (const field of getKycFieldDefinitions(clientType)) {
    if (!byPage.has(field.page)) {
      const section = { id: `kyc-page-${sections.length + 1}`, title: field.page, fields: [] };
      byPage.set(field.page, section);
      sections.push(section);
    }
    byPage.get(field.page).fields.push({
      id: field.key,
      key: field.key,
      label: field.label,
      type: field.type || 'text',
      required: field.required,
      ...(field.options ? { options: [...field.options] } : {}),
      value: values[field.key] ?? '',
    });
  }

  return sections;
}

function canonicalKycValues(values, clientType, { includeEmpty = false } = {}) {
  const source = values && typeof values === 'object' ? values : {};
  const result = {};
  for (const field of getKycFieldDefinitions(clientType)) {
    const value = source[field.key];
    if (includeEmpty || (value !== undefined && value !== null && value !== '')) {
      result[field.key] = value ?? '';
    }
  }
  return result;
}

// Compatibility map for answers saved by the pre-v2 browser-owned Individual
// questionnaire. Every legacy field has a canonical destination; nothing is
// discarded during migration.
const KYC_TEMPLATE_FIELD_MAP = {
  f_title:        'title',
  f_firstname:    'firstName',
  f_lastname:     'lastName',
  f_dob:          'dob',
  f_nationality:  'nationality',
  f_country:      'residency',
  f_pob:          'placeOfBirth',
  f_passport:     'passportNumber',
  f_passport_expiry: 'passportExpiry',
  f_passport_country: 'passportCountry',
  f_addr1:        'address',
  f_addr2:        'addressLine2',
  f_city:         'city',
  f_zip:          'postalCode',
  f_ctry:         'addressCountry',
  f_tax_country:  'taxResidency',
  f_tin:          'taxId',
  f_emp_status:   'employmentStatus',
  f_occupation:   'occupation',
  f_employer:     'employer',
  f_income:       'annualIncome',
  f_sow:          'sourceOfWealth',
  f_net_assets:   'netAssets',
  f_pep:          'pep',
  f_sanctions:    'sanctions',
  f_adverse:      'adverse',
};

// Folds a completed KYC Task's answers into the REQUIRED_KYC_FIELDS shape,
// ready to merge into client.kyc. Two answer shapes are handled: the legacy
// KYC_TEMPLATE one (f_firstname, f_addr1, …, Individual-only, needs the
// mapping below) and the current one the fill form now actually sends, whose
// field names already are canonical keys for the client's own type
// (firstName, legalName, …) — those pass through unchanged.
function mapTaskAnswersToKyc(answers, clientType, { includeEmpty = false } = {}) {
  const source = answers && typeof answers === 'object' ? answers : {};
  const kyc = canonicalKycValues(source, clientType);

  if (includeEmpty) {
    for (const field of getKycFieldDefinitions(clientType)) {
      if (Object.prototype.hasOwnProperty.call(source, field.key)
        && (source[field.key] === '' || source[field.key] === null)) {
        kyc[field.key] = '';
      }
    }
  }

  // Compatibility for pre-v2 Individual tasks only. New tasks submit the
  // canonical keys above, and non-Individual tasks must never inherit this
  // old Individual-only mapping.
  if (clientType !== 'Individual') return kyc;

  for (const [templateKey, kycKey] of Object.entries(KYC_TEMPLATE_FIELD_MAP)) {
    if (source[templateKey] === undefined || (!includeEmpty && source[templateKey] === '')) continue;
    const value = source[templateKey];
    kyc[kycKey] = ['pep', 'sanctions', 'adverse'].includes(kycKey)
      ? String(value).toLowerCase() === 'yes' ? 'Yes' : String(value).toLowerCase() === 'no' ? 'No' : value
      : value;
  }
  return kyc;
}

// API submissions are untrusted even when the browser renders a constrained
// date/select control. Normalize scalar values here and reject anything that
// could not be represented by the canonical field definition, so the task,
// profile and correction views can never disagree about a stored value.
function validateKycSubmission(answers, clientType, { includeEmpty = false } = {}) {
  const mapped = mapTaskAnswersToKyc(answers, clientType, { includeEmpty });
  const definitions = new Map(
    getKycFieldDefinitions(clientType).map((field) => [field.key, field])
  );
  const values = {};
  const errors = [];

  for (const [key, rawValue] of Object.entries(mapped)) {
    const field = definitions.get(key);
    if (!field) continue;
    if (typeof rawValue !== 'string') {
      errors.push(`${field.label} must be a text value`);
      continue;
    }

    const value = String(rawValue).trim();
    if (!value) {
      if (includeEmpty) values[key] = '';
      continue;
    }

    if (field.type === 'select' && Array.isArray(field.options) && !field.options.includes(value)) {
      errors.push(`${field.label} must be one of the configured options`);
      continue;
    }

    if (field.type === 'date') {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      const parsed = match
        ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
        : null;
      const isRealDate = parsed
        && parsed.getUTCFullYear() === Number(match[1])
        && parsed.getUTCMonth() === Number(match[2]) - 1
        && parsed.getUTCDate() === Number(match[3]);
      if (!isRealDate) {
        errors.push(`${field.label} must be a valid date in YYYY-MM-DD format`);
        continue;
      }
    }

    values[key] = value;
  }

  return { values, errors };
}

// Submission is deliberately stricter than HTML's `required` attribute: the
// business workflow requires every configured field to have a saved value,
// including fields that are optional only for gap/correction generation.
// Keeping this check beside the canonical schema prevents individual callers
// from quietly falling back to "required fields only" semantics.
// Only mandatory questions can be "missing". The questionnaire asks 104
// things; most of them are recorded if known and left blank if not, and
// treating every blank as an omission would make it unsubmittable.
function missingKycFieldDefinitions(values, clientType) {
  const source = values && typeof values === 'object' ? values : {};
  return getKycFieldDefinitions(clientType).filter(
    (field) => field.required && !String(source[field.key] ?? '').trim()
  );
}

module.exports = {
  KYC_SCHEMA_VERSION,
  REQUIRED_KYC_FIELDS,
  BUILT_IN_KYC_FIELDS,
  setActiveKycFields,
  getKycFieldDefinitions,
  buildKycSections,
  canonicalKycValues,
  mapTaskAnswersToKyc,
  validateKycSubmission,
  missingKycFieldDefinitions,
};
