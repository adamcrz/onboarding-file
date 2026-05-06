const path = require('path');
const fs   = require('fs');
const User = require('../models/User');
const { sendClientInviteEmail } = require('../services/email.service');

const CONTRACTS_DIR = path.join(__dirname, '..');

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
  const fv = fieldValues || {};
  // Name: separate last/first fields (client_last_name, client_first_name)
  const lastName    = fv.client_last_name  || '';
  const firstName   = fv.client_first_name || '';
  const fullName    = [firstName, lastName].filter(Boolean).join(' ');

  const addr1       = fv.client_address1    || fv.client_address || '';
  const addr2       = fv.client_address2    || '';
  const city        = fv.client_city        || '';
  const country     = fv.client_country     || '';
  const nationality = fv.client_nationality || '';
  const dob         = fv.client_dob         || '';
  const contractDate= fv.contract_date      || '';
  const depotBank   = fv.depot_bank         || '';
  const portfolioNo = fv.portfolio_number   || '';

  const cityDate = [city, contractDate].filter(Boolean).join(', ');
  const fullAddr  = [addr1, addr2, city, country].filter(Boolean).join(', ');

  const map = {};

  // Full name (NachundVorname = "Vorname Nachname") — all numbered variants across template pages
  if (fullName) {
    [
      'NachundVorname','NachundVorname1','NachundVorname2','NachundVorname3',
      'NachundVorname4','NachundVorname5','NachundVorname7','NachundVorname8',
      'NachundVorname9','NachundVorname10','NachnameVorname',
    ].forEach(k => { map[k] = fullName; });
  }
  if (lastName)  { map['Nachname']  = lastName;  map['Nachname1']  = lastName;  }
  if (firstName) { map['Vorname']   = firstName;  map['Vorname1']   = firstName; }

  // Address components — all numbered variants
  if (addr1)   { map['Adresse1'] = addr1; map['Adresse11'] = addr1; map['Adresse12'] = addr1; map['Adresse13'] = addr1; }
  if (addr2)   { map['Adresse2'] = addr2; map['Adresse21'] = addr2; map['Adresse22'] = addr2; map['Adresse23'] = addr2; }
  if (fullAddr)  map['Adresse']  = fullAddr;
  if (city)    { map['Ort'] = city;  map['Ort1'] = city;  map['Ort2'] = city;  map['Ort3'] = city;  }
  if (country) { map['Land'] = country; map['Land1'] = country; map['Land2'] = country; map['Land3'] = country; }

  // Signature-block place/date line
  if (cityDate)    map['Ort/Datum'] = cityDate;

  // Personal details — all numbered variants
  if (dob)         { map['Birth']  = dob;         map['Birth1'] = dob;         }
  if (nationality) { map['Nat']    = nationality;  map['Nat1']   = nationality;
                     map['Nat.']   = nationality;  map['Nationality'] = nationality; }

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

  // (currency weight MAX values go via ccy_chf_max etc — handled below with pctVal)

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

  // Currency weights — same pattern: bookmark holds MAX, "0" cell gets MIN
  if (fv.ccy_chf_max) map['CHF'] = pctVal(fv.ccy_chf_max);
  if (fv.ccy_eur_max) map['EUR'] = pctVal(fv.ccy_eur_max);
  if (fv.ccy_usd_max) map['USD'] = pctVal(fv.ccy_usd_max);
  if (fv.ccy_gbp_max) map['GBP'] = pctVal(fv.ccy_gbp_max);

  // Additional investment category (last row of the investment table) — bookmark: And
  if (fv.additional_category) map['And'] = fv.additional_category;

  return map;
}

// Builds checkbox replacement map for the "New Contract / Replaces existing" toggle.
function buildContractTypeCheckboxes(fieldValues) {
  const isNew = fieldValues.contract_type !== 'replace';
  return {
    '☐ New Contract':                    (isNew  ? '☑' : '☐') + ' New Contract',
    '□ New Contract':                    (isNew  ? '☑' : '□') + ' New Contract',
    '☐ Replaces the existing Contract':  (!isNew ? '☑' : '☐') + ' Replaces the existing Contract',
    '□ Replaces the existing Contract':  (!isNew ? '☑' : '□') + ' Replaces the existing Contract',
  };
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
  const pct = v => (v !== undefined && v !== '') ? v + '%' : '';

  const targets = [
    { bm: 'Equity', min: fv.alloc_equities_min    },
    { bm: 'Equtiy', min: fv.alloc_equities_min    },  // typo in EN template
    { bm: 'Bonds',  min: fv.alloc_fixed_income_min },
    { bm: 'Cash',   min: fv.alloc_cash_min         },
    { bm: 'Alt',    min: fv.alloc_other_min        },
    { bm: 'CHF',    min: fv.ccy_chf_min            },
    { bm: 'EUR',    min: fv.ccy_eur_min            },
    { bm: 'USD',    min: fv.ccy_usd_min            },
    { bm: 'GBP',    min: fv.ccy_gbp_min            },
  ];

  // Track replaced bookmarks so we don't double-replace the typo pair
  const done = new Set();

  targets.forEach(({ bm, min }) => {
    if (min === undefined || min === '') return;
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

    // Replace the first <w:t>...</w:t> in that cell with the min value
    const newMinCellXml = minCellXml.replace(
      /<w:t[^>]*>[^<]*<\/w:t>/,
      `<w:t xml:space="preserve">${escXml(pct(min))}</w:t>`
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

    // Apply checkbox state in preview (field checkboxes + contract type toggle)
    const checkboxMap = {
      ...buildCheckboxReplacements(fieldValues, fieldDefs),
      ...buildContractTypeCheckboxes(fieldValues),
    };
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
    const checkboxMap = {
      ...buildCheckboxReplacements(fieldValues, fieldDefs),
      ...buildContractTypeCheckboxes(fieldValues),
    };

    ['word/document.xml','word/header1.xml','word/footer1.xml','word/header2.xml','word/footer2.xml']
      .forEach(xmlFile => {
        if (!zip.files[xmlFile]) return;
        let xml = applyReplacementsToXml(zip.files[xmlFile].asText(), replacements);
        xml = applyAllocMinToXml(xml, fieldValues);
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

exports.sendInvite = async (req, res) => {
  const { clientName, clientEmail, templateId, fieldValues } = req.body;
  if (!clientEmail || !clientName) {
    return res.status(400).json({ error: 'Client name and email are required' });
  }

  const template = TEMPLATES.find(t => t.id === templateId);

  try {
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

    res.json({ success: true, message: `Invitation sent to ${clientEmail}`, otp });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
