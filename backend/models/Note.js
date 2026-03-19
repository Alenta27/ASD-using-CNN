const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    student_id: { type: String, required: true, index: true },
    note: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Note', noteSchema);
