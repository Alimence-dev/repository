const pool = require('../../config/db');
const { recordAudit } = require('../../utils/auditLog');
const { rankSupervisors } = require('../../ai/supervisorAllocation');

async function getRecommendations(req, res) {
  const { projectId } = req.query;

  if (!projectId) {
    return res.status(400).json({ message: 'projectId query parameter is required' });
  }

  const [projectRows] = await pool.query(
    `SELECT p.project_id, p.title, t.description
     FROM projects p JOIN topics t ON t.topic_id = p.topic_id
     WHERE p.project_id = ?`,
    [projectId]
  );
  const project = projectRows[0];
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const topicText = `${project.title} ${project.description || ''}`;

  const [supervisors] = await pool.query(
    `SELECT u.user_id, u.full_name, u.expertise_tags,
            COUNT(p.project_id) AS active_project_count
     FROM users u
     LEFT JOIN projects p ON p.supervisor_id = u.user_id AND p.stage != 'completed'
     WHERE u.role = 'supervisor' AND u.status = 'active'
     GROUP BY u.user_id, u.full_name, u.expertise_tags`
  );

  const ranked = rankSupervisors(topicText, supervisors);
  return res.json(ranked);
}

async function createAllocation(req, res) {
  const { student_id, supervisor_id, project_id, match_score } = req.body;

  if (!student_id || !supervisor_id || !project_id) {
    return res.status(400).json({ message: 'student_id, supervisor_id, and project_id are required' });
  }

  const [projectRows] = await pool.query('SELECT student_id FROM projects WHERE project_id = ?', [project_id]);
  const project = projectRows[0];
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }
  if (project.student_id !== Number(student_id)) {
    return res.status(400).json({ message: 'student_id does not match the student on this project' });
  }

  const [supervisorRows] = await pool.query(
    "SELECT user_id FROM users WHERE user_id = ? AND role = 'supervisor' AND status = 'active'",
    [supervisor_id]
  );
  if (!supervisorRows[0]) {
    return res.status(400).json({ message: 'supervisor_id does not refer to an active supervisor' });
  }

  await pool.query(
    `INSERT INTO supervisor_allocations (student_id, supervisor_id, match_score, approved_by)
     VALUES (?, ?, ?, ?)`,
    [student_id, supervisor_id, match_score ?? null, req.user.user_id]
  );

  await pool.query('UPDATE projects SET supervisor_id = ? WHERE project_id = ?', [supervisor_id, project_id]);

  await recordAudit(req.user.user_id, 'allocate_supervisor', `projects:${project_id}`);

  return res.status(201).json({ message: 'Supervisor allocated', project_id: Number(project_id), supervisor_id });
}

module.exports = { getRecommendations, createAllocation };
