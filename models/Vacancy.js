const mongoose = require('mongoose');

const VacancySchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  description: { type: String, trim: true },
  requirements: [String],
  status: { type: String, enum: ['draft', 'open', 'closed'], default: 'draft' },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  postedAt: { type: Date },
  closingDate: { type: Date },
  applicationsCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Vacancy', VacancySchema);
