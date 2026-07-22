const express = require('express');
const multer = require('multer');
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/leave/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Get leave requests with filtering
router.get('/', verifyToken, async (req, res) => {
  try {
    const {
      user,
      status,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = req.query;

    let query = {};

    // Role gating: HR can view all, Clerk can view requests submitted to clerk, others only their own
    const userRole = req.user.role?.name;
    const isHr = ['Super Admin', 'HR Officer'].includes(userRole);
    const isClerk = ['Super Admin', 'Clerk'].includes(userRole);

    if (user) {
      // allow HR to query arbitrary users; allow Clerk to query their own id or fetch clerk-assignable items
      if (isHr) {
        query.user = user;
      } else if (String(user) === String(req.user._id)) {
        query.user = user;
      } else {
        // other roles must not query arbitrary users
        query.user = req.user._id;
      }
    } else {
      if (isHr) {
        // no user restriction
      } else if (isClerk) {
        // Clerks should see items assigned to them (Submitted to Clerk)
        query.workflowStage = 'Submitted to Clerk';
      } else {
        // regular users only see their own requests
        query.user = req.user._id;
      }
    }
    if (status) query.status = status;
    if (type) query.type = type;
    if (startDate && endDate) {
      query.$or = [
        { startDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { endDate: { $gte: new Date(startDate), $lte: new Date(endDate) } }
      ];
    }

    const skip = (page - 1) * limit;

    const leaveRequests = await Leave.find(query)
      .populate('user', 'name email department role')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Leave.countDocuments(query);

    res.json({
      requests: leaveRequests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRequests: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leave requests', error: error.message });
  }
});

const parseDateOnly = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string') return null;

  const parts = value.split('-').map(Number);
  if (parts.length !== 3) return null;

  const [year, month, day] = parts;
  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const validLeaveTypes = ['annual', 'sick', 'maternity', 'paternity', 'emergency', 'study', 'compassionate'];

// Submit leave request
router.post('/', verifyToken, async (req, res) => {
  try {
    const { type, startDate, endDate, reason, reliefStaffName, reliefDuties } = req.body;
    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);
    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
    const trimmedReliefStaffName = typeof reliefStaffName === 'string' ? reliefStaffName.trim() : '';
    const trimmedReliefDuties = typeof reliefDuties === 'string' ? reliefDuties.trim() : '';

    if (!type || !validLeaveTypes.includes(type)) {
      return res.status(400).json({ message: 'Select a valid leave type.' });
    }

    if (!start || !end) {
      return res.status(400).json({ message: 'Valid start and end dates are required.' });
    }

    if (!trimmedReason) {
      return res.status(400).json({ message: 'Please provide a reason for the leave.' });
    }

    if (!trimmedReliefStaffName) {
      return res.status(400).json({ message: 'Please provide the name of the person who will manage your duties.' });
    }

    if (!trimmedReliefDuties) {
      return res.status(400).json({ message: 'Please describe the duties or information for the relief person.' });
    }

    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (start < tomorrow) {
      return res.status(400).json({ message: 'Leave must be requested at least one day before the start date.' });
    }

    if (end < start) {
      return res.status(400).json({ message: 'Leave end date must be the same as or after the start date.' });
    }

    // Prevent submitting a new request if user has an active pending or approved leave overlapping
    const overlapping = await Leave.findOne({
      user: req.user._id,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: end, $gte: start } },
        { endDate: { $lte: end, $gte: start } },
        { startDate: { $lte: start }, endDate: { $gte: end } }
      ]
    });

    if (overlapping) {
      return res.status(400).json({ message: 'You already have an overlapping or active leave (pending/approved). Please return from leave before requesting another.' });
    }

    const leaveRequest = new Leave({
      user: req.user._id,
      type,
      startDate: start,
      endDate: end,
      reason: trimmedReason,
      reliefStaffName: trimmedReliefStaffName,
      reliefDuties: trimmedReliefDuties,
      status: 'pending',
      workflowStage: 'Submitted to HR',
    });

    await leaveRequest.save();

    await recordAudit({
      req,
      action: 'Submitted leave request',
      entity: 'Leave',
      entityId: leaveRequest._id,
      details: {
        type,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        reason: trimmedReason,
        reliefStaffName: trimmedReliefStaffName,
        reliefDuties: trimmedReliefDuties,
        status: leaveRequest.status,
        workflowStage: leaveRequest.workflowStage,
      },
    });

    const populatedRequest = await Leave.findById(leaveRequest._id)
      .populate('user', 'name email department role');

    res.status(201).json(populatedRequest);
  } catch (error) {
    console.error('Leave submit failed:', {
      user: req.user?._id,
      body: req.body,
      error: error.message,
    });
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: `Leave request invalid: ${error.message}`, error: error.message });
    }
    res.status(500).json({ message: `Error submitting leave request: ${error.message}`, error: error.message });
  }
});

