const express = require('express');
const Announcement = require('../models/Announcement');
const Message = require('../models/Message');
const Department = require('../models/Department');
const User = require('../models/User');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/announcements', verifyToken, async (req, res) => {
  try {
    const { type, department, role, limit = 20 } = req.query;
    const query = {};

    if (type) query.type = type;
    if (department) query.targetDepartments = department;
    if (role) query.targetRoles = role;

    const visibilityFilters = [];
    if (department) visibilityFilters.push({ targetDepartments: department });
    if (role) visibilityFilters.push({ targetRoles: role });

    if (visibilityFilters.length > 0) {
      query.$or = [
        { targetDepartments: { $exists: false } },
        { targetDepartments: { $size: 0 } },
        { targetRoles: { $exists: false } },
        { targetRoles: { $size: 0 } },
        ...visibilityFilters,
      ];
    }

    const announcements = await Announcement.find(query)
      .populate('createdBy', 'name email')
      .populate('targetDepartments', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load announcements', error: error.message });
  }
});

router.post('/announcements', verifyToken, authorizeRoles('Super Admin', 'Committee Officer', 'HR Officer', 'Finance Officer', 'ICT Admin', 'Clerk', 'Procurement Officer'), async (req, res) => {
  try {
    const { title, body, type, targetDepartments, targetRoles, expiresAt } = req.body;
    const announcement = new Announcement({
      title,
      body,
      type: type || 'announcement',
      targetDepartments: Array.isArray(targetDepartments) ? targetDepartments : [],
      targetRoles: Array.isArray(targetRoles) ? targetRoles : [],
      expiresAt,
      createdBy: req.user._id,
    });

    await announcement.save();
    const populated = await Announcement.findById(announcement._id).populate('createdBy', 'name email');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create announcement', error: error.message });
  }
});

router.get('/messages', verifyToken, async (req, res) => {
  try {
    const { folder = 'inbox' } = req.query;
    const userId = req.user._id;

    const query = folder === 'sent'
      ? { from: userId }
      : {
          $or: [
            { to: userId },
            { toDepartment: req.user.department },
          ],
        };

    const messages = await Message.find(query)
      .populate('from', 'name email')
      .populate('to', 'name email')
      .populate('toDepartment', 'name')
      .sort({ createdAt: -1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load messages', error: error.message });
  }
});

router.post('/messages', verifyToken, async (req, res) => {
  try {
    const { subject, body, to, toDepartment } = req.body;
    if (!subject || !body) {
      return res.status(400).json({ message: 'Subject and body are required' });
    }

    const message = new Message({
      subject,
      body,
      from: req.user._id,
      to: Array.isArray(to) ? to : [],
      toDepartment: toDepartment || undefined,
    });

    await message.save();
    const populated = await Message.findById(message._id)
      .populate('from', 'name email')
      .populate('to', 'name email')
      .populate('toDepartment', 'name');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message', error: error.message });
  }
});

router.post('/messages/:id/read', verifyToken, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (!message.readBy.some((userId) => userId.toString() === req.user._id.toString())) {
      message.readBy.push(req.user._id);
      await message.save();
    }

    const populated = await Message.findById(message._id)
      .populate('from', 'name email')
      .populate('to', 'name email')
      .populate('toDepartment', 'name');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark message read', error: error.message });
  }
});

module.exports = router;
