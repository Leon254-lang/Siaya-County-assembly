const mongoose = require('mongoose');

const InternSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
  },
  phone: {
    type: String,
    trim: true,
  },
  firstName: {
    type: String,
    trim: true,
  },
  lastName: {
    type: String,
    trim: true,
  },
  institution: {
    type: String,
    trim: true,
  },
  course: {
    type: String,
    trim: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  placement: {
    type: String,
    trim: true,
  },
  startDate: Date,
  endDate: Date,
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active',
  },
  dailyLogs: [
    {
      date: Date,
      activity: String,
      notes: String,
    },
  ],
  evaluations: [
    {
      reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      score: Number,
      comments: String,
      date: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  completionReports: [
    {
      date: {
        type: Date,
        default: Date.now,
      },
      summary: String,
      supervisor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      remarks: String,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Intern', InternSchema);
