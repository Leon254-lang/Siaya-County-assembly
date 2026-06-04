const express = require('express');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const User = require('../models/User');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const ASSEMBLY_PREMISES = {
  latitude: 0.0619,
  longitude: 34.2886,
  radiusMeters: 1200
};

const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const isWithinPremises = (latitude, longitude) => {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
  return getDistanceFromLatLonInMeters(
    latitude,
    longitude,
    ASSEMBLY_PREMISES.latitude,
    ASSEMBLY_PREMISES.longitude
  ) <= ASSEMBLY_PREMISES.radiusMeters;
};

const router = express.Router();

// Get attendance records with filtering
router.get('/', verifyToken, async (req, res) => {
  try {
    const {
      user,
      userType,
      date,
      month,
      year,
      status,
      page = 1,
      limit = 10
    } = req.query;

    let query = {};

    if (user) query.user = user;
    if (userType) query.userType = userType;
    if (status) query.status = status;
    if (date) query.date = new Date(date);
    if (month && year) {
      query.month = parseInt(month);
      query.year = parseInt(year);
    }

    const skip = (page - 1) * limit;

    const records = await Attendance.find(query)
      .populate('user', 'name email department role')
      .populate('approvedBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Attendance.countDocuments(query);

    res.json({
      records,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching attendance records', error: error.message });
  }
});

// Check-in endpoint
router.post('/checkin', verifyToken, async (req, res) => {
  try {
    const { method = 'manual', location, deviceId, latitude, longitude, address } = req.body;
    if (latitude == null || longitude == null) {
      return res.status(400).json({ message: 'Location is required for attendance and must be enabled on your device.' });
    }
    if (!isWithinPremises(latitude, longitude)) {
      return res.status(400).json({ message: 'You must be within the Siaya County Assembly premises to check in.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if user already checked in today
    const existingRecord = await Attendance.findOne({
      user: req.user._id,
      date: today
    });

    if (existingRecord && existingRecord.checkIn.time) {
      return res.status(400).json({ message: 'Already checked in today' });
    }

    const attendanceData = {
      user: req.user._id,
      userType: req.user.role?.name?.toLowerCase().includes('intern') ? 'intern' :
                req.user.role?.name?.toLowerCase().includes('mca') ? 'mca' : 'staff',
      date: today,
      month: today.getMonth() + 1, // getMonth() returns 0-11, so add 1
      year: today.getFullYear(),
      status: 'present',
      checkIn: {
        time: new Date(),
        method,
        location,
        deviceId,
      },
      location: { latitude, longitude, address },
      deviceInfo: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        deviceType: req.body.deviceType || 'web',
      },
    };

    let attendance;
    if (existingRecord) {
      attendance = await Attendance.findByIdAndUpdate(
        existingRecord._id,
        { ...attendanceData, updatedAt: new Date() },
        { new: true }
      ).populate('user', 'name email');
    } else {
      attendance = new Attendance(attendanceData);
      await attendance.save();
      attendance = await Attendance.findById(attendance._id).populate('user', 'name email');
    }

    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Error checking in', error: error.message });
  }
});

// Check-out endpoint
router.post('/checkout', verifyToken, async (req, res) => {
  try {
    const { method = 'manual', location, deviceId, breakTime = 0, latitude, longitude, address } = req.body;
    if (latitude == null || longitude == null) {
      return res.status(400).json({ message: 'Location is required for attendance and must be enabled on your device.' });
    }
    if (!isWithinPremises(latitude, longitude)) {
      return res.status(400).json({ message: 'You must be within the Siaya County Assembly premises to check out.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await Attendance.findOne({
      user: req.user._id,
      date: today
    });

    if (!record) {
      return res.status(404).json({ message: 'No check-in record found for today' });
    }

    if (record.checkOut.time) {
      return res.status(400).json({ message: 'Already checked out today' });
    }

    record.checkOut = {
      time: new Date(),
      method,
      location,
      deviceId,
    };
    record.location = { latitude, longitude, address };
    record.breakTime = breakTime;
    record.updatedAt = new Date();

    await record.save();
    const updatedRecord = await Attendance.findById(record._id)
      .populate('user', 'name email')
      .populate('approvedBy', 'name');

    res.json(updatedRecord);
  } catch (error) {
    res.status(500).json({ message: 'Error checking out', error: error.message });
  }
});

// Generate QR code for attendance
router.post('/generate-qr', verifyToken, async (req, res) => {
  try {
    const { expiresIn = 24 } = req.body; // hours
    const qrCode = require('crypto').randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);

    // Update or create attendance record with QR code
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let record = await Attendance.findOne({
      user: req.user._id,
      date: today
    });

    if (!record) {
      record = new Attendance({
        user: req.user._id,
        userType: req.user.role?.name?.toLowerCase().includes('intern') ? 'intern' : 'staff',
        date: today,
        month: today.getMonth() + 1,
        year: today.getFullYear(),
        status: 'present',
      });
    }

    record.qrCode = {
      code: qrCode,
      generatedAt: new Date(),
      expiresAt,
      isActive: true,
    };

    await record.save();

    res.json({
      qrCode,
      expiresAt,
      user: req.user.name,
      userId: req.user._id
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating QR code', error: error.message });
  }
});

// Verify QR code attendance
router.post('/verify-qr', verifyToken, authorizeRoles('Security Officer', 'Super Admin', 'ICT Admin'), async (req, res) => {
  try {
    const { qrCode, method = 'qr_code', location, deviceId } = req.body;

    const record = await Attendance.findOne({
      'qrCode.code': qrCode,
      'qrCode.isActive': true,
      'qrCode.expiresAt': { $gt: new Date() }
    }).populate('user', 'name email department');

    if (!record) {
      return res.status(404).json({ message: 'Invalid or expired QR code' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!record.checkIn.time) {
      // Check-in
      record.checkIn = {
        time: new Date(),
        method,
        location,
        deviceId,
      };
      record.status = 'present';
    } else if (!record.checkOut.time) {
      // Check-out
      record.checkOut = {
        time: new Date(),
        method,
        location,
        deviceId,
      };
    } else {
      return res.status(400).json({ message: 'Already checked out for today' });
    }

    record.updatedAt = new Date();
    await record.save();

    res.json({
      success: true,
      action: record.checkOut.time ? 'checkout' : 'checkin',
      user: record.user.name,
      time: record.checkOut.time || record.checkIn.time
    });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying QR code', error: error.message });
  }
});

// Get monthly attendance summary
router.get('/summary/:userId/:year/:month', verifyToken, async (req, res) => {
  try {
    const { userId, year, month } = req.params;

    const records = await Attendance.find({
      user: userId,
      year: parseInt(year),
      month: parseInt(month)
    }).sort({ date: 1 });

    const summary = {
      userId,
      year: parseInt(year),
      month: parseInt(month),
      totalDays: records.length,
      presentDays: records.filter(r => r.status === 'present').length,
      absentDays: records.filter(r => r.status === 'absent').length,
      leaveDays: records.filter(r => r.status === 'leave').length,
      remoteDays: records.filter(r => r.status === 'remote').length,
      lateDays: records.filter(r => r.status === 'late').length,
      partialDays: records.filter(r => r.status === 'partial').length,
      totalWorkingHours: records.reduce((sum, r) => sum + (r.workingHours || 0), 0),
      totalOvertime: records.reduce((sum, r) => sum + (r.overtime || 0), 0),
      records
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: 'Error generating summary', error: error.message });
  }
});

// Get attendance report
router.get('/report', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate, department, userType } = req.query;

    let query = {};
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (department) query['user.department'] = department;
    if (userType) query.userType = userType;

    const records = await Attendance.find(query)
      .populate('user', 'name email department role')
      .sort({ date: 1, 'user.name': 1 });

    // Group by user
    const report = {};
    records.forEach(record => {
      const userId = record.user._id.toString();
      if (!report[userId]) {
        report[userId] = {
          user: record.user,
          records: [],
          summary: {
            present: 0,
            absent: 0,
            leave: 0,
            remote: 0,
            late: 0,
            partial: 0,
            totalHours: 0
          }
        };
      }

      report[userId].records.push(record);
      report[userId].summary[record.status]++;
      report[userId].summary.totalHours += record.workingHours || 0;
    });

    res.json(Object.values(report));
  } catch (error) {
    res.status(500).json({ message: 'Error generating report', error: error.message });
  }
});

// Mark absent for users who didn't check in
router.post('/mark-absent', verifyToken, authorizeRoles('Super Admin', 'HR Officer'), async (req, res) => {
  try {
    const { date } = req.body;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Find all users who should have attendance records
    const users = await User.find({
      role: { $ne: null },
      isActive: { $ne: false }
    });

    const absentRecords = [];

    for (const user of users) {
      const existingRecord = await Attendance.findOne({
        user: user._id,
        date: targetDate
      });

      if (!existingRecord) {
        const record = new Attendance({
          user: user._id,
          userType: user.role?.name?.toLowerCase().includes('intern') ? 'intern' :
                   user.role?.name?.toLowerCase().includes('mca') ? 'mca' : 'staff',
          date: targetDate,
          status: 'absent',
          notes: 'Auto-marked as absent'
        });
        await record.save();
        absentRecords.push(record);
      }
    }

    res.json({
      message: `Marked ${absentRecords.length} users as absent`,
      records: absentRecords
    });
  } catch (error) {
    res.status(500).json({ message: 'Error marking absent', error: error.message });
  }
});

module.exports = router;
