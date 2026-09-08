const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Role = require('../models/Role');
const Committee = require('../models/Committee');
const Attendance = require('../models/Attendance');
const Meeting = require('../models/Meeting');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { buildMemberQuery } = require('../utils/memberFilters');

const router = express.Router();

const getMcaRole = async () => {
  const role = await Role.findOne({ name: 'MCA' });
  if (!role) {
    throw new Error('MCA role not found. Please seed the role in the application.');
  }
  return role;
};

router.get('/', verifyToken, authorizeRoles('Super Admin', 'HR Officer', 'Committee Officer', 'Clerk'), async (req, res) => {
  try {
    const role = await getMcaRole();
    const filters = {
      search: req.query.search || '',
      ward: req.query.ward || '',
      party: req.query.party || '',
      committee: req.query.committee || '',
      includeInactive: req.query.includeInactive === 'true',
    };

    const query = {
      ...buildMemberQuery(filters),
      role: role._id,
    };

    const mcas = await User.find(query)
      .populate('role department committeeMemberships')
      .sort({ name: 1 });
    res.json(mcas);
  } catch (error) {
    res.status(500).json({ message: 'Error loading MCA list', error: error.message });
  }
});

router.get('/:id', verifyToken, authorizeRoles('Super Admin', 'HR Officer', 'Committee Officer', 'Clerk'), async (req, res) => {
  try {
    const mca = await User.findById(req.params.id).populate('role department committeeMemberships');
    if (!mca) return res.status(404).json({ message: 'MCA not found' });
    res.json(mca);
  } catch (error) {
    res.status(500).json({ message: 'Error loading MCA profile', error: error.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const userRole = req.user.role?.name;
    const canRegisterMca = userRole === 'Super Admin' || userRole?.includes('Admin');
    if (!canRegisterMca) {
      return res.status(403).json({ message: 'Only Admin users can register MCAs' });
    }

    const {
      name,
      member_id,
      full_name,
      email,
      password,
      ward,
      constituency,
      position,
      party,
      phone,
      address,
      photo,
      status = 'active',
      committeeMemberships = [],
      isActive = true,
    } = req.body;

    if (!(name || full_name) || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const role = await getMcaRole();
    const hashedPassword = await bcrypt.hash(password, 10);

    const mca = new User({
      member_id,
      name: name || full_name,
      full_name: full_name || name,
      email,
      password: hashedPassword,
      role: role._id,
      ward,
      constituency,
      position,
      party,
      phone,
      photo,
      profilePic: photo,
      status,
      isActive,
      contactDetails: {
        address,
      },
      committeeMemberships,
    });

    await mca.save();
    await mca.populate('role department committeeMemberships');
    res.status(201).json(mca);
  } catch (error) {
    res.status(500).json({ message: 'Error creating MCA', error: error.message });
  }
});

router.put('/:id', verifyToken, authorizeRoles('Super Admin', 'HR Officer', 'Clerk'), async (req, res) => {
  try {
    const {
      name,
      member_id,
      full_name,
      ward,
      constituency,
      position,
      party,
      phone,
      address,
      photo,
      status,
      committeeMemberships,
      password,
      isActive,
    } = req.body;

    const mca = await User.findById(req.params.id);
    if (!mca) return res.status(404).json({ message: 'MCA not found' });

    if (mca.role) {
      const role = await Role.findById(mca.role);
      if (role && role.name !== 'MCA') {
        return res.status(400).json({ message: 'Target user is not an MCA profile' });
      }
    }

    mca.member_id = member_id ?? mca.member_id;
    mca.name = name ?? full_name ?? mca.name;
    mca.full_name = full_name ?? name ?? mca.full_name;
    mca.ward = ward ?? mca.ward;
    mca.constituency = constituency ?? mca.constituency;
    mca.position = position ?? mca.position;
    mca.party = party ?? mca.party;
    mca.phone = phone ?? mca.phone;
    mca.photo = photo ?? mca.photo;
    mca.profilePic = photo ?? mca.profilePic;
    mca.isActive = typeof isActive === 'boolean' ? isActive : status ? status === 'active' : mca.isActive;
    mca.status = status ?? (mca.isActive ? 'active' : 'inactive');
    mca.contactDetails = mca.contactDetails || {};
    mca.contactDetails.address = address ?? mca.contactDetails.address;
    mca.committeeMemberships = Array.isArray(committeeMemberships)
      ? committeeMemberships
      : mca.committeeMemberships;

    if (password) {
      mca.password = await bcrypt.hash(password, 10);
    }

    await mca.save();
    await mca.populate('role department committeeMemberships');
    res.json(mca);
  } catch (error) {
    res.status(500).json({ message: 'Error updating MCA profile', error: error.message });
  }
});

router.patch('/:id/deactivate', verifyToken, authorizeRoles('Super Admin', 'Clerk'), async (req, res) => {
  try {
    const mca = await User.findById(req.params.id);
    if (!mca) return res.status(404).json({ message: 'MCA not found' });

    mca.isActive = false;
    mca.status = 'inactive';
    await mca.save();
    res.json({ message: 'Member deactivated successfully.', member: mca });
  } catch (error) {
    res.status(500).json({ message: 'Error deactivating member', error: error.message });
  }
});

router.get('/:id/attendance-report', verifyToken, authorizeRoles('Super Admin', 'HR Officer', 'Committee Officer', 'Clerk'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.params.id;
    const query = { user: userId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const records = await Attendance.find(query).sort({ date: 1 });
    const summary = {
      totalDays: records.length,
      presentDays: records.filter((r) => r.status === 'present').length,
      absentDays: records.filter((r) => r.status === 'absent').length,
      leaveDays: records.filter((r) => r.status === 'leave').length,
      remoteDays: records.filter((r) => r.status === 'remote').length,
      lateDays: records.filter((r) => r.status === 'late').length,
      partialDays: records.filter((r) => r.status === 'partial').length,
      totalWorkingHours: records.reduce((sum, r) => sum + (r.workingHours || 0), 0),
    };

    res.json({ summary, records });
  } catch (error) {
    res.status(500).json({ message: 'Error loading attendance report', error: error.message });
  }
});

router.get('/:id/performance', verifyToken, authorizeRoles('Super Admin', 'HR Officer', 'Committee Officer', 'Clerk'), async (req, res) => {
  try {
    const userId = req.params.id;
    const mca = await User.findById(userId).populate('role');
    if (!mca) return res.status(404).json({ message: 'MCA not found' });
    if (!mca.role || mca.role.name !== 'MCA') {
      return res.status(400).json({ message: 'Target user is not an MCA profile' });
    }

    const attendanceRecords = await Attendance.find({ user: userId });
    const meetingRecords = await Meeting.find({ 'attendance.user': userId });

    const sessionAttendance = meetingRecords.filter((meeting) => meeting.meetingType === 'session');
    const committeeAttendance = meetingRecords.filter((meeting) => meeting.meetingType === 'committee');

    const countPresent = (records) => records.reduce((count, meeting) => {
      const entry = meeting.attendance.find((att) => att.user.toString() === userId.toString());
      return count + (entry && entry.status === 'Present' ? 1 : 0);
    }, 0);

    const performance = {
      totalAttendanceRecords: attendanceRecords.length,
      presentDays: attendanceRecords.filter((r) => r.status === 'present').length,
      absentDays: attendanceRecords.filter((r) => r.status === 'absent').length,
      attendanceRate: attendanceRecords.length > 0
        ? Math.round((attendanceRecords.filter((r) => r.status === 'present').length / attendanceRecords.length) * 100)
        : 0,
      committeeMeetingsScheduled: committeeAttendance.length,
      committeeMeetingsAttended: countPresent(committeeAttendance),
      sessionMeetingsScheduled: sessionAttendance.length,
      sessionMeetingsAttended: countPresent(sessionAttendance),
      recentAttendance: attendanceRecords.slice(-10).map((record) => ({
        date: record.date,
        status: record.status,
      })),
    };

    res.json(performance);
  } catch (error) {
    res.status(500).json({ message: 'Error loading performance metrics', error: error.message });
  }
});

module.exports = router;
