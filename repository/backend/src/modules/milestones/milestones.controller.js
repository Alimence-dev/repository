const pool = require('../../config/db');
const { isFiniteNumber } = require('../../utils/validators');

const VALID_STATUSES = ['pending', 'submitted', 'approved', 'late'];
const DEFAULT_MILESTONES = ['Proposal', 'Chapter 1', 'Chapter 2', 'Chapter 3', 'Final', 'Defense'];

// Called from proposals.controller.js right after a project is created -
// the "Proposal" milestone starts out submitted since creating the project IS submitting the proposal.
async function createDefaultMilestones(projectId) {
  const rows = DEFAULT_MILESTONES.map((name) => [
    projectId,
    name,
    name === 'Proposal' ? 'submitted' : 'pending',
    name === 'Proposal' ? 100 : 0,
  ]);

  await pool.query('INSERT INTO milestones (project_id, name, status, progress_percent) VALUES ?', [rows]);
}

async function listMilestones(req, res) {
  const { id } = req.params;

  const [projectRows] = await pool.query('SELECT student_id, supervisor_id FROM projects WHERE project_id = ?', [id]);
  const project = projectRows[0];
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const { user_id, role } = req.user;
  const isAuthorized = role === 'coordinator' || project.student_id === user_id || project.supervisor_id === user_id;
  if (!isAuthorized) {
    return res.status(403).json({ message: 'Not authorized to view these milestones' });
  }

  const [rows] = await pool.query(
    `SELECT milestone_id, name, status, progress_percent, due_date, completed_at
     FROM milestones WHERE project_id = ? ORDER BY milestone_id`,
    [id]
  );

  return res.json(rows);
}

async function updateMilestone(req, res) {
  const { id, milestoneId } = req.params;
  const { status, progress_percent, due_date } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ message: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  if (progress_percent !== undefined && (!isFiniteNumber(progress_percent) || progress_percent < 0 || progress_percent > 100)) {
    return res.status(400).json({ message: 'progress_percent must be a number between 0 and 100' });
  }

  const [projectRows] = await pool.query('SELECT supervisor_id FROM projects WHERE project_id = ?', [id]);
  const project = projectRows[0];
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const { user_id, role } = req.user;
  if (role === 'supervisor' && project.supervisor_id !== user_id) {
    return res.status(403).json({ message: 'You are not the assigned supervisor for this project' });
  }

  const fields = [];
  const params = [];
  if (status) {
    fields.push('status = ?');
    params.push(status);
    if (status === 'approved') {
      fields.push('completed_at = NOW()');
    }
  }
  if (progress_percent !== undefined) {
    fields.push('progress_percent = ?');
    params.push(progress_percent);
  }
  if (due_date) {
    fields.push('due_date = ?');
    params.push(due_date);
  }

  if (fields.length === 0) {
    return res.status(400).json({ message: 'Nothing to update' });
  }

  params.push(id, milestoneId);
  const [result] = await pool.query(
    `UPDATE milestones SET ${fields.join(', ')} WHERE project_id = ? AND milestone_id = ?`,
    params
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Milestone not found' });
  }

  return res.json({ message: 'Milestone updated' });
}

module.exports = { createDefaultMilestones, listMilestones, updateMilestone };
