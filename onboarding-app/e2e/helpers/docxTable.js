const path = require('path');
// Reuse the backend's own pizzip install rather than adding a second one as
// an e2e devDependency.
const PizZip = require(path.join(__dirname, '../../backend/node_modules/pizzip'));

// Returns [{ texts, bookmarks, colors }] for every row of the <w:tbl> whose
// first row contains a bookmark named `anchorBookmark`.
function readTableRows(docxBuffer, anchorBookmark) {
  const zip = new PizZip(docxBuffer);
  const xml = zip.file('word/document.xml').asText();
  const anchorIdx = xml.indexOf(`w:name="${anchorBookmark}"`);
  if (anchorIdx === -1) throw new Error(`Bookmark ${anchorBookmark} not found in document.xml`);

  const tblStart = xml.lastIndexOf('<w:tbl>', anchorIdx);
  const tblEnd = xml.indexOf('</w:tbl>', anchorIdx) + '</w:tbl>'.length;
  const tbl = xml.slice(tblStart, tblEnd);

  return tbl.split(/(?=<w:tr[ >])/).filter((r) => r.startsWith('<w:tr')).map((row) => ({
    texts: [...row.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]),
    bookmarks: [...row.matchAll(/w:name="([^"]+)"/g)].map((m) => m[1]),
    colors: [...row.matchAll(/w:color w:val="([0-9A-Za-z]+)"/g)].map((m) => m[1]),
  }));
}

module.exports = { readTableRows };
