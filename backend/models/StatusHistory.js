// backend/models/StatusHistory.js  ← NEW FILE, create this
const mongoose = require('mongoose');

const StatusHistorySchema = new mongoose.Schema({
  facultyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status:     { type: String, required: true },   // e.g. "ABSENT"
  note:       { type: String, default: '' },       // the note they wrote students
  timestamp:  { type: Date,   default: Date.now },
});

module.exports = mongoose.model('StatusHistory', StatusHistorySchema);