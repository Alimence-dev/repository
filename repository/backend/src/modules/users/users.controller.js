const pool = require('../../config/db');
const { recordAudit } = require('../../utils/auditLog');
const { isValidEmail } = require('../../utils/validators');

const USER_COLUMNS = 'user_id, full_name, email, role, department, expertise_tags, status, created_at';
const VALID_ROLES = ['student', 'supervisor', 'coordinator', 'admin'];
const VALID_STATUSES = ['active', 'inactive'];

async function getMe(req, res) {
  const [rows] = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE user_id = ?`, [req.user.user_id]);

  if (!rows[0]) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json(rows[0]);
}

async function listUsers(req, res) {
  const { role } = req.query;

  const conditions = [];
  const params = [];
  if (role) {
    conditions.push('role = ?');
    params.push(role);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await pool.query(`SELECT ${USER_COLUMNS} FROM users ${whereClause} ORDER BY user_id`, params);

  return res.json(rows);
}

async function createUser(req, res) {
  const { full_name, email, password, role, department, expertise_tags } = req.body;

  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ message: 'full_name, email, password, and role are required' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'email must be a valid email address' });
  }

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ message: `role must be one of: ${VALID_ROLES.join(', ')}` });
  }

  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ message: 'password must be a string of at least 8 characters' });
  }

  const passwordHash = await require('bcrypt').hash(password, 10);

  try {
    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, department, expertise_tags) VALUES (?, ?, ?, ?, ?, ?)`,
      [full_name, email, passwordHash, role, department || null, expertise_tags || null]
    );

    await recordAudit(req.user.user_id, 'create_user', `users:${result.insertId}`);

    return res.status(201).json({
      user_id: result.insertId,
      full_name,
      email,
      role,
      department: department || null,
      expertise_tags: expertise_tags || null,
      status: 'active',
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }
    throw err;
  }
}

async function getAuditLogs(req, res) {
  const [rows] = await pool.query(
    `SELECT a.log_id AS audit_id, a.user_id AS actor_id, u.full_name AS actor_name, a.action, a.entity_affected, a.timestamp
     FROM audit_log a
     LEFT JOIN users u ON a.user_id = u.user_id
     ORDER BY a.timestamp DESC
     LIMIT 200`
  );

  return res.json(rows);
}

async function updateRole(req, res) {
  const { id } = req.params;
  const { role } = req.body;

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ message: `role must be one of: ${VALID_ROLES.join(', ')}` });
  }

  const [result] = await pool.query('UPDATE users SET role = ? WHERE user_id = ?', [role, id]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'User not found' });
  }

  await recordAudit(req.user.user_id, 'update_role', `users:${id}`);

  return res.json({ message: 'Role updated' });
}

async function updateStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ message: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const [result] = await pool.query('UPDATE users SET status = ? WHERE user_id = ?', [status, id]);
  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'User not found' });
  }

  await recordAudit(req.user.user_id, 'update_status', `users:${id}`);

  return res.json({ message: 'Status updated' });
}

module.exports = { getMe, listUsers, createUser, getAuditLogs, updateRole, updateStatus };
