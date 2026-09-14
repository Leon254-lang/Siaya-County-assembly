const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const Committee = require('../models/Committee');
const OrderPaper = require('../models/OrderPaper');
const Hansard = require('../models/Hansard');
const Bill = require('../models/Bill');
const PublicFeedback = require('../models/PublicFeedback');
const Meeting = require('../models/Meeting');
const Document = require('../models/Document');
const FinanceRecord = require('../models/FinanceRecord');

const router = express.Router();
const cleanText = (value, max) => String(value || '').trim().slice(0, max);

router.get('/members', async (req, res) => {
  const role = await require('../models/Role').findOne({ name: 'MCA' });
  const members = role ? await User.find({ role: role._id, isActive: true }).select('member_id name full_name ward constituency position party photo profilePic') : [];
  res.json(members);
});

router.get('/committees', async (req, res) => {
  const committees = await Committee.find().populate('chairperson viceChairperson members', 'name full_name member_id ward party').select('name description chairperson viceChairperson members');
  res.json(committees);
});

router.get('/order-papers', async (req, res) => {
  const papers = await OrderPaper.find({ status: 'Published' }).select('title sessionDate sessionType status items notes').sort({ sessionDate: -1 });
  res.json(papers);
});

router.get('/hansard', async (req, res) => {
  const records = await Hansard.find({ status: 'Published' }).populate('sitting', 'title startTime endTime').populate('entries.speaker entries.member', 'name full_name member_id position').select('title sessionDate sessionType sitting entries publishedAt currentVersion').sort({ sessionDate: -1 });
  res.json(records);
});

router.get('/bills', async (req, res) => {
  const bills = await Bill.find({ status: { $in: ['Approved', 'Resolved'] } }).populate('committee', 'name').select('title summary status committee motions createdAt updatedAt').sort({ updatedAt: -1 });
  res.json(bills.map((bill) => ({
    ...bill.toObject(),
    motions: (bill.motions || []).filter((motion) => motion.status === 'Accepted').map((motion) => ({
      _id: motion._id,
      text: motion.text,
      status: motion.status,
      createdAt: motion.createdAt,
    })),
  })));
});

router.get('/calendar', async (req, res) => {
  const meetings = await Meeting.find({ startTime: { $gte: new Date() }, status: { $ne: 'Cancelled' } })
    .sort({ startTime: 1 }).limit(50).populate('committee', 'name')
    .select('title startTime endTime meetingType sittingType room committee agenda');
  res.json(meetings.map((meeting) => ({
    _id: meeting._id,
    title: meeting.title,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    meetingType: meeting.meetingType,
    sittingType: meeting.sittingType,
    committee: meeting.committee?.name || null,
    agenda: meeting.agenda,
  })));
});

router.get('/publications', async (req, res) => {
  const [reports, budgets, notices] = await Promise.all([
    Document.find({ status: 'published' }).select('title document_type type updatedAt').sort({ updatedAt: -1 }).limit(50),
    FinanceRecord.find({ category: 'Budget', status: { $in: ['Approved', 'Completed'] } }).select('title description amountApproved status updatedAt').sort({ updatedAt: -1 }).limit(50),
    require('../models/Announcement').find({ type: 'notice', $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }).select('title body createdAt expiresAt').sort({ createdAt: -1 }).limit(50),
  ]);
  res.json({ reports, budgets, notices });
});

router.get('/submissions/:trackingCode', async (req, res) => {
  const code = cleanText(req.params.trackingCode, 40).toUpperCase();
  const submission = await PublicFeedback.findOne({ trackingCode: code }).select('trackingCode title category status createdAt publishedOn reportSummary');
  if (!submission) return res.status(404).json({ message: 'Submission not found' });
  res.json(submission);
});

router.post('/submissions', async (req, res) => {
  const title = cleanText(req.body.title, 160);
  const description = cleanText(req.body.description, 5000);
  const email = cleanText(req.body.email, 254).toLowerCase();
  if (!title || !description) return res.status(400).json({ message: 'Title and description are required.' });
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'A valid email address is required.' });

  const trackingCode = `PUB-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  const submission = await PublicFeedback.create({
    title,
    description,
    category: ['public_comment', 'petition', 'feedback_report', 'bill_notice'].includes(req.body.category) ? req.body.category : 'public_comment',
    submittedBy: cleanText(req.body.name, 120) || 'Public user',
    publicEmail: email,
    trackingCode,
    status: 'draft',
  });
  res.status(201).json({ trackingCode: submission.trackingCode, status: submission.status, message: 'Submission received.' });
});

module.exports = router;