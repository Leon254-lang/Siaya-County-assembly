const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  docNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ['incoming', 'outgoing', 'memo', 'bill', 'report', 'minutes', 'letter', 'contract'],
    default: 'incoming',
  },
  category: {
    type: String,
    enum: ['administrative', 'financial', 'legal', 'technical', 'personnel', 'public'],
    default: 'administrative',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'under_review', 'approved', 'rejected', 'archived'],
    default: 'draft',
  },
  origin: {
    type: String,
    trim: true,
  },
  destination: {
    type: String,
    trim: true,
  },
  currentDepartment: {
    type: String,
    trim: true,
  },
  sender: {
    name: String,
    organization: String,
    contact: String,
  },
  recipient: {
    name: String,
    organization: String,
    contact: String,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  tags: [String],
  files: [
    {
      path: String,
      filename: String,
      originalName: String,
      size: Number,
      mimeType: String,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  dueDate: {
    type: Date,
  },
  approvalHistory: [
    {
      action: {
        type: String,
        enum: ['created', 'submitted', 'assigned', 'moved', 'approved', 'rejected', 'archived', 'returned'],
        default: 'created',
      },
      by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      fromDepartment: String,
      toDepartment: String,
      comment: String,
      when: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  movementHistory: [
    {
      fromDepartment: String,
      toDepartment: String,
      movedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reason: String,
      movedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

module.exports = mongoose.model('Document', DocumentSchema);
