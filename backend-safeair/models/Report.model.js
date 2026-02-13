const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  from: Date,
  to: Date,
  type: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', ReportSchema);
