const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Role = require('../models/Role');
const Department = require('../models/Department');
const Committee = require('../models/Committee');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads/avatars');
fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g,'_')}`),
});
const upload = multer({ storage });

router.get('/', verifyToken, authorizeRoles('Super Admin', 'ICT Admin', 'HR Officer', 'Committee Officer', 'Clerk'), async (req, res) => {
  const users = await User.find().select('-password').populate('role department');
  res.json(users);
});

router.get('/:id', verifyToken, authorizeRoles('Super Admin', 'ICT Admin', 'HR Officer', 'Committee Officer', 'Clerk'), async (req, res) => {
  const user = await User.findById(req.params.id).select('-password').populate('role department');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, email, phone, roleName, departmentId, isActive, password, committeeMemberships, ward, party, contactDetails } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isSelf = req.user._id.toString() === req.params.id;
    const isAdmin = req.user.role?.name === 'Super Admin';
    const canManageUsers = isAdmin || ['ICT Admin', 'HR Officer'].includes(req.user.role?.name);

    if (!isSelf && !canManageUsers) {
      return res.status(403).json({ message: 'You cannot update this user.' });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    if (roleName && roleName !== user.role?.name) {
      if (!isAdmin) {
        return res.status(403).json({ message: 'Only admins can change roles.' });
      }
      const role = await Role.findOne({ name: roleName });
      if (!role) {
        return res.status(400).json({ message: 'Invalid role selected' });
      }
      user.role = role._id;
    }

    if (departmentId !== undefined) {
      const currentDepartmentId = user.department ? user.department.toString() : '';
      if (!isAdmin && departmentId !== currentDepartmentId) {
        return res.status(403).json({ message: 'Only admins can change departments.' });
      }
      if (departmentId) {
        const department = await Department.findById(departmentId);
        if (!department) {
          return res.status(400).json({ message: 'Invalid department selected' });
        }
        user.department = department._id;
      } else if (departmentId === '') {
        user.department = undefined;
      }
    }

    if (typeof name === 'string' && name.trim()) user.name = name.trim();
    if (typeof email === 'string' && email.trim()) user.email = email.trim().toLowerCase();
    if (typeof phone === 'string') user.phone = phone.trim();
    if (typeof ward === 'string') user.ward = ward.trim();
    if (typeof party === 'string') user.party = party.trim();
    if (typeof contactDetails === 'object' && contactDetails !== null) {
      user.contactDetails = {
        ...user.contactDetails,
        address: typeof contactDetails.address === 'string' ? contactDetails.address.trim() : user.contactDetails?.address,
      };
    }

    if (Array.isArray(committeeMemberships)) {
      const uniqueIds = Array.from(new Set(committeeMemberships.filter((id) => id)));
      const validCommittees = await Committee.find({ _id: { $in: uniqueIds } });
      if (validCommittees.length !== uniqueIds.length) {
        return res.status(400).json({ message: 'One or more selected committees are invalid.' });
      }
      user.committeeMemberships = validCommittees.map((committee) => committee._id);
    }

    if (typeof isActive === 'boolean') {
      if (!isAdmin) {
        return res.status(403).json({ message: 'Only admins can change status.' });
      }
      user.isActive = isActive;
    }

    if (typeof password === 'string' && password.trim()) {
      if (!isSelf && !canManageUsers) {
        return res.status(403).json({ message: 'Only admins can change other passwords.' });
      }
      user.password = await bcrypt.hash(password.trim(), 10);
    }

    await user.save();

    const updatedUser = await User.findById(user._id)
      .populate('role department committeeMemberships');
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
    res.json({ message: 'User deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Could not delete user.', error: error.message });
  }
});

router.post('/:id/avatar', verifyToken, upload.single('avatar'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Allow user or admin to upload
    const isSelf = req.user._id.toString() === user._id.toString();
    const isAdmin = ['Super Admin', 'ICT Admin', 'HR Officer'].includes(req.user.role?.name);
    if (!isSelf && !isAdmin) return res.status(403).json({ message: 'Not authorized' });

    if (!req.file) return res.status(400).json({ message: 'No file selected.' });
    user.profilePic = `/uploads/avatars/${req.file.filename}`;
    await user.save();
    res.json({ message: 'Avatar updated.', profilePic: user.profilePic });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed.', error: err.message });
  }
});

module.exports = router;
