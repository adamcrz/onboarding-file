// Bridges the ES-module PDF.js build to the rest of app.js, which is loaded as a
// classic (non-module) script and can't `import` directly.
import * as pdfjsLib from './pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = './vendor/pdfjs/pdf.worker.min.mjs';
window.pdfjsLib = pdfjsLib;
