const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['meeting_reminder', 'approval_request', 'deadline', 'status_update', 'public_notice', 'system'],
    default: 'system',
  },
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true, trim: true },
  link: { type: String, trim: true },
  critical: { type: Boolean, default: false },
  readAt: Date,
  emailSentAt: Date,
  smsSentAt: Date,
  createdAt: { type: Date, default: Date.now },
});

NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, readAt: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);