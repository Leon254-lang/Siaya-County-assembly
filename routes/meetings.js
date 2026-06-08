const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Meeting = require('../models/Meeting');
const Committee = require('../models/Committee');
const Document = require('../models/Document');
const Message = require('../models/Message');
const Announcement = require('../models/Announcement');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');
const { sendReminder } = require('../utils/mailer');

const router = express.Router();
const uploadDir = path.join(__dirname, '../uploads/meetings');
const boardrooms = ['Boardroom 1', 'Boardroom 2', 'Boardroom 3', 'Boardroom 4', 'Boardroom 5'];

const isRoomBooked = async (room, startTime, endTime, excludeMeetingId = null) => {
  if (!room || !startTime || !endTime) return false;

  const query = {
    room,
    startTime: { $lt: new Date(endTime) },
    endTime: { $gt: new Date(startTime) },
  };

  if (excludeMeetingId) {
    query._id = { $ne: excludeMeetingId };
  }

  return await Meeting.exists(query);
};

const ensureInterval = (startTime, endTime) => {
  const start = new Date(startTime);
  if (endTime) return new Date(endTime);
  return new Date(start.getTime() + 60 * 60 * 1000);
};

const computeDecision = (results) => {
  const yes = results.find((item) => item.option.toLowerCase() === 'yes')?.votes || 0;
  const no = results.find((item) => item.option.toLowerCase() === 'no')?.votes || 0;
  const abstain = results.find((item) => item.option.toLowerCase() === 'abstain')?.votes || 0;
  if (yes === no) return yes > 0 ? 'Tie' : 'No clear decision';
  return yes > no ? 'Approved' : 'Rejected';
};
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

const buildMeetingDocument = async (meeting, committee, userId) => {
  const year = new Date().getFullYear();
  const count = await Document.countDocuments({ createdAt: { $gte: new Date(year, 0, 1) } });
  const docNumber = `DOC-${year}-${String(count + 1).padStart(4, '0')}`;
  const document = new Document({
    docNumber,
    title: `Meeting scheduled: ${meeting.title}`,
    description: meeting.agenda || 'A new meeting was scheduled.',
    type: 'minutes',
    category: 'administrative',
    priority: 'medium',
    status: 'pending',
    origin: 'Meeting Scheduler',
    destination: committee?.name || 'Meetings',
    currentDepartment: 'Meetings',
    owner: userId,
    department: committee?._id,
    tags: ['meeting', 'schedule'],
    approvalHistory: [
      {
        action: 'created',
        by: userId,
        comment: 'Meeting created and sent to documents',
      },
    ],
  });
  await document.save();
  return document;
};

