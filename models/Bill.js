const mongoose = require('mongoose');
const { LEGISLATIVE_STATUS_FLOW, buildHistoryEntry, generateReferenceNumber } = require('../utils/legislativeTracking');

const MotionSchema = new mongoose.Schema({
  proposer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  comments: String,
  nextResponsibleOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  workflowHistory: [{
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: String,
    status: String,
    comment: String,
    nextResponsibleOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  }],
});

const VoteResultSchema = new mongoose.Schema({
  option: { type: String },
  votes: { type: Number, default: 0 },
});

const CommitteeRecommendationSchema = new mongoose.Schema({
  committee: { type: mongoose.Schema.Types.ObjectId, ref: 'Committee' },
  recommendation: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
  recommendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const LegislativeHistoryEntrySchema = new mongoose.Schema({
  status: { type: String, enum: LEGISLATIVE_STATUS_FLOW, required: true },
  actor: { type: String, trim: true },
  note: { type: String, trim: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: true });

const LegislativeAttachmentSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  url: { type: String, trim: true },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const AmendmentSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  summary: { type: String, trim: true },
  status: { type: String, enum: ['Draft', 'Submitted', 'Approved', 'Rejected'], default: 'Draft' },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const QuestionSchema = new mongoose.Schema({
  question: { type: String, trim: true },
  department: { type: String, trim: true },
  response: { type: String, trim: true },
  status: { type: String, enum: ['Pending', 'Answered', 'Escalated'], default: 'Pending' },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const BillSchema = new mongoose.Schema({
  type: { type: String, enum: ['Bill', 'Motion', 'Question', 'Resolution'], default: 'Bill' },
  title: { type: String, required: true, trim: true },
  summary: { type: String, trim: true },
  referenceNumber: { type: String, unique: true, sparse: true, trim: true },
  sponsor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  proposer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  category: { type: String, trim: true },
  department: { type: String, trim: true },
  status: { type: String, enum: ['Draft', 'Submitted', 'Reviewed', 'Approved', 'Rejected', 'Debated', 'Resolved', 'Committee Review', 'Voting'], default: 'Draft' },
  workflow: { type: String, enum: LEGISLATIVE_STATUS_FLOW, default: 'Draft' },
  committee: { type: mongoose.Schema.Types.ObjectId, ref: 'Committee' },
  documents: [{ type: String }],
  attachments: [LegislativeAttachmentSchema],
  amendments: [AmendmentSchema],
  questions: [QuestionSchema],
  resolution: { type: String, trim: true },
  motions: [MotionSchema],
  committeeRecommendations: [CommitteeRecommendationSchema],
  voting: {
    items: [
      new mongoose.Schema({
        question: { type: String, required: true },
        options: [String],
        voteType: {
          type: String,
          enum: ['voice', 'electronic', 'secret'],
          default: 'electronic',
        },
        results: [VoteResultSchema],
        voteRecords: [
          {
            voter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            option: String,
            castAt: { type: Date, default: Date.now },
          },
        ],
        finalDecision: { type: String, trim: true },
        talliedAt: Date,
      }),
    ],
  },
  history: [LegislativeHistoryEntrySchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

BillSchema.pre('validate', function (next) {
  if (!this.referenceNumber) {
    this.referenceNumber = generateReferenceNumber(this.type || 'Bill');
  }
  if (!this.history || this.history.length === 0) {
    this.history = [buildHistoryEntry(this.workflow || this.status || 'Draft', this.sponsor ? 'Member Sponsor' : 'System', `${this.type || 'Bill'} record created with reference ${this.referenceNumber}.`)];
  }
  next();
});

BillSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Bill', BillSchema);
