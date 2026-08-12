const pool = require('../../config/db');

async function archiveProject(req, res) {
  const { projectId } = req.params;
  const { keywords } = req.body;

  const [projectRows] = await pool.query(
    `SELECT p.project_id, p.title, p.stage, t.description AS topic_description, u.department
     FROM projects p
     JOIN topics t ON t.topic_id = p.topic_id
     JOIN users u ON u.user_id = p.student_id
     WHERE p.project_id = ?`,
    [projectId]
  );
  const project = projectRows[0];
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }
  if (project.stage !== 'completed') {
    return res.status(400).json({
      message: `Project must be in the 'completed' stage before archiving (currently '${project.stage}')`,
    });
  }

  const [finalDocRows] = await pool.query(
    `SELECT file_path FROM documents WHERE project_id = ? AND doc_type = 'final' ORDER BY version DESC LIMIT 1`,
    [projectId]
  );
  const finalDoc = finalDocRows[0];
  if (!finalDoc) {
    return res.status(400).json({ message: 'No final document has been uploaded for this project yet' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO repository (project_id, title, keywords, department, year, archived_file_path)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        project.title,
        keywords || project.topic_description || null,
        project.department,
        new Date().getFullYear(),
        finalDoc.file_path,
      ]
    );

    return res.status(201).json({ repository_id: result.insertId, project_id: Number(projectId) });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'This project has already been archived' });
    }
    throw err;
  }
}

async function searchRepository(req, res) {
  const { q, department, year } = req.query;

  const conditions = [];
  const params = [];

  if (q) {
    conditions.push('MATCH(title, keywords) AGAINST (? IN NATURAL LANGUAGE MODE)');
    params.push(q);
  }
  if (department) {
    conditions.push('department = ?');
    params.push(department);
  }
  if (year) {
    conditions.push('year = ?');
    params.push(year);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT repository_id, project_id, title, keywords, department, year, archived_file_path
     FROM repository ${whereClause} ORDER BY year DESC, title`,
    params
  );

  return res.json(rows);
}

module.exports = { archiveProject, searchRepository };
