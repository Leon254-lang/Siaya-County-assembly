const express = require('express');
const Intern = require('../models/Intern');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  const interns = await Intern.find().populate('department supervisor completionReports.supervisor evaluations.reviewer');
  res.json(interns);
});

router.get('/:id', verifyToken, async (req, res) => {
  const intern = await Intern.findById(req.params.id).populate('department supervisor completionReports.supervisor evaluations.reviewer');
  if (!intern) {
    return res.status(404).json({ message: 'Intern not found' });
  }
  res.json(intern);
});

router.post('/', verifyToken, async (req, res) => {
  const intern = new Intern(req.body);
  await intern.save();
  const populated = await Intern.findById(intern._id).populate('department supervisor completionReports.supervisor evaluations.reviewer');
  res.status(201).json(populated);
});

router.put('/:id', verifyToken, async (req, res) => {
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
  res.json(intern);
});

router.post('/:id/log', verifyToken, async (req, res) => {
  const intern = await Intern.findById(req.params.id);
  if (!intern) {
    return res.status(404).json({ message: 'Intern not found' });
  }

  intern.dailyLogs.push({
    date: req.body.date ? new Date(req.body.date) : new Date(),
    activity: req.body.activity,
    notes: req.body.notes,
  });

  await intern.save();
  const populated = await Intern.findById(intern._id).populate('department supervisor completionReports.supervisor evaluations.reviewer');
  res.json(populated);
});

router.post('/:id/evaluate', verifyToken, async (req, res) => {
  const intern = await Intern.findById(req.params.id);
  if (!intern) {
    return res.status(404).json({ message: 'Intern not found' });
  }

  intern.evaluations.push({
    reviewer: req.user._id,
    score: req.body.score,
    comments: req.body.comments,
    date: req.body.date ? new Date(req.body.date) : new Date(),
  });

  await intern.save();
  const populated = await Intern.findById(intern._id).populate('department supervisor completionReports.supervisor evaluations.reviewer');
  res.json(populated);
});

router.post('/:id/complete', verifyToken, async (req, res) => {
  const intern = await Intern.findById(req.params.id);
  if (!intern) {
    return res.status(404).json({ message: 'Intern not found' });
  }

  intern.completionReports.push({
    date: req.body.date ? new Date(req.body.date) : new Date(),
    summary: req.body.summary,
    supervisor: req.user._id,
    remarks: req.body.remarks,
  });
  intern.status = 'completed';
  intern.endDate = req.body.date ? new Date(req.body.date) : new Date();

  await intern.save();
  const populated = await Intern.findById(intern._id).populate('department supervisor completionReports.supervisor evaluations.reviewer');
  res.json(populated);
});

module.exports = router;
