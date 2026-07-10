const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  modules: {
    type: [String],
    default: [],
  },
  boardroom: {
    type: String,
    trim: true,
    validate: {
      validator: (value) => !value || /^Boardroom [1-5]$/.test(value),
      message: 'Boardroom must be one of Boardroom 1 through Boardroom 5.',
    },
  },
});

DepartmentSchema.index({ boardroom: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Department', DepartmentSchema);
