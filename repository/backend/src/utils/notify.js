const pool = require('../config/db');
const { sendMail } = require('./mailer');

// Records an in-app notification, pushes it over Socket.io if the user is connected,
// and emails them (mailer no-ops quietly if SMTP isn't configured in this environment).
async function notifyUserWithEmail(io, userId, message, emailSubject) {
  const [result] = await pool.query('INSERT INTO notifications (user_id, message) VALUES (?, ?)', [userId, message]);

  io.to(`user:${userId}`).emit('notification', {
    notification_id: result.insertId,
    message,
    created_at: new Date().toISOString(),
  });

  const [rows] = await pool.query('SELECT email FROM users WHERE user_id = ?', [userId]);
  const email = rows[0]?.email;
  if (email) {
    await sendMail(email, emailSubject, message);
  }
}

module.exports = { notifyUserWithEmail };
