const pool = require('../../config/db');
const { notifyUserWithEmail } = require('../../utils/notify');
const { isFiniteNumber } = require('../../utils/validators');

async function addFeedback(req, res) {
  const { id } = req.params;
  const { comment, rating } = req.body;

  if (!comment && rating === undefined) {
    return res.status(400).json({ message: 'comment or rating is required' });
  }
  if (rating !== undefined && (!isFiniteNumber(rating) || rating < 1 || rating > 5)) {
    return res.status(400).json({ message: 'rating must be a number between 1 and 5' });
  }

  const [projectRows] = await pool.query(
    'SELECT student_id, supervisor_id, title FROM projects WHERE project_id = ?',
    [id]
  );
  const project = projectRows[0];
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const { user_id, role } = req.user;
  if (role === 'supervisor' && project.supervisor_id !== user_id) {
    return res.status(403).json({ message: 'You are not the assigned supervisor for this project' });
  }

  const [result] = await pool.query(
    'INSERT INTO feedback (project_id, given_by, comment, rating) VALUES (?, ?, ?, ?)',
    [id, user_id, comment || null, rating ?? null]
  );

  const io = req.app.get('io');
  await notifyUserWithEmail(
    io,
    project.student_id,
    `New feedback was posted on your project "${project.title}".`,
    'New feedback on your project'
  );

  return res.status(201).json({
    feedback_id: result.insertId,
    project_id: Number(id),
    given_by: user_id,
    comment: comment || null,
    rating: rating ?? null,
  });
}

async function listFeedback(req, res) {
  const { id } = req.params;

  const [projectRows] = await pool.query('SELECT student_id, supervisor_id FROM projects WHERE project_id = ?', [id]);
  const project = projectRows[0];
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const { user_id, role } = req.user;
  const isAuthorized = role === 'coordinator' || project.student_id === user_id || project.supervisor_id === user_id;
  if (!isAuthorized) {
    return res.status(403).json({ message: 'Not authorized to view this feedback' });
  }

  const [rows] = await pool.query(
    `SELECT f.feedback_id, f.comment, f.rating, f.created_at, f.given_by, u.full_name AS given_by_name
     FROM feedback f JOIN users u ON u.user_id = f.given_by
     WHERE f.project_id = ? ORDER BY f.created_at DESC`,
    [id]
  );

  return res.json(rows);
}

module.exports = { addFeedback, listFeedback };
