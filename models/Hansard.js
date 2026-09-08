const mongoose = require('mongoose');

const HansardEntrySchema = new mongoose.Schema({
  speaker: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  speakerName: { type: String, trim: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: { type: String, trim: true },
  text: { type: String, required: true, trim: true },
  timestamp: { type: Date, default: Date.now },
  sequence: { type: Number, default: 1 },
}, { _id: true });

const HansardSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  sitting: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' },
  sessionDate: { type: Date, required: true },
  sessionType: {
    type: String,
    enum: ['Plenary', 'Committee', 'Special Session'],
    default: 'Plenary',
  },
  status: {
    type: String,
    enum: ['Draft', 'Pending Approval', 'Approved', 'Published', 'Archived'],
    default: 'Draft',
  },
  entries: [HansardEntrySchema],
  versions: [
    {
      version: { type: Number, required: true },
      entries: [HansardEntrySchema],
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now },
      changeNote: String,
    },
  ],
  currentVersion: { type: Number, default: 1 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  publishedAt: Date,
  notes: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Hansard', HansardSchema);
