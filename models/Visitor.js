const mongoose = require('mongoose');

const generateBadgeNumber = () => `V-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const VisitorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  idNumber: {
    type: String,
    required: true,
    trim: true,
  },
  organization: {
    type: String,
    trim: true,
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  purpose: {
    type: String,
    required: true,
    trim: true,
  },
  badgeNumber: {
    type: String,
    trim: true,
    unique: true,
    default: generateBadgeNumber,
  },
  entryTime: {
    type: Date,
    default: Date.now,
  },
  exitTime: Date,
  status: {
    type: String,
    enum: ['inside', 'left', 'cancelled'],
    default: 'inside',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Visitor', VisitorSchema);
