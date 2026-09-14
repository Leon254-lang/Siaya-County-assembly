const mongoose = require('mongoose');

const ActionItemSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  description: { type: String, trim: true },
  responsiblePerson: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dueDate: { type: Date },
  status: { type: String, enum: ['Pending', 'Ongoing', 'Completed', 'Overdue', 'Cancelled'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const CommitteeMeetingSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  date: { type: Date },
  agenda: { type: String, trim: true },
  invitations: [{ type: String, trim: true }],
  attendance: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  minutes: { type: String, trim: true },
  documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
  actionItems: [ActionItemSchema],
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const CommitteeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  mandate: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  clerk: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  chairperson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  viceChairperson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  meetings: [CommitteeMeetingSchema],
  reports: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    },
  ],
  documents: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    },
  ],
  recommendations: [
    {
      text: String,
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  performance: {
    totalMeetings: { type: Number, default: 0 },
    overdueActions: { type: Number, default: 0 },
    completedActions: { type: Number, default: 0 },
    averageAttendance: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Committee', CommitteeSchema);
