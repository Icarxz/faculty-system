const startStatusUpdater = require('./jobs/statusUpdater');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config(); // This loads variables from the .env file

// Initialize the Express app
const app = express();

// Middleware
app.use(cors()); // Allows your React frontend to communicate with this backend
app.use(express.json()); // Allows the server to accept JSON data in requests

// ROUTES
const facultyRoutes = require('./routes/faculty');
app.use('/api/faculty', facultyRoutes);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes); // This adds the /api/auth prefix

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB!');

    startStatusUpdater();
    
    // Only start listening for requests AFTER the database connects
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Error connecting to MongoDB:', error.message);
  });

// A simple test route to make sure the server is alive
app.get('/', (req, res) => {
  res.send('Faculty Attendance API is running...');
});