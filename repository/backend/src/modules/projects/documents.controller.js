const path = require('path');
const pool = require('../../config/db');
const { extractText } = require('../../utils/textExtraction');
const { checkPlagiarism } = require('../../ai/aiServiceClient');

const VALID_DOC_TYPES = ['proposal', 'chapter', 'final'];
const PLAGIARISM_CHECKED_TYPES = ['chapter', 'final'];
const BACKEND_ROOT = path.join(__dirname, '..', '..', '..');

// Best-effort: a document upload should succeed even if the AI service is unreachable or a
// corpus file fails to parse. This is a secondary risk signal on top of the upload, not a gate.
async function runPlagiarismCheck(projectId, filePath) {
  try {
    const text = await extractText(filePath);
    if (!text.trim()) return null;

    const [corpusDocs] = await pool.query(
      `SELECT file_path FROM documents
       WHERE doc_type IN ('chapter', 'final') AND project_id != ?
       ORDER BY uploaded_at DESC LIMIT 20`,
      [projectId]
    );

    const corpusTexts = (
      await Promise.all(corpusDocs.map((d) => extractText(path.join(BACKEND_ROOT, d.file_path))))
    ).filter((t) => t.trim());

    const result = await checkPlagiarism(text, corpusTexts);
    await pool.query('UPDATE projects SET plagiarism_score = ? WHERE project_id = ?', [result.risk_score, projectId]);
    return result;
  } catch (err) {
    console.error('[plagiarism-check] Skipped due to error:', err.message);
    return null;
  }
}

async function uploadDocument(req, res) {
  const projectId = req.params.id;
  const { doc_type } = req.body;

  if (!VALID_DOC_TYPES.includes(doc_type)) {
    return res.status(400).json({ message: `doc_type must be one of: ${VALID_DOC_TYPES.join(', ')}` });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'file is required' });
  }

  const [projectRows] = await pool.query('SELECT student_id FROM projects WHERE project_id = ?', [projectId]);
  const project = projectRows[0];
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }
  if (project.student_id !== req.user.user_id) {
    return res.status(403).json({ message: 'You can only upload documents to your own project' });
  }

  const [versionRows] = await pool.query(
    'SELECT COALESCE(MAX(version), 0) AS maxVersion FROM documents WHERE project_id = ? AND doc_type = ?',
    [projectId, doc_type]
  );
  const nextVersion = versionRows[0].maxVersion + 1;

  const relativePath = path.relative(BACKEND_ROOT, req.file.path);

  const [result] = await pool.query(
    `INSERT INTO documents (project_id, file_path, version, doc_type) VALUES (?, ?, ?, ?)`,
    [projectId, relativePath, nextVersion, doc_type]
  );

  let plagiarism = null;
  if (PLAGIARISM_CHECKED_TYPES.includes(doc_type)) {
    plagiarism = await runPlagiarismCheck(projectId, req.file.path);
  }

  return res.status(201).json({
    document_id: result.insertId,
    project_id: Number(projectId),
    file_path: relativePath,
    version: nextVersion,
    doc_type,
    plagiarism_check: plagiarism,
  });
}

async function listDocuments(req, res) {
  const projectId = req.params.id;

  const [projectRows] = await pool.query(
    'SELECT student_id, supervisor_id FROM projects WHERE project_id = ?',
    [projectId]
  );
  const project = projectRows[0];
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const { user_id, role } = req.user;
  const isAuthorized = role === 'coordinator' || project.student_id === user_id || project.supervisor_id === user_id;
  if (!isAuthorized) {
    return res.status(403).json({ message: 'Not authorized to view these documents' });
  }

  const [rows] = await pool.query(
    'SELECT document_id, file_path, version, doc_type, uploaded_at FROM documents WHERE project_id = ? ORDER BY doc_type, version',
    [projectId]
  );

  return res.json(rows);
}

module.exports = { uploadDocument, listDocuments };
