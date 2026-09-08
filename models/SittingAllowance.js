const mongoose = require('mongoose');

const SittingAllowanceSchema = new mongoose.Schema({
  claimNumber: { type: String, unique: true, sparse: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attendance: { type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' },
  sessionDate: { type: Date, required: true },
  meeting: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' },
  allowanceType: {
    type: String,
    enum: ['Plenary', 'Committee', 'Special Sitting'],
    default: 'Plenary',
  },
  attendanceStatus: {
    type: String,
    enum: ['Present', 'Absent', 'Excused', 'Late'],
    default: 'Present',
  },
  eligible: { type: Boolean, default: true },
  rate: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'Approved', 'Rejected'],
    default: 'Draft',
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  submittedAt: Date,
  eligibilityReason: { type: String, trim: true },
  notes: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('SittingAllowance', SittingAllowanceSchema);
