const pool = require('../../config/db');
const { recordAudit } = require('../../utils/auditLog');
const { notifyUserWithEmail } = require('../../utils/notify');
const { predictDeadline } = require('../../ai/deadlinePrediction');

const VALID_STAGES = ['proposal', 'in_progress', 'defense', 'completed'];

async function listProjects(req, res) {
  const { role, user_id } = req.user;
  const { stage } = req.query;

  const conditions = [];
  const params = [];

  if (role === 'supervisor') {
    conditions.push('p.supervisor_id = ?');
    params.push(user_id);
  } else if (role === 'student') {
    conditions.push('p.student_id = ?');
    params.push(user_id);
  }

  if (stage) {
    conditions.push('p.stage = ?');
    params.push(stage);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [rows] = await pool.query(
    `SELECT p.project_id, p.student_id, s.full_name AS student_name, p.supervisor_id,
            sup.full_name AS supervisor_name, p.topic_id, p.title, p.stage, p.created_at
     FROM projects p
     JOIN users s ON s.user_id = p.student_id
     LEFT JOIN users sup ON sup.user_id = p.supervisor_id
     ${whereClause}
     ORDER BY p.created_at DESC`,
    params
  );

  return res.json(rows);
}

async function getProjectById(req, res) {
  const { id } = req.params;

  const [rows] = await pool.query(
    `SELECT project_id, student_id, supervisor_id, topic_id, title, stage,
            similarity_score, plagiarism_score, predicted_deadline, created_at
     FROM projects WHERE project_id = ?`,
    [id]
  );
  const project = rows[0];
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const { user_id, role } = req.user;
  const isAuthorized = role === 'coordinator' || project.student_id === user_id || project.supervisor_id === user_id;
  if (!isAuthorized) {
    return res.status(403).json({ message: 'Not authorized to view this project' });
  }

  return res.json(project);
}

async function updateStage(req, res) {
  const { id } = req.params;
  const { stage } = req.body;

  if (!VALID_STAGES.includes(stage)) {
    return res.status(400).json({ message: `stage must be one of: ${VALID_STAGES.join(', ')}` });
  }

  const [rows] = await pool.query('SELECT student_id, supervisor_id, title FROM projects WHERE project_id = ?', [id]);
  const project = rows[0];
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const { user_id, role } = req.user;
  if (role === 'supervisor' && project.supervisor_id !== user_id) {
    return res.status(403).json({ message: 'You are not the assigned supervisor for this project' });
  }

  await pool.query('UPDATE projects SET stage = ? WHERE project_id = ?', [stage, id]);
  await recordAudit(user_id, 'update_stage', `projects:${id}`);

  const io = req.app.get('io');
  await notifyUserWithEmail(
    io,
    project.student_id,
    `Your project "${project.title}" has moved to the "${stage}" stage.`,
    'Project stage updated'
  );

  return res.json({ message: 'Stage updated', stage });
}

async function predictProjectDeadline(req, res) {
  const { id } = req.params;

  const [rows] = await pool.query('SELECT supervisor_id FROM projects WHERE project_id = ?', [id]);
  const project = rows[0];
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const { user_id, role } = req.user;
  if (role === 'supervisor' && project.supervisor_id !== user_id) {
    return res.status(403).json({ message: 'You are not the assigned supervisor for this project' });
  }

  const prediction = await predictDeadline(pool, id);
  await pool.query('UPDATE projects SET predicted_deadline = ? WHERE project_id = ?', [
    prediction.predicted_deadline,
    id,
  ]);

  return res.json(prediction);
}

module.exports = { listProjects, getProjectById, updateStage, predictProjectDeadline };
