const express = require('express');
const Intern = require('../models/Intern');
const mongoose = require('mongoose');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  const interns = await Intern.find().populate('department supervisor completionReports.supervisor evaluations.reviewer');
  res.json(interns);
});

const resolveIntern = async (id, user) => {
  let intern = null;
  // Try by intern _id
  if (mongoose.Types.ObjectId.isValid(id)) {
    intern = await Intern.findById(id).populate('department supervisor completionReports.supervisor evaluations.reviewer');
    if (intern) return intern;
  }

  // If not found by id, try to find by user email when available
  if (user && user.email) {
    intern = await Intern.findOne({ email: user.email }).populate('department supervisor completionReports.supervisor evaluations.reviewer');
    if (intern) return intern;
  }

  return null;
};

router.get('/:id', verifyToken, async (req, res) => {
  const intern = await resolveIntern(req.params.id, req.user);
  if (!intern) {
    return res.status(404).json({ message: 'Intern not found' });
  }
  res.json(intern);
});

router.post('/', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  const intern = new Intern(req.body);
  await intern.save();

  await recordAudit({
    req,
    action: 'Created intern',
    entity: 'Intern',
    entityId: intern._id,
    details: req.body,
  });

  const populated = await Intern.findById(intern._id).populate('department supervisor completionReports.supervisor evaluations.reviewer');
  res.status(201).json(populated);
});

router.put('/:id', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  const updates = {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    department: req.body.department,
    supervisor: req.body.supervisor,
    placement: req.body.placement,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    status: req.body.status,
  };
  const intern = await Intern.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).populate('department supervisor completionReports.supervisor evaluations.reviewer');
  if (!intern) {
    return res.status(404).json({ message: 'Intern not found' });
  }

  await recordAudit({
    req,
    action: 'Updated intern',
    entity: 'Intern',
    entityId: intern._id,
    details: updates,
  });

  res.json(intern);
});

router.post('/:id/log', verifyToken, async (req, res) => {
  const intern = await resolveIntern(req.params.id, req.user);
  if (!intern) {
    return res.status(404).json({ message: 'Intern not found' });
  }

  const logEntry = {
    date: req.body.date ? new Date(req.body.date) : new Date(),
    activity: req.body.activity,
    notes: req.body.notes,
  };

  intern.dailyLogs.push(logEntry);
  await intern.save();

  await recordAudit({
    req,
    action: 'Added intern daily log',
    entity: 'Intern',
    entityId: intern._id,
    details: logEntry,
  });

  const populated = await Intern.findById(intern._id).populate('department supervisor completionReports.supervisor evaluations.reviewer');
  res.json(populated);
});

router.post('/:id/evaluate', verifyToken, async (req, res) => {
  const intern = await resolveIntern(req.params.id, req.user);
  if (!intern) {
    return res.status(404).json({ message: 'Intern not found' });
  }

  const evaluation = {
    reviewer: req.user._id,
    score: req.body.score,
    comments: req.body.comments,
    date: req.body.date ? new Date(req.body.date) : new Date(),
  };

  intern.evaluations.push(evaluation);
  await intern.save();

  await recordAudit({
    req,
    action: 'Added intern evaluation',
    entity: 'Intern',
    entityId: intern._id,
    details: evaluation,
  });

  const populated = await Intern.findById(intern._id).populate('department supervisor completionReports.supervisor evaluations.reviewer');
  res.json(populated);
});

router.post('/:id/complete', verifyToken, async (req, res) => {
  const intern = await resolveIntern(req.params.id, req.user);
  if (!intern) {
    return res.status(404).json({ message: 'Intern not found' });
  }

  const completionReport = {
    date: req.body.date ? new Date(req.body.date) : new Date(),
    summary: req.body.summary,
    supervisor: req.user._id,
    remarks: req.body.remarks,
  };

  intern.completionReports.push(completionReport);
  intern.status = 'completed';
  intern.endDate = req.body.date ? new Date(req.body.date) : new Date();

  await intern.save();

  await recordAudit({
    req,
    action: 'Completed intern program',
    entity: 'Intern',
    entityId: intern._id,
    details: completionReport,
  });

  const populated = await Intern.findById(intern._id).populate('department supervisor completionReports.supervisor evaluations.reviewer');
  res.json(populated);
});

module.exports = router;
