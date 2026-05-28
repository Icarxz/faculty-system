const mongoose = require('mongoose');

// Connect to your local MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/faculty-attendance')
.then(() => console.log('Connected to MongoDB for seeding...'))
.catch(err => console.error('Database connection error:', err));

// Define Schema references
const User = require('./models/User'); 
const Schedule = require('./models/Schedule');

const seedDatabase = async () => {
  try {
    console.log(' Clearing old Faculty and Schedule data...');
    // Delete all users who are FACULTY (keeps Admin/Dean/Student intact)
    await User.deleteMany({ role: 'FACULTY' });
    await Schedule.deleteMany({});

    console.log(' Planting real instructors...');

    // 1. Create the Instructors
    const instructors = await User.insertMany([
      {
        name: 'Ledilyn H. Colmo',
        email: 'lcolmo@ccis.edu',
        role: 'FACULTY',
        programPosition: 'Faculty / Librarian',
        qrHash: 'colmo_qr_2026', // Use this exactly to log in
        currentStatus: 'OUT_OF_OFFICE',
        room: 'New Library'
      },
      {
        name: 'Mary Anne E. Edjan',
        email: 'medjan@ccis.edu',
        role: 'FACULTY',
        programPosition: 'Faculty',
        qrHash: 'edjan_qr_2026',
        currentStatus: 'OUT_OF_OFFICE',
        room: 'Old Library'
      },
      {
        name: 'Ronnie C. Fortaleza',
        email: 'rfortaleza@ccis.edu',
        role: 'FACULTY',
        programPosition: 'Faculty',
        qrHash: 'fortaleza_qr_2026',
        currentStatus: 'OUT_OF_OFFICE',
        room: 'ICT 101 A'
      },
      {
        name: 'Carl Spence Percy',
        email: 'cpercy@ccis.edu',
        role: 'FACULTY',
        programPosition: 'Program Head, BSIT',
        qrHash: 'percy_qr_2026',
        currentStatus: 'OUT_OF_OFFICE',
        room: 'IICT 306'
      },
      {
        name: 'Sarah Mae R. Silva',
        email: 'ssilva@ccis.edu',
        role: 'FACULTY',
        programPosition: 'Faculty',
        qrHash: 'silva_qr_2026',
        currentStatus: 'OUT_OF_OFFICE',
        room: 'IICT 305'
      }
    ]);

    // Map the IDs so we can attach schedules to the right person
    const [colmoId, edjanId, fortalezaId, percyId, silvaId] = instructors.map(i => i._id);

    console.log(' Assigning official schedules...');

    // 2. Insert their specific schedules (Day: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri)
    await Schedule.insertMany([
      // --- LEDILYN H. COLMO ---
      { facultyId: colmoId, subject: 'LIS 6 (BLIS 2-A)', room: 'New Library', dayOfWeek: 2, startTime: '08:00', endTime: '09:30' },
      { facultyId: colmoId, subject: 'LIS 6 (BLIS 2-B)', room: 'New Library', dayOfWeek: 3, startTime: '08:00', endTime: '09:30' },
      { facultyId: colmoId, subject: 'LIS 6 (BLIS 2-A)', room: 'New Library', dayOfWeek: 4, startTime: '08:00', endTime: '09:30' },
      { facultyId: colmoId, subject: 'LIS 6 (BLIS 2-B)', room: 'New Library', dayOfWeek: 5, startTime: '08:00', endTime: '09:30' },

      // --- MARY ANNE E. EDJAN ---
      { facultyId: edjanId, subject: 'LIS 2', room: 'Old Library', dayOfWeek: 1, startTime: '09:00', endTime: '10:30' },
      { facultyId: edjanId, subject: 'SC BLIS 1-B', room: 'Old Library', dayOfWeek: 1, startTime: '10:30', endTime: '12:00' },
      { facultyId: edjanId, subject: 'LIS 2 (SC BLIS 1-A)', room: 'ICT 309', dayOfWeek: 2, startTime: '10:30', endTime: '12:00' },
      { facultyId: edjanId, subject: 'LIS 2', room: 'Old Library', dayOfWeek: 3, startTime: '09:00', endTime: '10:30' },
      { facultyId: edjanId, subject: 'SC BLIS 1-B', room: 'Old Library', dayOfWeek: 3, startTime: '10:30', endTime: '12:00' },
      { facultyId: edjanId, subject: 'LIS 2 (SC BLIS 1-A)', room: 'ICT 309', dayOfWeek: 4, startTime: '10:30', endTime: '12:00' },

      // --- RONNIE C. FORTALEZA ---
      { facultyId: fortalezaId, subject: 'ICT 1 (SC BSCD 1-C)', room: 'ICT 101 A', dayOfWeek: 2, startTime: '11:00', endTime: '12:30' },
      { facultyId: fortalezaId, subject: 'LIS 11 (SC BLIS 3-A)', room: 'ICT 301 (LAB)', dayOfWeek: 2, startTime: '13:00', endTime: '16:00' },
      { facultyId: fortalezaId, subject: 'LICT 3 (SC BLIS 2-B)', room: 'ICT 301 (LAB)', dayOfWeek: 3, startTime: '11:00', endTime: '14:00' },
      { facultyId: fortalezaId, subject: 'ICT 1 (SC BSCD 1-C)', room: 'ICT 101 A', dayOfWeek: 4, startTime: '11:00', endTime: '12:30' },

      // --- CARL SPENCE PERCY ---
      { facultyId: percyId, subject: 'INFOT 8 (BSIT 3-D)', room: 'IICT 306', dayOfWeek: 1, startTime: '13:00', endTime: '14:30' },
      { facultyId: percyId, subject: 'INFOT 8 (BSIT 3-B)', room: 'IICT 307', dayOfWeek: 2, startTime: '13:00', endTime: '14:30' },
      { facultyId: percyId, subject: 'INFOT 8 (BSIT 3-D)', room: 'IICT 308', dayOfWeek: 3, startTime: '13:00', endTime: '14:30' },
      { facultyId: percyId, subject: 'INFOT 8 (BSIT 3-B)', room: 'IICT 307', dayOfWeek: 4, startTime: '13:00', endTime: '14:30' },
      { facultyId: percyId, subject: 'INFOE 4 (BSIT 3-D)', room: 'IICT 304', dayOfWeek: 5, startTime: '13:00', endTime: '14:30' },

      // --- SARAH MAE R. SILVA ---
      { facultyId: silvaId, subject: 'COMSC 9 (BSCS 3B-SE)', room: 'IICT 106', dayOfWeek: 1, startTime: '09:00', endTime: '10:30' },
      { facultyId: silvaId, subject: 'INFOT 9 (BS INFO 3C)', room: 'IICT 305', dayOfWeek: 1, startTime: '13:00', endTime: '16:00' },
      { facultyId: silvaId, subject: 'INFOT 9 (BS INFO 3B)', room: 'IICT 305', dayOfWeek: 3, startTime: '13:00', endTime: '16:00' },
      { facultyId: silvaId, subject: 'INFOT 9 (BS INFO 3D)', room: 'IICT 305', dayOfWeek: 5, startTime: '13:00', endTime: '16:00' }
    ]);

    console.log(' SUCCESS! Database is seeded with real CCIS data.');
    process.exit();
  } catch (error) {
    console.error(' Seeding Error:', error);
    process.exit(1);
  }
};

seedDatabase();