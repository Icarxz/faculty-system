const bcrypt = require('bcryptjs');
const express = require('express');
const router = express.Router();
const User = require('../models/User'); 
const Schedule = require('../models/Schedule');
const Appointment = require('../models/Appointment');
const Announcement = require('../models/Announcement');
const StatusHistory = require('../models/StatusHistory');
const crypto = require('crypto'); // Built-in Node.js module for secure hashes
const AttendanceSession = require('../models/AttendanceSession');

// =========================================================================
// === GLOBAL HELPER FUNCTION: Time Math ===
// Configured at the top so it is hoisted and accessible by all routes below
// =========================================================================
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const isPM = timeStr.toUpperCase().includes('PM');
  const isAM = timeStr.toUpperCase().includes('AM');
  const cleanTime = timeStr.replace(/ AM| PM|AM|PM/gi, '').trim();
  
  let [hours, minutes] = cleanTime.split(':').map(Number);
  
  if (isPM && hours !== 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  
  return (hours * 60) + minutes;
};

// =========================================================================
// === ROUTES ===
// =========================================================================

// === 1. SECURE REGISTRATION ROUTE (With Bcrypt) ===
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, programPosition } = req.body;

    if (!email.toLowerCase().endsWith('@ua.edu.ph')) {
      return res.status(400).json({ error: 'Registration denied. You must use a valid @ua.edu.ph university email.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    if (role === 'ADMIN' || role === 'DEAN') {
      return res.status(403).json({ error: 'Restricted role. Contact IT department.' });
    }

    // Hash the password before saving!
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const accountStatus = role === 'STUDENT' ? 'ACTIVE' : 'PENDING_APPROVAL';

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword, // Secured.
      role,
      programPosition,
      accountStatus,
      currentStatus: 'OUT_OF_OFFICE'
    });

    res.json({ 
      message: role === 'STUDENT' ? 'Registration successful!' : 'Registration submitted. Awaiting Admin approval.',
      accountStatus 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// === 2. SECURE LOGIN ROUTE ===
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find the user
    const user = await User.findOne({ email: email.toLowerCase() });

    console.log("DIAGNOSTIC - User found:", user ? "YES" : "NO", "| Email searched:", email.toLowerCase());
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // 2. Check the Status State Machine BEFORE checking the password
    if (user.accountStatus === 'PENDING_APPROVAL') {
      return res.status(403).json({ error: 'Access Denied: Your faculty account is still pending Admin verification.' });
    }
    if (user.accountStatus === 'ARCHIVED' || user.accountStatus === 'RESTRICTED') {
      return res.status(403).json({ error: 'Access Denied: Your account has been restricted or archived.' });
    }

    // 3. Cryptographically verify the password (Declared only ONCE)
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("DIAGNOSTIC - Password Match:", isMatch);
    
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // 4. Send back the user data (Do NOT send the hashed password back to the frontend)
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      programPosition: user.programPosition
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// 1. GET ROUTE: Fetch all faculty members for the dashboard
router.get('/status', async (req, res) => {
  try {
    const facultyList = await User.find({ role: 'FACULTY' })
      .select('name programPosition currentStatus currentLocation room statusUpdatedAt statusNote qrHash')
      .sort({ name: 1 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const enriched = facultyList.map(f => {
      const obj = f.toObject();
      const lastUpdate = f.statusUpdatedAt ? new Date(f.statusUpdatedAt) : null;
      const updatedToday = lastUpdate && lastUpdate >= today;
      
      if (!updatedToday) {
        obj.currentStatus = 'NOT_UPDATED';
      }
      return obj;
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching faculty status' });
  }
});

// 2. PUT ROUTE: Update a specific faculty member's status
router.put('/update-status/:id', async (req, res) => {
  const { currentStatus, currentLocation, statusNote } = req.body;
  try {
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { 
        currentStatus, 
        currentLocation, 
        statusNote,
        statusUpdatedAt: new Date()
      },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Could not update status.' });
  }
});

// 3. GET ROUTE: Fetch schedule for a specific faculty member
router.get('/my-schedule/:facultyId', async (req, res) => {
  try {
    const schedules = await Schedule.find({ facultyId: req.params.facultyId })
      .sort({ dayOfWeek: 1, startTime: 1 });
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching schedule.' });
  }
});

// 4. POST ROUTE: Admin assigns a schedule to a faculty member
router.post('/schedule/add', async (req, res) => {
  const { facultyId, subject, room, dayOfWeek, startTime, endTime } = req.body;
  try {
    await Schedule.create({ facultyId, subject, room, dayOfWeek, startTime, endTime });
    res.json({ message: 'Schedule assigned successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Server error assigning schedule.' });
  }
});

// 5. POST ROUTE: Admin adds a new faculty member (QR Generation)
router.post('/add', async (req, res) => {
  const { name, email, programPosition, room, role } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const qrHash = email.split('@')[0] + '_qr_' + new Date().getFullYear();

    const newUser = new User({
      name,
      email,
      programPosition,
      room,
      role: role || 'FACULTY',
      qrHash,
      currentStatus: 'OUT_OF_OFFICE',
    });

    await newUser.save();
    res.json({ message: 'Account provisioned successfully', qrHash, facultyName: name });
  } catch (error) {
    res.status(500).json({ error: 'Error provisioning account' });
  }
});

// 6. GET ROUTE: Seed Database with Real BS INFO 3D Schedule
router.get('/seed', async (req, res) => {
  try {
    await User.deleteMany({ role: { $in: ['FACULTY', 'ADMIN', 'DEAN', 'STUDENT'] } });
    await Schedule.deleteMany({});
    await Appointment.deleteMany({});
    await Announcement.deleteMany({});

    // await User.create({ role: 'ADMIN', name: 'System Admin', email: 'admin@univ.edu', qrHash: 'admin_qr_999', programPosition: 'IT Department' });
    // await User.create({ role: 'DEAN', name: 'John C. Amar, DMgt', email: 'jamar@ccis.edu', qrHash: 'dean_qr_777', programPosition: 'Dean of CCIS' });
    // await User.create({ role: 'STUDENT', name: 'Juan Dela Cruz', email: 'student@univ.edu', qrHash: 'student_qr_111', programPosition: 'BS INFO 3D' });

    // const f1 = await User.create({ role: 'FACULTY', name: 'Prof. Christian Cubon', email: 'ccubon@univ.edu', qrHash: 'qr_infot6', programPosition: 'INFOT 6 Instructor', currentStatus: 'AVAILABLE' });
    // const f2 = await User.create({ role: 'FACULTY', name: 'Dr. Maria Santos', email: 'msantos@univ.edu', qrHash: 'qr_infot7', programPosition: 'INFOT 7 Instructor', currentStatus: 'AVAILABLE' });
    // const f3 = await User.create({ role: 'FACULTY', name: 'Prof. Alan Turing', email: 'aturing@univ.edu', qrHash: 'qr_infot8', programPosition: 'INFOT 8 Instructor', currentStatus: 'AVAILABLE' });
    // const f4 = await User.create({ role: 'FACULTY', name: 'Dr. Grace Hopper', email: 'ghopper@univ.edu', qrHash: 'qr_infot9', programPosition: 'INFOT 9 Instructor', currentStatus: 'AVAILABLE' });
    // const f5 = await User.create({ role: 'FACULTY', name: 'Prof. Linus Torvalds', email: 'ltorvalds@univ.edu', qrHash: 'qr_iasec1', programPosition: 'IASEC 1 Instructor', currentStatus: 'AVAILABLE' });
    // const f6 = await User.create({ role: 'FACULTY', name: 'Dr. Ada Lovelace', email: 'alovelace@univ.edu', qrHash: 'qr_nas3', programPosition: 'NAS 3 Instructor', currentStatus: 'AVAILABLE' });
    // const f7 = await User.create({ role: 'FACULTY', name: 'Prof. Vint Cerf', email: 'vcerf@univ.edu', qrHash: 'qr_nas4', programPosition: 'NAS 4 Instructor', currentStatus: 'AVAILABLE' });

    // const schedules = [
    //   { facultyId: f1._id, subject: 'INFOT 6', room: 'IICT 302 (LAB)', dayOfWeek: 2, startTime: '09:00', endTime: '10:00' },
    //   { facultyId: f1._id, subject: 'INFOT 6', room: 'IICT 304 (LAB)', dayOfWeek: 2, startTime: '13:00', endTime: '14:00' },
    //   { facultyId: f1._id, subject: 'INFOT 6', room: 'IICT 302 (LAB)', dayOfWeek: 4, startTime: '09:00', endTime: '10:00' },
    //   { facultyId: f1._id, subject: 'INFOT 6', room: 'IICT 304 (LAB)', dayOfWeek: 4, startTime: '13:00', endTime: '14:00' },
    //   { facultyId: f2._id, subject: 'INFOT 7', room: 'IICT 307 (LAB)', dayOfWeek: 1, startTime: '10:00', endTime: '11:00' },
    //   { facultyId: f2._id, subject: 'INFOT 7', room: 'IICT 307 (LAB)', dayOfWeek: 2, startTime: '07:00', endTime: '09:00' },
    //   { facultyId: f2._id, subject: 'INFOT 7', room: 'IICT 307 (LAB)', dayOfWeek: 3, startTime: '10:00', endTime: '11:00' },
    //   { facultyId: f2._id, subject: 'INFOT 7', room: 'IICT 307 (LAB)', dayOfWeek: 4, startTime: '07:00', endTime: '09:00' },
    //   { facultyId: f2._id, subject: 'INFOT 7', room: 'IICT 307 (LAB)', dayOfWeek: 5, startTime: '10:00', endTime: '11:00' },
    //   { facultyId: f3._id, subject: 'INFOT 8', room: 'IICT 306 (LAB)', dayOfWeek: 1, startTime: '11:00', endTime: '13:00' },
    //   { facultyId: f3._id, subject: 'INFOT 8', room: 'IICT 307 (LAB)', dayOfWeek: 2, startTime: '14:00', endTime: '16:00' },
    //   { facultyId: f3._id, subject: 'INFOT 8', room: 'IICT 306 (LAB)', dayOfWeek: 3, startTime: '11:00', endTime: '12:00' },
    //   { facultyId: f3._id, subject: 'INFOT 8', room: 'IICT 307 (LAB)', dayOfWeek: 4, startTime: '14:00', endTime: '16:00' },
    //   { facultyId: f4._id, subject: 'INFOT 9', room: 'IICT 305 (LAB)', dayOfWeek: 2, startTime: '10:00', endTime: '12:00' },
    //   { facultyId: f4._id, subject: 'INFOT 9', room: 'IICT 305 (LAB)', dayOfWeek: 4, startTime: '10:00', endTime: '12:00' },
    //   { facultyId: f5._id, subject: 'IASEC 1', room: 'IICT 309 (LAB)', dayOfWeek: 1, startTime: '13:00', endTime: '16:00' },
    //   { facultyId: f5._id, subject: 'IASEC 1', room: 'IICT 308 (LAB)', dayOfWeek: 3, startTime: '14:00', endTime: '16:00' },
    //   { facultyId: f5._id, subject: 'IASEC 1', room: 'IICT 308 (LAB)', dayOfWeek: 5, startTime: '11:00', endTime: '12:00' },
    //   { facultyId: f5._id, subject: 'IASEC 1', room: 'IICT 308 (LAB)', dayOfWeek: 5, startTime: '14:00', endTime: '16:00' },
    //   { facultyId: f6._id, subject: 'NAS 3', room: 'IICT 307 (LAB)', dayOfWeek: 2, startTime: '16:00', endTime: '19:00' },
    //   { facultyId: f6._id, subject: 'NAS 3', room: 'IICT 307 (LAB)', dayOfWeek: 4, startTime: '16:00', endTime: '19:00' },
    //   { facultyId: f7._id, subject: 'NAS 4', room: 'IICT 305 (LAB)', dayOfWeek: 1, startTime: '16:00', endTime: '18:00' },
    //   { facultyId: f7._id, subject: 'NAS 4', room: 'IICT 305 (LAB)', dayOfWeek: 3, startTime: '16:00', endTime: '18:00' },
    //   { facultyId: f7._id, subject: 'NAS 4', room: 'IICT 305 (LAB)', dayOfWeek: 5, startTime: '16:00', endTime: '18:00' },
    // ];
    // await Schedule.insertMany(schedules);
    
    // await Announcement.insertMany([
    //   { facultyName: 'Prof. Christian Cubon', section: 'BS INFO 3D', subject: 'INFOT 6', message: 'Class is suspended today due to a faculty meeting. Please review Chapter 4.' },
    //   { facultyName: 'Dr. Maria Santos', section: 'ALL', subject: 'General', message: 'Midterm grade consultations are now open. Please request an appointment.' }
    // ]);

    res.json({ message: "Successfully seeded Local Database for presentation!" });
  } catch (error) {
    res.status(500).json({ error: 'Error seeding data', details: error.message });
  }
});

// 7. GET ROUTE: Fetch announcements by section
router.get('/announcements/:section', async (req, res) => {
  try {
    const announcements = await Announcement.find({
      $or: [{ section: req.params.section }, { section: 'ALL' }]
    }).sort({ datePosted: -1 });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching announcements' });
  }
});

// 8. POST ROUTE: Student requests an appointment with Operating Hours Check
router.post('/appointment', async (req, res) => {
  try {
    const { facultyId, date, time, studentName } = req.body;

    const aptDate = new Date(date);
    const dayOfWeek = aptDate.getDay(); 
    const requestedMinutes = timeToMinutes(time); 

    // Upstream Operating Hours Constraint: 7:30 AM (450 mins) to 4:00 PM (960 mins)
    if (requestedMinutes < 450 || requestedMinutes > 960) {
      return res.status(400).json({ 
        error: `Booking Denied: Consultations are restricted to official operating hours (7:30 AM to 4:00 PM).` 
      });
    }

    // Upstream Check 1: Master Schedule Collision
    const classesToday = await Schedule.find({ facultyId: facultyId, dayOfWeek: dayOfWeek });
    for (let currentClass of classesToday) {
      const classStart = timeToMinutes(currentClass.startTime);
      const classEnd = timeToMinutes(currentClass.endTime);
      
      if (requestedMinutes >= classStart && requestedMinutes <= classEnd) {
        return res.status(400).json({ 
          error: `Booking Denied: The instructor has a scheduled class during this time block.` 
        });
      }
    }

    // Upstream Check 2: Approved Appointments
    const existingApproved = await Appointment.findOne({
      facultyId, date, time, status: 'APPROVED'
    });
    if (existingApproved) {
      return res.status(400).json({ 
        error: `Booking Denied: The instructor already has a confirmed consultation at this time.` 
      });
    }

    // Anti-Spam Protocol
    const existingPending = await Appointment.findOne({
      facultyId, date, time, studentName, status: 'PENDING'
    });
    if (existingPending) {
      return res.status(400).json({ 
        error: `Anti-Spam: You already have a pending request submitted for this exact time.` 
      });
    }

    const newAppointment = await Appointment.create(req.body);
    res.json({ message: 'Appointment requested successfully!', appointment: newAppointment });

  } catch (error) {
    console.error('Student Booking Error:', error);
    res.status(500).json({ error: 'Server error creating appointment' });
  }
});

// 9. GET ROUTE: Admin fetches ALL appointments
router.get('/appointments/all', async (req, res) => {
  try {
    const appointments = await Appointment.find().populate('facultyId', 'name').sort({ createdAt: -1 });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching all appointments' });
  }
});

// 10. PUT ROUTE: Faculty/Admin approves or rejects appointments
router.put('/appointment/:id', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (status !== 'APPROVED') {
      const updatedApt = await Appointment.findByIdAndUpdate(req.params.id, { status }, { new: true });
      return res.json(updatedApt);
    }

    const pendingApt = await Appointment.findById(req.params.id);
    if (!pendingApt) return res.status(404).json({ error: 'Appointment not found' });

    const aptDate = new Date(pendingApt.date);
    const dayOfWeek = aptDate.getDay(); 
    const requestedMinutes = timeToMinutes(pendingApt.time);

    // Hard Block 1: Master Schedule Collision
    const classesToday = await Schedule.find({ facultyId: pendingApt.facultyId, dayOfWeek: dayOfWeek });
    for (let currentClass of classesToday) {
      const classStart = timeToMinutes(currentClass.startTime);
      const classEnd = timeToMinutes(currentClass.endTime);
      
      if (requestedMinutes >= classStart && requestedMinutes <= classEnd) {
        return res.status(400).json({ 
          error: `Approval Denied: You have a scheduled ${currentClass.subject} class in ${currentClass.room} during this time.` 
        });
      }
    }

    // Hard Block 2: Double-Booking Collision
    const doubleBooked = await Appointment.findOne({
      facultyId: pendingApt.facultyId,
      date: pendingApt.date,
      time: pendingApt.time,
      status: 'APPROVED',
      _id: { $ne: pendingApt._id }
    });
    if (doubleBooked) {
      return res.status(400).json({ 
        error: `Approval Denied: You already have an approved appointment with ${doubleBooked.studentName} at this time.` 
      });
    }

    const safeApt = await Appointment.findByIdAndUpdate(req.params.id, { status: 'APPROVED' }, { new: true });
    res.json(safeApt);

  } catch (error) {
    console.error('Approval Engine Error:', error);
    res.status(500).json({ error: 'Server error processing the approval logic.' });
  }
});

// 11. GET ROUTE: Fetch all unverified users
router.get('/users/all', async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'ADMIN' } }).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

// 12. GET ROUTE: Fetch appointments for one specific faculty member
router.get('/appointments/me/:facultyId', async (req, res) => {
  try {
    const appointments = await Appointment.find({ facultyId: req.params.facultyId }).sort({ createdAt: -1 });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching my appointments' });
  }
});

// 13. PUT ROUTE: Save a Notice
router.put('/notice/:id', async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, { noticeMessage: req.body.notice }, { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: 'Error saving notice' }); }
});

