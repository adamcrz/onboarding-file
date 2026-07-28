const path = require('path');
const fs   = require('fs');
const User = require('../models/User');
const ContractReview = require('../models/ContractReview');
const { sendClientInviteEmail } = require('../services/email.service');

const CONTRACTS_DIR = path.join(__dirname, '..');
const APPENDIX_DIR  = path.join(__dirname, '..', '..', 'Form A T S');

// Beneficial-owner identification appendix (Swiss VSB 20) — which form applies
// depends on the client's legal form: natural person (A), operating company (K),
// domiciliary company / foundation (S), or trust (T).
const APPENDICES = {
  individual: { letter: 'A', label: 'Individual',  files: { DE: 'Vermögensverwaltungsvertrag DE - Anhang Formulare A.docx',            EN: 'Vermögensverwaltungsvertrag EN - Anhang Formulare A.docx' } },
  company:    { letter: 'K', label: 'Company',      files: { DE: 'Vermögensverwaltungsvertrag DE - Anhang Formulare K.docx',            EN: 'Vermögensverwaltungsvertrag EN - Anhang Formulare K.docx' } },
  foundation: { letter: 'S', label: 'Foundation',   files: { DE: 'Vermögensverwaltungsvertrag DE - Anhang Formular S - Multi BO.docx',  EN: 'Vermögensverwaltungsvertrag EN - Anhang Formulare S - Mulit BO.docx' } },
  trust:      { letter: 'T', label: 'Trust',        files: { DE: 'Vermögensverwaltungsvertrag DE - Anhang Formular T - Multi (2).docx', EN: 'Vermögensverwaltungsvertrag EN - Anhang Formulare T - Multi BO.docx' } },
};

const TEMPLATES = [
  { id: 'de-all-in',      lang: 'DE', name: 'Vertragsset All-In',        type: 'All-In',                file: '2025_Vertragsset DE - AllesIN FINAL.docx' },
  { id: 'de-advisory',    lang: 'DE', name: 'Advisory Vertrag',           type: 'Advisory',              file: 'Vetragsset DE - Advisory Vertrag DE 2025.docx' },
  { id: 'en-disc-all-in', lang: 'EN', name: 'Discretionary All-In',       type: 'Discretionary All-In',  file: '2025_Vertragsset EN  Discretionary All-IN.docx' },
  { id: 'en-advisory',    lang: 'EN', name: 'Advisory Contract',          type: 'Advisory',              file: 'AdvisoryContract EN.docx' },
  { id: 'en-execution',   lang: 'EN', name: 'Execution Only',             type: 'Execution Only',        file: 'Execution only EN 02112023.docx' },
];

function standardFields(lang) {
  return lang === 'DE'
    ? [
        { key: 'client_last_name',   label: 'Nachname',                              type: 'text',  required: true  },
        { key: 'client_first_name',  label: 'Vorname',                               type: 'text',  required: true  },
        { key: 'client_email',       label: 'E-Mail-Adresse',                        type: 'email', required: true  },
        { key: 'client_dob',         label: 'Geburtsdatum',                          type: 'date',  required: true  },
        { key: 'client_address1',    label: 'Strasse und Hausnummer',                type: 'text',  required: true  },
        { key: 'client_address2',    label: 'Adresszusatz (optional)',               type: 'text',  required: false },
        { key: 'client_city',        label: 'Ort',                                   type: 'text',  required: true  },
        { key: 'client_country',     label: 'Land',                                  type: 'text',  required: true  },
        { key: 'client_nationality', label: 'Nationalität',                          type: 'text',  required: false },
        { key: 'contract_date',      label: 'Vertragsdatum',                         type: 'date',  required: true  },
        { key: 'depot_bank',         label: 'Depotbank',                             type: 'text',  required: false },
        { key: 'portfolio_number',   label: 'Portfolionummer',                       type: 'text',  required: false },
        { key: 'additional_category',label: 'Weitere Anlagekategorie (optional)',    type: 'text',  required: false },
      ]
    : [
        { key: 'client_last_name',   label: 'Last Name',                             type: 'text',  required: true  },
        { key: 'client_first_name',  label: 'First Name',                            type: 'text',  required: true  },
        { key: 'client_email',       label: 'Client Email Address',                  type: 'email', required: true  },
        { key: 'client_dob',         label: 'Date of Birth',                         type: 'date',  required: true  },
        { key: 'client_address1',    label: 'Street Address',                        type: 'text',  required: true  },
        { key: 'client_address2',    label: 'Address Line 2 (optional)',             type: 'text',  required: false },
        { key: 'client_city',        label: 'City',                                  type: 'text',  required: true  },
        { key: 'client_country',     label: 'Country',                               type: 'text',  required: true  },
        { key: 'client_nationality', label: 'Nationality',                           type: 'text',  required: false },
        { key: 'contract_date',      label: 'Contract Date',                         type: 'date',  required: true  },
        { key: 'depot_bank',         label: 'Custodian Bank',                        type: 'text',  required: false },
        { key: 'portfolio_number',   label: 'Portfolio Number',                      type: 'text',  required: false },
        { key: 'additional_category',label: 'Additional Investment Category (opt.)', type: 'text',  required: false },
      ];
}

