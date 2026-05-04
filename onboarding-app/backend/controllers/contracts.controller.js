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
