const mongoose = require('mongoose');
const User = require('./backend/models/user');
const Screening = require('./backend/models/screening');

async function testRealDatabase() {
  try {
    // Connect to your actual MongoDB database
    await mongoose.connect('mongodb+srv://alentatom2026:XiaFgsNr0EiiO4ib@asd.q5rgd0s.mongodb.net/?retryWrites=true&w=majority&appName=asd');
    console.log('✅ Connected to MongoDB Atlas');

    // Test the actual stats queries
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Count all users with pending status
    const pendingCount = await User.countDocuments({
      status: 'pending'
    });
    console.log('📊 Pending Approvals:', pendingCount);

    // Count all active users
    const userCount = await User.countDocuments({
      isActive: true
    });
    console.log('👥 Total Active Users:', userCount);

    // Get screenings for current month
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const firstDayOfNextMonth = new Date(currentYear, currentMonth + 1, 1);
    const screeningCount = await Screening.countDocuments({
      createdAt: {
        $gte: firstDayOfMonth,
        $lt: firstDayOfNextMonth
      }
    });
    console.log('🔍 Screenings This Month:', screeningCount);

    // Get total counts
    const totalUsers = await User.countDocuments();
    const totalScreenings = await Screening.countDocuments();
    console.log('📈 Total Users in Database:', totalUsers);
    console.log('📈 Total Screenings in Database:', totalScreenings);

    // Get some sample users to see what's in the database
    const sampleUsers = await User.find().limit(5).select('username email role status isActive createdAt');
    console.log('\n👤 Sample Users in Database:');
    sampleUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} (${user.email}) - Role: ${user.role || 'N/A'} - Status: ${user.status} - Active: ${user.isActive}`);
    });

    // Get some sample screenings
    const sampleScreenings = await Screening.find().limit(5).select('childName screeningType result createdAt');
    console.log('\n🔍 Sample Screenings in Database:');
    sampleScreenings.forEach((screening, index) => {
      console.log(`${index + 1}. ${screening.childName} - Type: ${screening.screeningType} - Result: ${screening.result} - Date: ${screening.createdAt}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Database test completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testRealDatabase();

