const Customisation = require('../models/MandateRiskSchemaCustomisation');
const {
  MANDATE_RISK_FIELDS,
  mandateRiskFieldDefinitions,
} = require('../config/mandateRiskFields');

// The questionnaire as it currently stands = the printed form minus what
// Compliance retired, plus what they added. Merging happens here and nowhere
// else, so every reader (task list, questionnaire, schema page, submission
// gate) is answering from the same list.
//
// The merged list is cached in-process because it is read on almost every KYC
// request and changes only when someone edits the schema; every mutation below
// refreshes it, so a stale read is not possible within a process.
let cached = mandateRiskFieldDefinitions();

function mergeFields(customisation) {
  const removed = new Set(customisation?.removed || []);
  const kept = MANDATE_RISK_FIELDS.filter((f) => !removed.has(f.key));
  const added = (customisation?.added || []).map((f) => (f.toObject ? f.toObject() : { ...f }));

  // Added questions sit at the end of the section they name, so a new question
  // in "2. Vermögenswerte" appears with the other asset questions rather than
  // after the Compliance sign-off block. A section nobody shipped is appended.
  const merged = [];
  const sections = [];
  for (const f of kept) {
    if (!sections.includes(f.page)) sections.push(f.page);
  }
  for (const f of added) {
    if (!sections.includes(f.page)) sections.push(f.page);
  }
  for (const section of sections) {
    merged.push(...kept.filter((f) => f.page === section));
    merged.push(...added.filter((f) => f.page === section));
  }
  return mandateRiskFieldDefinitions(merged);
}

async function loadCustomisation() {
  return Customisation.findOneAndUpdate(
    { singleton: 'default' },
    { $setOnInsert: { singleton: 'default' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// Re-reads the stored customisation and refreshes the cache. Call this at
// startup and at the top of any handler whose answer must reflect an edit made
// by another process.
async function refreshMandateRiskSchema() {
  try {
    cached = mergeFields(await loadCustomisation());
  } catch (err) {
    // A schema-store outage must not take the questionnaire down: fall back to
    // the printed form, which is always correct if incomplete.
    console.error('⚠  Could not load the mandate-risk schema customisation:', err.message);
    cached = mandateRiskFieldDefinitions();
  }
  return cached;
}

// Synchronous accessor for the merged list, so existing call sites keep their
// shape. Returns the printed form until the first refresh completes.
function mandateRiskFields() {
  return cached;
}

// `cached` already holds formatted definitions, so filter it directly rather
// than handing it back to the formatter — running that twice prefixed the
// question number onto a label that already carried it ("1a) 1a) …").
function missingFields(answers = {}) {
  return cached.filter((f) =>
    f.required && !f.complianceOnly && !String(answers?.[f.key] ?? '').trim());
}

const slugKey = (label) => `custom_${String(label)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 40) || 'field'}`;

async function addMandateRiskField(input, actor) {
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
  const taken = new Set([
    ...MANDATE_RISK_FIELDS.map((f) => f.key),
    ...customisation.added.map((f) => f.key),
  ]);
  let key = String(input?.key || '').trim() || slugKey(label);
  if (taken.has(key)) {
    let n = 2;
    while (taken.has(`${key}_${n}`)) n += 1;
    key = `${key}_${n}`;
  }

  // Numbering continues past the printed form's own, so an added question is
  // visibly an addition rather than pretending to be part of the original.
  const highest = Math.max(
    0,
    ...[...MANDATE_RISK_FIELDS, ...customisation.added]
      .map((f) => Number.parseInt(String(f.no).replace(/[^0-9]/g, ''), 10))
      .filter(Number.isFinite)
  );
  const no = String(input?.no || '').trim() || String(highest + 1);

  customisation.added.push({
    key, no, label, page, type, options,
    required: input?.required !== false,
    affectsRisk: Boolean(input?.affectsRisk),
    complianceOnly: Boolean(input?.complianceOnly),
    addedBy: actor || 'Compliance',
  });
  await customisation.save();
  await refreshMandateRiskSchema();
  return cached.find((f) => f.key === key);
}

async function removeMandateRiskField(key) {
  const target = String(key || '').trim();
  if (!target) { const e = new Error('A field key is required'); e.status = 400; throw e; }

  const customisation = await loadCustomisation();
  const wasAdded = customisation.added.some((f) => f.key === target);
  const isBuiltIn = MANDATE_RISK_FIELDS.some((f) => f.key === target);
  if (!wasAdded && !isBuiltIn) {
    const e = new Error('No such mandate-risk question'); e.status = 404; throw e;
  }

  if (wasAdded) {
    // A question that was only ever an addition disappears entirely — there is
    // no printed original to keep suppressing.
    customisation.added = customisation.added.filter((f) => f.key !== target);
  } else if (!customisation.removed.includes(target)) {
    customisation.removed.push(target);
  }
  await customisation.save();
  await refreshMandateRiskSchema();
  return { key: target, restorable: isBuiltIn };
}

async function restoreMandateRiskField(key) {
  const customisation = await loadCustomisation();
  customisation.removed = customisation.removed.filter((k) => k !== String(key));
  await customisation.save();
  await refreshMandateRiskSchema();
  return cached;
}

async function removedFieldKeys() {
  return (await loadCustomisation()).removed || [];
}

module.exports = {
  refreshMandateRiskSchema,
  mandateRiskFields,
  missingFields,
  addMandateRiskField,
  removeMandateRiskField,
  restoreMandateRiskField,
  removedFieldKeys,
};
