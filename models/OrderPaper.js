const mongoose = require('mongoose');

const OrderPaperItemSchema = new mongoose.Schema({
  orderNo: { type: Number, default: 1 },
  title: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['Business', 'Bill', 'Motion', 'Report', 'Petition', 'Question', 'Other'],
    default: 'Business',
  },
  description: { type: String, trim: true },
  mover: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  responsible: { type: String, trim: true },
  status: {
    type: String,
    enum: ['Scheduled', 'In Progress', 'Deferred', 'Completed'],
    default: 'Scheduled',
  },
}, { _id: true });

const OrderPaperSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  sessionDate: { type: Date, required: true },
  sessionType: {
    type: String,
    enum: ['Plenary', 'Committee', 'Special Session'],
    default: 'Plenary',
  },
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Approved', 'Archived'],
    default: 'Draft',
  },
  items: [OrderPaperItemSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  publishedAt: Date,
  notes: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('OrderPaper', OrderPaperSchema);
