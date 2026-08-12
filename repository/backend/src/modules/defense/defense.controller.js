const pool = require('../../config/db');
const { recordAudit } = require('../../utils/auditLog');
const { notifyUserWithEmail } = require('../../utils/notify');
const { isValidDate } = require('../../utils/validators');
const { findAvailableSlot } = require('../../ai/defenseScheduling');

async function scheduleDefense(req, res) {
  const { project_id, panel_members, room, candidate_dates } = req.body;

  if (!project_id || !room || !Array.isArray(panel_members) || panel_members.length === 0) {
    return res.status(400).json({ message: 'project_id, room, and a non-empty panel_members array are required' });
  }
  if (!Array.isArray(candidate_dates) || candidate_dates.length === 0 || !candidate_dates.every(isValidDate)) {
    return res.status(400).json({ message: 'candidate_dates must be a non-empty array of valid ISO datetimes' });
  }

  const [projectRows] = await pool.query(
    'SELECT project_id, student_id, title, stage FROM projects WHERE project_id = ?',
    [project_id]
  );
  const project = projectRows[0];
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }
  if (project.stage !== 'defense') {
    return res.status(400).json({
      message: `Project is not ready for defense scheduling (must be in the 'defense' stage, currently '${project.stage}')`,
    });
  }

  const [panelRows] = await pool.query('SELECT user_id FROM users WHERE user_id IN (?)', [panel_members]);
  if (panelRows.length !== new Set(panel_members).size) {
    return res.status(400).json({ message: 'One or more panel_members do not refer to an existing user' });
  }

  const [existing] = await pool.query('SELECT room, scheduled_date, panel_members FROM defense_schedule');

  const candidateSlots = candidate_dates.map((d) => ({ scheduled_date: d, room }));
  const slot = findAvailableSlot(candidateSlots, existing, panel_members);

  if (!slot) {
    return res.status(409).json({ message: 'No conflict-free slot found among the given candidate dates' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO defense_schedule (project_id, panel_members, scheduled_date, room, status)
       VALUES (?, ?, ?, ?, 'scheduled')`,
      [project_id, JSON.stringify(panel_members), slot.scheduled_date, room]
    );

    const io = req.app.get('io');
    const message = `Defense for "${project.title}" has been scheduled for ${new Date(slot.scheduled_date).toLocaleString()} in ${room}.`;
    const recipients = [project.student_id, ...panel_members];
    await Promise.all(
      [...new Set(recipients)].map((userId) => notifyUserWithEmail(io, userId, message, 'Defense scheduled'))
    );

    return res.status(201).json({
      defense_id: result.insertId,
      project_id: Number(project_id),
      panel_members,
      scheduled_date: slot.scheduled_date,
      room,
      status: 'scheduled',
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'This project already has a defense scheduled' });
    }
    throw err;
  }
}

async function listDefenses(req, res) {
  const [rows] = await pool.query(
    `SELECT d.defense_id, d.project_id, p.title, s.full_name AS student_name,
            d.scheduled_date, d.room, d.status, d.result
     FROM defense_schedule d
     JOIN projects p ON p.project_id = d.project_id
     JOIN users s ON s.user_id = p.student_id
     ORDER BY d.scheduled_date DESC`
  );
  return res.json(rows);
}

async function getDefense(req, res) {
  const { projectId } = req.params;

  const [projectRows] = await pool.query('SELECT student_id, supervisor_id FROM projects WHERE project_id = ?', [
    projectId,
  ]);
  const project = projectRows[0];
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }

  const { user_id, role } = req.user;
  const isAuthorized = role === 'coordinator' || project.student_id === user_id || project.supervisor_id === user_id;
  if (!isAuthorized) {
    return res.status(403).json({ message: 'Not authorized to view this defense' });
  }

  const [rows] = await pool.query(
    `SELECT defense_id, project_id, panel_members, scheduled_date, room, status, result
     FROM defense_schedule WHERE project_id = ?`,
    [projectId]
  );
  const defense = rows[0];
  if (!defense) {
    return res.status(404).json({ message: 'No defense scheduled for this project yet' });
  }

  // mysql2 returns JSON columns as raw strings, not parsed values.
  if (typeof defense.panel_members === 'string') {
    defense.panel_members = JSON.parse(defense.panel_members);
  }

  return res.json(defense);
}

async function recordResult(req, res) {
  const { id } = req.params;
  const { result } = req.body;

  if (!result) {
    return res.status(400).json({ message: 'result is required' });
  }

  const [rows] = await pool.query('SELECT project_id FROM defense_schedule WHERE defense_id = ?', [id]);
  const defense = rows[0];
  if (!defense) {
    return res.status(404).json({ message: 'Defense not found' });
  }

  await pool.query("UPDATE defense_schedule SET result = ?, status = 'completed' WHERE defense_id = ?", [result, id]);
  await recordAudit(req.user.user_id, 'record_defense_result', `defense_schedule:${id}`);

  return res.json({ message: 'Result recorded', result, status: 'completed' });
}

module.exports = { scheduleDefense, listDefenses, getDefense, recordResult };
