const express = require('express');
const AuditLog = require('../models/AuditLog');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, authorizeRoles('Super Admin', 'ICT Admin'), async (req, res) => {
  try {
    const { user, action, entity, page = 1, limit = 25 } = req.query;
    const query = {};

    if (user) query.user = user;
    if (action) query.action = new RegExp(action, 'i');
    if (entity) query.entity = new RegExp(entity, 'i');

    const skip = (Number(page) - 1) * Number(limit);
    const logs = await AuditLog.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await AuditLog.countDocuments(query);

    res.json({
      logs,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalLogs: total,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching audit logs', error: error.message });
  }
});

module.exports = router;
