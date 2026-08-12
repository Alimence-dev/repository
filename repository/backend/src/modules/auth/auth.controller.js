const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../../config/db');
const { isValidEmail } = require('../../utils/validators');

const SALT_ROUNDS = 10;
const SELF_REGISTERABLE_ROLES = ['student', 'supervisor'];

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

async function register(req, res) {
  const { full_name, email, password, role, department, expertise_tags } = req.body;

  if (!full_name || !email || !password || !role) {
    return res.status(400).json({ message: 'full_name, email, password, and role are required' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'email must be a valid email address' });
  }

  if (!SELF_REGISTERABLE_ROLES.includes(role)) {
    return res.status(400).json({
      message: `role must be one of: ${SELF_REGISTERABLE_ROLES.join(', ')} (coordinator accounts are assigned by an existing coordinator)`,
    });
  }

  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ message: 'password must be a string of at least 8 characters' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  try {
    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, department, expertise_tags)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [full_name, email, passwordHash, role, department || null, expertise_tags || null]
    );

    const token = signToken({ user_id: result.insertId, role });

    return res.status(201).json({
      token,
      user: { user_id: result.insertId, full_name, email, role, department: department || null },
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'An account with this email already exists' });
    }
    throw err;
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  const user = rows[0];

  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ message: 'This account has been deactivated' });
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const token = signToken({ user_id: user.user_id, role: user.role });

  return res.json({
    token,
    user: {
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      department: user.department,
    },
  });
}

module.exports = { register, login };
