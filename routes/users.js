const express = require('express');
const User = require('../models/User');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, authorizeRoles('Super Admin', 'ICT Admin', 'HR Officer', 'Committee Officer', 'Clerk'), async (req, res) => {
  const users = await User.find().populate('role department');
  res.json(users);
});

router.get('/:id', verifyToken, authorizeRoles('Super Admin', 'ICT Admin', 'HR Officer', 'Committee Officer', 'Clerk'), async (req, res) => {
  const user = await User.findById(req.params.id).populate('role department');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

module.exports = router;
