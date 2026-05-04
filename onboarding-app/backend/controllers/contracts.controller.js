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
        { key: 'client_name',        label: 'Vollständiger Name',    type: 'text',  required: true  },
        { key: 'client_email',       label: 'E-Mail-Adresse',        type: 'email', required: true  },
        { key: 'client_dob',         label: 'Geburtsdatum',          type: 'date',  required: true  },
        { key: 'client_address',     label: 'Adresse',               type: 'text',  required: true  },
        { key: 'client_nationality', label: 'Nationalität',          type: 'text',  required: false },
        { key: 'contract_date',      label: 'Vertragsdatum',         type: 'date',  required: true  },
        { key: 'account_number',     label: 'Kontonummer / Depot',   type: 'text',  required: false },
      ]
    : [
        { key: 'client_name',        label: 'Client Full Name',      type: 'text',  required: true  },
        { key: 'client_email',       label: 'Client Email Address',  type: 'email', required: true  },
        { key: 'client_dob',         label: 'Date of Birth',         type: 'date',  required: true  },
        { key: 'client_address',     label: 'Client Address',        type: 'text',  required: true  },
        { key: 'client_nationality', label: 'Nationality',           type: 'text',  required: false },
        { key: 'contract_date',      label: 'Contract Date',         type: 'date',  required: true  },
        { key: 'account_number',     label: 'Account / Portfolio No.',type: 'text', required: false },
      ];
}

function guessType(label) {
  const l = label.toLowerCase();
  if (l.includes('date') || l.includes('datum'))                  return 'date';
  if (l.includes('email') || l.includes('e-mail'))               return 'email';
  if (l.includes('phone') || l.includes('tel') || l.includes('fon')) return 'tel';
  if (l.includes('amount') || l.includes('betrag') || l.includes('value')) return 'number';
  return 'text';
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

  const base = standardFields(template.lang);
  const filePath = path.join(CONTRACTS_DIR, template.file);

  if (!fs.existsSync(filePath)) {
    return res.json({ templateId: template.id, lang: template.lang, fields: base });
  }

  try {
    const mammoth = require('mammoth');
    const { value: text } = await mammoth.extractRawText({ path: filePath });

    const skipKw = ['name','email','adress','address','datum','date','geburt','dob',
                    'national','account','konto','depot','e-mail'];

    const extra = [...new Set(
      [...text.matchAll(/\[([^\]]{3,80})\]/g)]
        .map(m => m[1].trim())
        .filter(v => !v.match(/^\d+$/) && !v.match(/^[A-Z]{1,4}$/))
    )]
      .filter(raw => !skipKw.some(kw => raw.toLowerCase().includes(kw)))
      .map(raw => ({
        key:   'tpl_' + raw.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'').slice(0,40),
        label: raw,
        type:  guessType(raw),
        required: false,
      }))
      .filter((f, i, arr) => arr.findIndex(x => x.key === f.key) === i)
      .slice(0, 15);

    res.json({ templateId: template.id, lang: template.lang, fields: [...base, ...extra] });
  } catch (_) {
    res.json({ templateId: template.id, lang: template.lang, fields: base });
  }
};

function buildReplacementMap(fieldValues, fieldDefs) {
  const map = {};
  const synonyms = {
    client_name:        ['Name','Name des Kunden','Client Name','Full Name','Kundenname','Anleger','Vertragspartner'],
    client_email:       ['E-Mail','Email','E-Mail-Adresse','Client Email'],
    client_dob:         ['Geburtsdatum','Date of Birth','DOB','geboren am','Geburtstag'],
    client_address:     ['Adresse','Address','Client Address','Wohnadresse','Wohnort'],
    client_nationality: ['Nationalität','Nationality','Staatsbürgerschaft','Staatsangehörigkeit'],
    contract_date:      ['Datum','Date','Vertragsdatum','Contract Date','Ort und Datum'],
    account_number:     ['Kontonummer','Account Number','Portfolio No.','Depot-Nr.','Depot','Konto'],
  };
  Object.entries(synonyms).forEach(([key, patterns]) => {
    if (fieldValues[key]) patterns.forEach(p => { map[p] = fieldValues[key]; });
  });
  (fieldDefs || []).filter(f => f.key.startsWith('tpl_')).forEach(f => {
    if (fieldValues[f.key]) map[f.label] = fieldValues[f.key];
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
    const { value: html } = await mammoth.convertToHtml({ path: filePath });
    const { fieldValues = {}, fieldDefs = [] } = req.body;
    const replacements = buildReplacementMap(fieldValues, fieldDefs);

    let processed = html;
    Object.entries(replacements).forEach(([pattern, value]) => {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      processed = processed.replace(
        new RegExp(`\\[${escaped}\\]`, 'g'),
        `<mark style="background:#bbf7d0;padding:1px 4px;border-radius:2px;font-weight:600;">${value}</mark>`
      );
    });
    processed = processed.replace(
      /\[([^\]]{1,80})\]/g,
      '<mark style="background:#fecaca;padding:1px 4px;border-radius:2px;">[$1]</mark>'
    );

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
        let xml = zip.files[xmlFile].asText();
        Object.entries(replacements).forEach(([pattern, value]) => {
          const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          xml = xml.replace(new RegExp(`\\[${escaped}\\]`, 'g'), value);
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
