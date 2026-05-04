const cron = require('node-cron');
const User = require('../models/User');
const Schedule = require('../models/Schedule');

// This cron expression '* * * * *' means "Run every 1 minute"
const startStatusUpdater = () => {
  cron.schedule('* * * * *', async () => {
    console.log('⏰ [Cron Job] Checking faculty schedules...');
    
    const now = new Date();
    const currentDay = now.getDay(); 
    
    // Format the current time as HH:MM (24-hour format) to match our database
    const currentHours = now.getHours().toString().padStart(2, '0');
    const currentMinutes = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHours}:${currentMinutes}`;

    try {
      // 1. Find all classes that are happening RIGHT NOW
      const activeClasses = await Schedule.find({
        dayOfWeek: currentDay,
        startTime: { $lte: currentTime }, // Class started before or at current time
        endTime: { $gt: currentTime }     // Class ends after current time
      });

      // Extract just the IDs of the faculty members who are teaching right now
      const activeFacultyIds = activeClasses.map(cls => cls.facultyId);

      // 2. Update those specific faculty members to 'IN_CLASS'
      for (let cls of activeClasses) {
        await User.findByIdAndUpdate(cls.facultyId, {
          currentStatus: 'IN_CLASS',
          currentLocation: cls.room // Update their location to the classroom
        });
      }

      // 3. Revert faculty back to 'AVAILABLE' if their class just finished
      // We look for anyone marked 'IN_CLASS' who is NOT in our activeFacultyIds list
      await User.updateMany(
        {
          role: 'FACULTY',
          currentStatus: 'IN_CLASS',
          _id: { $nin: activeFacultyIds } 
        },
        {
          currentStatus: 'AVAILABLE',
          currentLocation: '' // Clear the classroom location so it defaults back to their office
        }
      );

      if (activeClasses.length > 0) {
        console.log(`✅ Updated ${activeClasses.length} faculty to IN_CLASS.`);
      }

    } catch (error) {
      console.error('❌ Error running status updater cron job:', error);
    }
  });
};

module.exports = startStatusUpdater;