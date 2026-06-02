const mongoose = require('mongoose');

const MotionSchema = new mongoose.Schema({
  proposer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: { type: String, trim: true },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' },
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

const BillSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  summary: { type: String, trim: true },
  proposer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['Draft', 'Submitted', 'Committee Review', 'Debate', 'Voting', 'Approved', 'Rejected'], default: 'Draft' },
  committee: { type: mongoose.Schema.Types.ObjectId, ref: 'Committee' },
  documents: [{ type: String }],
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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

BillSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Bill', BillSchema);