exports.getTemplates = (_req, res) => {
  res.json(TEMPLATES.map(({ id, lang, name, type }) => ({ id, lang, name, type })));
};

function findAppendixFile(clientType, lang) {
  const appendix = APPENDICES[clientType];
  if (!appendix) return null;
  const file = appendix.files[lang];
  if (!file) return null;
  return { appendix, filePath: path.join(APPENDIX_DIR, file), fileName: file };
}

exports.previewAppendix = async (req, res) => {
  const found = findAppendixFile(req.params.clientType, req.params.lang);
  if (!found) return res.status(404).json({ error: 'No appendix for this client type / language' });
  if (!fs.existsSync(found.filePath)) return res.status(404).json({ error: 'File not found on disk' });

  try {
    const mammoth = require('mammoth');
    const { value: html } = await mammoth.convertToHtml({ path: found.filePath });
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>Formular ${found.appendix.letter}</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; max-width: 820px; margin: 40px auto;
               padding: 0 32px 60px; line-height: 1.7; color: #1a1a1a; font-size: 13px; }
        h1,h2,h3 { color: #111; } p { margin: 0.5em 0; }
        table { border-collapse: collapse; width: 100%; margin: 8px 0; }
        td, th { border: 1px solid #d1d5db; padding: 6px 10px; }
      </style>
    </head><body>${html}</body></html>`;
    res.json({ html: fullHtml, name: `Formular ${found.appendix.letter}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.downloadAppendix = (req, res) => {
  const found = findAppendixFile(req.params.clientType, req.params.lang);
  if (!found) return res.status(404).json({ error: 'No appendix for this client type / language' });
  if (!fs.existsSync(found.filePath)) return res.status(404).json({ error: 'File not found on disk' });
  res.download(found.filePath, found.fileName);
};

exports.downloadTemplate = (req, res) => {
  const template = TEMPLATES.find(t => t.id === req.params.templateId);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  const filePath = path.join(CONTRACTS_DIR, template.file);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });
  res.download(filePath, template.file);
};

exports.getPlaceholders = async (req, res) => {
  const template = TEMPLATES.find(t => t.id === req.params.templateId);
  if (!template) return res.status(404).json({ error: 'Template not found' });

  const base     = standardFields(template.lang);
  const filePath = path.join(CONTRACTS_DIR, template.file);
  if (!fs.existsSync(filePath)) {
    return res.json({ templateId: template.id, lang: template.lang, fields: base, bookmarks: [] });
  }

  try {
    const mammoth = require('mammoth');
    const PizZip  = require('pizzip');

    // Extract bookmark names from the docx XML
    const content = fs.readFileSync(filePath, 'binary');
    const zip     = new PizZip(content);
    const docXml  = zip.files['word/document.xml']?.asText() || '';
    const bmRe    = /<w:bookmarkStart\b[^/]*\/>/g;
    const bookmarks = [];
    let bm;
    while ((bm = bmRe.exec(docXml)) !== null) {
      const nameM = bm[0].match(/w:name="([^"]+)"/);
      if (nameM && !nameM[1].startsWith('_')) bookmarks.push(nameM[1]);
    }
    // Some templates (the EN ones) have no FormularLetter bookmark but do have the
    // plain-text "(Form X)" heading applyFormularLetterToXml can still swap — report
    // it the same way so the frontend knows the letter selector actually does something.
    if (!bookmarks.includes('FormularLetter') && hasPlainTextFormularMarker(docXml)) {
      bookmarks.push('FormularLetter');
    }
    const uniqueBookmarks = [...new Set(bookmarks)].sort();
    console.log(`[${template.id}] Bookmarks found:`, uniqueBookmarks);

    const { value: text } = await mammoth.extractRawText({ path: filePath });

    const checkboxes = [...new Set(
      [...text.matchAll(/[☐□]\s*([^\n☐□]{2,80})/g)]
        .map(m => m[1].trim())
        .filter(v => v.length >= 2 && !v.match(/^\d+$/))
    )]
      .slice(0, 25)
      .map(label => ({
        key:      'chk_' + label.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'').slice(0,40),
        label,
        type:     'checkbox',
        required: false,
      }))
      .filter((f, i, arr) => arr.findIndex(x => x.key === f.key) === i);

    res.json({ templateId: template.id, lang: template.lang, fields: [...base, ...checkboxes], bookmarks: uniqueBookmarks });
  } catch (_) {
    res.json({ templateId: template.id, lang: template.lang, fields: base, bookmarks: [] });
  }
};

