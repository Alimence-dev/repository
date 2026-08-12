const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter !== undefined) return transporter;

  if (!process.env.MAIL_HOST || !process.env.MAIL_USER) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT) || 587,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD },
  });

  return transporter;
}

async function sendMail(to, subject, text) {
  const t = getTransporter();

  if (!t) {
    console.log(`[mailer] SMTP not configured - skipped email to ${to}: "${subject}"`);
    return;
  }

  try {
    await t.sendMail({ from: process.env.MAIL_FROM, to, subject, text });
  } catch (err) {
    console.error('[mailer] Failed to send email:', err.message);
  }
}

module.exports = { sendMail };
