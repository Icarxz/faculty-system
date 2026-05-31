const express = require('express');
const router = express.Router();
const User = require('../models/User'); 
const Schedule = require('../models/Schedule');
const Appointment = require('../models/Appointment');
const Announcement = require('../models/Announcement');
const StatusHistory = require('../models/StatusHistory');

// 1. GET ROUTE: Fetch all faculty members for the dashboard
router.get('/status', async (req, res) => {
  try {
    const facultyList = await User.find({ role: 'FACULTY' })
      .select('name programPosition currentStatus currentLocation room statusUpdatedAt statusNote qrHash') // [cite: 711]
      .sort({ name: 1 }); // [cite: 711]

    // We figure out exactly when "Midnight" was today [cite: 712]
    const today = new Date();
    today.setHours(0, 0, 0, 0); // [cite: 712]

    // We loop through every professor [cite: 712]
    const enriched = facultyList.map(f => {
      const obj = f.toObject(); // [cite: 712]
      const lastUpdate = f.statusUpdatedAt ? new Date(f.statusUpdatedAt) : null; // [cite: 712]
      const updatedToday = lastUpdate && lastUpdate >= today; // [cite: 712]
      
      // If they didn't update today, we artificially change their status to 'NOT_UPDATED' [cite: 713]
      if (!updatedToday) {
        obj.currentStatus = 'NOT_UPDATED'; // [cite: 714]
      }
      return obj; // [cite: 714]
    });

    res.json(enriched); // [cite: 714]
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching faculty status' }); // [cite: 715]
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
        statusUpdatedAt: new Date() // <--- This is the magic! It stamps the exact current time [cite: 716]
      },
      { new: true } // [cite: 716, 717]
    );
    res.json(updated); // [cite: 717]
  } catch (err) {
    res.status(500).json({ error: 'Could not update status.' }); // [cite: 717]
  }
});

// === NEW FEATURE: GET A SINGLE PROFESSOR'S SCHEDULE ===
// 3. GET ROUTE: Fetch schedule for a specific faculty member
router.get('/my-schedule/:facultyId', async (req, res) => {
  try {
    const schedules = await Schedule.find({ facultyId: req.params.facultyId })
      .sort({ dayOfWeek: 1, startTime: 1 }); // Sort by day, then time
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching schedule.' });
  }
});

// === NEW FEATURE: ADMIN ASSIGNS A NEW SCHEDULE ===
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

    // Generate a unique QR Hash based on their email
    const qrHash = email.split('@')[0] + '_qr_' + new Date().getFullYear();

    const newUser = new User({
      name,
      email,
      programPosition,
      room,
      role: role || 'FACULTY', // === NEW: Save their role (defaults to FACULTY if empty) ===
      qrHash,
      currentStatus: 'OUT_OF_OFFICE',
    });

    await newUser.save();
    res.json({ message: 'Account provisioned successfully', qrHash, facultyName: name });
  } catch (error) {
    res.status(500).json({ error: 'Error provisioning account' });
  }
});