// Escapes a string for safe insertion into XML text content.
function escXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Builds a map from the exact placeholder text that appears in the .docx files
// to the replacement value from the form. The templates use Word bookmarks whose
// visible text matches the bookmark name (e.g. "NachundVorname", "Adresse1", …).
function buildReplacementMap(fieldValues, _fieldDefs) {
  const fv   = fieldValues || {};
  const isUO = fv.uo_vertrag === 'true';

  // Person 1
  const lastName1  = fv.client_last_name  || '';
  const firstName1 = fv.client_first_name || '';
  const fullName1  = [firstName1, lastName1].filter(Boolean).join(' ');

  // Person 2 (U/O Vertrag)
  const lastName2  = fv.p2_last_name  || '';
  const firstName2 = fv.p2_first_name || '';
  const fullName2  = [firstName2, lastName2].filter(Boolean).join(' ');

  // Contract-heading name: "Person1" or "Person1 u/o Person2"
  const contractName = (isUO && fullName2) ? `${fullName1} u/o ${fullName2}` : fullName1;

  const addr1        = fv.client_address1    || fv.client_address || '';
  const addr2        = fv.client_address2    || '';
  const city1        = fv.client_city        || '';
  const country1     = fv.client_country     || '';
  const nationality1 = fv.client_nationality || '';
  const dob1         = fv.client_dob         || '';
  const contractDate = fv.contract_date      || '';
  const depotBank    = fv.depot_bank         || '';
  const portfolioNo  = fv.portfolio_number   || '';

  const cityDate = [city1, contractDate].filter(Boolean).join(', ');
  const fullAddr  = [addr1, addr2, city1, country1].filter(Boolean).join(', ');

  const map = {};

  // NachundVorname (contract heading) — mandatsname takes priority, falls back to auto-computed contractName
  const headingName = (fv.mandatsname && fv.mandatsname.trim()) ? fv.mandatsname.trim() : contractName;
  if (headingName) {
    ['NachundVorname','NachundVorname1','NachundVorname2','NachundVorname3',
     'NachundVorname4','NachundVorname5','NachundVorname7','NachundVorname8',
     'NachundVorname9','NachundVorname10','NachnameVorname',
    ].forEach(k => { map[k] = headingName; });
  }

  // Person 1 name
  if (lastName1)  map['Nachname'] = lastName1;
  if (firstName1) map['Vorname']  = firstName1;

  // Person 2 name (Form A row 2) — empty if not U/O
  map['Nachname1'] = isUO ? lastName2  : '';
  map['Vorname1']  = isUO ? firstName2 : '';

  // Person 1 address — main fields + Form A row 1 (Adresse11) + other pages (Adresse13)
  if (addr1) { map['Adresse1'] = addr1; map['Adresse11'] = addr1; map['Adresse13'] = addr1; }
  if (addr2) { map['Adresse2'] = addr2; map['Adresse21'] = addr2; map['Adresse23'] = addr2; }
  if (fullAddr) map['Adresse'] = fullAddr;
  if (city1)    { map['Ort'] = city1;    map['Ort1'] = city1;    map['Ort3'] = city1;    }
  if (country1) { map['Land'] = country1; map['Land1'] = country1; map['Land3'] = country1; }

  // Person 2 address (Form A row 2) — empty if not U/O
  map['Adresse12'] = isUO ? (fv.p2_address1 || '') : '';
  map['Adresse22'] = isUO ? (fv.p2_address2 || '') : '';
  map['Ort2']      = isUO ? (fv.p2_city    || '') : '';
  map['Land2']     = isUO ? (fv.p2_country  || '') : '';

  // Signature-block place/date line
  if (cityDate) map['Ort/Datum'] = cityDate;

  // Person 1 personal details
  if (dob1)         { map['Birth'] = dob1;          }
  if (nationality1) { map['Nat']   = nationality1;  map['Nat.'] = nationality1; map['Nationality'] = nationality1; }

  // Person 2 personal details — empty if not U/O
  map['Birth1'] = isUO ? (fv.p2_dob         || '') : '';
  map['Nat1']   = isUO ? (fv.p2_nationality || '') : '';

  // Contract details
  if (depotBank)   map['Depotbank']        = depotBank;
  if (portfolioNo) { map['Portfolionummer'] = portfolioNo; map['Portfolionummer1'] = portfolioNo; }

  // Fees — actual bookmark names in templates: Fee, Perf
  const mgmtFee = fv.management_fee  ? fv.management_fee  + '%' : '';
  const perfFee = fv.performance_fee ? fv.performance_fee + '%' : '';
  if (mgmtFee) map['Fee']  = mgmtFee;
  if (perfFee) map['Perf'] = perfFee;

  // Portfolio currency — bookmark: Currency
  const ccy = fv.portfolio_currency || '';
  if (ccy) map['Currency'] = ccy;

  // Kundenberater
  if (fv.kundenberater_name)  { map['Kundenberater'] = fv.kundenberater_name;  map['RM'] = fv.kundenberater_name;  }
  if (fv.kundenberater_email) { map['KundenberaterEmail'] = fv.kundenberater_email; map['RMEmail'] = fv.kundenberater_email; }

  // Further instructions — bookmark: Furtherinstructions
  const comments = fv.investment_comments || '';
  if (comments) map['Furtherinstructions'] = comments;

  // Asset allocations — bookmarks hold the MAX value; the MIN goes into the hardcoded "0"
  // cell immediately before each bookmark (handled by applyAllocMinToXml below).
  // Bookmark names: Equity (DE) / Equtiy (EN typo), Bonds, Cash, Alt
  const pctVal = v => (v !== undefined && v !== '') ? v + '%' : '';
  if (fv.alloc_equities_max)     { map['Equity'] = pctVal(fv.alloc_equities_max); map['Equtiy'] = pctVal(fv.alloc_equities_max); }
  if (fv.alloc_fixed_income_max) map['Bonds'] = pctVal(fv.alloc_fixed_income_max);
  if (fv.alloc_cash_max)         map['Cash']  = pctVal(fv.alloc_cash_max);
  if (fv.alloc_other_max)        map['Alt']   = pctVal(fv.alloc_other_max);

  // Currency weights — bookmark holds MAX; "0" cell gets MIN (via applyAllocMinToXml).
  // Only fill currencies where at least one of min/max is non-zero; otherwise clear bookmark.
  const ccyActive = (minK, maxK) => parseFloat(fv[minK]) > 0 || parseFloat(fv[maxK]) > 0;
  map['CHF'] = pctVal(fv.ccy_chf_max);  // CHF always shown (main reference currency)
  map['EUR'] = ccyActive('ccy_eur_min','ccy_eur_max') ? pctVal(fv.ccy_eur_max) : '';
  map['USD'] = ccyActive('ccy_usd_min','ccy_usd_max') ? pctVal(fv.ccy_usd_max) : '';
  map['GBP'] = ccyActive('ccy_gbp_min','ccy_gbp_max') ? pctVal(fv.ccy_gbp_max) : '';
  map['AUD'] = ccyActive('ccy_aud_min','ccy_aud_max') ? pctVal(fv.ccy_aud_max) : '';

  // Additional investment category (last row of the investment table) — bookmark: And
  if (fv.additional_category) map['And'] = fv.additional_category;

  return map;
}

