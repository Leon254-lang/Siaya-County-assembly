const express = require('express');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(Number(req.query.limit) || 50);
  res.json(notifications);
});

router.post('/:id/read', verifyToken, async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { readAt: new Date() },
    { new: true }
  );
  if (!notification) return res.status(404).json({ message: 'Notification not found' });
  res.json(notification);
});

router.get('/preferences', verifyToken, async (req, res) => {
  const user = await User.findById(req.user._id).select('notificationPreferences');
  res.json(user?.notificationPreferences || {});
});

router.patch('/preferences', verifyToken, async (req, res) => {
  const allowed = ['email', 'sms', 'meetingReminders', 'approvalRequests', 'deadlines', 'statusUpdates', 'publicNotices'];
  const preferences = {};
  allowed.forEach((key) => {
    if (typeof req.body[key] === 'boolean') preferences[`notificationPreferences.${key}`] = req.body[key];
  });
  const user = await User.findByIdAndUpdate(req.user._id, { $set: preferences }, { new: true }).select('notificationPreferences');
  res.json(user.notificationPreferences);
});

module.exports = router;