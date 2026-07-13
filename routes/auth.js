const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.post('/register', verifyToken, authorizeRoles('Super Admin', 'ICT Admin', 'HR Officer'), async (req, res) => {
  try {
    const { name, email, password, roleName, phone, department } = req.body;
    const userRole = req.user.role?.name;
    if (roleName === 'MCA' && !userRole?.includes('Admin')) {
      return res.status(403).json({ message: 'Only admins can create MCA accounts.' });
    }

    if (!password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({ message: 'Password required.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use.' });
    }

    const role = await Role.findOne({ name: roleName || 'Clerk' });
    if (!role) {
      return res.status(400).json({ message: 'Select a valid role.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashed,
      role: role._id,
      phone,
      department,
    });
    await user.save();

    const created = await User.findById(user._id).populate('role department');
    res.status(201).json({ message: 'User created.', user: created });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed.', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).populate('role');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'supersecret', {
      expiresIn: '8h',
    });

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role.name } });
  } catch (error) {
    res.status(500).json({ message: 'Login failed.', error: error.message });
  }
});

router.get('/me', verifyToken, (req, res) => {
  res.json(req.user);
});

module.exports = router;
