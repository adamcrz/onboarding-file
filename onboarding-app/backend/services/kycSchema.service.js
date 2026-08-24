const Customisation = require('../models/KycSchemaCustomisation');
const {
  BUILT_IN_KYC_FIELDS,
  setActiveKycFields,
} = require('../config/kycRequiredFields');

// The KYC questionnaire as it currently stands = the shipped questions minus
// what Compliance retired, plus what they added.
//
// The merged list is pushed into config/kycRequiredFields.js rather than
// returned, because roughly forty places already read the schema through that
// module — the task form, the gap check, the exports, the PDF, the submission
// gate, the client profile. Putting the result where they already look means
// every one of them reflects an edit, and none can be forgotten.
//
// Mirrors services/mandateRiskSchema.service.js deliberately: the two
// questionnaires are edited in the same way, so they should be built the same
// way.

// Added questions sit at the end of the section they name, so a new question in
// "3. Adresse" appears with the other address questions rather than after the
// closing block. A section nobody shipped is appended at the end.
function mergeFields(customisation) {
  const removed = new Set(customisation?.removed || []);
  const kept = BUILT_IN_KYC_FIELDS.filter((f) => !removed.has(f.key));
  const added = (customisation?.added || []).map((f) => (f.toObject ? f.toObject() : { ...f }));

  const sections = [];
  for (const f of [...kept, ...added]) {
    if (!sections.includes(f.page)) sections.push(f.page);
  }

  const merged = [];
  for (const section of sections) {
    merged.push(...kept.filter((f) => f.page === section));
    merged.push(...added.filter((f) => f.page === section));
  }
  return merged;
}

async function loadCustomisation() {
  return Customisation.findOneAndUpdate(
    { singleton: 'default' },
    { $setOnInsert: { singleton: 'default' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// Re-reads the stored customisation and installs the merged list. Call at
// startup, and at the top of any handler whose answer must reflect an edit
// made by another process.
async function refreshKycSchema() {
  try {
    setActiveKycFields(mergeFields(await loadCustomisation()));
  } catch (err) {
    // A schema-store outage must not take the questionnaire down: fall back to
    // the shipped questions, which are always correct if incomplete.
    console.error('⚠  Could not load the KYC schema customisation:', err.message);
    setActiveKycFields(null);
  }
}

const slugKey = (label) => `custom_${String(label)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 40) || 'field'}`;

async function addKycField(input, actor) {
  const label = String(input?.label || '').trim();
  if (!label) { const e = new Error('A question label is required'); e.status = 400; throw e; }
  const page = String(input?.page || '').trim();
  if (!page) { const e = new Error('A section is required'); e.status = 400; throw e; }

  const type = ['text', 'textarea', 'select', 'date', 'number'].includes(input?.type) ? input.type : 'text';
  const options = Array.isArray(input?.options)
    ? input.options.map((o) => String(o).trim()).filter(Boolean)
    : String(input?.options || '').split(',').map((o) => o.trim()).filter(Boolean);
  if (type === 'select' && !options.length) {
    const e = new Error('A dropdown question needs at least one option'); e.status = 400; throw e;
  }

  const customisation = await loadCustomisation();
  // A key collision would make two questions share one answer, so a new key is
  // suffixed until it is genuinely free — including against questions that are
  // currently retired, which can be restored later.
  const taken = new Set([
    ...BUILT_IN_KYC_FIELDS.map((f) => f.key),
    ...customisation.added.map((f) => f.key),
  ]);
  let key = String(input?.key || '').trim() || slugKey(label);
  if (taken.has(key)) {
    let n = 2;
    while (taken.has(`${key}_${n}`)) n += 1;
    key = `${key}_${n}`;
  }

  customisation.added.push({
    key, label, page, type, options,
    required: input?.required !== false,
    addedBy: actor || 'Compliance',
  });
  await customisation.save();
  await refreshKycSchema();
  return { key, label, page, type, options, required: input?.required !== false };
}

async function removeKycField(key) {
  const target = String(key || '').trim();
  if (!target) { const e = new Error('A field key is required'); e.status = 400; throw e; }

  const customisation = await loadCustomisation();
  const wasAdded = customisation.added.some((f) => f.key === target);
  const isBuiltIn = BUILT_IN_KYC_FIELDS.some((f) => f.key === target);
  if (!wasAdded && !isBuiltIn) {
    const e = new Error('No such KYC question'); e.status = 404; throw e;
  }

  if (wasAdded) {
    // A question that was only ever an addition disappears entirely — there is
    // no shipped original left to suppress.
    customisation.added = customisation.added.filter((f) => f.key !== target);
  } else if (!customisation.removed.includes(target)) {
    customisation.removed.push(target);
  }
  await customisation.save();
  await refreshKycSchema();
  // Answers already recorded against a retired question are deliberately left
  // in Client.kyc: removing a question from the form is not a decision to
  // destroy what clients already told you, and restoring it brings the answers
  // back with it.
  return { key: target, restorable: isBuiltIn };
}

async function restoreKycField(key) {
  const customisation = await loadCustomisation();
  customisation.removed = customisation.removed.filter((k) => k !== String(key));
  await customisation.save();
  await refreshKycSchema();
}

async function removedFieldKeys() {
  return (await loadCustomisation()).removed || [];
}

async function addedFieldKeys() {
  return ((await loadCustomisation()).added || []).map((f) => f.key);
}

module.exports = {
  refreshKycSchema,
  addKycField,
  removeKycField,
  restoreKycField,
  removedFieldKeys,
  addedFieldKeys,
};
