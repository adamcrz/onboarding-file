// Mirrors REQUIRED_KYC_FIELDS in frontend/app.js — the same per-client-type
// obligatory KYC fields, with a page reference added so a detected gap can
// say where in the questionnaire it lives. Keep both lists in sync: this one
// drives the server-side completeness check (services/kycGapCheck.service.js),
// the frontend one drives the editable KYC form and its "missing" highlight.
const REQUIRED_KYC_FIELDS = {
  Individual: [
    { key: 'firstName',        label: 'First Name',            page: 'Page 1 — Personal Details' },
    { key: 'lastName',         label: 'Last Name',              page: 'Page 1 — Personal Details' },
    { key: 'dob',              label: 'Date of Birth',          page: 'Page 1 — Personal Details' },
    { key: 'nationality',      label: 'Nationality',            page: 'Page 1 — Personal Details' },
    { key: 'residency',        label: 'Residency',              page: 'Page 1 — Personal Details' },
    { key: 'taxResidency',     label: 'Tax Residency',          page: 'Page 2 — Tax & Identification' },
    { key: 'taxId',            label: 'Tax ID / SSN',           page: 'Page 2 — Tax & Identification' },
    { key: 'passportNumber',   label: 'Passport Number',        page: 'Page 2 — Tax & Identification' },
    { key: 'passportExpiry',   label: 'Passport Expiry',        page: 'Page 2 — Tax & Identification' },
    { key: 'address',          label: 'Address',                page: 'Page 2 — Tax & Identification' },
    { key: 'employmentStatus', label: 'Employment Status',      page: 'Page 3 — Financial Profile' },
    { key: 'occupation',       label: 'Occupation',              page: 'Page 3 — Financial Profile' },
    { key: 'annualIncome',     label: 'Annual Income',          page: 'Page 3 — Financial Profile' },
    { key: 'sourceOfWealth',   label: 'Source of Wealth',       page: 'Page 3 — Financial Profile' },
  ],
  Corporate: [
    { key: 'legalName',            label: 'Legal Name',              page: 'Page 1 — Entity Details' },
    { key: 'tradingName',          label: 'Trading Name',            page: 'Page 1 — Entity Details' },
    { key: 'registrationNumber',   label: 'Registration Number',     page: 'Page 1 — Entity Details' },
    { key: 'registrationDate',     label: 'Registration Date',       page: 'Page 1 — Entity Details' },
    { key: 'registrationCountry',  label: 'Registration Country',    page: 'Page 1 — Entity Details' },
    { key: 'jurisdiction',         label: 'Jurisdiction',            page: 'Page 1 — Entity Details' },
    { key: 'address',              label: 'Registered Address',      page: 'Page 1 — Entity Details' },
    { key: 'businessType',         label: 'Business Type',           page: 'Page 2 — Business Profile' },
    { key: 'industry',             label: 'Industry',                page: 'Page 2 — Business Profile' },
    { key: 'website',              label: 'Website',                 page: 'Page 2 — Business Profile' },
    { key: 'purpose',              label: 'Purpose of Account',      page: 'Page 2 — Business Profile' },
    { key: 'annualTurnover',       label: 'Annual Turnover',         page: 'Page 3 — Financial Profile' },
    { key: 'netAssets',            label: 'Net Assets',              page: 'Page 3 — Financial Profile' },
    { key: 'employees',            label: 'Employees',               page: 'Page 3 — Financial Profile' },
  ],
  Domiciliary: [
    { key: 'legalName',                   label: 'Legal Name',                     page: 'Page 1 — Entity Details' },
    { key: 'registrationNumber',          label: 'Registration Number',            page: 'Page 1 — Entity Details' },
    { key: 'registrationDate',            label: 'Registration Date',              page: 'Page 1 — Entity Details' },
    { key: 'registrationCountry',         label: 'Registration Country',           page: 'Page 1 — Entity Details' },
    { key: 'jurisdiction',                label: 'Jurisdiction',                   page: 'Page 1 — Entity Details' },
    { key: 'address',                     label: 'Registered Address',             page: 'Page 1 — Entity Details' },
    { key: 'purpose',                     label: 'Purpose of Account',             page: 'Page 2 — Beneficial Ownership' },
    { key: 'beneficialOwnerName',         label: 'Beneficial Owner Name',          page: 'Page 2 — Beneficial Ownership' },
    { key: 'beneficialOwnerNationality',  label: 'Beneficial Owner Nationality',   page: 'Page 2 — Beneficial Ownership' },
    { key: 'sourceOfWealth',              label: 'Source of Wealth',               page: 'Page 3 — Financial Profile' },
    { key: 'netAssets',                   label: 'Net Assets',                     page: 'Page 3 — Financial Profile' },
  ],
  Foundation: [
    { key: 'foundationName',       label: 'Foundation Name',                       page: 'Page 1 — Entity Details' },
    { key: 'registrationNumber',   label: 'Registration Number',                   page: 'Page 1 — Entity Details' },
    { key: 'registrationDate',     label: 'Registration Date',                     page: 'Page 1 — Entity Details' },
    { key: 'registrationCountry',  label: 'Registration Country',                  page: 'Page 1 — Entity Details' },
    { key: 'jurisdiction',         label: 'Jurisdiction',                          page: 'Page 1 — Entity Details' },
    { key: 'address',              label: 'Registered Address',                    page: 'Page 1 — Entity Details' },
    { key: 'purpose',              label: 'Purpose / Object of Foundation',        page: 'Page 2 — Beneficial Ownership' },
    { key: 'founderName',          label: 'Founder Name',                          page: 'Page 2 — Beneficial Ownership' },
    { key: 'beneficialOwnerName',  label: 'Beneficial Owner / Board Member Name',  page: 'Page 2 — Beneficial Ownership' },
    { key: 'sourceOfWealth',       label: 'Source of Wealth',                      page: 'Page 3 — Financial Profile' },
    { key: 'netAssets',            label: 'Net Assets',                            page: 'Page 3 — Financial Profile' },
  ],
  Trust: [
    { key: 'trustName',          label: 'Trust Name',                    page: 'Page 1 — Trust Details' },
    { key: 'trustDeedDate',      label: 'Trust Deed Date',               page: 'Page 1 — Trust Details' },
    { key: 'jurisdiction',       label: 'Jurisdiction',                  page: 'Page 1 — Trust Details' },
    { key: 'settlorName',        label: 'Settlor Name',                  page: 'Page 2 — Parties' },
    { key: 'settlorNationality', label: 'Settlor Nationality',           page: 'Page 2 — Parties' },
    { key: 'trusteeName',        label: 'Trustee Name',                  page: 'Page 2 — Parties' },
    { key: 'protectorName',      label: 'Protector Name (if appointed)', page: 'Page 2 — Parties' },
    { key: 'beneficiaries',      label: 'Beneficiaries',                 page: 'Page 2 — Parties' },
    { key: 'purpose',            label: 'Purpose of Trust',              page: 'Page 3 — Financial Profile' },
    { key: 'sourceOfWealth',     label: 'Source of Wealth',              page: 'Page 3 — Financial Profile' },
    { key: 'netAssets',          label: 'Net Assets',                    page: 'Page 3 — Financial Profile' },
  ],
};