router.get('/', verifyToken, async (req, res) => {
  const query = {};
  if (req.query.upcoming === 'true') {
    query.startTime = {
      $gte: new Date(),
      $lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    };
  }

  if (req.query.type) {
    query.meetingType = req.query.type;
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

router.get('/availability', verifyToken, async (req, res) => {
  try {
    const { startTime, endTime } = req.query;
    const now = new Date();
    const query = {
      room: { $in: boardrooms },
      startTime: { $lt: startTime ? new Date(endTime) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      endTime: { $gt: startTime ? new Date(startTime) : now },
    };

    const busyMeetings = await Meeting.find(query)
      .sort({ startTime: 1 })
      .populate('committee attendees');

    const busyRooms = [...new Set(busyMeetings.map((meeting) => meeting.room).filter(Boolean))];
    const availableRooms = boardrooms.filter((room) => !busyRooms.includes(room));

    res.json({ availableRooms, busyRooms, busyMeetings });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load room availability', error: error.message });
  }
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

    await recordAudit({
      req,
      action: 'Sent meeting reminder',
      entity: 'Meeting',
      entityId: meeting._id,
      details: { title: meeting.title },
    });

    return res.json({ message: 'Reminder sent successfully.' });
  } catch (error) {
    console.error(`Failed to send manual reminder for meeting '${meeting.title}':`, error.message);
    return res.status(500).json({ message: 'Failed to send reminder.' });
  }
});

router.post('/', verifyToken, authorizeRoles('Clerk', 'Committee Officer', 'Super Admin'), async (req, res) => {
  const meetingData = { ...req.body };
  const committee = meetingData.committee ? await Committee.findById(meetingData.committee) : null;

  if (meetingData.attendees && Array.isArray(meetingData.attendees)) {
    meetingData.attendance = meetingData.attendees.map((user) => ({ user, status: 'Confirmed' }));
  }

  if (meetingData.room && meetingData.startTime) {
    meetingData.endTime = ensureInterval(meetingData.startTime, meetingData.endTime);
    if (await isRoomBooked(meetingData.room, meetingData.startTime, meetingData.endTime)) {
      return res.status(409).json({ message: `Room ${meetingData.room} is already booked during this time.` });
    }
  }

  const meeting = new Meeting(meetingData);
  await meeting.save();
  await meeting.populate('committee attendees attendance.user');

  try {
    const document = await buildMeetingDocument(meeting, committee, req.user._id);
    if (committee) {
      committee.reports = committee.reports || [];
      committee.reports.push(document._id);
      await committee.save();
    }

    if (meetingData.attendees && meetingData.attendees.length > 0) {
      const message = new Message({
        subject: `Meeting scheduled: ${meeting.title}`,
        body: `A meeting titled "${meeting.title}" has been scheduled for ${new Date(meeting.startTime).toLocaleString()} in ${meeting.room || 'TBD'}. Agenda: ${meeting.agenda || 'No agenda specified.'}`,
        from: req.user._id,
        to: meetingData.attendees,
      });
      await message.save();
    }

    const announcement = new Announcement({
      title: `Meeting scheduled: ${meeting.title}`,
      body: `A meeting has been scheduled for ${new Date(meeting.startTime).toLocaleString()} in ${meeting.room || 'TBD'}. Please review the agenda and prepare accordingly.`,
      type: 'notice',
      createdBy: req.user._id,
    });
    await announcement.save();
  } catch (error) {
    console.error('Failed to create meeting document or communication notice:', error.message);
  }

  await recordAudit({
    req,
    action: 'Scheduled meeting',
    entity: 'Meeting',
    entityId: meeting._id,
    details: {
      title: meeting.title,
      room: meeting.room,
      startTime: meeting.startTime,
      committee: meeting.committee,
    },
  });

  res.status(201).json(meeting);
});

router.put('/:id', verifyToken, authorizeRoles('Clerk', 'Committee Officer', 'Super Admin'), async (req, res) => {
  const updateData = { ...req.body };
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

  const proposedRoom = updateData.room || meeting.room;
  const proposedStartTime = updateData.startTime || meeting.startTime;
  const proposedEndTime = ensureInterval(proposedStartTime, updateData.endTime || meeting.endTime);

  if (proposedRoom && proposedStartTime && proposedEndTime) {
    if (await isRoomBooked(proposedRoom, proposedStartTime, proposedEndTime, meeting._id)) {
      return res.status(409).json({ message: `Room ${proposedRoom} is already booked during this time.` });
    }
  }

  if (updateData.attendees && Array.isArray(updateData.attendees)) {
    meeting.title = updateData.title ?? meeting.title;
    meeting.committee = updateData.committee ?? meeting.committee;
    meeting.room = proposedRoom;
    meeting.startTime = proposedStartTime;
    meeting.endTime = proposedEndTime;
    meeting.notes = updateData.notes ?? meeting.notes;
    meeting.attendees = updateData.attendees;
    meeting.attendance = updateData.attendees.map((user) => ({ user, status: 'Confirmed' }));
    await meeting.save();
    await meeting.populate('committee attendees attendance.user');
    return res.json(meeting);
  }

  const updatedMeeting = await Meeting.findByIdAndUpdate(req.params.id, {
    ...updateData,
    endTime: proposedEndTime,
  }, {
    new: true,
    runValidators: true,
  }).populate('committee attendees attendance.user');

  if (!updatedMeeting) return res.status(404).json({ message: 'Meeting not found' });
  res.json(updatedMeeting);
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

const appendVotingItem = (meeting, item) => ({
  question: item.question,
  description: item.description,
  voteType: item.voteType || 'electronic',
  options: Array.isArray(item.options) ? item.options : [],
  results: (item.options || []).map((option) => ({ option, votes: 0 })),
  voteRecords: [],
  finalDecision: '',
});

router.post('/:id/voting-items', verifyToken, authorizeRoles('Clerk', 'Committee Officer', 'Super Admin'), async (req, res) => {
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

  const items = Array.isArray(req.body.votingItems)
    ? req.body.votingItems
    : req.body.question
      ? [{ question: req.body.question, description: req.body.description, voteType: req.body.voteType, options: req.body.options }]
      : [];

  if (items.length === 0) {
    return res.status(400).json({ message: 'No voting item data provided' });
  }

  items.forEach((item) => {
    meeting.votingItems.push(appendVotingItem(meeting, item));
  });

  await meeting.save();
  await meeting.populate('committee attendees attendance.user');
  res.json(meeting);
});

router.post('/:id/voting-item', verifyToken, authorizeRoles('Clerk', 'Committee Officer', 'Super Admin'), async (req, res) => {
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

  const { question, description, voteType, options } = req.body;
  if (!question || !options || (Array.isArray(options) ? options.length === 0 : true)) {
    return res.status(400).json({ message: 'Invalid voting item payload' });
  }

  meeting.votingItems.push(appendVotingItem(meeting, { question, description, voteType, options }));
  await meeting.save();
  await meeting.populate('committee attendees attendance.user');
  res.json(meeting);
});

router.post('/:id/vote', verifyToken, authorizeRoles('Clerk', 'Committee Officer', 'Super Admin', 'MCA'), async (req, res) => {
  const meeting = await Meeting.findById(req.params.id);
  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

  const { itemId, option } = req.body;
  const item = meeting.votingItems.id(itemId);
  if (!item) {
    return res.status(400).json({ message: 'Voting item not found' });
  }

  const existing = item.results.find((result) => result.option === option);
  if (existing) {
    existing.votes += 1;
  } else {
    item.results.push({ option, votes: 1 });
  }

  item.voteRecords.push({
    voter: req.user._id,
    option,
  });
  item.finalDecision = computeDecision(item.results);
  item.talliedAt = new Date();

  await meeting.save();
  await meeting.populate('committee attendees attendance.user');
  res.json(item);
});

router.get('/:id/voting-summary', verifyToken, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id).populate('committee attendees attendance.user');
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    const summary = meeting.votingItems.map((item) => ({
      _id: item._id,
      question: item.question,
      description: item.description,
      voteType: item.voteType,
      options: item.options,
      results: item.results,
      finalDecision: item.finalDecision || computeDecision(item.results),
      totalVotes: item.results.reduce((sum, result) => sum + (result.votes || 0), 0),
      castCount: item.voteRecords.length,
      talliedAt: item.talliedAt,
    }));

    res.json({ meetingId: meeting._id, title: meeting.title, startTime: meeting.startTime, summary });
  } catch (error) {
    res.status(500).json({ message: 'Error loading voting summary', error: error.message });
  }
});

router.post('/:id/upload-agenda', verifyToken, authorizeRoles('Clerk', 'Committee Officer', 'Super Admin'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No agenda file uploaded' });

  const meeting = await Meeting.findByIdAndUpdate(
    req.params.id,
    { agendaFile: req.file.filename },
    { new: true }
  ).populate('committee attendees attendance.user');

  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

  // Notify attendees that the agenda has been uploaded
  try {
    const attendeeEmails = meeting.attendees
      .filter((a) => a?.email)
      .map((a) => a.email);

    if (attendeeEmails.length > 0) {
      const subject = `Agenda uploaded: ${meeting.title}`;
      const text = `The agenda for the meeting '${meeting.title}' has been uploaded. The meeting is scheduled for ${meeting.startTime?.toLocaleString() || 'N/A'} in ${meeting.room || 'TBD'}.`;
      const html = `<p>The agenda for <strong>${meeting.title}</strong> has been uploaded.</p>
        <p><strong>When:</strong> ${meeting.startTime ? meeting.startTime.toLocaleString() : 'TBD'}</p>
        <p><strong>Where:</strong> ${meeting.room || 'TBD'}</p>
        <p>You can download the agenda from the meeting page.</p>`;

      await sendReminder({ to: attendeeEmails.join(','), subject, text, html });
    }
  } catch (notifyErr) {
    console.error('Failed to notify attendees about agenda upload:', notifyErr.message);
  }

  res.json(meeting);
});

router.post('/:id/upload-minutes', verifyToken, authorizeRoles('Clerk', 'Committee Officer', 'Super Admin'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No minutes file uploaded' });

  const meeting = await Meeting.findByIdAndUpdate(
    req.params.id,
    { minutesFile: req.file.filename },
    { new: true }
  ).populate('committee attendees attendance.user');

  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

  // Notify attendees that minutes are available
  try {
    const attendeeEmails = meeting.attendees
      .filter((a) => a?.email)
      .map((a) => a.email);

    if (attendeeEmails.length > 0) {
      const subject = `Minutes archived: ${meeting.title}`;
      const text = `Minutes for the meeting '${meeting.title}' have been uploaded and archived.`;
      const html = `<p>The minutes for <strong>${meeting.title}</strong> have been uploaded and archived.</p>
        <p>You can download the minutes from the meeting page.</p>`;

      await sendReminder({ to: attendeeEmails.join(','), subject, text, html });
    }
  } catch (notifyErr) {
    console.error('Failed to notify attendees about minutes upload:', notifyErr.message);
  }

  res.json(meeting);
});

module.exports = router;
