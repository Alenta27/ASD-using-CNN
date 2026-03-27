const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, required: false, default: '' },
    expectedAnswer: { type: String, required: false, default: '' },
    isCorrect: { type: Boolean, required: false, default: false },
    score: { type: Number, required: false, default: 0 }
  },
  { _id: false }
);

const multiDisorderResultSchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true
    },
    disorderType: {
      type: String,
      enum: ['ADHD', 'Speech & Language Delay', 'Dyslexia', 'Anxiety / Behavioral Issues'],
      required: true
    },
    responses: {
      type: [responseSchema],
      default: []
    },
    correctAnswers: {
      type: Number,
      required: false,
      min: 0,
      default: 0
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    totalScore: {
      type: Number,
      required: false,
      min: 0,
      default: 0
    },
    accuracy: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0
    },
    result: {
      type: String,
      enum: ['Low Risk', 'Moderate Risk', 'High Risk'],
      required: true
    }
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false }
  }
);

module.exports = mongoose.model('MultiDisorderResult', multiDisorderResultSchema);
