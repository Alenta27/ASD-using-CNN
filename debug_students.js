const mongoose = require('mongoose');
const Patient = require('./backend/models/patient');
const User = require('./backend/models/user');
require('dotenv').config({ path: './backend/.env' });

async function checkStudents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/asd-detection');
    console.log('Connected to MongoDB');

    const teacherEmail = 'alentahhhtom10@gmail.com';
    const teacher = await User.findOne({ email: teacherEmail });
    
    if (!teacher) {
      console.log('Teacher not found');
      return;
    }

    console.log(`Teacher ID: ${teacher._id}`);

    const students = await Patient.find({ assignedTeacherId: teacher._id });
    console.log(`Total students found: ${students.length}`);

    const statusCounts = {};
    const riskCounts = {};

    students.forEach(s => {
      statusCounts[s.screeningStatus] = (statusCounts[s.screeningStatus] || 0) + 1;
      riskCounts[s.riskLevel] = (riskCounts[s.riskLevel] || 0) + 1;
    });

    console.log('Screening Status counts:', statusCounts);
    console.log('Risk Level counts:', riskCounts);

    if (students.length > 0) {
        console.log('Sample student:', {
            name: students[0].name,
            screeningStatus: students[0].screeningStatus,
            riskLevel: students[0].riskLevel
        });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStudents();
