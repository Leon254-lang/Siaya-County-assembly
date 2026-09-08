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
  document_type: {
    type: String,
    enum: ['Bills', 'Motions', 'Committee Reports', 'Order Papers', 'Hansard', 'Notices', 'Minutes', 'Other'],
    default: 'Other',
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
    enum: ['draft', 'submitted', 'reviewed', 'approved', 'published', 'archived', 'pending', 'under_review', 'rejected'],
    default: 'draft',
  },
  version: { type: Number, default: 1, min: 1 },
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
  uploaded_by: {
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
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  dueDate: {
    type: Date,
  },
  responseStatus: {
    type: String,
    enum: ['not_requested', 'awaiting', 'received', 'overdue'],
    default: 'not_requested',
  },
  responseNotes: {
    type: String,
    trim: true,
  },
  responseReceivedAt: Date,
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

DocumentSchema.pre('save', function syncDocumentMetadata(next) {
  this.uploaded_by = this.uploaded_by || this.owner;
  this.created_at = this.created_at || this.createdAt;
  this.updated_at = new Date();
  this.updatedAt = this.updated_at;
  next();
});

module.exports = mongoose.model('Document', DocumentSchema);
