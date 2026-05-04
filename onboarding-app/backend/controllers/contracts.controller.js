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
        { key: 'client_name',        label: 'Vollständiger Name (Nach- und Vorname)', type: 'text',  required: true  },
        { key: 'client_email',       label: 'E-Mail-Adresse',                         type: 'email', required: true  },
        { key: 'client_dob',         label: 'Geburtsdatum',                           type: 'date',  required: true  },
        { key: 'client_address1',    label: 'Strasse und Hausnummer',                 type: 'text',  required: true  },
        { key: 'client_address2',    label: 'Adresszusatz (optional)',                type: 'text',  required: false },
        { key: 'client_city',        label: 'Ort',                                    type: 'text',  required: true  },
        { key: 'client_country',     label: 'Land',                                   type: 'text',  required: true  },
        { key: 'client_nationality', label: 'Nationalität',                           type: 'text',  required: false },
        { key: 'contract_date',      label: 'Vertragsdatum',                          type: 'date',  required: true  },
        { key: 'depot_bank',         label: 'Depotbank',                              type: 'text',  required: false },
        { key: 'portfolio_number',   label: 'Portfolionummer',                        type: 'text',  required: false },
      ]
    : [
        { key: 'client_name',        label: 'Full Name (Last, First)',                type: 'text',  required: true  },
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
  const fields = standardFields(template.lang);
  res.json({ templateId: template.id, lang: template.lang, fields });
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
  const name        = fv.client_name        || '';
  const addr1       = fv.client_address1    || fv.client_address || '';
  const addr2       = fv.client_address2    || '';
  const city        = fv.client_city        || '';
  const country     = fv.client_country     || '';
  const nationality = fv.client_nationality || '';
  const dob         = fv.client_dob         || '';
  const contractDate= fv.contract_date      || '';
  const depotBank   = fv.depot_bank         || '';
  const portfolioNo = fv.portfolio_number   || '';

  // Split "Last First" → lastName / firstName for templates that store them separately
  const parts     = name.trim().split(/\s+/);
  const lastName  = parts.length > 1 ? parts[parts.length - 1] : name;
  const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : '';

  const cityDate = [city, contractDate].filter(Boolean).join(', ');
  const fullAddr  = [addr1, addr2, city, country].filter(Boolean).join(', ');

  const map = {};

  // Full name — all numbered suffix variants used across different template pages
  if (name) {
    [
      'NachundVorname','NachundVorname1','NachundVorname2','NachundVorname3',
      'NachundVorname5','NachundVorname7','NachundVorname10','NachnameVorname',
    ].forEach(k => { map[k] = name; });
  }
  if (lastName)  { map['Nachname']  = lastName;  map['Nachname1'] = lastName; }
  if (firstName)   map['Vorname']   = firstName;

  // Address components
  if (addr1)   { map['Adresse1'] = addr1; map['Adresse11'] = addr1; }
  if (addr2)   { map['Adresse2'] = addr2; map['Adresse21'] = addr2; map['Adresse23'] = addr2; }
  if (fullAddr)  map['Adresse']  = fullAddr;
  if (city)    { map['Ort'] = city;  map['Ort1'] = city; map['Ort2'] = city; map['Ort3'] = city; }
  if (country) { map['Land'] = country; map['Land1'] = country; }

  // Signature-block place/date line
  if (cityDate)    map['Ort/Datum'] = cityDate;

  // Personal details
  if (dob)         map['Birth']       = dob;
  if (nationality) { map['Nat'] = nationality; map['Nat.'] = nationality; map['Nationality'] = nationality; }

  // Contract details
  if (depotBank)   map['Depotbank']        = depotBank;
  if (portfolioNo) { map['Portfolionummer'] = portfolioNo; map['Portfolionummer1'] = portfolioNo; }

  return map;
}

// Replaces placeholder text inside a Word XML string.
//
// The templates store placeholder text as visible run text matching the bookmark
// name (e.g. <w:t>NachundVorname</w:t>). Word sometimes splits a single word
// across two adjacent runs (e.g. <w:t>Nach</w:t><w:t>undVorname</w:t>). We
// handle both cases by working paragraph-by-paragraph: collect all <w:t> text,
// compare the trimmed concatenation to each placeholder, and if it matches we
// write the value into the first <w:t> and empty the rest.
function applyReplacementsToXml(xml, replacements) {
  if (!Object.keys(replacements).length) return xml;

  return xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, para => {
    const textNodes = [...para.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)];
    if (!textNodes.length) return para;

    const combinedText = textNodes.map(m => m[1]).join('').trim();
    const value = replacements[combinedText];
    if (value === undefined || value === '') return para;

    // Put the replacement value in the first <w:t>, wipe the rest
    let firstDone = false;
    return para.replace(/<w:t[^>]*>[^<]*<\/w:t>/g, () => {
      if (!firstDone) {
        firstDone = true;
        return `<w:t xml:space="preserve">${escXml(value)}</w:t>`;
      }
      return '<w:t></w:t>';
    });
  });
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
      zip.file(xmlFile, applyReplacementsToXml(zip.files[xmlFile].asText(), replacements));
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

    ['word/document.xml','word/header1.xml','word/footer1.xml','word/header2.xml','word/footer2.xml']
      .forEach(xmlFile => {
        if (!zip.files[xmlFile]) return;
        zip.file(xmlFile, applyReplacementsToXml(zip.files[xmlFile].asText(), replacements));
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
