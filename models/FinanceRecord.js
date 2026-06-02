const mongoose = require('mongoose');

const FinanceRecordSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: ['Budget', 'Expenditure', 'Payment', 'Procurement'],
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  amountRequested: {
    type: Number,
    default: 0,
  },
  amountApproved: {
    type: Number,
    default: 0,
  },
  amountSpent: {
    type: Number,
    default: 0,
  },
  referenceNumber: {
    type: String,
    trim: true,
  },
  vendor: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'Approved', 'Rejected', 'Paid', 'Completed'],
    default: 'Draft',
  },
  approvalStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

FinanceRecordSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('FinanceRecord', FinanceRecordSchema);
