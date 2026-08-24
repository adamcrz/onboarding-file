const CONTRACT_VALIDATION_MAPS = require('./contractValidationMaps');

// One declarative requirement spec per contract template — the single source
// of truth for "what makes this contract complete". The checker walks these
// rules generically, so supporting a new contract type means adding an entry
// here, never touching the checker, controller, or UI.
//
// Rule kinds (each carries its own detection strategy):
//   'region'      — coordinate-based ink check on a specific page (signatures,
//                   checkboxes, initials). Needs boxes mapped for the template;
//                   sourced from CONTRACT_VALIDATION_MAPS so the existing
//                   hand-extracted coordinates stay the one place they live.
//   'page-count'  — structural: the upload must have at least `minPages` pages.
//                   Catches a partial scan / missing back half of a package.
//   'attachment'  — a supporting document (by Client.documents type/name) must
//                   exist and have a real uploaded file.
//   'field'       — a contract form field must have been filled at build time.
//
// Only 'region' needs per-template pixel mapping. The other three are
// structural and work for every template immediately, which is why templates
// without coordinate maps still get real validation rather than silently
// passing or reporting "unsupported".
//
// pageLabel is what the correction item shows the user ("Seite 7"-style
// reference). For non-page-specific rules it stays null so the UI can render
// a document-level item instead of inventing a page number.

// Wraps the existing coordinate maps as 'region' rules so the two sources
// never drift — CONTRACT_VALIDATION_MAPS remains the only place raw box
// geometry is written down.
function regionRulesFor(templateId) {
  const map = CONTRACT_VALIDATION_MAPS[templateId];
  if (!map) return [];
  return map.regions.map((region) => ({
    kind: 'region',
    id: region.id,
    label: region.label,
    page: region.page,
    rule: region.rule,
    boxes: region.boxes,
  }));
}

// Minimum page counts are taken from the generated output of each template's
// own .docx (the package a client actually receives), so a short upload is a
// genuinely incomplete package rather than an arbitrary threshold.
const STRUCTURAL_MIN_PAGES = {
  'de-all-in': 20,
  'de-advisory': 12,
  'en-disc-all-in': 20,
  'en-advisory': 12,
  'en-execution': 8,
};

const CONTRACT_REQUIREMENTS = {
  'de-all-in': {
    label: 'Vertragsset All-In (DE)',
    lang: 'DE',
    documentType: 'Auftragsvertrag',
  },
  'de-advisory': {
    label: 'Advisory Vertrag (DE)',
    lang: 'DE',
    documentType: 'Advisory Vertrag',
  },
  'en-disc-all-in': {
    label: 'Discretionary All-In (EN)',
    lang: 'EN',
    documentType: 'Discretionary Mandate',
  },
  'en-advisory': {
    label: 'Advisory Contract (EN)',
    lang: 'EN',
    documentType: 'Advisory Contract',
  },
  'en-execution': {
    label: 'Execution Only (EN)',
    lang: 'EN',
    documentType: 'Execution Only Agreement',
  },
};

// Assembled once at require-time: every template gets its region rules (empty
// for the not-yet-mapped ones) plus the structural rules that apply to all.
for (const [templateId, spec] of Object.entries(CONTRACT_REQUIREMENTS)) {
  spec.templateId = templateId;
  spec.rules = [
    {
      kind: 'page-count',
      id: 'complete-package',
      label: spec.lang === 'DE' ? 'Vollständiges Vertragsset' : 'Complete contract package',
      minPages: STRUCTURAL_MIN_PAGES[templateId],
      page: null,
    },
    ...regionRulesFor(templateId),
  ];
  // Surfaced to the UI so a reviewer can tell "no issues found" apart from
  // "this template has no signature/checkbox coordinates mapped yet".
  spec.hasRegionCoverage = spec.rules.some((r) => r.kind === 'region');
}

function requirementsFor(templateId) {
  return CONTRACT_REQUIREMENTS[templateId] || null;
}

module.exports = { CONTRACT_REQUIREMENTS, requirementsFor, STRUCTURAL_MIN_PAGES };
