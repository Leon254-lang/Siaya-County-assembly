const mongoose = require('mongoose');

const AppraisalSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    trim: true,
  },
  employeeName: {
    type: String,
    required: true,
    trim: true,
  },
  department: {
    type: String,
    trim: true,
  },
  period: {
    type: String,
    required: true,
    trim: true,
  },
  performance: {
    type: Number,
    required: true,
  },
  communication: {
    type: Number,
    required: true,
  },
  reliability: {
    type: Number,
    required: true,
  },
  teamwork: {
    type: Number,
    required: true,
  },
  achievements: {
    type: String,
    trim: true,
  },
  managerComments: {
    type: String,
    trim: true,
  },
  dueDate: {
    type: String,
    trim: true,
  },
  score: {
    type: Number,
    required: true,
  },
  rating: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    default: 'Pending Review',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Appraisal', AppraisalSchema);