// Toggles the "New Contract" / "Replaces the existing Contract" cover-page toggle.
// These are native Word checkbox content controls (<w:sdt> + <w14:checkbox>), not
// plain "☐ Label" text — the label is a separate run that follows the control, so a
// literal-text replace (the previous approach) never matches anything. Both the
// stored checked state and the displayed glyph run have to be updated for the
// change to actually show.
const CONTRACT_TYPE_LABELS = {
  new:     ['new contract', 'neuer vertrag'],
  replace: ['replaces the existing contract', 'replaces existing contract', 'ersetzt den bestehenden vertrag'],
};

function applyContractTypeCheckboxToXml(xml, fieldValues) {
  const isNew = (fieldValues || {}).contract_type !== 'replace';
  const sdtRe = /<w:sdt>[\s\S]*?<\/w:sdt>/g;
  const edits = [];
  let m;
  while ((m = sdtRe.exec(xml)) !== null) {
    const block = m[0];
    if (!block.includes('<w14:checkbox>')) continue;

    const blockEnd = m.index + block.length;
    const pEnd = xml.indexOf('</w:p>', blockEnd);
    let after = pEnd >= 0 ? xml.slice(blockEnd, pEnd) : xml.slice(blockEnd, blockEnd + 500);
    const nextSdt = after.indexOf('<w:sdt>');
    if (nextSdt >= 0) after = after.slice(0, nextSdt);
    const label = [...after.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map(x => x[1]).join('').trim().toLowerCase();
    if (!label) continue;

    let shouldCheck = null;
    if (CONTRACT_TYPE_LABELS.new.some(l => label.includes(l)))          shouldCheck = isNew;
    else if (CONTRACT_TYPE_LABELS.replace.some(l => label.includes(l))) shouldCheck = !isNew;
    if (shouldCheck === null) continue;

    let newBlock = block.replace(/<w14:checked w14:val="\d+"\/>/, `<w14:checked w14:val="${shouldCheck ? 1 : 0}"/>`);
    newBlock = newBlock.replace(/(<w:sdtContent>[\s\S]*?<w:t[^>]*>)[^<]*(<\/w:t>)/, `$1${shouldCheck ? '☒' : '☐'}$2`);
    edits.push({ start: m.index, end: blockEnd, text: newBlock });
  }
  for (let i = edits.length - 1; i >= 0; i--) {
    xml = xml.slice(0, edits[i].start) + edits[i].text + xml.slice(edits[i].end);
  }
  return xml;
}

// Replaces placeholder text inside a Word XML string using Word bookmarks as
// anchors. Each placeholder in the templates is wrapped in a bookmark whose
// w:name matches the placeholder text (e.g. w:name="NachundVorname"). This
// approach handles both single-run and split-run placeholders, and also handles
// multiple placeholders in the same paragraph (e.g. "Adresse1 Adresse2").
//
// Processing order: last-to-first so string indices stay valid as we modify.
function applyReplacementsToXml(xml, replacements) {
  if (!Object.keys(replacements).length) return xml;

  // Collect all bookmarkStart elements whose name matches a replacement key.
  const bookmarks = [];
  const bmStartRe = /<w:bookmarkStart\b[^/]*\/>/g;
  let m;
  while ((m = bmStartRe.exec(xml)) !== null) {
    const nameM = m[0].match(/w:name="([^"]+)"/);
    const idM   = m[0].match(/w:id="(\d+)"/);
    if (!nameM || !idM) continue;
    const name  = nameM[1];
    const id    = idM[1];
    const value = replacements[name];
    if (!value) continue;

    // Find the matching bookmarkEnd tag
    const endRe    = new RegExp(`<w:bookmarkEnd\\b[^>]*w:id="${id}"[^>]*/>`);
    const endMatch = endRe.exec(xml.slice(m.index));
    if (!endMatch) continue;

    bookmarks.push({
      // content region: from end of bookmarkStart tag to start of bookmarkEnd tag
      contentStart: m.index + m[0].length,
      contentEnd:   m.index + endMatch.index,
      value,
    });
  }

  if (!bookmarks.length) return xml;

  // Process from last to first so earlier offsets stay valid
  bookmarks.sort((a, b) => b.contentStart - a.contentStart);

  bookmarks.forEach(bm => {
    const segment = xml.slice(bm.contentStart, bm.contentEnd);

    // Replace text runs inside this bookmark: first <w:t> gets the value, rest are emptied
    let firstDone = false;
    const newSegment = segment.replace(/<w:t[^>]*>[^<]*<\/w:t>/g, () => {
      if (!firstDone) {
        firstDone = true;
        return `<w:t xml:space="preserve">${escXml(bm.value)}</w:t>`;
      }
      return '<w:t></w:t>';
    });

    xml = xml.slice(0, bm.contentStart) + newSegment + xml.slice(bm.contentEnd);
  });

  return xml;
}

