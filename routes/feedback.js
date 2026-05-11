const express = require('express');
const PublicFeedback = require('../models/PublicFeedback');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.category) {
    filter.category = req.query.category;
  }
  const items = await PublicFeedback.find(filter).sort({ createdAt: -1 });
  res.json(items);
});

router.get('/:id', async (req, res) => {
  const item = await PublicFeedback.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Public item not found' });
  res.json(item);
});

router.post('/', verifyToken, async (req, res) => {
  const item = new PublicFeedback(req.body);
  await item.save();
  res.status(201).json(item);
});

router.put('/:id', verifyToken, async (req, res) => {
  const updates = {
    title: req.body.title,
    description: req.body.description,
    category: req.body.category,
    submittedBy: req.body.submittedBy,
    status: req.body.status,
    publishedOn: req.body.status === 'published' ? new Date() : req.body.publishedOn,
    eventDate: req.body.eventDate,
    eventLocation: req.body.eventLocation,
    registrationDeadline: req.body.registrationDeadline,
    reportSummary: req.body.reportSummary,
    reportDetails: req.body.reportDetails,
  };

  const item = await PublicFeedback.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!item) return res.status(404).json({ message: 'Public item not found' });
  res.json(item);
});

router.post('/:id/comment', async (req, res) => {
  const item = await PublicFeedback.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Public item not found' });

  item.comments.push({
    name: req.body.name || 'Anonymous',
    email: req.body.email,
    message: req.body.message,
  });

  await item.save();
  res.json(item);
});

router.post('/:id/register', async (req, res) => {
  const item = await PublicFeedback.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Public item not found' });

  item.registrations.push({
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    organization: req.body.organization,
  });

  await item.save();
  res.json(item);
});

module.exports = router;
