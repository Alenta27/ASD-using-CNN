const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
  {
    student_id: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    type: { type: String, enum: ['Therapy', 'Assessment'], required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Schedule', scheduleSchema);