// Replaces the hardcoded "0" cell that sits immediately before each allocation/currency
// bookmark with the corresponding minimum (Bandbreiten) value. The templates have the
// structure: [cell "0"] [cell "-"] [cell bookmark-MAX], so the bookmark holds the max
// and the "0" cell needs the min injected directly into its XML text run.
function applyAllocMinToXml(xml, fieldValues) {
  const fv = fieldValues || {};
  const ccyActive = (minK, maxK) => parseFloat(fv[minK]) > 0 || parseFloat(fv[maxK]) > 0;
  const targets = [
    // Asset classes — always show the min value (0% is meaningful, e.g. "0% – 15%")
    { bm: 'Equity', min: fv.alloc_equities_min,     suppress: false },
    { bm: 'Equtiy', min: fv.alloc_equities_min,     suppress: false },  // EN template typo
    { bm: 'Bonds',  min: fv.alloc_fixed_income_min, suppress: false },
    { bm: 'Cash',   min: fv.alloc_cash_min,          suppress: false },
    { bm: 'Alt',    min: fv.alloc_other_min,         suppress: false },
    // Currencies — suppress (clear "0" cell) when both min+max are zero
    { bm: 'CHF', min: fv.ccy_chf_min, suppress: false },  // CHF always shown
    { bm: 'EUR', min: fv.ccy_eur_min, suppress: !ccyActive('ccy_eur_min','ccy_eur_max') },
    { bm: 'USD', min: fv.ccy_usd_min, suppress: !ccyActive('ccy_usd_min','ccy_usd_max') },
    { bm: 'GBP', min: fv.ccy_gbp_min, suppress: !ccyActive('ccy_gbp_min','ccy_gbp_max') },
    { bm: 'AUD', min: fv.ccy_aud_min, suppress: !ccyActive('ccy_aud_min','ccy_aud_max') },
  ];

  // Track replaced bookmarks so we don't double-replace the typo pair
  const done = new Set();

  targets.forEach((target) => {
    const { bm, min, suppress } = target;
    if (!suppress && (min === undefined || min === '')) return;
    if (done.has(bm)) return;

    const bmIdx = xml.indexOf(`w:name="${bm}"`);
    if (bmIdx === -1) return;

    // Find the <w:tc> containing this bookmark, then step back 2 cells
    const bmCell   = xml.lastIndexOf('<w:tc>', bmIdx);
    const dashCell = xml.lastIndexOf('<w:tc>', bmCell - 1);
    const minCell  = xml.lastIndexOf('<w:tc>', dashCell - 1);
    if (minCell === -1) return;

    // Safety: the middle cell must contain only "-" — prevents corrupting other content
    const dashCellEnd = xml.indexOf('</w:tc>', dashCell);
    const dashText = xml.slice(dashCell, dashCellEnd).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (dashText !== '-') return;

    const minCellEnd = xml.indexOf('</w:tc>', minCell) + '</w:tc>'.length;
    const minCellXml = xml.slice(minCell, minCellEnd);

    // Replace the "0" cell: empty string if suppressed (both values 0), else min%
    const minText = target.suppress
      ? ''
      : ((min !== undefined && min !== '') ? min + '%' : '');
    const newMinCellXml = minCellXml.replace(
      /<w:t[^>]*>[^<]*<\/w:t>/,
      `<w:t xml:space="preserve">${escXml(minText)}</w:t>`
    );

    if (newMinCellXml !== minCellXml) {
      xml = xml.slice(0, minCell) + newMinCellXml + xml.slice(minCellEnd);
      done.add(bm);
      // If we just handled Equity, mark Equtiy as done too (same cell)
      if (bm === 'Equity') done.add('Equtiy');
      if (bm === 'Equtiy') done.add('Equity');
    }
  });

  return xml;
}

