const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST ROUTE: Verify QR Code
router.post('/qr-login', async (req, res) => {
  try {
    const { qrHash } = req.body;
    
    // 1. Find the user by their QR Hash
    let user = await User.findOne({ qrHash });
    
    if (!user) {
      return res.status(404).json({ error: 'Invalid QR Code. User not found.' });
    }

    // === NEW: AUTOMATIC ATTENDANCE LOGIC ===
    // If the person logging in is a Faculty member, punch their timecard immediately!
    if (user.role === 'FACULTY') {
      user.currentStatus = 'AVAILABLE';
      user.statusUpdatedAt = new Date();
      user.statusNote = 'Auto-logged via Morning QR Scan';
      await user.save(); // Save the updated attendance to the database
    }
    // =======================================

    // 3. Send the user data back to the React frontend
    res.json({ message: 'Login successful', user });

  } catch (error) {
    console.error("QR Login Error:", error);
    res.status(500).json({ error: 'Server error during QR login' });
  }
});

module.exports = router;