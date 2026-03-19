const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Patient = require('./models/patient');
const SpeechTherapy = require('./models/SpeechTherapy');

async function seedSpeechSessions() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/asd_database';
  await mongoose.connect(uri);

  try {
    const patients = await Patient.find({}, '_id name age grade').limit(8);
    if (!patients.length) {
      console.log('No patients found.');
      return;
    }

    let audioPath = 'uploads/040041c70a0e1769436ea9d49b9943c0';
    if (!fs.existsSync(path.join(__dirname, audioPath))) {
      audioPath = 'uploads/0798f1a70947d393ed770e92224fb822';
    }

    const prompts = [
      'Say banana',
      'Say the sun is bright',
      'Say red balloon',
      'Say I can play outside',
      'Say butterfly',
      'Say reading is fun',
      'Say green apple',
      'Say good morning teacher'
    ];

    const therapyTypes = ['Pronunciation', 'Articulation', 'Fluency', 'VoiceQuality'];

    let created = 0;

    for (let i = 0; i < patients.length; i += 1) {
      const patient = patients[i];
      const baseCount = await SpeechTherapy.countDocuments({ childId: patient._id });

      const docs = [0, 1].map((offset) => ({
        childId: patient._id,
        sessionDate: new Date(Date.now() - ((i * 2 + offset) * 3600 * 1000)),
        audioFilePath: audioPath,
        originalFileName: 'seed-session-audio.webm',
        practicePrompt: prompts[(i + offset) % prompts.length],
        language: 'English',
        sessionNumber: baseCount + offset + 1,
        status: 'pending',
        therapyType: therapyTypes[(i + offset) % therapyTypes.length]
      }));

      await SpeechTherapy.insertMany(docs);
      created += docs.length;
    }

    const totalPending = await SpeechTherapy.countDocuments({ status: 'pending' });
    console.log('Created pending sessions:', created);
    console.log('Total pending sessions now:', totalPending);
  } finally {
    await mongoose.connection.close();
  }
}

seedSpeechSessions().catch((error) => {
  console.error('Failed to seed speech sessions:', error);
  process.exit(1);
});
