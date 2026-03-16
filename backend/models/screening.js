const mongoose = require('mongoose');

const screeningSchema = new mongoose.Schema({
  // Required: Patient reference (new multimodal system)
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: false, index: true },
  
  // Legacy: User reference (backward compatibility)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  childName: { type: String, required: false },
  
  // Screening identification
  screeningId: { type: String, unique: true, required: false, sparse: true },
  screeningType: { 
    type: String, 
    enum: ['facial', 'mri', 'questionnaire', 'behavioral', 'gaze', 'speech', 'voice', 'M-CHAT-R/F', 'SACS-R', 'SCSQ', 'AQ Test'], 
    required: true,
    index: true
  },
  
  // Results - NEW multimodal fields
  resultScore: { type: Number, required: false, min: 0, max: 1 }, // Probability score (0-1)
  resultLabel: { type: String, enum: ['ASD', 'No ASD', 'Low Risk', 'Medium Risk', 'Moderate Risk', 'High Risk'], required: false },
  confidenceScore: { type: Number, required: false, min: 0, max: 1 }, // Model confidence
  
  // Legacy result field (backward compatibility)
  result: { type: String, enum: ['low_risk', 'medium_risk', 'high_risk'], required: false },
  
  // Module-specific data
  gazeMetrics: {
    gazDirection: { type: String, required: false },
    attentionScore: { type: Number, required: false },
    headPitch: { type: Number, required: false },
    headYaw: { type: Number, required: false },
  },
  
  // Behavioral assessment data
  behavioralMetrics: {
    socialInteraction: { type: Number, required: false },
    communication: { type: Number, required: false },
    repetitiveBehavior: { type: Number, required: false },
    sensoryResponse: { type: Number, required: false },
  },
  
  // Questionnaire data
  questionnaireAnswers: { type: mongoose.Schema.Types.Mixed, required: false },
  
  // Speech therapy data
  speechMetrics: {
    articulation: { type: Number, required: false },
    fluency: { type: Number, required: false },
    language: { type: Number, required: false },
    voice: { type: Number, required: false },
  },
  
  // MRI analysis data
  mriMetrics: {
    brainRegions: { type: mongoose.Schema.Types.Mixed, required: false },
    volumeAnalysis: { type: mongoose.Schema.Types.Mixed, required: false },
  },
  
  // Additional metadata
  notes: { type: String, required: false },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Clinician/teacher who conducted
  duration: { type: Number, required: false }, // Duration in seconds
  fileUrl: { type: String, required: false }, // Associated file (image, MRI scan, etc.)
  
  // Status tracking
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

// Indexes for efficient queries
screeningSchema.index({ patientId: 1, screeningType: 1 });
screeningSchema.index({ createdAt: -1 });

// Generate unique screening ID before saving
screeningSchema.pre('save', async function(next) {
  if (this.isNew && !this.screeningId) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.screeningId = `SCR_${timestamp}_${random}`;
  }
  next();
});

module.exports = mongoose.model('Screening', screeningSchema);