// 6. GET ROUTE (TEMPORARY): Seed Database with Real BS INFO 3D Schedule
router.get('/seed', async (req, res) => {
  try {
    await User.deleteMany({ role: { $in: ['FACULTY', 'ADMIN', 'DEAN', 'STUDENT'] } });
    await Schedule.deleteMany({});
    await Appointment.deleteMany({});
    await Announcement.deleteMany({});

    // Create Admin, Dean, and a Student
    await User.create({ role: 'ADMIN', name: 'System Admin', email: 'admin@univ.edu', qrHash: 'admin_qr_999', programPosition: 'IT Department' });
    await User.create({ role: 'DEAN', name: 'John C. Amar, DMgt', email: 'jamar@ccis.edu', qrHash: 'dean_qr_777', programPosition: 'Dean of CCIS' });
    
    // NEW: Create a test Student
    await User.create({ role: 'STUDENT', name: 'Juan Dela Cruz', email: 'student@univ.edu', qrHash: 'student_qr_111', programPosition: 'BS INFO 3D' });

    const f1 = await User.create({ role: 'FACULTY', name: 'Prof. Christian Cubon', email: 'ccubon@univ.edu', qrHash: 'qr_infot6', programPosition: 'INFOT 6 Instructor', currentStatus: 'AVAILABLE' });
    const f2 = await User.create({ role: 'FACULTY', name: 'Dr. Maria Santos', email: 'msantos@univ.edu', qrHash: 'qr_infot7', programPosition: 'INFOT 7 Instructor', currentStatus: 'AVAILABLE' });
    const f3 = await User.create({ role: 'FACULTY', name: 'Prof. Alan Turing', email: 'aturing@univ.edu', qrHash: 'qr_infot8', programPosition: 'INFOT 8 Instructor', currentStatus: 'AVAILABLE' });
    const f4 = await User.create({ role: 'FACULTY', name: 'Dr. Grace Hopper', email: 'ghopper@univ.edu', qrHash: 'qr_infot9', programPosition: 'INFOT 9 Instructor', currentStatus: 'AVAILABLE' });
    const f5 = await User.create({ role: 'FACULTY', name: 'Prof. Linus Torvalds', email: 'ltorvalds@univ.edu', qrHash: 'qr_iasec1', programPosition: 'IASEC 1 Instructor', currentStatus: 'AVAILABLE' });
    const f6 = await User.create({ role: 'FACULTY', name: 'Dr. Ada Lovelace', email: 'alovelace@univ.edu', qrHash: 'qr_nas3', programPosition: 'NAS 3 Instructor', currentStatus: 'AVAILABLE' });
    const f7 = await User.create({ role: 'FACULTY', name: 'Prof. Vint Cerf', email: 'vcerf@univ.edu', qrHash: 'qr_nas4', programPosition: 'NAS 4 Instructor', currentStatus: 'AVAILABLE' });

    // Insert Real Class Schedules
    const schedules = [
      { facultyId: f1._id, subject: 'INFOT 6', room: 'IICT 302 (LAB)', dayOfWeek: 2, startTime: '09:00', endTime: '10:00' },
      { facultyId: f1._id, subject: 'INFOT 6', room: 'IICT 304 (LAB)', dayOfWeek: 2, startTime: '13:00', endTime: '14:00' },
      { facultyId: f1._id, subject: 'INFOT 6', room: 'IICT 302 (LAB)', dayOfWeek: 4, startTime: '09:00', endTime: '10:00' },
      { facultyId: f1._id, subject: 'INFOT 6', room: 'IICT 304 (LAB)', dayOfWeek: 4, startTime: '13:00', endTime: '14:00' },
      { facultyId: f2._id, subject: 'INFOT 7', room: 'IICT 307 (LAB)', dayOfWeek: 1, startTime: '10:00', endTime: '11:00' },
      { facultyId: f2._id, subject: 'INFOT 7', room: 'IICT 307 (LAB)', dayOfWeek: 2, startTime: '07:00', endTime: '09:00' },
      { facultyId: f2._id, subject: 'INFOT 7', room: 'IICT 307 (LAB)', dayOfWeek: 3, startTime: '10:00', endTime: '11:00' },
      { facultyId: f2._id, subject: 'INFOT 7', room: 'IICT 307 (LAB)', dayOfWeek: 4, startTime: '07:00', endTime: '09:00' },
      { facultyId: f2._id, subject: 'INFOT 7', room: 'IICT 307 (LAB)', dayOfWeek: 5, startTime: '10:00', endTime: '11:00' },
      { facultyId: f3._id, subject: 'INFOT 8', room: 'IICT 306 (LAB)', dayOfWeek: 1, startTime: '11:00', endTime: '13:00' },
      { facultyId: f3._id, subject: 'INFOT 8', room: 'IICT 307 (LAB)', dayOfWeek: 2, startTime: '14:00', endTime: '16:00' },
      { facultyId: f3._id, subject: 'INFOT 8', room: 'IICT 306 (LAB)', dayOfWeek: 3, startTime: '11:00', endTime: '12:00' },
      { facultyId: f3._id, subject: 'INFOT 8', room: 'IICT 307 (LAB)', dayOfWeek: 4, startTime: '14:00', endTime: '16:00' },
      { facultyId: f4._id, subject: 'INFOT 9', room: 'IICT 305 (LAB)', dayOfWeek: 2, startTime: '10:00', endTime: '12:00' },
      { facultyId: f4._id, subject: 'INFOT 9', room: 'IICT 305 (LAB)', dayOfWeek: 4, startTime: '10:00', endTime: '12:00' },
      { facultyId: f5._id, subject: 'IASEC 1', room: 'IICT 309 (LAB)', dayOfWeek: 1, startTime: '13:00', endTime: '16:00' },
      { facultyId: f5._id, subject: 'IASEC 1', room: 'IICT 308 (LAB)', dayOfWeek: 3, startTime: '14:00', endTime: '16:00' },
      { facultyId: f5._id, subject: 'IASEC 1', room: 'IICT 308 (LAB)', dayOfWeek: 5, startTime: '11:00', endTime: '12:00' },
      { facultyId: f5._id, subject: 'IASEC 1', room: 'IICT 308 (LAB)', dayOfWeek: 5, startTime: '14:00', endTime: '16:00' },
      { facultyId: f6._id, subject: 'NAS 3', room: 'IICT 307 (LAB)', dayOfWeek: 2, startTime: '16:00', endTime: '19:00' },
      { facultyId: f6._id, subject: 'NAS 3', room: 'IICT 307 (LAB)', dayOfWeek: 4, startTime: '16:00', endTime: '19:00' },
      { facultyId: f7._id, subject: 'NAS 4', room: 'IICT 305 (LAB)', dayOfWeek: 1, startTime: '16:00', endTime: '18:00' },
      { facultyId: f7._id, subject: 'NAS 4', room: 'IICT 305 (LAB)', dayOfWeek: 3, startTime: '16:00', endTime: '18:00' },
      { facultyId: f7._id, subject: 'NAS 4', room: 'IICT 305 (LAB)', dayOfWeek: 5, startTime: '16:00', endTime: '18:00' },
    ];
    await Schedule.insertMany(schedules);
    
    // NEW: Insert Sample Announcements at the end of the seed script
    await Announcement.insertMany([
      { facultyName: 'Prof. Christian Cubon', section: 'BS INFO 3D', subject: 'INFOT 6', message: 'Class is suspended today due to a faculty meeting. Please review Chapter 4.' },
      { facultyName: 'Dr. Maria Santos', section: 'ALL', subject: 'General', message: 'Midterm grade consultations are now open. Please request an appointment.' }
    ]);

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

// 8. POST ROUTE: Student requests an appointment
router.post('/appointment', async (req, res) => {
  try {
    await Appointment.create(req.body);
    res.json({ message: 'Appointment requested successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Server error creating appointment' });
  }
});

// NEW ADMIN ROUTES 

// 9. GET ROUTE: Admin fetches ALL appointments
router.get('/appointments/all', async (req, res) => {
  try {
    // Populate the faculty name so the admin knows who the appointment is for
    const appointments = await Appointment.find().populate('facultyId', 'name').sort({ createdAt: -1 });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching all appointments' });
  }
});

// 10. PUT ROUTE: Admin approves/rejects appointments
router.put('/appointment/:id', async (req, res) => {
  try {
    const updatedApt = await Appointment.findByIdAndUpdate(
      req.params.id, 
      { status: req.body.status }, 
      { new: true }
    );
    res.json(updatedApt);
  } catch (error) {
    res.status(500).json({ error: 'Server error updating appointment' });
  }
});

// 11. GET ROUTE: Fetch "Pending/Unverified" Accounts (For Demo Purposes, fetches all)
router.get('/users/all', async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'ADMIN' } }).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

// 1. Fetch appointments for ONE specific faculty member
router.get('/appointments/me/:facultyId', async (req, res) => {
  try {
    const appointments = await Appointment.find({ facultyId: req.params.facultyId }).sort({ createdAt: -1 });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching my appointments' });
  }
});

// 2. Save a Notice
router.put('/notice/:id', async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, { noticeMessage: req.body.notice }, { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: 'Error saving notice' }); }
});

