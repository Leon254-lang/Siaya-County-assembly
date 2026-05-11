const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Meeting = require('../models/Meeting');
const { verifyToken } = require('../middleware/auth');
const { sendReminder } = require('../utils/mailer');

const router = express.Router();
const uploadDir = path.join(__dirname, '../uploads/meetings');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  },
});

const upload = multer({ storage });

router.get('/', verifyToken, async (req, res) => {
  const query = {};
  if (req.query.upcoming === 'true') {
    query.startTime = {
      $gte: new Date(),
      $lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    };
  }

  const meetings = await Meeting.find(query)
    .sort({ startTime: 1 })
    .populate('committee attendees attendance.user');
  res.json(meetings);
});

router.get('/reminders', verifyToken, async (req, res) => {
  const now = new Date();
  const soon = new Date(now.getTime() + 15 * 60 * 1000);
  const reminders = await Meeting.find({
    startTime: { $gte: now, $lte: soon },
    reminderSent: false,
  })
    .sort({ startTime: 1 })
    .populate('committee attendees');

  res.json(reminders);
});

router.get('/:id', verifyToken, async (req, res) => {
  const meeting = await Meeting.findById(req.params.id).populate('committee attendees attendance.user');
  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
  res.json(meeting);
});

router.post('/:id/send-reminder', verifyToken, async (req, res) => {
  const meeting = await Meeting.findById(req.params.id).populate('committee attendees');
  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

  const attendeeEmails = meeting.attendees
    .filter((attendee) => attendee?.email)
    .map((attendee) => attendee.email);

  if (attendeeEmails.length === 0) {
    return res.status(400).json({ message: 'No attendee email addresses are available for this meeting.' });
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
    meeting.reminderSent = true;
    await meeting.save();
    return res.json({ message: 'Reminder sent successfully.' });
  } catch (error) {
    console.error(`Failed to send manual reminder for meeting '${meeting.title}':`, error.message);
    return res.status(500).json({ message: 'Failed to send reminder.' });
  }
});

router.post('/', verifyToken, async (req, res) => {
  const meetingData = { ...req.body };
  if (meetingData.attendees && Array.isArray(meetingData.attendees)) {
    meetingData.attendance = meetingData.attendees.map((user) => ({ user, status: 'Confirmed' }));
  }

  const meeting = new Meeting(meetingData);
  await meeting.save();
  await meeting.populate('committee attendees attendance.user');
  res.status(201).json(meeting);
});

router.put('/:id', verifyToken, async (req, res) => {
  const updateData = { ...req.body };
  if (updateData.attendees && Array.isArray(updateData.attendees)) {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    meeting.title = updateData.title ?? meeting.title;
    meeting.committee = updateData.committee ?? meeting.committee;
    meeting.room = updateData.room ?? meeting.room;
    meeting.startTime = updateData.startTime ?? meeting.startTime;
    meeting.endTime = updateData.endTime ?? meeting.endTime;
    meeting.notes = updateData.notes ?? meeting.notes;
    meeting.attendees = updateData.attendees;
    meeting.attendance = updateData.attendees.map((user) => ({ user, status: 'Confirmed' }));
    await meeting.save();
    await meeting.populate('committee attendees attendance.user');
    return res.json(meeting);
  }

  const meeting = await Meeting.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  }).populate('committee attendees attendance.user');

  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
  res.json(meeting);
});

router.post('/:id/attendance', verifyToken, async (req, res) => {
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

  if (!Array.isArray(req.body.attendance)) {
    return res.status(400).json({ message: 'Attendance array is required' });
  }

  meeting.attendance = req.body.attendance.map((entry) => ({
    user: entry.user,
    status: entry.status || 'Pending',
    checkedInAt: entry.checkedInAt ? new Date(entry.checkedInAt) : undefined,
  }));

  await meeting.save();
  await meeting.populate('committee attendees attendance.user');
  res.json(meeting);
});

router.post('/:id/checkin', verifyToken, async (req, res) => {
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

  const { userId } = req.body;
  const userEntry = meeting.attendance.find((entry) => entry.user.toString() === userId);
  if (userEntry) {
    userEntry.status = 'Present';
    userEntry.checkedInAt = new Date();
  } else {
    meeting.attendance.push({ user: userId, status: 'Present', checkedInAt: new Date() });
  }

  await meeting.save();
  await meeting.populate('committee attendees attendance.user');
  res.json(meeting);
});

router.post('/:id/upload-agenda', verifyToken, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No agenda file uploaded' });

  const meeting = await Meeting.findByIdAndUpdate(
    req.params.id,
    { agendaFile: req.file.filename },
    { new: true }
  ).populate('committee attendees attendance.user');

  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
  res.json(meeting);
});

router.post('/:id/upload-minutes', verifyToken, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No minutes file uploaded' });

  const meeting = await Meeting.findByIdAndUpdate(
    req.params.id,
    { minutesFile: req.file.filename },
    { new: true }
  ).populate('committee attendees attendance.user');

  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
  res.json(meeting);
});

module.exports = router;
