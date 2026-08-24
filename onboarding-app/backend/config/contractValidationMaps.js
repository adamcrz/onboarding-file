// Signed-contract checkbox/initials regions, checked server-side by
// services/pdfChecker.service.js against every uploaded "Signed Contract"
// PDF. Box coordinates were extracted once (via PyMuPDF, offline) from an
// actual generated+rendered contract for each template, as fractions of page
// width/height so they hold regardless of render DPI. This only covers the
// pages/sections that were mapped — extend with the same coordinate-
// extraction approach to cover more templates/regions.
//
// This is the single source of truth for these coordinates. The frontend
// keeps only a matching id -> label list (CONTRACT_TEMPLATE_LABELS in
// app.js) for the "Contract Template Used" dropdown; it never sees the
// actual box geometry.
const CONTRACT_VALIDATION_MAPS = {
  'en-disc-all-in': {
    label: 'Discretionary All-In (EN)',
    regions: [
      { id: 'investment_strategy', label: 'Investment Strategy selection', page: 18, rule: 'at-least-one', boxes: [
        {x0:0.1237,y0:0.1541,x1:0.1311,y1:0.1593}, {x0:0.1237,y0:0.1709,x1:0.1311,y1:0.1761},
      ]},
      { id: 'risk_capacity', label: 'Risk Capacity assessment', page: 14, rule: 'at-most-one', boxes: [
        {x0:0.1479,y0:0.1597,x1:0.1539,y1:0.1661}, {x0:0.1493,y0:0.1829,x1:0.1553,y1:0.1893},
        {x0:0.1495,y0:0.2058,x1:0.1555,y1:0.2122}, {x0:0.1497,y0:0.2291,x1:0.1557,y1:0.2355},
        {x0:0.1497,y0:0.2523,x1:0.1558,y1:0.2587},
      ]},
      { id: 'risk_tolerance', label: 'Risk Tolerance assessment', page: 14, rule: 'at-most-one', boxes: [
        {x0:0.5435,y0:0.1597,x1:0.5495,y1:0.1661}, {x0:0.5449,y0:0.1829,x1:0.5509,y1:0.1893},
        {x0:0.5451,y0:0.2058,x1:0.5511,y1:0.2122}, {x0:0.5453,y0:0.2291,x1:0.5513,y1:0.2355},
        {x0:0.5453,y0:0.2523,x1:0.5514,y1:0.2587},
      ]},
      { id: 'suitable_mandate', label: 'Suitable Mandate selection', page: 14, rule: 'at-most-one', boxes: [
        {x0:0.1673,y0:0.3287,x1:0.1733,y1:0.3351}, {x0:0.1672,y0:0.3659,x1:0.1731,y1:0.3723},
        {x0:0.1672,y0:0.4209,x1:0.1731,y1:0.4273}, {x0:0.1672,y0:0.4707,x1:0.1731,y1:0.4771},
        {x0:0.1672,y0:0.5375,x1:0.1731,y1:0.5439},
      ]},
    ],
  },
  'en-advisory': {
    label: 'Advisory Contract (EN)',
    regions: [
      { id: 'initials_p4', label: 'Client initials (p.4 — third-party compensation waiver)', page: 4, rule: 'ink-present', boxes: [
        {x0:0.7382,y0:0.1683,x1:0.9282,y1:0.1922},
      ]},
    ],
  },
};

module.exports = CONTRACT_VALIDATION_MAPS;
