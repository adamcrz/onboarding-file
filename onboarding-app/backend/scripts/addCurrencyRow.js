// Adds a currency row to the contract templates' currency-allocation table.
//
//   node scripts/addCurrencyRow.js --code SGD --after JPY
//   node scripts/addCurrencyRow.js --code SGD --after JPY --dry-run
//
// The table lives in the Word template, not in the app: each currency is a row
// whose max cell carries a bookmark named after the currency, and the writer in
// contracts.controller.js fills those bookmarks in. A currency the template has
// no row for cannot appear in a generated contract however much the Contract
// Builder offers it — which is how JPY was added before this, and by hand.
//
// The new row is a clone of an existing one, so it inherits that row's borders,
// fonts, shading and cell widths exactly. Nothing about the table's appearance
// is reconstructed; only the currency code and the bookmark change.
//
// Templates are versioned in git, so a bad run is recoverable with git checkout.
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
};
const has = (name) => process.argv.includes(`--${name}`);

// Only the templates that actually carry a currency table. Advisory and
// Execution Only have no currency allocation at all — see
// contract-builder-field-gating.spec.js.
const TEMPLATES = [
  '2025_Vertragsset DE - AllesIN FINAL.docx',
  '2025_Vertragsset EN  Discretionary All-IN.docx',
];

function patch(xml, { code, after }) {
  if (xml.includes(`w:name="${code}"`)) return { xml, skipped: 'already present' };

  const anchor = xml.indexOf(`w:name="${after}"`);
  if (anchor === -1) return { xml, error: `no row bookmarked ${after}` };

  const rowStart = xml.lastIndexOf('<w:tr ', anchor);
  const rowEnd = xml.indexOf('</w:tr>', anchor) + '</w:tr>'.length;
  if (rowStart === -1 || rowEnd < rowStart) return { xml, error: 'could not isolate the row' };

  const row = xml.slice(rowStart, rowEnd);

  // A bookmark id must be unique in the document, or Word treats the two as one
  // bookmark and the second silently never receives its value.
  const usedIds = [...xml.matchAll(/w:bookmark(?:Start|End)[^>]*w:id="(\d+)"/g)].map((m) => Number(m[1]));
  const newId = Math.max(0, ...usedIds) + 1;

  let clone = row
    .replace(/(<w:bookmarkStart[^>]*w:id=")\d+(")/, `$1${newId}$2`)
    .replace(/(<w:bookmarkEnd[^>]*w:id=")\d+(")/, `$1${newId}$2`)
    .replace(new RegExp(`(w:name=")${after}(")`), `$1${code}$2`);

  // The currency code appears as visible text twice: the label cell, and the
  // placeholder inside the bookmark that the writer overwrites. Both become the
  // new code; the numbers and the dash between them are left alone.
  clone = clone.replace(
    new RegExp(`(<w:t[^>]*>)${after}(</w:t>)`, 'g'),
    `$1${code}$2`,
  );

  if (clone === row) return { xml, error: 'clone came out identical to the source row' };

  return { xml: xml.slice(0, rowEnd) + clone + xml.slice(rowEnd), added: true, newId };
}

(async () => {
  const code = (arg('code') || '').trim().toUpperCase();
  const after = (arg('after') || 'JPY').trim().toUpperCase();
  const dryRun = has('dry-run');

  if (!/^[A-Z]{3}$/.test(code)) {
    console.error('Usage: node scripts/addCurrencyRow.js --code SGD [--after JPY] [--dry-run]');
    process.exit(1);
  }

  console.log(`Adding ${code} after ${after}${dryRun ? '  (dry run)' : ''}\n`);

  for (const file of TEMPLATES) {
    const full = path.join(__dirname, '..', file);
    if (!fs.existsSync(full)) { console.log(`  ${file}: not found, skipped`); continue; }

    const zip = new PizZip(fs.readFileSync(full));
    const before = zip.file('word/document.xml').asText();
    const { xml, added, skipped, error, newId } = patch(before, { code, after });

    if (error) { console.log(`  ${file}\n     ✗ ${error}`); continue; }
    if (skipped) { console.log(`  ${file}\n     — ${skipped}`); continue; }

    if (!dryRun) {
      zip.file('word/document.xml', xml);
      fs.writeFileSync(full, zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
    }
    console.log(`  ${file}`);
    console.log(`     ✓ ${added ? 'row added' : 'no change'} (bookmark id ${newId})${dryRun ? ' — not written' : ''}`);
  }

  // Read the templates back and report what the table now contains, rather
  // than trusting the edit.
  if (!dryRun) {
    console.log('\nVerifying:');
    for (const file of TEMPLATES) {
      const full = path.join(__dirname, '..', file);
      const xml = new PizZip(fs.readFileSync(full)).file('word/document.xml').asText();
      const names = [...xml.matchAll(/w:bookmarkStart[^>]*w:name="([^"]+)"/g)].map((m) => m[1]);
      const ccy = ['CHF', 'USD', 'EUR', 'AUD', 'GBP', 'JPY', code, 'And'].filter((c) => names.includes(c));
      const dupes = names.filter((n, i) => names.indexOf(n) !== i);
      console.log(`  ${file}`);
      console.log(`     currencies: ${ccy.join(', ')}`);
      console.log(`     duplicate bookmark names: ${dupes.length ? dupes.join(', ') : 'none'}`);
    }
  }
})().catch((err) => { console.error('\n❌ ', err.message); process.exit(1); });
