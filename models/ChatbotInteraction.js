const mongoose = require('mongoose');

const ChatbotInteractionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: { type: String, trim: true },
  question: { type: String, required: true, trim: true, maxlength: 2000 },
  answer: { type: String, required: true, maxlength: 10000 },
  sourceCitations: [{ label: String, url: String, type: String, sourceType: String, page: String }],
  accessDenied: { type: Boolean, default: false },
  feedback: { type: String, enum: ['helpful', 'not_helpful', 'report_incorrect'] },
  feedbackComment: { type: String, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now },
});

ChatbotInteractionSchema.index({ createdAt: -1 });
ChatbotInteractionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ChatbotInteraction', ChatbotInteractionSchema);
