const mongoose = require('mongoose');

const moodCheckInSchema = new mongoose.Schema(
  {
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    childId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    mood: {
      type: String,
      enum: ['Calm', 'Happy', 'Anxious', 'Irritable'],
      required: true,
      default: 'Calm'
    },
    attention: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      required: true,
      default: 'Medium'
    },
    sleep: {
      type: String,
      enum: ['Poor', 'Fair', 'Good', 'Excellent'],
      required: true,
      default: 'Good'
    }
  },
  { timestamps: true }
);

moodCheckInSchema.index({ parentId: 1, childId: 1, createdAt: -1 });

module.exports = mongoose.model('MoodCheckIn', moodCheckInSchema);