// 14. PUT ROUTE: Save a Future Flag Date & AUTO-CANCEL Appointments on that date
router.put('/flag-date/:id', async (req, res) => {
  try {
    const { flagDate, reason } = req.body;
    
    const updated = await User.findByIdAndUpdate(
      req.params.id, 
      { flaggedDate: flagDate, flaggedReason: reason }, 
      { new: true }
    );

    await Appointment.updateMany(
      { 
        facultyId: req.params.id, 
        date: flagDate, 
        status: { $in: ['PENDING', 'APPROVED'] } 
      },
      { 
        $set: { 
          status: 'CANCELLED (FACULTY ON LEAVE)',
          reason: 'System Auto-Cancel: Faculty declared emergency leave.'
        } 
      }
    );

    res.json(updated);
  } catch (err) { res.status(500).json({ error: 'Error saving flag date' }); }
});

// 15. GET ROUTE: Fetch appointments for one specific student
router.get('/appointments/student/:studentName', async (req, res) => {
  try {
    const appointments = await Appointment.find({ studentName: req.params.studentName })
      .populate('facultyId', 'name')
      .sort({ createdAt: -1 });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching student appointments' });
  }
});

// 16. POST ROUTE: Instructor starts a live attendance session
router.post('/attendance/start', async (req, res) => {
  try {
    const { facultyId, subject, section } = req.body;

    // 1. Generate a random 32-character hex token
    const sessionToken = crypto.randomBytes(16).toString('hex');
    
    // 2. Set an absolute expiration (e.g., 3 hours from now) in case they forget to click "End Class"
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 3);

    // 3. Save the active session to the database
    const newSession = await AttendanceSession.create({
      facultyId,
      subject,
      section,
      sessionToken,
      expiresAt,
      status: 'ACTIVE'
    });

    // 4. Send the token back to the React frontend to be rendered into a QR code
    res.json({ 
      message: 'Class session started securely.', 
      sessionToken: newSession.sessionToken,
      sessionId: newSession._id
    });

  } catch (error) {
    console.error('Session Error:', error);
    res.status(500).json({ error: 'Failed to generate secure attendance session.' });
  }
});

