const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  action: {
    type: String,
    required: true,
    trim: true,
  },
  entity: {
    type: String,
    trim: true,
  },
  entityId: {
    type: String,
    trim: true,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
  },
  method: {
    type: String,
    trim: true,
  },
  path: {
    type: String,
    trim: true,
  },
  ip: {
    type: String,
    trim: true,
  },
  userAgent: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
