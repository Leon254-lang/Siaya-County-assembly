const express = require('express');
const ProcurementRecord = require('../models/ProcurementRecord');
const Announcement = require('../models/Announcement');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, authorizeRoles('Super Admin', 'Procurement Officer', 'Clerk'), async (req, res) => {
  try {
    const records = await ProcurementRecord.find().sort({ createdAt: -1 });
    res.json({ records });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching procurement records', error: error.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const payload = { ...req.body };
    const userRole = req.user?.role?.name || req.user?.role || '';
    const isProcurementAdmin = ['Super Admin', 'Procurement Officer', 'Clerk'].includes(userRole);

    // Only procurement administrators can create procurement records other than requisition requests.
    if (payload.type !== 'requisition' && !isProcurementAdmin) {
      return res.status(403).json({ message: 'Access denied: only procurement or clerk users can create procurement records.' });
    }

    if (payload.type === 'requisition') {
      payload.status = payload.status || 'Pending Procurement Approval';
      payload.workflowStage = payload.workflowStage || 'Requested';
      payload.requestedBy = payload.requestedBy || req.user?.name || 'Department';
      payload.department = payload.department || req.user?.department?.name || req.user?.department || 'Unknown';
    }

    const record = await ProcurementRecord.create(payload);

    if (payload.type === 'requisition') {
      const announcement = new Announcement({
        title: `New procurement requisition request from ${payload.department || 'a department'}`,
        body: `${payload.requestedBy || 'A user'} has requested a procurement requisition titled "${payload.title}" for ${payload.department || 'their department'}. Review this request in Procurement.`,
        type: 'notice',
        targetRoles: ['Procurement Officer'],
        createdBy: req.user._id,
      });
      await announcement.save();
    }

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error creating procurement record', error: error.message });
  }
});

router.put('/:id', verifyToken, authorizeRoles('Super Admin', 'Procurement Officer', 'Clerk'), async (req, res) => {
  try {
    const record = await ProcurementRecord.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error updating procurement record', error: error.message });
  }
});

router.delete('/:id', verifyToken, authorizeRoles('Super Admin', 'Procurement Officer', 'Clerk'), async (req, res) => {
  try {
    const record = await ProcurementRecord.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting procurement record', error: error.message });
  }
});

module.exports = router;
