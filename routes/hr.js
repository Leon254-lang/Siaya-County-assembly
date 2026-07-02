const express = require('express');
const Appraisal = require('../models/Appraisal');
const SelfAssessment = require('../models/SelfAssessment');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/appraisals', verifyToken, authorizeRoles('Super Admin', 'HR Officer', 'ICT Admin'), async (req, res) => {
  try {
    const appraisals = await Appraisal.find().sort({ createdAt: -1 });
    res.json(appraisals);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load appraisals', error: error.message });
  }
});

router.post('/appraisals', verifyToken, authorizeRoles('Super Admin', 'HR Officer', 'ICT Admin'), async (req, res) => {
  try {
    const appraisal = new Appraisal(req.body);
    await appraisal.save();
    res.status(201).json(appraisal);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create appraisal', error: error.message });
  }
});

router.put('/appraisals/:id', verifyToken, authorizeRoles('Super Admin', 'HR Officer', 'ICT Admin'), async (req, res) => {
  try {
    const appraisal = await Appraisal.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!appraisal) return res.status(404).json({ message: 'Appraisal not found' });
    res.json(appraisal);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update appraisal', error: error.message });
  }
});

router.get('/self-assessments', verifyToken, authorizeRoles('Super Admin', 'HR Officer', 'ICT Admin'), async (req, res) => {
  try {
    const assessments = await SelfAssessment.find().sort({ createdAt: -1 });
    res.json(assessments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load self assessments', error: error.message });
  }
});

router.post('/self-assessments', verifyToken, authorizeRoles('Super Admin', 'HR Officer', 'ICT Admin'), async (req, res) => {
  try {
    const assessment = new SelfAssessment(req.body);
    await assessment.save();
    res.status(201).json(assessment);
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit self assessment', error: error.message });
  }
});

module.exports = router;
