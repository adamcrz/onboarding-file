// Builds the "NaturalPersonKYC" bulk-import .xlsx used to feed confirmed client
// KYC records into the external KYC/compliance system. Format reverse-engineered
// from backend/Import_NaturalPersonKYC.xlsx: a [QUESTIONNAIRE] header block (one
// row per confirmed client) followed by an [ANSWERS] block (one row per answered
// question across all of them) — matching the original sample file's shape.
//
// Every client whose KYC Form is confirmed by Compliance is appended to a running
// store (data/kycExportRecords.json) so the exported .xlsx accumulates over time
// and can be re-downloaded at any point with everything confirmed so far.
//
// Only 3 fields have a confirmed Question-Ident mapping (first name, last name,
// occupation) — everything else in the app's KYC data isn't wired up because we
// don't have Question Idents for it yet. Extend QUESTION_MAP below once more are
// available.
const fs      = require('fs');
const path    = require('path');
const PizZip  = require('pizzip');

const STORE_PATH = path.join(__dirname, '..', 'data', 'kycExportRecords.json');

const QUESTION_MAP = [
  { key: 'firstName',  questionIdent: 'Q1.1', answerIdent: 'Q1.2', text: 'Vorname(n) Vertragspartei',                                      type: 'ShortFreeTextQuestion' },
  { key: 'lastName',   questionIdent: 'Q1.3', answerIdent: 'Q1.4', text: 'Nachname(n) Vertragspartei',                                      type: 'ShortFreeTextQuestion' },
  { key: 'occupation', questionIdent: 'Q3.1', answerIdent: 'Q3.2', text: 'Beruf, geschäftliche Aktivitäten etc. (frühere, aktuelle, evtl. geplante)', type: 'FreeTextQuestion' },
];

function colLetter(n) {
  let s = '';
  n += 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function escXml(str) {
  return String(str ?? '').replace(/[<>&'"]/g, c => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', "'":'&apos;', '"':'&quot;' }[c]));
}

// rows: array of arrays of plain string cell values (blank string = empty cell)
function buildSheetXml(rows) {
  const sharedStrings = [];
  const stringIndex = new Map();
  const internString = (str) => {
    if (stringIndex.has(str)) return stringIndex.get(str);
    const idx = sharedStrings.length;
    sharedStrings.push(str);
    stringIndex.set(str, idx);
    return idx;
  };

  const rowsXml = rows.map((row, rIdx) => {
    const rowNum = rIdx + 1;
    const cellsXml = row.map((val, cIdx) => {
      if (val === '' || val === null || val === undefined) return '';
      const ref = `${colLetter(cIdx)}${rowNum}`;
      const idx = internString(String(val));
      return `<c r="${ref}" t="s"><v>${idx}</v></c>`;
    }).join('');
    return `<row r="${rowNum}">${cellsXml}</row>`;
  }).join('');

  const maxCols = Math.max(1, ...rows.map(r => r.length));
  const dimensionRef = `A1:${colLetter(maxCols - 1)}${rows.length}`;

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="${dimensionRef}"/>
<sheetData>${rowsXml}</sheetData>
</worksheet>`;

  const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">
${sharedStrings.map(s => `<si><t xml:space="preserve">${escXml(s)}</t></si>`).join('')}
</sst>`;

  return { sheetXml, sharedStringsXml };
}

function buildMinimalXlsx(rows) {
  const { sheetXml, sharedStringsXml } = buildSheetXml(rows);
  const zip = new PizZip();

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`);

  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);

  zip.file('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>`);

  zip.file('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`);

  zip.file('xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="1"><fill><patternFill patternType="none"/></fill></fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf/></cellStyleXfs>
<cellXfs count="1"><xf/></cellXfs>
</styleSheet>`);

  zip.file('xl/sharedStrings.xml', sharedStringsXml);
  zip.file('xl/worksheets/sheet1.xml', sheetXml);

  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// Builds the [QUESTIONNAIRE]/[ANSWERS] rows for every confirmed KYC record so far —
// one QUESTIONNAIRE row and up to 3 ANSWERS rows per record.
function buildNaturalPersonKycRows(records) {
  const rows = [
    ['[TYPE:filled-questionnaires]'],
    ['[QUESTIONNAIRE]'],
    ['Import Ident', 'Questionnaire Type', 'Questionnaire Ident'],
  ];
  records.forEach(r => rows.push([r.importIdent, 'NaturalPersonKYC', 'KYC']));
  rows.push(['[END]'], [], ['[ANSWERS]'],
    ['Import Ident', 'Question Ident', 'Table Column', 'Table Row', 'Question Text', 'Question type', 'Expects content as answer', 'Answer Ident', 'Answer Text', 'Content']);

  records.forEach(r => {
    QUESTION_MAP.forEach(q => {
      const content = r[q.key];
      if (!content) return; // skip fields with no answer rather than exporting a blank row
      rows.push([r.importIdent, q.questionIdent, '', '', q.text, q.type, 'TRUE', q.answerIdent, '0', content]);
    });
  });

  rows.push(['[END]']);
  return rows;
}

function loadRecords() {
  if (!fs.existsSync(STORE_PATH)) return [];
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); } catch { return []; }
}

function saveRecords(records) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(records, null, 2));
}

// Adds (or updates, if the client was already confirmed before) a client's
// confirmed KYC answers to the running store.
function appendConfirmedKyc({ clientId, firstName, lastName, occupation }) {
  const importIdent = `NaturalPersonKYC-${clientId}`;
  const records = loadRecords();
  const record = { importIdent, clientId, firstName, lastName, occupation, confirmedAt: new Date().toISOString() };
  const existingIdx = records.findIndex(r => r.clientId === clientId);
  if (existingIdx >= 0) records[existingIdx] = record;
  else records.push(record);
  saveRecords(records);
  return record;
}

// Builds the .xlsx containing every client confirmed so far.
function buildNaturalPersonKycXlsx() {
  return buildMinimalXlsx(buildNaturalPersonKycRows(loadRecords()));
}

// buildMinimalXlsx is exported so other exports (the per-mandate KYC and
// mandate-risk sheets) write real .xlsx through the same writer rather than a
// second, subtly different one.
module.exports = { appendConfirmedKyc, buildNaturalPersonKycXlsx, buildMinimalXlsx, QUESTION_MAP };
