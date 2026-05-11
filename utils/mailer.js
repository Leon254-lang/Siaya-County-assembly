const nodemailer = require('nodemailer');

const createTransporter = () => {
  const {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASS,
    EMAIL_SECURE,
  } = process.env;

  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
    console.warn('Email reminder config incomplete. Reminder emails will fall back to console only.');
    return null;
  }

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(EMAIL_PORT),
    secure: EMAIL_SECURE === 'true',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
};

const sendReminder = async ({ to, subject, text, html }) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log('Reminder email fallback:', { to, subject, text });
    return;
  }

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
  });

  console.log(`Reminder email sent to ${to}: ${info.messageId}`);
};

module.exports = { sendReminder };
