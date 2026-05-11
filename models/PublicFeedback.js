const mongoose = require('mongoose');

const PublicFeedbackSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    enum: ['bill_notice', 'event_notice', 'public_comment', 'feedback_report'],
    default: 'public_comment',
  },
  submittedBy: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'reviewed', 'archived'],
    default: 'draft',
  },
  publishedOn: Date,
  eventDate: Date,
  eventLocation: String,
  registrationDeadline: Date,
  registrations: [
    {
      name: String,
      email: String,
      phone: String,
      organization: String,
      status: {
        type: String,
        enum: ['registered', 'cancelled'],
        default: 'registered',
      },
      registeredAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  comments: [
    {
      name: String,
      email: String,
      message: String,
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  reportSummary: String,
  reportDetails: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('PublicFeedback', PublicFeedbackSchema);
