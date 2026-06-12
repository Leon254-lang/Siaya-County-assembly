const express = require('express');
const ProcurementRecord = require('../models/ProcurementRecord');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    const records = await ProcurementRecord.find().sort({ createdAt: -1 });
    res.json({ records });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching procurement records', error: error.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const record = await ProcurementRecord.create(req.body);
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error creating procurement record', error: error.message });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const record = await ProcurementRecord.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error updating procurement record', error: error.message });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const record = await ProcurementRecord.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting procurement record', error: error.message });
  }
});

module.exports = router;
