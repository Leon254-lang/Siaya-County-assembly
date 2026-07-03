const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  vacancy: { type: mongoose.Schema.Types.ObjectId, ref: 'Vacancy', required: true },
  applicantName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  resume: {
    filename: String,
    path: String,
  },
  coverLetter: String,
  status: { type: String, enum: ['pending', 'shortlisted', 'interview_scheduled', 'hired', 'rejected'], default: 'pending' },
  interviewDate: Date,
  interviewNotes: String,
  appliedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Application', ApplicationSchema);
