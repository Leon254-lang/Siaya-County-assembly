const mongoose = require('mongoose');

const ProcurementRecordSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['plan', 'requisition', 'po', 'supplier', 'tender', 'inventory', 'contract', 'report', 'document'],
  },
  title: { type: String, required: true, trim: true },
  department: { type: String, trim: true },
  budget: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  supplier: { type: String, trim: true },
  status: { type: String, trim: true },
  reference: { type: String, trim: true },
  category: { type: String, trim: true },
  performance: { type: String, trim: true },
  contact: { type: String, trim: true },
  summary: { type: String, trim: true },
  priority: { type: String, trim: true },
  requestedBy: { type: String, trim: true },
  description: { type: String, trim: true },
  deadline: { type: String, trim: true },
  expiryDate: { type: String, trim: true },
  documentStatus: { type: String, trim: true },
  closingDate: { type: String, trim: true },
  recommendation: { type: String, trim: true },
  bids: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 0 },
  issuedAt: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('ProcurementRecord', ProcurementRecordSchema);
