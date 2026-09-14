const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const crypto = require('crypto');
const connectDB = require('./config/db');
const { sendReminder } = require('./utils/mailer');
const { safeNotify } = require('./utils/notifications');
const Role = require('./models/Role');
const { auditApiRequest } = require('./middleware/auditRequest');

dotenv.config();

const app = express();
app.set('trust proxy', 1);
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] === 'http') {
    return res.redirect(`https://${req.headers.host}${req.originalUrl}`);
  }
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  next();
});
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
}));
app.use(express.json({ limit: '256kb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from the React build folder
app.use(express.static(path.join(__dirname, 'client/dist')));

app.get('/api', (req, res) => {
  res.json({ message: 'ICAMS API is running' });
});

const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many public requests. Please try again later.' },
});

const publicSubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many submissions. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Try again later.' },
});

app.use('/api/public/submissions', publicSubmissionLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/resend-verification', authLimiter);
app.use('/api', auditApiRequest);
app.use('/api/public', publicApiLimiter, require('./routes/publicPortal'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/procurement', require('./routes/procurement'));
app.use('/api/procurement-records', require('./routes/procurementRecords'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/leave', require('./routes/leave'));
app.use('/api/visitors', require('./routes/visitors'));
app.use('/api/meetings', require('./routes/meetings'));
app.use('/api/committees', require('./routes/committees'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/interns', require('./routes/interns'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/mcas', require('./routes/mcas'));
app.use('/api/communications', require('./routes/communications'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/order-papers', require('./routes/orderPapers'));
app.use('/api/hansard', require('./routes/hansard'));
app.use('/api/sitting-allowances', require('./routes/sittingAllowances'));
app.use('/api/hr', require('./routes/hr'));
app.use('/api/assistant', require('./routes/assistant'));
app.use('/api/ai-knowledge', require('./routes/aiKnowledge'));
app.use('/api/security', require('./routes/security'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/public/reports', require('./routes/reports'));

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

const ensureDefaultRoles = async () => {
  const roleNames = [
    'Super Admin',
    'ICT Admin',
    'HR Officer',
    'Clerk',
    'Speaker',
    'Finance Officer',
    'Committee Officer',
    'Procurement Officer',
    'Registry',
    'MCA',
    'Intern',
    'Security Officer',
  ];

  for (const name of roleNames) {
    await Role.findOneAndUpdate(
      { name },
      { name, description: `${name} role` },
      { upsert: true, new: true }
    );
  }
  console.log('Default roles seeded or already present');
};

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

const startServer = async () => {
  console.log('Starting server with env vars:');
  console.log('MONGO_URI=' + (process.env.MONGO_URI ? 'set' : 'missing'));
  console.log('JWT_SECRET=' + (process.env.JWT_SECRET ? 'set' : 'missing'));
  console.log('SEED_ADMIN_EMAIL=' + (process.env.SEED_ADMIN_EMAIL ? 'set' : 'missing'));
  console.log('SEED_ADMIN_PASSWORD=' + (process.env.SEED_ADMIN_PASSWORD ? 'set' : 'missing'));

  try {
    await connectDB();
    await ensureDefaultRoles();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    }).on('error', (err) => {
      console.error('Server failed to listen:', err);
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

const Meeting = require('./models/Meeting');

const sendMeetingReminders = async () => {
  try {
    const now = new Date();
    const soon = new Date(now.getTime() + 15 * 60 * 1000);
    const meetings = await Meeting.find({
      startTime: { $gte: now, $lte: soon },
      reminderSent: false,
    }).populate('committee attendees');

    if (meetings.length === 0) return;

    const sentMeetingIds = [];

    for (const meeting of meetings) {
      const attendeeEmails = meeting.attendees
        .filter((attendee) => attendee?.email)
        .map((attendee) => attendee.email);

      if (attendeeEmails.length === 0) {
        console.log(`Reminder skipped for meeting '${meeting.title}' because no attendee emails were found.`);
        sentMeetingIds.push(meeting._id);
        continue;
      }

      const subject = `Reminder: ${meeting.title}`;
      const text = `Your meeting is scheduled to start at ${meeting.startTime.toLocaleString()} in ${meeting.room || 'TBD'}.

Agenda: ${meeting.agenda || 'No agenda details provided.'}

Please arrive on time and confirm attendance through the meeting portal.`;
      const html = `<p>Your meeting <strong>${meeting.title}</strong> is scheduled to start at <strong>${meeting.startTime.toLocaleString()}</strong> in <strong>${meeting.room || 'TBD'}</strong>.</p>
        <p><strong>Agenda:</strong> ${meeting.agenda || 'No agenda details provided.'}</p>
        <p>Please arrive on time and confirm attendance through the meeting portal.</p>`;

      try {
        await sendReminder({
          to: attendeeEmails.join(','),
          subject,
          text,
          html,
        });
        await safeNotify({
          userIds: meeting.attendees.map((attendee) => attendee._id),
          type: 'meeting_reminder',
          title: subject,
          body: text,
          link: `/meetings/${meeting._id}`,
        });
        sentMeetingIds.push(meeting._id);
      } catch (emailError) {
        console.error(`Failed to send reminder for meeting '${meeting.title}':`, emailError.message);
      }
    }

    if (sentMeetingIds.length > 0) {
      await Meeting.updateMany(
        { _id: { $in: sentMeetingIds } },
        { $set: { reminderSent: true } }
      );
    }
  } catch (error) {
    console.error('Meeting reminder job failed:', error.message);
  }
};

setInterval(sendMeetingReminders, 60 * 1000);

const sendOverdueActionReminders = async () => {
  try {
    const now = new Date();
    const meetings = await Meeting.find({ 'actionItems.deadline': { $lt: now } }).select('title actionItems');
    for (const meeting of meetings) {
      let changed = false;
      for (const item of meeting.actionItems || []) {
        if (!item.deadline || item.deadline >= now || ['Completed', 'Cancelled'].includes(item.status) || item.escalatedAt) continue;
        item.status = 'Overdue';
        item.escalatedAt = now;
        changed = true;
        await safeNotify({
          userIds: [item.assignedTo, item.nextResponsibleOfficer],
          type: 'deadline',
          title: 'Action item overdue',
          body: `The action item "${item.title}" for ${meeting.title} is overdue.`,
          link: `/meetings/${meeting._id}`,
          critical: true,
        });
      }
      if (changed) await meeting.save();
    }
  } catch (error) {
    console.error('Overdue action reminder job failed:', error.message);
  }
};

setInterval(sendOverdueActionReminders, 60 * 1000);
