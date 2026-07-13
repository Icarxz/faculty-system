const mongoose = require('mongoose');

const AttendanceSessionSchema = new mongoose.Schema({
  facultyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  subject: { type: String, required: true },
  section: { type: String, required: true },
  
  // This is the cryptographic password that prevents cheating
  sessionToken: { type: String, required: true, unique: true }, 
  
  status: { 
    type: String, 
    enum: ['ACTIVE', 'CLOSED'], 
    default: 'ACTIVE' 
  },
  
  // We store the unique _id of the students who successfully scan in
  attendees: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    scannedAt: { type: Date, default: Date.now }
  }],

  expiresAt: { type: Date, required: true } // Auto-closes if the instructor forgets
}, { timestamps: true });

// Automatically delete or close documents after they expire to keep the DB clean
AttendanceSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AttendanceSession', AttendanceSessionSchema);