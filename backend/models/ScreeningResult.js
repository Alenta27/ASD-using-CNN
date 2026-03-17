const mongoose = require('mongoose');

const ScreeningResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  childName: {
    type: String,
    required: true
  },
  screeningType: {
    type: String,
    enum: ['MCHAT', 'ATTENTION', 'MRI'],
    required: true
  },
  scores: {
    questionnaireScore: { type: Number, default: 0 },
    attentionScore: { type: Number, default: 0 },
    mriPrediction: { type: String, enum: ['ASD', 'No ASD', 'Unknown'], default: 'Unknown' }
  },
  riskLevel: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    required: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  recommendation: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { timestamps: true });

module.exports = mongoose.model('ScreeningResult', ScreeningResultSchema);
