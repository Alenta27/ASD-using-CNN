const mongoose = require('mongoose');
const Patient = require('./models/patient');
const User = require('./models/user');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/asd_database';

mongoose.connect(mongoUri)
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    // Get all patients
    const patients = await Patient.find().select('name age parent_user_id therapist_user_id').lean();
    
    console.log('📋 PATIENT DATA:\n');
    for (const patient of patients) {
      console.log(`Patient: ${patient.name} (Age: ${patient.age})`);
      console.log(`  - ID: ${patient._id}`);
      console.log(`  - Parent ID: ${patient.parent_user_id || 'MISSING ❌'}`);
      console.log(`  - Therapist ID: ${patient.therapist_user_id || 'MISSING ❌'}`);
      
      // Check if parent exists
      if (patient.parent_user_id) {
        const parent = await User.findById(patient.parent_user_id).select('username email');
        if (parent) {
          console.log(`  - Parent: ${parent.username || parent.email} ✅`);
        } else {
          console.log(`  - Parent: NOT FOUND IN DATABASE ❌`);
        }
      }
      console.log('');
    }
    
    // Summary
    const withParent = patients.filter(p => p.parent_user_id).length;
    const withoutParent = patients.filter(p => !p.parent_user_id).length;
    
    console.log('\n📊 SUMMARY:');
    console.log(`Total Patients: ${patients.length}`);
    console.log(`With Parent: ${withParent} ✅`);
    console.log(`Without Parent: ${withoutParent} ❌`);
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
