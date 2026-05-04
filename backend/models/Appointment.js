const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  studentSection: { type: String, required: true },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  reason: { type: String, required: true },
  status: { type: String, default: 'PENDING' } // Can be PENDING, APPROVED, or REJECTED
}, { timestamps: true });

module.exports = mongoose.model('Appointment', AppointmentSchema);