// The KYC Task questionnaire (KYC_TEMPLATE in frontend/app.js) uses its own,
// more granular field ids (separate address lines, employer, PEP status, …).
// This maps the ones that correspond to a REQUIRED_KYC_FIELDS.Individual key
// so completing a KYC Task writes into the same shared client.kyc record
// instead of leaving answers stranded in KycTask.answers as a second, silently
// disconnected copy. Address is special-cased: several template fields
// combine into the single `address` string.
const KYC_TEMPLATE_FIELD_MAP = {
  f_firstname:    'firstName',
  f_lastname:     'lastName',
  f_dob:          'dob',
  f_nationality:  'nationality',
  f_country:      'residency',
  f_passport:     'passportNumber',
  f_passport_expiry: 'passportExpiry',
  f_tax_country:  'taxResidency',
  f_tin:          'taxId',
  f_emp_status:   'employmentStatus',
  f_occupation:   'occupation',
  f_income:       'annualIncome',
  f_sow:          'sourceOfWealth',
};
const KYC_TEMPLATE_ADDRESS_FIELDS = ['f_addr1', 'f_addr2', 'f_city', 'f_zip', 'f_ctry'];

// Folds a completed KYC Task's answers into the REQUIRED_KYC_FIELDS.Individual
// shape, ready to merge into client.kyc. Only touches keys it has a real
// mapping for — anything template-only (title, PEP, employer, …) stays in the
// task's own answers, it just isn't part of the obligatory-fields gap check.
function mapTaskAnswersToKyc(answers) {
  const kyc = {};
  for (const [templateKey, kycKey] of Object.entries(KYC_TEMPLATE_FIELD_MAP)) {
    if (answers[templateKey] !== undefined && answers[templateKey] !== '') kyc[kycKey] = answers[templateKey];
  }
  const addressParts = KYC_TEMPLATE_ADDRESS_FIELDS.map(k => answers[k]).filter(Boolean);
  if (addressParts.length) kyc.address = addressParts.join(', ');
  return kyc;
}

module.exports = { REQUIRED_KYC_FIELDS, mapTaskAnswersToKyc };