// Performance-fee settlement clause (§7.2 in the DE/EN "Discretionary All-In" templates).
// The templates contain BOTH wordings as separate paragraphs, each wrapped in its own
// bookmark ("PerfClauseAnnual" / "PerfClauseSemi"). Exactly one is shown per generated
// contract: whichever the fee-settlement toggle selects (default: semiannual/halbjährlich);
// the other is blanked out. Templates without these bookmarks (Advisory, Execution Only)
// are left untouched.
const PERF_CLAUSE_TEXT = {
  DE: {
    annual: pct => `Der Vermögensverwalter hat Anspruch auf eine jährliche Performance-Gebühr in Höhe von ${pct} p.a. (zuzüglich der jeweils anwendbaren Mehrwertsteuer) der Nettokapitalzunahme. Die Nettokapitalzunahme berechnet sich aus der Wertsteigerung des Portfolios unter Berücksichtigung von Einzahlungen und Rücknahmen sowie Zins- und Dividendengutschriften, abzüglich der Vermögensverwaltungsgebühr, Bankspesen, Steuern und sonstiger Abgaben. Die Abrechnung erfolgt jährlich, jeweils zum 30.11., unter Anwendung einer High-Water-Mark-Methode. Die Performance-Gebühr von ${pct} wird ausschließlich auf den Teil der Nettokapitalzunahme bis zur Höhe von ${pct} p.a der zuvor maßgeblichen High-Water-Mark erhoben. Ein etwaiger Kapitalzuwachs über diesen Schwellenwert hinaus bleibt von der Performance-Gebühr unberührt.`,
    semiannual: pct => `Der Vermögensverwalter hat Anspruch auf eine jährliche Performance-Gebühr in Höhe von ${pct} p.a. (zzgl. der jeweils anwendbaren Mehrwertsteuer) der Nettokapitalzunahme. Die Nettokapitalzunahme berechnet sich aus der Wertsteigerung des Portfolios unter Berücksichtigung von Einzahlungen und Rücknahmen sowie Zins- und Dividendengutschriften, abzüglich der Vermögensverwaltungsgebühr, Bankspesen, Steuern und sonstiger Abgaben. Die Abrechnung erfolgt halbjährlich, jeweils zum 30.06. und 31.12., unter Anwendung einer High-Water-Mark-Methode. Die ersten Vorab p.a. der Wertsteigerung oberhalb der High-Water-Mark gelten als sogenannte „Hurdle Rate“.`,
  },
  EN: {
    annual: pct => `The Asset Manager is entitled to an annual performance fee of ${pct} p.a. (plus the applicable VAT) of the net capital growth. The net capital growth is calculated from the increase in value of the portfolio, taking into account deposits and redemptions as well as interest and dividend credits, less the asset management fee, bank charges, taxes and other levies. Settlement takes place annually, on November 30, using a high-water mark method. The performance fee of ${pct} is charged exclusively on the portion of the net capital growth up to the level of ${pct} p.a. of the previously applicable high-water mark. Any capital growth exceeding this threshold shall not be subject to the performance fee.`,
    semiannual: pct => `The Asset Manager is entitled to an annual performance fee of ${pct} p.a. (plus the applicable VAT) of the net capital growth. The net capital growth is calculated from the increase in value of the portfolio, taking into account deposits and redemptions as well as interest and dividend credits, less the asset management fee, bank charges, taxes and other levies. Settlement takes place every six months, on June 30 and December 31, using a high-water mark method. The first Vorab p.a. of the increase in value above the high-water mark is deemed to be the hurdle rate.`,
  },
};

// Sets the full text of a bookmarked region unconditionally (unlike applyReplacementsToXml,
// this also blanks the region when `text` is empty — used to hide the non-selected clause).
function setBookmarkText(xml, name, text) {
  const startIdx = xml.indexOf(`w:name="${name}"`);
  if (startIdx === -1) return xml;
  const tagStart = xml.lastIndexOf('<w:bookmarkStart', startIdx);
  const bmStartTagEnd = xml.indexOf('/>', startIdx) + 2;
  const idM = xml.slice(tagStart, bmStartTagEnd).match(/w:id="(\d+)"/);
  if (!idM) return xml;
  const endRe = new RegExp(`<w:bookmarkEnd\\b[^>]*w:id="${idM[1]}"[^>]*/>`);
  const endMatch = endRe.exec(xml.slice(bmStartTagEnd));
  if (!endMatch) return xml;
  const contentStart = bmStartTagEnd;
  const contentEnd = bmStartTagEnd + endMatch.index;
  const segment = xml.slice(contentStart, contentEnd);

  let firstDone = false;
  const newSegment = segment.replace(/<w:t[^>]*>[^<]*<\/w:t>/g, () => {
    if (!firstDone) {
      firstDone = true;
      return `<w:t xml:space="preserve">${escXml(text)}</w:t>`;
    }
    return '<w:t></w:t>';
  });

  return xml.slice(0, contentStart) + newSegment + xml.slice(contentEnd);
}

function applyPerformanceFeeClauseToXml(xml, fieldValues, lang) {
  if (!xml.includes('w:name="PerfClauseAnnual"')) return xml; // template has no toggleable clause
  const fv = fieldValues || {};
  const pct = fv.performance_fee ? fv.performance_fee + '%' : 'Perf';
  const freq = fv.performance_fee_frequency === 'annual' ? 'annual' : 'semiannual';
  const texts = PERF_CLAUSE_TEXT[lang] || PERF_CLAUSE_TEXT.DE;

  xml = setBookmarkText(xml, 'PerfClauseAnnual', freq === 'annual'     ? texts.annual(pct)     : '');
  xml = setBookmarkText(xml, 'PerfClauseSemi',   freq === 'semiannual' ? texts.semiannual(pct) : '');
  return xml;
}

