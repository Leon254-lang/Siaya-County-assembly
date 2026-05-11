const mongoose = require('mongoose');

const AssetSchema = new mongoose.Schema({
  assetTag: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: ['ict', 'furniture', 'vehicle', 'office_supply', 'other'],
    default: 'other',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  assignedDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  location: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['available', 'in_use', 'maintenance', 'retired'],
    default: 'available',
  },
  purchaseDate: Date,
  value: Number,
  maintenanceLogs: [
    {
      task: String,
      performedBy: String,
      date: Date,
      notes: String,
    },
  ],
  disposalRecords: [
    {
      date: Date,
      reason: String,
      disposedBy: String,
      method: String,
      notes: String,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Asset', AssetSchema);
