const pool = require('../../config/db');

async function listNotifications(req, res) {
  const [rows] = await pool.query(
    'SELECT notification_id, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.user_id]
  );
  return res.json(rows);
}

async function markRead(req, res) {
  const { id } = req.params;

  const [result] = await pool.query(
    'UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
    [id, req.user.user_id]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  return res.json({ message: 'Marked as read' });
}

module.exports = { listNotifications, markRead };
