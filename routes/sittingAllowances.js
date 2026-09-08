const express = require('express');
const router = express.Router();
const SittingAllowance = require('../models/SittingAllowance');
const Meeting = require('../models/Meeting');
const Attendance = require('../models/Attendance');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');

router.get('/', verifyToken, async (req, res) => {
  try {
    const query = {};
    if (req.query.meeting) query.meeting = req.query.meeting;
    if (req.query.status) query.status = req.query.status;
    const records = await SittingAllowance.find(query).populate('member meeting attendance approvedBy submittedBy');
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load sitting allowances', error: error.message });
  }
});

router.get('/report', verifyToken, async (req, res) => {
  try {
    const query = {};
    if (req.query.meeting) query.meeting = req.query.meeting;
    if (req.query.status) query.status = req.query.status;
    const claims = await SittingAllowance.find(query).populate('member meeting attendance approvedBy submittedBy');
    res.json({
      totalClaims: claims.length,
      eligibleClaims: claims.filter((claim) => claim.eligible).length,
      totalAmount: claims.reduce((sum, claim) => sum + Number(claim.amount || 0), 0),
      byStatus: claims.reduce((summary, claim) => ({ ...summary, [claim.status]: (summary[claim.status] || 0) + 1 }), {}),
      claims,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate allowance claim report', error: error.message });
  }
});

router.post('/generate', verifyToken, authorizeRoles('Clerk', 'Super Admin'), async (req, res) => {
  try {
    const { member, meeting, sessionDate, allowanceType, attendanceStatus, rate, notes } = req.body;
    const amount = Number(rate || 0);

    const allowance = new SittingAllowance({
      claimNumber: `SAC-${Date.now()}`,
      member,
      meeting,
      sessionDate: sessionDate || new Date(),
      allowanceType: allowanceType || 'Plenary',
      attendanceStatus: attendanceStatus || 'Present',
      eligible: ['Present', 'Late'].includes(attendanceStatus || 'Present'),
      rate: amount,
      amount,
      notes,
      status: 'Draft',
    });

    await allowance.save();

    await recordAudit({
      req,
      action: 'Created sitting allowance record',
      entity: 'SittingAllowance',
      entityId: allowance._id,
      details: { member, amount },
    });

    res.status(201).json(allowance);
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate sitting allowance', error: error.message });
  }
});

router.post('/generate-from-sitting/:meetingId', verifyToken, authorizeRoles('Clerk', 'Super Admin'), async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.meetingId);
    if (!meeting) return res.status(404).json({ message: 'Sitting not found' });
    const records = await Attendance.find({ sitting: meeting._id });
    const rate = Number(req.body.rate || 0);
    const type = meeting.sittingType === 'Special Sitting' ? 'Special Sitting' : meeting.meetingType === 'committee' ? 'Committee' : 'Plenary';
    const allowances = await Promise.all(records.map((record) => {
      const attendanceStatus = { present: 'Present', Present: 'Present', absent: 'Absent', Absent: 'Absent', excused: 'Excused', Excused: 'Excused', late: 'Late', Late: 'Late' }[record.status] || 'Absent';
      return SittingAllowance.findOneAndUpdate(
        { member: record.member || record.user, meeting: meeting._id },
        { claimNumber: `SAC-${meeting._id}-${record.member || record.user}`, member: record.member || record.user, attendance: record._id, meeting: meeting._id, sessionDate: meeting.startTime || new Date(), allowanceType: type, attendanceStatus, eligible: ['Present', 'Late'].includes(attendanceStatus), eligibilityReason: ['Present', 'Late'].includes(attendanceStatus) ? 'Attendance qualifies for sitting allowance.' : `Attendance status: ${attendanceStatus}.`, rate, amount: ['Present', 'Late'].includes(attendanceStatus) ? rate : 0, status: 'Draft' },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }));
    res.status(201).json(allowances);
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate sitting allowances from attendance', error: error.message });
  }
});

router.post('/:id/submit', verifyToken, async (req, res) => {
  try {
    const allowance = await SittingAllowance.findById(req.params.id);
    if (!allowance) return res.status(404).json({ message: 'Allowance claim not found' });
    if (allowance.status !== 'Draft') return res.status(400).json({ message: 'Only draft claims can be submitted' });
    allowance.status = 'Submitted';
    allowance.submittedBy = req.user._id;
    allowance.submittedAt = new Date();
    await allowance.save();
    res.json(allowance);
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit allowance claim', error: error.message });
  }
});

router.patch('/:id/approve', verifyToken, authorizeRoles('Clerk', 'Super Admin'), async (req, res) => {
  try {
    const allowance = await SittingAllowance.findById(req.params.id);
    if (!allowance) return res.status(404).json({ message: 'Sitting allowance record not found' });
    if (allowance.status !== 'Submitted') return res.status(400).json({ message: 'Only submitted allowance claims can be approved' });

    allowance.status = 'Approved';
    allowance.approvedBy = req.user._id;
    await allowance.save();

    await recordAudit({
      req,
      action: 'Approved sitting allowance',
      entity: 'SittingAllowance',
      entityId: allowance._id,
      details: { amount: allowance.amount },
    });

    res.json(allowance);
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve sitting allowance', error: error.message });
  }
});

module.exports = router;
