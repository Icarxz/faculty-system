const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
  facultyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', // Links this schedule to a specific professor
    required: true 
  },
  subject: { type: String, required: true },
  room: { type: String, required: true },
  dayOfWeek: { type: Number, required: true }, // 0 = Sunday, 1 = Monday, 2 = Tuesday, etc.
  startTime: { type: String, required: true }, // 24-hour format e.g., "09:00" or "14:30"
  endTime: { type: String, required: true }    // 24-hour format e.g., "10:30" or "16:00"
});

module.exports = mongoose.model('Schedule', ScheduleSchema);