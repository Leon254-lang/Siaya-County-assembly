const mongoose = require('mongoose');

const AttendanceEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Present', 'Absent', 'Excused', 'Late'],
    default: 'Pending',
  },
  checkedInAt: Date,
  method: {
    type: String,
    enum: ['clerk', 'qr_code', 'biometric', 'pin'],
    default: 'clerk',
  },
  deviceId: String,
});

const MeetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  committee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Committee',
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  room: {
    type: String,
    trim: true,
    validate: {
      validator: (value) => !value || /^Boardroom [1-5]$/.test(value),
      message: 'Room must be one of Boardroom 1 through Boardroom 5.',
    },
  },
  agenda: {
    type: String,
    trim: true,
  },
  agendaFile: {
    type: String,
    trim: true,
  },
  minutes: {
    type: String,
    trim: true,
  },
  minutesFile: {
    type: String,
    trim: true,
  },
  orderPaper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OrderPaper',
  },
  hansard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hansard',
  },
  documents: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    },
  ],
  startTime: Date,
  endTime: Date,
  attendees: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  meetingType: {
    type: String,
    enum: ['committee', 'session'],
    default: 'committee',
  },
  sittingType: {
    type: String,
    enum: ['Plenary', 'Special Sitting', 'Committee'],
    default: 'Plenary',
  },
  votingItems: [
    new mongoose.Schema({
      question: {
        type: String,
        required: true,
        trim: true,
      },
      description: {
        type: String,
        trim: true,
      },
      options: [
        {
          type: String,
          trim: true,
        },
      ],
      voteType: {
        type: String,
        enum: ['voice', 'electronic', 'secret'],
        default: 'electronic',
      },
      results: [
        {
          option: {
            type: String,
            trim: true,
          },
          votes: {
            type: Number,
            default: 0,
          },
        },
      ],
      voteRecords: [
        {
          voter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          option: String,
          castAt: { type: Date, default: Date.now },
        },
      ],
      finalDecision: {
        type: String,
        trim: true,
      },
      talliedAt: Date,
    }),
  ],
  attendance: [AttendanceEntrySchema],
  attendancePolicy: {
    type: String,
    enum: ['clerk', 'qr_code', 'biometric', 'pin'],
    default: 'clerk',
  },
  attendanceQr: {
    codeHash: String,
    expiresAt: Date,
    generatedAt: Date,
  },
  quorumRequired: {
    type: Number,
    min: 0,
    default: 0,
  },
  quorumType: {
    type: String,
    enum: ['members', 'percentage'],
    default: 'members',
  },
  publishMemberVotingRecord: {
    type: Boolean,
    default: true,
  },
  actionItems: [
    new mongoose.Schema({
      title: { type: String, required: true, trim: true },
      assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      deadline: Date,
      status: { type: String, enum: ['Pending', 'Ongoing', 'Completed', 'Overdue', 'Cancelled'], default: 'Pending' },
      notes: { type: String, trim: true },
    }, { _id: true })
  ],
  outcome: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Cancelled', 'Completed', 'Draft'],
    default: 'Scheduled',
  },
  notes: {
    type: String,
    trim: true,
  },
  reminderSent: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Meeting', MeetingSchema);
