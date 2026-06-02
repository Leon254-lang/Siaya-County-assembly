const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { sendReminder } = require('./utils/mailer');
const Role = require('./models/Role');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from the React build folder
app.use(express.static(path.join(__dirname, 'client/dist')));

app.get('/', (req, res) => {
  res.json({ message: 'ICAMS API is running' });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/procurement', require('./routes/procurement'));
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
    'Finance Officer',
    'Committee Officer',
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
