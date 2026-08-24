const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

// Converts a Word document to PDF, so a signed contract can be worked with a
// page at a time.
//
// Why this exists: the page-level correction loop — Compliance flags page 2,
// the RM downloads page 2, corrects it, uploads it, and it is spliced back in —
// only works on a PDF. A Word file has no fixed pages (what Word calls page 2
// depends on the reader's fonts and margins), and a corrected PDF page cannot
// be put back into a .docx. So a signed contract that arrives as Word is
// converted once, on upload, and the PDF becomes the document. The Word file
// is kept as a version, never discarded.
//
// Conversion is best-effort by design. Where no converter exists — a Linux
// container with neither LibreOffice nor Word — the upload still succeeds and
// the document stays as Word; corrections there work at document scope, which
// is what happened before this existed. Nothing depends on it having worked.

const EXEC_TIMEOUT_MS = 90000;   // a long contract on a cold LibreOffice start

const LIBREOFFICE_CANDIDATES = [
  process.env.SOFFICE_PATH,
  'soffice',                                              // on PATH (Linux, macOS)
  '/usr/bin/soffice',
  '/usr/lib/libreoffice/program/soffice',
  'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
  'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
].filter(Boolean);

const run = (cmd, args, opts = {}) => new Promise((resolve, reject) => {
  execFile(cmd, args, { timeout: EXEC_TIMEOUT_MS, windowsHide: true, ...opts }, (err, stdout, stderr) => {
    if (err) return reject(Object.assign(err, { stdout, stderr }));
    resolve({ stdout, stderr });
  });
});

// A PowerShell single-quoted string. The only escape inside one is a doubled
// quote, which is what makes an apostrophe in a client's name safe here.
const psLiteral = (value) => "'" + String(value).replace(/'/g, "''") + "'";

// LibreOffice: the portable option, and the one a Linux host can actually have.
async function convertWithLibreOffice(inputPath, outDir) {
  for (const bin of LIBREOFFICE_CANDIDATES) {
    try {
      await run(bin, ['--headless', '--norestore', '--convert-to', 'pdf', '--outdir', outDir, inputPath]);
      const produced = path.join(outDir, path.basename(inputPath, path.extname(inputPath)) + '.pdf');
      if (fs.existsSync(produced)) return produced;
    } catch (_) {
      // Not this one — try the next candidate.
    }
  }
  return null;
}

// Word itself, on a Windows machine that has it. Slower and Windows-only, but
// its pagination is by definition the pagination the person saw when they
// wrote "page 2", which is the whole point of the exercise.
async function convertWithWord(inputPath, outDir) {
  if (process.platform !== 'win32') return null;
  const outPath = path.join(outDir, path.basename(inputPath, path.extname(inputPath)) + '.pdf');

  // Written to a file and run with -File rather than passed inline with
  // -Command. An inline script has to survive two levels of quoting before
  // PowerShell ever sees it, and a contract path containing spaces, an
  // apostrophe or an ampersand quietly turns it into something that no longer
  // parses — which is exactly what happened the first time.
  //
  // 17 is wdFormatPDF. Word is closed in a finally so a failed conversion
  // cannot leave an invisible WINWORD.EXE holding the file open.
  const scriptPath = path.join(outDir, 'convert.ps1');
  const ps = [
    "$ErrorActionPreference = 'Stop'",
    '$src = ' + psLiteral(inputPath),
    '$dst = ' + psLiteral(outPath),
    '$word = New-Object -ComObject Word.Application',
    '$word.Visible = $false',
    'try {',
    '  $doc = $word.Documents.Open($src, $false, $true)',
    '  $doc.SaveAs([ref]$dst, [ref]17)',
    '  $doc.Close($false)',
    '} finally { $word.Quit() }',
  ].join(String.fromCharCode(13, 10));
  fs.writeFileSync(scriptPath, ps, 'utf8');

  try {
    await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath]);
    return fs.existsSync(outPath) ? outPath : null;
  } catch (err) {
    const first = String(err.stderr || err.message).split(String.fromCharCode(10))[0];
    console.warn('\u26a0  Word could not convert the document:', first.slice(0, 160));
    return null;
  }
}

const isWordFile = (filePath) => /\.docx?$/i.test(String(filePath || ''));

// Returns the path of a PDF rendition, or null when no converter is available.
// Never throws: a failed conversion leaves a document as Word, it does not
// fail the upload.
async function convertWordToPdf(inputPath) {
  if (!inputPath || !isWordFile(inputPath) || !fs.existsSync(inputPath)) return null;

  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docx2pdf-'));
  try {
    const produced = (await convertWithLibreOffice(inputPath, outDir))
      || (await convertWithWord(inputPath, outDir));
    if (!produced) return null;

    // Move it out of the temporary directory before that is removed, and never
    // over the top of something already there.
    const base = path.basename(inputPath, path.extname(inputPath));
    let finalPath = path.join(path.dirname(inputPath), base + '.pdf');
    let n = 2;
    while (fs.existsSync(finalPath)) {
      finalPath = path.join(path.dirname(inputPath), base + '-' + n + '.pdf');
      n += 1;
    }
    fs.copyFileSync(produced, finalPath);
    return finalPath;
  } catch (err) {
    console.warn('\u26a0  Word to PDF conversion failed:', err.message);
    return null;
  } finally {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
}

// Whether any converter is present, so startup can say so once rather than
// leaving it to be discovered when a page download quietly hands back a whole
// document instead of the page that was asked for.
async function converterAvailable() {
  for (const bin of LIBREOFFICE_CANDIDATES) {
    try {
      await run(bin, ['--version'], { timeout: 10000 });
      return 'LibreOffice (' + bin + ')';
    } catch (_) { /* next candidate */ }
  }
  if (process.platform === 'win32') {
    try {
      await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
        "$w = New-Object -ComObject Word.Application; $w.Quit(); 'ok'"], { timeout: 30000 });
      return 'Microsoft Word';
    } catch (_) { /* none */ }
  }
  return null;
}

module.exports = { convertWordToPdf, converterAvailable, isWordFile };
