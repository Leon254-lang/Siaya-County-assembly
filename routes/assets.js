const express = require('express');
const Asset = require('../models/Asset');
const { verifyToken } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  const assets = await Asset.find()
    .populate('assignedTo', 'name email')
    .populate('assignedDepartment', 'name');
  res.json(assets);
});

router.get('/:id', verifyToken, async (req, res) => {
  const asset = await Asset.findById(req.params.id)
    .populate('assignedTo', 'name email')
    .populate('assignedDepartment', 'name');
  if (!asset) {
    return res.status(404).json({ message: 'Asset not found' });
  }
  res.json(asset);
});

router.post('/', verifyToken, async (req, res) => {
  const asset = new Asset(req.body);
  await asset.save();

  await recordAudit({
    req,
    action: 'Created asset',
    entity: 'Asset',
    entityId: asset._id,
    details: req.body,
  });

  const populated = await Asset.findById(asset._id)
    .populate('assignedTo', 'name email')
    .populate('assignedDepartment', 'name');
  res.status(201).json(populated);
});

router.put('/:id', verifyToken, async (req, res) => {
  const update = req.body;
  const asset = await Asset.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  })
    .populate('assignedTo', 'name email')
    .populate('assignedDepartment', 'name');
  if (!asset) {
    return res.status(404).json({ message: 'Asset not found' });
  }

  await recordAudit({
    req,
    action: 'Updated asset',
    entity: 'Asset',
    entityId: asset._id,
    details: update,
  });

  res.json(asset);
});

router.post('/:id/maintenance', verifyToken, async (req, res) => {
  const { task, performedBy, date, notes } = req.body;
  const asset = await Asset.findById(req.params.id);
  if (!asset) {
    return res.status(404).json({ message: 'Asset not found' });
  }

  asset.maintenanceLogs.push({
    task,
    performedBy,
    date: date ? new Date(date) : new Date(),
    notes,
  });
  asset.status = 'maintenance';
  await asset.save();

  await recordAudit({
    req,
    action: 'Added maintenance entry',
    entity: 'Asset',
    entityId: asset._id,
    details: { task, performedBy, notes },
  });

  const populated = await Asset.findById(asset._id)
    .populate('assignedTo', 'name email')
    .populate('assignedDepartment', 'name');
  res.json(populated);
});

router.post('/:id/dispose', verifyToken, async (req, res) => {
  const { date, reason, disposedBy, method, notes } = req.body;
  const asset = await Asset.findById(req.params.id);
  if (!asset) {
    return res.status(404).json({ message: 'Asset not found' });
  }

  asset.disposalRecords.push({
    date: date ? new Date(date) : new Date(),
    reason,
    disposedBy,
    method,
    notes,
  });
  asset.status = 'retired';
  await asset.save();

  await recordAudit({
    req,
    action: 'Disposed asset',
    entity: 'Asset',
    entityId: asset._id,
    details: { reason, disposedBy, method, notes },
  });

  const populated = await Asset.findById(asset._id)
    .populate('assignedTo', 'name email')
    .populate('assignedDepartment', 'name');
  res.json(populated);
});

module.exports = router;
