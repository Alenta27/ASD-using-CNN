const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './backend/.env' });

async function testApi() {
  try {
    const userId = '68c75cede1778a7e4fd63f05'; // ID for alentahhhtom10@gmail.com
    const token = jwt.sign(
      { id: userId, email: 'alentahhhtom10@gmail.com', role: 'teacher' },
      process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this-in-production"
    );

    console.log('Testing /api/teacher/students...');
    const resStudents = await axios.get('http://localhost:5000/api/teacher/students', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Students returned:', resStudents.data.length);

    console.log('Testing /api/teacher/class-stats...');
    const resStats = await axios.get('http://localhost:5000/api/teacher/class-stats', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Stats returned:', resStats.data);

    process.exit(0);
  } catch (err) {
    console.error('API Test Failed:', err.message);
    if (err.response) {
      console.error('Response status:', err.response.status);
      console.error('Response data:', err.response.data);
    }
    process.exit(1);
  }
}

testApi();
