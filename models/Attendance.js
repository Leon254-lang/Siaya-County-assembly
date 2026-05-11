const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userType: {
    type: String,
    enum: ['staff', 'intern', 'mca', 'visitor'],
    default: 'staff',
  },
  date: {
    type: Date,
    required: true,
  },
  month: {
    type: Number,
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'leave', 'remote', 'partial', 'late'],
    default: 'present',
  },
  checkIn: {
    time: Date,
    method: {
      type: String,
      enum: ['manual', 'fingerprint', 'qr_code', 'card', 'face_recognition'],
      default: 'manual',
    },
    location: String,
    deviceId: String,
  },
  checkOut: {
    time: Date,
    method: {
      type: String,
      enum: ['manual', 'fingerprint', 'qr_code', 'card', 'face_recognition'],
      default: 'manual',
    },
    location: String,
    deviceId: String,
  },
  workingHours: {
    type: Number, // in hours
    default: 0,
  },
  breakTime: {
    type: Number, // in minutes
    default: 0,
  },
  overtime: {
    type: Number, // in hours
    default: 0,
  },
  leaveType: {
    type: String,
    enum: ['annual', 'sick', 'maternity', 'paternity', 'emergency', 'study', 'compassionate'],
  },
  notes: {
    type: String,
    trim: true,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  qrCode: {
    code: String,
    generatedAt: Date,
    expiresAt: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  fingerprintData: {
    template: String, // For future fingerprint integration
    deviceId: String,
    capturedAt: Date,
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
  },
  deviceInfo: {
    userAgent: String,
    ipAddress: String,
    deviceType: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for better performance
AttendanceSchema.index({ user: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ user: 1, month: 1, year: 1 });
AttendanceSchema.index({ date: 1 });
AttendanceSchema.index({ 'qrCode.code': 1 });

// Calculate working hours automatically
AttendanceSchema.pre('save', function(next) {
  if (this.checkIn?.time && this.checkOut?.time) {
    const diffMs = this.checkOut.time - this.checkIn.time;
    const diffHours = diffMs / (1000 * 60 * 60);
    this.workingHours = Math.max(0, diffHours - (this.breakTime / 60)); // Subtract break time
  }

  // Set month and year from date
  if (this.date) {
    this.month = this.date.getMonth() + 1; // JavaScript months are 0-indexed
    this.year = this.date.getFullYear();
  }

  next();
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