// 3. Save a Future Flag Date & AUTO-CANCEL Appointments on that date
router.put('/flag-date/:id', async (req, res) => {
  try {
    const { flagDate, reason } = req.body;
    
    // 1. Update the faculty's profile with the flag
    const updated = await User.findByIdAndUpdate(
      req.params.id, 
      { flaggedDate: flagDate, flaggedReason: reason }, 
      { new: true }
    );

    // 2. MASS CANCELLATION SWEEP
    // Find all appointments for this professor on this exact date that haven't been rejected yet
    await Appointment.updateMany(
      { 
        facultyId: req.params.id, 
        date: flagDate, 
        status: { $in: ['PENDING', 'APPROVED'] } 
      },
      { 
        $set: { 
          status: 'CANCELLED (FACULTY ON LEAVE)',
          reason: 'System Auto-Cancel: Faculty declared emergency leave.' // Overwrites the reason to inform the student
        } 
      }
    );

    res.json(updated);
  } catch (err) { res.status(500).json({ error: 'Error saving flag date' }); }
});

// 4. Fetch appointments for ONE specific student
router.get('/appointments/student/:studentName', async (req, res) => {
  try {
    // In a full production app, we would search by studentId, but for this MVP, 
    // searching by their exact userName string works perfectly.
    const appointments = await Appointment.find({ studentName: req.params.studentName })
      .populate('facultyId', 'name') // We populate this so the student can see the Professor's name
      .sort({ createdAt: -1 });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching student appointments' });
  }
});

module.exports = router;