// Report return from approved leave
router.post('/:id/return', verifyToken, async (req, res) => {
  try {
    const leaveRequest = await Leave.findById(req.params.id);
    if (!leaveRequest) return res.status(404).json({ message: 'Leave request not found' });

    const currentUserId = req.user._id.toString();
    const requesterId = leaveRequest.user.toString();
    const userRole = req.user.role?.name;

    if (currentUserId !== requesterId && !['Super Admin', 'HR Officer', 'Clerk'].includes(userRole)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (leaveRequest.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved leave can be marked as returned.' });
    }

    leaveRequest.returned = true;
    leaveRequest.returnDate = new Date();
    leaveRequest.workflowStage = 'Returned';
    leaveRequest.updatedAt = new Date();

    await leaveRequest.save();

    const populatedRequest = await Leave.findById(leaveRequest._id)
      .populate('user', 'name email department role')
      .populate('approvedBy', 'name');

    res.json(populatedRequest);
  } catch (error) {
    res.status(500).json({ message: 'Error reporting return from leave', error: error.message });
  }
});

// Upload attachment to leave request
router.post('/:id/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const leaveRequest = await Leave.findById(req.params.id);
    if (!leaveRequest) return res.status(404).json({ message: 'Leave request not found' });

    if (!req.file) return res.status(400).json({ message: 'File upload required' });

    leaveRequest.attachments.push({
      filename: req.file.originalname,
      path: req.file.path,
    });

    leaveRequest.updatedAt = new Date();
    await leaveRequest.save();

    const populatedRequest = await Leave.findById(leaveRequest._id)
      .populate('user', 'name email department role')
      .populate('approvedBy', 'name');

    res.json(populatedRequest);
  } catch (error) {
    res.status(500).json({ message: 'Error uploading attachment', error: error.message });
  }
});

