const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  member_id: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
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
  full_name: {
    type: String,
    trim: true,
  },
  constituency: {
    type: String,
    trim: true,
  },
  position: {
    type: String,
    trim: true,
    default: 'Member of County Assembly',
  },
  photo: {
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
  isEmailVerified: {
    type: Boolean,
    default: true,
  },
  emailVerificationToken: {
    type: String,
    default: null,
  },
  emailVerificationExpiresAt: {
    type: Date,
    default: null,
  },
  verifiedAt: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  failedLoginHistory: [{
    type: Date,
    default: Date.now,
  }],
  lastLoginAt: {
    type: Date,
    default: null,
  },
  lastLoginIp: {
    type: String,
    trim: true,
    default: null,
  },
  lastLoginDevice: {
    type: String,
    trim: true,
    default: null,
  },
  notificationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    meetingReminders: { type: Boolean, default: true },
    approvalRequests: { type: Boolean, default: true },
    deadlines: { type: Boolean, default: true },
    statusUpdates: { type: Boolean, default: true },
    publicNotices: { type: Boolean, default: true },
  },
  mfaEnabled: { type: Boolean, default: false },
  mfaSecret: { type: String, select: false },
  mfaRecoveryCodes: { type: [String], select: false, default: [] },
  lastLoginLocation: {
    type: String,
    trim: true,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

UserSchema.pre('save', function syncMemberFields(next) {
  if (this.isModified('name') || !this.full_name) this.full_name = this.name;
  if (this.isModified('full_name') && this.full_name) this.name = this.full_name;
  if (this.isModified('isActive')) this.status = this.isActive ? 'active' : 'inactive';
  if (this.isModified('status')) this.isActive = this.status === 'active';
  if (this.isModified('profilePic') && !this.photo) this.photo = this.profilePic;
  if (this.isModified('photo')) this.profilePic = this.photo;
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('User', UserSchema);
