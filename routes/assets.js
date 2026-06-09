const express = require('express');
const Asset = require('../models/Asset');
const { verifyToken } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');

const router = express.Router();

const sanitizeAssetPayload = (payload = {}) => {
  const sanitized = { ...payload };

  if (typeof sanitized.assetTag === 'string') {
    sanitized.assetTag = sanitized.assetTag.trim();
  }
  if (typeof sanitized.name === 'string') {
    sanitized.name = sanitized.name.trim();
  }
  if (typeof sanitized.location === 'string') {
    sanitized.location = sanitized.location.trim();
  }

  if (sanitized.purchaseDate === '' || sanitized.purchaseDate === null || sanitized.purchaseDate === undefined) {
    delete sanitized.purchaseDate;
  }
  if (sanitized.value === '' || sanitized.value === null || sanitized.value === undefined) {
    delete sanitized.value;
  }
  if (sanitized.assignedTo === '' || sanitized.assignedTo === null || sanitized.assignedTo === undefined) {
    delete sanitized.assignedTo;
  }
  if (sanitized.assignedDepartment === '' || sanitized.assignedDepartment === null || sanitized.assignedDepartment === undefined) {
    delete sanitized.assignedDepartment;
  }

  return sanitized;
};

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
  try {
    const payload = sanitizeAssetPayload(req.body);
    const asset = new Asset(payload);
    await asset.save();

    await recordAudit({
      req,
      action: 'Created asset',
      entity: 'Asset',
      entityId: asset._id,
      details: payload,
    });

    const populated = await Asset.findById(asset._id)
      .populate('assignedTo', 'name email')
      .populate('assignedDepartment', 'name');
    res.status(201).json(populated);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ message: 'Asset tag already exists. Please choose a different asset tag.' });
    }

    if (error?.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Asset registration failed. Please review the asset details and try again.',
        errors: error.errors,
      });
    }

    console.error('Failed to create asset:', error);
    return res.status(500).json({ message: 'Failed to register the asset. Please try again.' });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const update = sanitizeAssetPayload(req.body);
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
  } catch (error) {
    if (error?.name === 'ValidationError') {
      return res.status(400).json({ message: 'Asset update failed. Please review the details and try again.' });
    }

    console.error('Failed to update asset:', error);
    return res.status(500).json({ message: 'Failed to update asset. Please try again.' });
  }
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
