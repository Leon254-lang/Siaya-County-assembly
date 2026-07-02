const mongoose = require('mongoose');

const SelfAssessmentSchema = new mongoose.Schema({
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
  selfSummary: {
    type: String,
    required: true,
    trim: true,
  },
  strengths: {
    type: String,
    trim: true,
  },
  growthAreas: {
    type: String,
    trim: true,
  },
  goals: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('SelfAssessment', SelfAssessmentSchema);
