const pool = require('../config/db');

async function recordAudit(userId, action, entityAffected) {
  await pool.query(
    'INSERT INTO audit_log (user_id, action, entity_affected) VALUES (?, ?, ?)',
    [userId, action, entityAffected || null]
  );
}

module.exports = { recordAudit };