// Flags the performance-fee clause in red in the PREVIEW ONLY when Jährlich (annual)
// is selected, since Halbjährlich (semiannual) is the standard default — annual is the
// deviation worth calling out to the reviewer. The generated .docx keeps normal text.
function highlightPerfClauseInPreviewHtml(html, fieldValues, lang) {
  const fv = fieldValues || {};
  if (fv.performance_fee_frequency !== 'annual') return html;
  const pct = fv.performance_fee ? fv.performance_fee + '%' : 'Perf';
  const texts = PERF_CLAUSE_TEXT[lang] || PERF_CLAUSE_TEXT.DE;
  const clause = texts.annual(pct);
  if (!html.includes(clause)) return html;
  return html.replace(clause, `<span style="color:#dc2626;">${clause}</span>`);
}

// Fallback for templates where "(Form(ular) X)" has no bookmark at all — the DE
// templates wrap the letter in a "FormularLetter" bookmark (handled by
// setBookmarkText above), but the EN templates split it across plain runs with
// nothing to anchor to: <w:t>(Form</w:t> ... <w:t> </w:t> ... <w:t>A)</w:t>.
// Finds the run right after the literal "(Form" run whose text contains ")" and
// replaces its content with the new letter.
function hasPlainTextFormularMarker(xml) {
  return /<w:t[^>]*>\(Form<\/w:t>/.test(xml);
}

function setPlainTextFormularLetter(xml, letter) {
  const markerRe = /<w:t[^>]*>\(Form<\/w:t>/;
  const markerMatch = markerRe.exec(xml);
  if (!markerMatch) return xml;

  const tRe = /<w:t([^>]*)>([^<]*)<\/w:t>/g;
  tRe.lastIndex = markerMatch.index + markerMatch[0].length;
  let m;
  while ((m = tRe.exec(xml)) !== null) {
    if (m[2].includes(')')) {
      return xml.slice(0, m.index) + `<w:t${m[1]}>${escXml(letter)})</w:t>` + xml.slice(m.index + m[0].length);
    }
  }
  return xml;
}

// Swaps the "(Formular A)" / "(Form A)" heading in the embedded beneficial-owner
// declaration to match the client's legal form (A/K/S/T) — see APPENDICES above.
function applyFormularLetterToXml(xml, fieldValues) {
  const hasBookmark  = xml.includes('w:name="FormularLetter"');
  const hasPlainText = hasPlainTextFormularMarker(xml);
  if (!hasBookmark && !hasPlainText) return xml; // template has no embedded Formular section

  const clientType = (fieldValues || {}).client_type;
  const letter = APPENDICES[clientType]?.letter || 'A';
  if (hasBookmark) xml = setBookmarkText(xml, 'FormularLetter', `${letter})`);
  if (hasPlainText) xml = setPlainTextFormularLetter(xml, letter);
  return xml;
}

function buildCheckboxReplacements(fieldValues, fieldDefs) {
  const map = {};
  (fieldDefs || []).filter(f => f.type === 'checkbox').forEach(f => {
    const checked = fieldValues[f.key] === 'true';
    map['☐ ' + f.label] = (checked ? '☑' : '☐') + ' ' + f.label;
    map['□ ' + f.label] = (checked ? '☑' : '□') + ' ' + f.label;
  });
  return map;
}

exports.previewContract = async (req, res) => {
  const template = TEMPLATES.find(t => t.id === req.params.templateId);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  const filePath = path.join(CONTRACTS_DIR, template.file);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

  try {
    const mammoth = require('mammoth');
    const PizZip  = require('pizzip');
    const { fieldValues = {}, fieldDefs = [] } = req.body;
    const replacements = buildReplacementMap(fieldValues, fieldDefs);

    // Apply replacements to the docx XML before converting to HTML
    const content = fs.readFileSync(filePath, 'binary');
    const zip = new PizZip(content);
    ['word/document.xml'].forEach(xmlFile => {
      if (!zip.files[xmlFile]) return;
      let xml = applyReplacementsToXml(zip.files[xmlFile].asText(), replacements);
      xml = applyAllocMinToXml(xml, fieldValues);
      xml = applyPerformanceFeeClauseToXml(xml, fieldValues, template.lang);
      xml = applyFormularLetterToXml(xml, fieldValues);
      xml = applyContractTypeCheckboxToXml(xml, fieldValues);
      zip.file(xmlFile, xml);
    });

    const buffer = zip.generate({ type: 'nodebuffer' });
    const { value: html } = await mammoth.convertToHtml({ buffer });

    // Highlight any remaining unfilled placeholders in red
    const knownPlaceholders = [
      'NachundVorname','Adresse1','Adresse2','Adresse','Ort','Land',
      'Depotbank','Portfolionummer','Birth','Nat','Nationality',
      'Nachname','Vorname','Ort/Datum',
    ];
    let processed = html;
    knownPlaceholders
      .filter(p => !replacements[p])
      .forEach(p => {
        const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        processed = processed.replace(
          new RegExp(`\\b${esc}\\b`, 'g'),
          `<mark style="background:#fecaca;padding:1px 4px;border-radius:2px;">${p}</mark>`
        );
      });

    // Apply checkbox state in preview (contract type toggle is already baked into
    // the XML above, before the mammoth conversion, since it's a native checkbox
    // content control rather than replaceable text)
    const checkboxMap = buildCheckboxReplacements(fieldValues, fieldDefs);
    Object.entries(checkboxMap).forEach(([from, to]) => {
      const esc = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const isChecked = to.startsWith('☑');
      processed = processed.replace(
        new RegExp(esc, 'g'),
        isChecked
          ? `<mark style="background:#bbf7d0;padding:1px 4px;border-radius:2px;font-weight:600;">${to}</mark>`
          : to
      );
    });

    processed = highlightPerfClauseInPreviewHtml(processed, fieldValues, template.lang);

    const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>${template.name}</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; max-width: 820px; margin: 40px auto;
               padding: 0 32px 60px; line-height: 1.7; color: #1a1a1a; font-size: 13px; }
        h1,h2,h3 { color: #111; } p { margin: 0.5em 0; }
        table { border-collapse: collapse; width: 100%; margin: 8px 0; }
        td, th { border: 1px solid #d1d5db; padding: 6px 10px; }
      </style>
    </head><body>${processed}</body></html>`;

    res.json({ html: fullHtml, name: template.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.generateContract = async (req, res) => {
  const template = TEMPLATES.find(t => t.id === req.params.templateId);
  if (!template) return res.status(404).json({ error: 'Template not found' });
  const filePath = path.join(CONTRACTS_DIR, template.file);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

  try {
    const PizZip = require('pizzip');
    const { fieldValues = {}, fieldDefs = [] } = req.body;
    const replacements = buildReplacementMap(fieldValues, fieldDefs);

    const content = fs.readFileSync(filePath, 'binary');
    const zip = new PizZip(content);
    const checkboxMap = buildCheckboxReplacements(fieldValues, fieldDefs);

    ['word/document.xml','word/header1.xml','word/footer1.xml','word/header2.xml','word/footer2.xml']
      .forEach(xmlFile => {
        if (!zip.files[xmlFile]) return;
        let xml = applyReplacementsToXml(zip.files[xmlFile].asText(), replacements);
        xml = applyAllocMinToXml(xml, fieldValues);
        xml = applyPerformanceFeeClauseToXml(xml, fieldValues, template.lang);
        xml = applyFormularLetterToXml(xml, fieldValues);
        xml = applyContractTypeCheckboxToXml(xml, fieldValues);
        // Apply checkbox state
        Object.entries(checkboxMap).forEach(([from, to]) => {
          const esc = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          xml = xml.replace(new RegExp(esc, 'g'), to);
        });
        zip.file(xmlFile, xml);
      });

    const buffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    res.setHeader('Content-Disposition', `attachment; filename="${template.file}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Creates/updates the client's portal login and emails them their OTP invite.
// Shared by the direct-invite endpoint and the Contract Reviews approval flow.
async function createClientInviteAndEmail(clientName, clientEmail, templateId) {
  const template = TEMPLATES.find(t => t.id === templateId);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const otp   = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

  let user = await User.findOne({ email: clientEmail.toLowerCase() });
  if (user) {
    user.name = clientName;
    user.password = otp;
    user.isEmailVerified = true;
    user.role = 'client';
    await user.save();
  } else {
    user = new User({ name: clientName, email: clientEmail.toLowerCase(),
                      password: otp, role: 'client', isEmailVerified: true });
    await user.save();
  }

  await sendClientInviteEmail(clientEmail, clientName, otp, template?.name || templateId);
  return otp;
}

exports.sendInvite = async (req, res) => {
  const { clientName, clientEmail, templateId } = req.body;
  if (!clientEmail || !clientName) {
    return res.status(400).json({ error: 'Client name and email are required' });
  }

  try {
    const otp = await createClientInviteAndEmail(clientName, clientEmail, templateId);
    res.json({ success: true, message: `Invitation sent to ${clientEmail}`, otp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ============================================================
   CONTRACT REVIEWS — RM submits a built contract package to
   Compliance for approval before the client is invited.
   ============================================================ */
exports.submitContractReview = async (req, res) => {
  const {
    templateId, templateName, lang, clientName, clientEmail,
    fieldValues, kycDelegation, rmName, rmEmail,
  } = req.body;

  if (!clientEmail || !clientName) {
    return res.status(400).json({ error: 'Client name and email are required' });
  }

  try {
    const review = await ContractReview.create({
      templateId, templateName, lang, clientName, clientEmail,
      fieldValues, kycDelegation, rmName, rmEmail,
    });
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listContractReviews = async (_req, res) => {
  try {
    const reviews = await ContractReview.find().sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.approveContractReview = async (req, res) => {
  try {
    const review = await ContractReview.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Contract review not found' });
    if (review.status !== 'pending') {
      return res.status(400).json({ error: 'This contract package has already been reviewed' });
    }

    const otp = await createClientInviteAndEmail(review.clientName, review.clientEmail, review.templateId);

    review.status = 'approved';
    review.reviewedAt = new Date();
    review.otp = otp;
    await review.save();

    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.rejectContractReview = async (req, res) => {
  const reason = (req.body.reason || '').trim();
  if (!reason) return res.status(400).json({ error: 'A rejection reason is required' });

  try {
    const review = await ContractReview.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Contract review not found' });
    if (review.status !== 'pending') {
      return res.status(400).json({ error: 'This contract package has already been reviewed' });
    }

    review.status = 'rejected';
    review.reviewedAt = new Date();
    review.rejectionReason = reason;
    await review.save();

    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
