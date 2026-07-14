const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['annual', 'sick', 'maternity', 'paternity', 'emergency', 'study', 'compassionate'],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  daysRequested: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: Date,
  comments: String,
  workflowStage: {
    type: String,
    enum: ['Submitted to HR', 'Submitted to Clerk', 'Approved by Clerk', 'Returned', 'Rejected by HR', 'Rejected by Clerk'],
    default: 'Submitted to HR',
  },
  reliefStaffName: {
    type: String,
    trim: true,
  },
  reliefDuties: {
    type: String,
    trim: true,
  },
  returned: {
    type: Boolean,
    default: false,
  },
  returnDate: Date,
  attachments: [{
    filename: String,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Calculate days requested automatically before validation
LeaveSchema.pre('validate', function(next) {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    this.daysRequested = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
  }
  next();
});

module.exports = mongoose.model('Leave', LeaveSchema);