const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Role = require('../models/Role');
const Department = require('../models/Department');
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

router.put('/:id', verifyToken, authorizeRoles('Super Admin'), async (req, res) => {
  try {
    const { name, email, phone, roleName, departmentId, isActive, password } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    if (roleName) {
      const role = await Role.findOne({ name: roleName });
      if (!role) {
        return res.status(400).json({ message: 'Invalid role selected' });
      }
      user.role = role._id;
    }

    if (departmentId !== undefined) {
      if (departmentId) {
        const department = await Department.findById(departmentId);
        if (!department) {
          return res.status(400).json({ message: 'Invalid department selected' });
        }
        user.department = department._id;
      } else {
        user.department = undefined;
      }
    }

    if (typeof name === 'string' && name.trim()) user.name = name.trim();
    if (typeof email === 'string' && email.trim()) user.email = email.trim().toLowerCase();
    if (typeof phone === 'string') user.phone = phone.trim();
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (typeof password === 'string' && password.trim()) {
      user.password = await bcrypt.hash(password.trim(), 10);
    }

    await user.save();

    const updatedUser = await User.findById(user._id).populate('role department');
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
});

router.delete('/:id', verifyToken, authorizeRoles('Super Admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
});

module.exports = router;