// Approve/Reject leave request and route through HR -> Clerk workflow
router.post('/:id/:action', verifyToken, authorizeRoles('Super Admin', 'HR Officer', 'Clerk'), async (req, res) => {
  try {
    const { action } = req.params;
    const { comments, reliefStaffName, reliefDuties } = req.body;
    const userRole = req.user.role?.name;

    const validActions = [
      'approve',
      'reject',
      'submit-to-clerk',
      'reject-by-hr',
      'approve-by-clerk',
      'reject-by-clerk'
    ];

    if (!validActions.includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const leaveRequest = await Leave.findById(req.params.id).populate('user', 'name email department role');
    if (!leaveRequest) return res.status(404).json({ message: 'Leave request not found' });

    if (['approve', 'submit-to-clerk'].includes(action)) {
      if (!['Super Admin', 'HR Officer'].includes(userRole)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      leaveRequest.status = 'pending';
      leaveRequest.workflowStage = 'Submitted to Clerk';
      leaveRequest.comments = comments;
      leaveRequest.updatedAt = new Date();
    } else if (action === 'reject' || action === 'reject-by-hr') {
      if (!['Super Admin', 'HR Officer'].includes(userRole)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      leaveRequest.status = 'rejected';
      leaveRequest.workflowStage = 'Rejected by HR';
      leaveRequest.comments = comments;
      leaveRequest.approvedBy = req.user._id;
      leaveRequest.approvedAt = new Date();
      leaveRequest.updatedAt = new Date();
    } else if (action === 'approve-by-clerk') {
      if (!['Super Admin', 'Clerk'].includes(userRole)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      leaveRequest.status = 'approved';
      leaveRequest.workflowStage = 'Approved by Clerk';
      leaveRequest.reliefStaffName = reliefStaffName;
      leaveRequest.reliefDuties = reliefDuties;
      leaveRequest.comments = comments;
      leaveRequest.approvedBy = req.user._id;
      leaveRequest.approvedAt = new Date();
      leaveRequest.updatedAt = new Date();

      const leaveDays = [];
      const currentDate = new Date(leaveRequest.startDate);

      while (currentDate <= leaveRequest.endDate) {
        leaveDays.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      for (const leaveDate of leaveDays) {
        const existingRecord = await Attendance.findOne({
          user: leaveRequest.user,
          date: leaveDate
        });

        if (!existingRecord) {
          const attendanceRecord = new Attendance({
            user: leaveRequest.user,
            userType: leaveRequest.user.role?.name?.toLowerCase().includes('intern') ? 'intern' : 'staff',
            date: leaveDate,
            status: 'leave',
            leaveType: leaveRequest.type,
            notes: `Leave: ${leaveRequest.reason}`,
            approvedBy: req.user._id,
          });
          await attendanceRecord.save();
        }
      }
    } else if (action === 'reject-by-clerk') {
      if (!['Super Admin', 'Clerk'].includes(userRole)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      leaveRequest.status = 'rejected';
      leaveRequest.workflowStage = 'Rejected by Clerk';
      leaveRequest.comments = comments;
      leaveRequest.approvedBy = req.user._id;
      leaveRequest.approvedAt = new Date();
      leaveRequest.updatedAt = new Date();
    }

    await leaveRequest.save();

    const populatedRequest = await Leave.findById(leaveRequest._id)
      .populate('user', 'name email department role')
      .populate('approvedBy', 'name');

    res.json(populatedRequest);
  } catch (error) {
    res.status(500).json({ message: 'Error processing leave request', error: error.message });
  }
});

// Get leave balance for user
router.get('/balance/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentYear = new Date().getFullYear();

    // This is a simplified leave balance calculation
    // In a real system, you'd have a leave balance table
    const annualLeaveEntitlement = 25; // days per year

    const approvedLeaves = await Leave.find({
      user: userId,
      status: 'approved',
      startDate: { $gte: new Date(currentYear, 0, 1) },
      endDate: { $lte: new Date(currentYear, 11, 31) }
    });

    const usedDays = approvedLeaves.reduce((sum, leave) => sum + leave.daysRequested, 0);
    const remainingDays = annualLeaveEntitlement - usedDays;

    res.json({
      userId,
      year: currentYear,
      entitlement: annualLeaveEntitlement,
      used: usedDays,
      remaining: Math.max(0, remainingDays),
      approvedRequests: approvedLeaves.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating leave balance', error: error.message });
  }
});

// Get leave calendar for a month
router.get('/calendar/:year/:month', verifyToken, async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const leaveRequests = await Leave.find({
      status: 'approved',
      $or: [
        { startDate: { $lte: endDate, $gte: startDate } },
        { endDate: { $lte: endDate, $gte: startDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
      ]
    }).populate('user', 'name department');

    const calendar = {};
    leaveRequests.forEach(request => {
      const currentDate = new Date(request.startDate);
      while (currentDate <= request.endDate && currentDate <= endDate) {
        if (currentDate >= startDate) {
          const dateKey = currentDate.toISOString().split('T')[0];
          if (!calendar[dateKey]) calendar[dateKey] = [];
          calendar[dateKey].push({
            user: request.user.name,
            department: request.user.department?.name || 'N/A',
            type: request.type,
            reason: request.reason
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    res.json(calendar);
  } catch (error) {
    res.status(500).json({ message: 'Error generating leave calendar', error: error.message });
  }
});

module.exports = router;