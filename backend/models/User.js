const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  role: { 
    type: String, 
    enum: ['STUDENT', 'FACULTY', 'DEAN', 'ADMIN'], 
    required: true 
  },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  
  // === NEW: Authentication & Security Fields ===
  password: { type: String }, 
  accountStatus: { 
    type: String, 
    enum: ['ACTIVE', 'PENDING_APPROVAL', 'ARCHIVED', 'RESTRICTED'],
    default: 'ACTIVE' 
  },

  schoolId: {
  type: String,
  required: function() { return this.role === 'STUDENT'; },
  unique: true,
  sparse: true, // allows multiple non-student docs with no schoolId, without unique-index collisions on null
  set: (v) => v ? v.toUpperCase() : v,
  validate: {
    validator: function(v) {
      if (this.role !== 'STUDENT') return true; // skip format check entirely for non-students
      return /^(\d{4}-\d{4}-[A-Z]|\d{4}-S0\d{4})$/.test(v);
    },
    message: props => `${props.value} is not a valid Student ID format. Use YYYY-XXXX-L or YYYY-S0XXXX.`
  }
},

  // MODIFIED: Removed 'required: true' so users can register without crashing the DB
  qrHash: { type: String, unique: true, sparse: true }, 
  
  programPosition: { type: String, required: true }, 
  room: { type: String }, 
  currentStatus: {
      type: String,
      enum: ['AVAILABLE', 'IN_CLASS', 'IN_MEETING', 'ON_BREAK', 'OUT_OF_OFFICE', 'ON_LEAVE', 'ABSENT', 'NOT_UPDATED'], 
      default: 'OUT_OF_OFFICE'
  },
  currentLocation: { type: String }, 
  statusUpdatedAt: { type: Date, default: null },
  noticeMessage: { type: String, default: '' },
  flaggedDate: { type: String, default: '' },
  flaggedReason: { type: String, default: '' },
  statusNote: { type: String, default: '' },
}, { timestamps: true });



module.exports = mongoose.model('User', UserSchema);