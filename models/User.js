const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  phone: {
    type: String,
    trim: true,
  },
  ward: {
    type: String,
    trim: true,
  },
  party: {
    type: String,
    trim: true,
  },
  contactDetails: {
    address: {
      type: String,
      trim: true,
    },
  },
  documents: [
    {
      filename: String,
      path: String,
      type: String,
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  committeeMemberships: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Committee',
    },
  ],
  profilePic: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', UserSchema);
