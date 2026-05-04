const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  facultyName: { type: String, required: true },
  section: { type: String, required: true }, // e.g., 'BS INFO 3D' or 'ALL'
  subject: { type: String, required: true },
  message: { type: String, required: true },
  datePosted: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Announcement', AnnouncementSchema);