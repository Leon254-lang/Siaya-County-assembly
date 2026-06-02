const mongoose = require('mongoose');

const CommitteeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  reports: [
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Committee', CommitteeSchema);
