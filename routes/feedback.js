const express = require('express');
const PublicFeedback = require('../models/PublicFeedback');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { buildWorkflowEvent } = require('../utils/workflow');
const { safeNotify } = require('../utils/notifications');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  const filter = {};
  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.category) {
    filter.category = req.query.category;
  }
  const items = await PublicFeedback.find(filter)
    .populate('workflowHistory.actor workflowHistory.nextResponsibleOfficer', 'name email')
    .populate('nextResponsibleOfficer', 'name email')
    .sort({ createdAt: -1 });
  res.json(items);
});

router.get('/:id', async (req, res) => {
  const item = await PublicFeedback.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Public item not found' });
  res.json(item);
});

router.post('/', verifyToken, async (req, res) => {
  const item = new PublicFeedback(req.body);
  item.currentStatus = item.status;
  item.workflowHistory.push(buildWorkflowEvent({
    actor: req.user._id,
    action: 'submitted',
    status: item.status,
    comment: req.body.comment || 'Public participation submission received',
    nextResponsibleOfficer: req.body.nextResponsibleOfficer || null,
  }));
  item.nextResponsibleOfficer = req.body.nextResponsibleOfficer || null;
  await item.save();
  await safeNotify({ userIds: [req.user._id], type: 'approval_request', title: 'Public participation submission received', body: item.title, link: `/feedback/${item._id}` });
  res.status(201).json(item);
});

router.post('/:id/review', verifyToken, authorizeRoles('Clerk', 'Committee Officer', 'Super Admin'), async (req, res) => {
  const { decision, comment = '', nextResponsibleOfficer = null } = req.body;
  if (!['reviewed', 'published', 'archived'].includes(decision)) {
    return res.status(400).json({ message: 'Decision must be reviewed, published, or archived' });
  }
  const item = await PublicFeedback.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Public item not found' });
  item.status = decision;
  item.currentStatus = decision;
  item.publishedOn = decision === 'published' ? new Date() : item.publishedOn;
  item.nextResponsibleOfficer = nextResponsibleOfficer || null;
  item.workflowHistory.push(buildWorkflowEvent({
    actor: req.user._id,
    action: decision,
    status: decision,
    comment,
    nextResponsibleOfficer,
  }));
  await item.save();
  if (item.submittedBy && /^[a-f\d]{24}$/i.test(item.submittedBy)) {
    await safeNotify({ userIds: [item.submittedBy], type: 'status_update', title: `Public submission ${decision}`, body: comment || `Your public submission was marked ${decision}.`, link: `/feedback/${item._id}` });
  }
  res.json(item);
});

router.put('/:id', verifyToken, async (req, res) => {
  const updates = {
    title: req.body.title,
    description: req.body.description,
    category: req.body.category,
    submittedBy: req.body.submittedBy,
    status: undefined,
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
  if (item.status !== 'published') return res.status(403).json({ message: 'Comments are only open on published items.' });

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
  if (item.status !== 'published') return res.status(403).json({ message: 'Registration is only open on published items.' });

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
