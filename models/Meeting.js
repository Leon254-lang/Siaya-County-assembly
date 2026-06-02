const mongoose = require('mongoose');

const AttendanceEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Present', 'Absent'],
    default: 'Pending',
  },
  checkedInAt: Date,
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
  room: {
    type: String,
    trim: true,
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
