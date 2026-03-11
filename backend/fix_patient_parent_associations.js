require('dotenv').config();
const mongoose = require('mongoose');
const Patient = require('./models/patient');
const User = require('./models/user');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/asd_database';

async function fixPatientParentAssociations() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    
    // Get all patients
    const patients = await Patient.find().lean();
    const users = await User.find({ role: 'parent' }).select('username email _id').lean();
    
    console.log('📋 CURRENT DATABASE STATUS:');
    console.log(`Total Patients: ${patients.length}`);
    console.log(`Total Parents: ${users.length}\n`);
    
    // Find patients without parents
    const patientsWithoutParent = patients.filter(p => !p.parent_user_id);
    const patientsWithParent = patients.filter(p => p.parent_user_id);
    
    console.log('✅ Patients WITH parent association: ' + patientsWithParent.length);
    patientsWithParent.forEach(p => {
      console.log(`   - ${p.name} (Age: ${p.age})`);
    });
    
    console.log('\n❌ Patients WITHOUT parent association: ' + patientsWithoutParent.length);
    patientsWithoutParent.forEach(p => {
      console.log(`   - ${p.name} (Age: ${p.age})`);
    });
    
    if (patientsWithoutParent.length === 0) {
      console.log('\n🎉 All patients already have parent associations!');
      process.exit(0);
    }
    
    console.log('\n\n📝 AVAILABLE PARENT USERS:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username || user.email} (ID: ${user._id})`);
    });
    
    console.log('\n\n🔧 FIX OPTIONS:');
    console.log('1. Auto-assign: Assign all patients without parents to the first available parent');
    console.log('2. Manual assign: Choose parent for each patient individually');
    console.log('3. Create new parent: Create a default parent user for unassigned patients');
    console.log('4. Exit without changes\n');
    
    const choice = await question('Enter your choice (1-4): ');
    
    switch(choice.trim()) {
      case '1':
        await autoAssignParent(patientsWithoutParent, users);
        break;
      case '2':
        await manualAssignParent(patientsWithoutParent, users);
        break;
      case '3':
        await createDefaultParent(patientsWithoutParent);
        break;
      case '4':
        console.log('Exiting without changes.');
        break;
      default:
        console.log('Invalid choice. Exiting.');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

async function autoAssignParent(patients, users) {
  if (users.length === 0) {
    console.log('❌ No parent users found. Please create a parent user first.');
    return;
  }
  
  const defaultParent = users[0];
  console.log(`\n🔄 Assigning all patients to: ${defaultParent.username || defaultParent.email}\n`);
  
  for (const patient of patients) {
    await Patient.findByIdAndUpdate(patient._id, {
      parent_user_id: defaultParent._id
    });
    console.log(`✅ Updated: ${patient.name} → ${defaultParent.username || defaultParent.email}`);
  }
  
  console.log('\n✅ All patients have been assigned!');
}

async function manualAssignParent(patients, users) {
  if (users.length === 0) {
    console.log('❌ No parent users found. Please create a parent user first.');
    return;
  }
  
  console.log('\n🔄 Manual Assignment Mode\n');
  
  for (const patient of patients) {
    console.log(`\n👤 Patient: ${patient.name} (Age: ${patient.age})`);
    console.log('Select parent:');
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username || user.email}`);
    });
    
    const choice = await question('Enter parent number (or press Enter to skip): ');
    
    if (choice.trim() === '') {
      console.log('Skipped.');
      continue;
    }
    
    const selectedIndex = parseInt(choice.trim()) - 1;
    if (selectedIndex >= 0 && selectedIndex < users.length) {
      const selectedParent = users[selectedIndex];
      await Patient.findByIdAndUpdate(patient._id, {
        parent_user_id: selectedParent._id
      });
      console.log(`✅ Assigned: ${patient.name} → ${selectedParent.username || selectedParent.email}`);
    } else {
      console.log('Invalid choice. Skipped.');
    }
  }
  
  console.log('\n✅ Manual assignment complete!');
}

async function createDefaultParent(patients) {
  console.log('\n🔄 Creating default parent user...\n');
  
  const defaultParentEmail = 'default.parent@cortexa.com';
  
  // Check if default parent already exists
  let defaultParent = await User.findOne({ email: defaultParentEmail });
  
  if (!defaultParent) {
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('DefaultParent123', 10);
    
    defaultParent = new User({
      username: 'Default Parent',
      email: defaultParentEmail,
      password: hashedPassword,
      role: 'parent',
      roleStatus: 'approved'
    });
    
    await defaultParent.save();
    console.log('✅ Created default parent user:');
    console.log(`   Email: ${defaultParentEmail}`);
    console.log(`   Password: DefaultParent123`);
    console.log('   (Change this password after first login!)\n');
  } else {
    console.log('✅ Default parent already exists.\n');
  }
  
  console.log('🔄 Assigning patients to default parent...\n');
  
  for (const patient of patients) {
    await Patient.findByIdAndUpdate(patient._id, {
      parent_user_id: defaultParent._id
    });
    console.log(`✅ Updated: ${patient.name}`);
  }
  
  console.log('\n✅ All patients have been assigned to default parent!');
}

// Run the script
fixPatientParentAssociations().finally(() => {
  rl.close();
  mongoose.connection.close();
});
