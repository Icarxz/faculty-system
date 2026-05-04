const express = require('express');
const router = express.Router();
const User = require('../models/User');

// POST ROUTE: Verify QR Code
router.post('/qr-login', async (req, res) => {
  const { qrHash } = req.body;
  
  try {
    // Look for a user in the database with this exact QR Hash
    const user = await User.findOne({ qrHash });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid QR Code. User not found.' });
    }

    // In a full production app, you would generate a JWT token here.
    // For the MVP, we will just return the user data to grant access.
    res.json({ message: 'Login successful', user });
    
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

module.exports = router;