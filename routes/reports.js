const express = require('express');
const PDFDocument = require('pdfkit');
const Meeting = require('../models/Meeting');
const Bill = require('../models/Bill');
const Attendance = require('../models/Attendance');
const Document = require('../models/Document');
const Committee = require('../models/Committee');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Announcement = require('../models/Announcement');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const roleName = (req) => req.user?.role?.name || req.user?.role || '';
const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const buildDashboard = async (req, publicView = false) => {
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
  const upcomingMeetings = await Meeting.find({ startTime: { $gte: now, $lte: nextMonth } })
    .sort({ startTime: 1 }).limit(12).populate('committee', 'name');

  if (publicView) {
    const [bills, notices, reports] = await Promise.all([
      Bill.find({ status: { $in: ['Approved', 'Debated', 'Resolved'] } }).sort({ updatedAt: -1 }).limit(20).select('title status referenceNumber updatedAt'),
      Announcement.find({ type: 'notice', $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] }).sort({ createdAt: -1 }).limit(20).select('title body createdAt expiresAt'),
      Document.find({ status: 'published' }).sort({ updatedAt: -1 }).limit(20).select('title document_type updatedAt'),
    ]);
    return { audience: 'Public', publishedBills: bills, notices, publishedReports: reports, calendar: upcomingMeetings };
  }

  const role = roleName(req);
  if (role === 'Speaker') {
    const [motions, attendance] = await Promise.all([
      Bill.find({ 'motions.status': 'Pending' }).select('title motions'),
      Attendance.countDocuments({ status: { $in: ['present', 'Present', 'late', 'Late'] } }),
    ]);
    return { audience: 'Speaker', calendar: upcomingMeetings, pendingMotions: motions, attendancePresent: attendance, decisionsAwaitingAction: upcomingMeetings.filter((meeting) => meeting.outcome && !meeting.actionItems?.every((item) => item.status === 'Completed')) };
  }
  if (['Clerk', 'Committee Officer'].includes(role)) {
    const [documents, committees] = await Promise.all([
      Document.find({ status: { $in: ['submitted', 'reviewed', 'approved'] } }).sort({ updatedAt: 1 }).limit(30).select('title status assignedTo updatedAt'),
      Committee.find().select('name performance meetings').limit(30),
    ]);
    const deadlines = committees.flatMap((committee) => (committee.meetings || []).flatMap((meeting) => (meeting.actionItems || []).filter((item) => item.status !== 'Completed')));
    return { audience: role, calendar: upcomingMeetings, pendingApprovals: documents.filter((item) => item.status !== 'approved'), documentsAwaitingPublication: documents.filter((item) => item.status === 'approved'), committeeDeadlines: deadlines };
  }
  if (role === 'MCA' || role === 'Member') {
    const [attendance, meetings, bills] = await Promise.all([
      Attendance.find({ user: req.user._id }).sort({ date: -1 }).limit(100).select('date status'),
      Meeting.find({ attendees: req.user._id }).sort({ startTime: -1 }).limit(30).select('title startTime actionItems'),
      Bill.find({ 'motions.proposer': req.user._id }).select('title status motions'),
    ]);
    return { audience: 'Member', personalAttendance: attendance, assignedCommitteeWork: meetings.flatMap((meeting) => meeting.actionItems || []).filter((item) => String(item.assignedTo) === String(req.user._id)), submittedMotions: bills, calendar: upcomingMeetings };
  }
  if (['Super Admin', 'ICT Admin', 'Administrator'].includes(role)) {
    const [users, activity, security] = await Promise.all([
      User.countDocuments({ isActive: { $ne: false } }),
      AuditLog.find().sort({ createdAt: -1 }).limit(30).populate('user', 'name'),
      AuditLog.find({ entity: { $in: ['SecurityEvent', 'User'] } }).sort({ createdAt: -1 }).limit(30).populate('user', 'name'),
    ]);
    return { audience: 'Administrator', activeUsers: users, systemActivity: activity, securityEvents: security, calendar: upcomingMeetings };
  }
  return { audience: role || 'User', calendar: upcomingMeetings };
};

router.get('/dashboard', verifyToken, async (req, res) => {
  try { res.json(await buildDashboard(req)); } catch (error) { res.status(500).json({ message: 'Unable to build dashboard report', error: error.message }); }
});

router.get('/export', verifyToken, async (req, res) => {
  try {
    const report = await buildDashboard(req);
    const format = req.query.format || 'excel';
    const rows = Object.entries(report).flatMap(([section, value]) => {
      if (!Array.isArray(value)) return [[section, value]];
      return [[section, ''], ...value.map((item) => [item.title || item.name || item.status || item.date || '', item.status || item.startTime || item.createdAt || ''])];
    });

    if (format === 'pdf') {
      const document = new PDFDocument({ margin: 40 });
      res.type('application/pdf').set('Content-Disposition', `attachment; filename="${report.audience.toLowerCase()}-dashboard.pdf"`);
      document.pipe(res);
      document.fontSize(18).text(`${report.audience} Dashboard Report`);
      document.moveDown();
      rows.forEach((row) => document.fontSize(10).text(`${row[0]}${row[1] ? `: ${row[1]}` : ''}`));
      document.end();
      return;
    }

    const html = `<table border="1"><tr><th>Section</th><th>Value</th></tr>${rows.map((row) => `<tr><td>${escapeCsv(row[0])}</td><td>${escapeCsv(row[1])}</td></tr>`).join('')}</table>`;
    res.type('application/vnd.ms-excel').set('Content-Disposition', `attachment; filename="${report.audience.toLowerCase()}-dashboard.xls"`).send(`<!doctype html><html><body>${html}</body></html>`);
  } catch (error) { res.status(500).json({ message: 'Unable to export dashboard report', error: error.message }); }
});

router.get('/', async (req, res) => {
  try { res.json(await buildDashboard(req, true)); } catch (error) { res.status(500).json({ message: 'Unable to build public report', error: error.message }); }
});

module.exports = router;