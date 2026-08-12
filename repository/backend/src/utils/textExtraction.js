const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Best-effort text extraction for the plagiarism-check feature. .doc (old binary Word format)
// isn't supported by mammoth - only .docx - so it falls through to an empty string rather
// than throwing, since a failed extraction shouldn't block the document upload itself.
async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === '.pdf') {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text || '';
    }

    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value || '';
    }
  } catch (err) {
    console.error(`[textExtraction] Failed to extract text from ${filePath}:`, err.message);
  }

  return '';
}

module.exports = { extractText };