// 17. POST ROUTE: Student confirms attendance via QR Redirect
router.post('/attendance/confirm', async (req, res) => {
  try {
    const { sessionToken, studentId } = req.body;

    // 1. Find the session
    const session = await AttendanceSession.findOne({ sessionToken });

    if (!session) {
      return res.status(404).json({ error: 'Invalid or unrecognized QR code.' });
    }

    // 2. Validate Expiration & Status
    const now = new Date();
    if (session.status === 'CLOSED' || now > session.expiresAt) {
      return res.status(400).json({ 
        error: 'This session has ended.', 
        code: 'SESSION_EXPIRED' 
      });
    }

    // 3. Idempotency Check (Has this student already checked in?)
    const alreadyCheckedIn = session.attendees.some(
      (attendee) => attendee.studentId.toString() === studentId
    );

    if (alreadyCheckedIn) {
      return res.status(200).json({ 
        message: 'You are already marked present for this class.', 
        code: 'ALREADY_LOGGED' 
      });
    }

    // 4. Atomic Write
    session.attendees.push({ studentId, scannedAt: now });
    await session.save();

    res.json({ message: 'Attendance confirmed successfully!' });

  } catch (error) {
    console.error('Confirmation Error:', error);
    res.status(500).json({ error: 'Server error processing attendance.' });
  }
});

module.exports = router;