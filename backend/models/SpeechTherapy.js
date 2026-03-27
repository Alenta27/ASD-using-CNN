const mongoose = require('mongoose');

/**
 * Speech Therapy Session Schema
 * 
 * Purpose: Store speech practice recordings for children with ASD
 * Focus: Therapeutic support and communication skill improvement
 * NOT for diagnosis - only for practice, feedback, and progress tracking
 */
const speechTherapySchema = new mongoose.Schema({
  // Child Information
  childId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Patient', 
    required: false,
    index: true
  },
  speechChildId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SpeechChild',
    required: false,
    index: true
  },
  
  // Session Details
  sessionDate: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  
  // Audio Recording
  audioFilePath: { 
    type: String, 
    required: true 
  },
  originalFileName: {
    type: String,
    required: false
  },
  audioMimeType: {
    type: String,
    required: false
  },
  
  // Practice Content
  practicePrompt: { 
    type: String, 
    required: false,
    description: "The word or sentence the child was asked to say"
  },
  sampleAudioPath: {
    type: String,
    required: false,
    description: "Path to the sample audio played to the child"
  },
  
  // PRO Features
  language: {
    type: String,
    enum: ['English', 'Malayalam', 'Hindi'],
    default: 'English'
  },
  aiSimilarityScore: {
    type: Number,
    min: 0,
    max: 100,
    required: false,
    description: "AI-calculated similarity score between child's speech and sample"
  },
  aiFeedback: {
    type: String,
    required: false,
    description: "AI-generated automated feedback"
  },
  
  // Therapy Type (Extended Feature 1)
  therapyType: {
    type: String,
    enum: ['Pronunciation', 'Articulation', 'Fluency', 'VoiceQuality', 'General'],
    default: 'General',
    description: "Specific type of speech therapy session"
  },

  // Therapist Evaluation
  rating: { 
    type: String, 
    enum: ['Poor', 'Average', 'Good', 'Not Rated'],
    default: 'Not Rated'
  },
  feedback: { 
    type: String, 
    default: '',
    description: "Therapist's comments and suggestions"
  },
  evaluatedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: false,
    description: "Teacher/therapist who provided the evaluation"
  },
  evaluatedAt: {
    type: Date,
    required: false
  },

  // Detailed Evaluation Criteria (Extended Feature 2)
  evaluationCriteria: {
    pronunciation: {
      clarity: { type: Number, min: 0, max: 10, required: false },
      accuracy: { type: Number, min: 0, max: 10, required: false },
      naturalness: { type: Number, min: 0, max: 10, required: false }
    },
    articulation: {
      consonantAccuracy: { type: Number, min: 0, max: 10, required: false },
      vowelAccuracy: { type: Number, min: 0, max: 10, required: false },
      consistency: { type: Number, min: 0, max: 10, required: false }
    },
    fluency: {
      speechRate: { type: Number, min: 0, max: 10, required: false },
      pauseControl: { type: Number, min: 0, max: 10, required: false },
      rhythm: { type: Number, min: 0, max: 10, required: false }
    },
    voiceQuality: {
      pitch: { type: Number, min: 0, max: 10, required: false },
      volume: { type: Number, min: 0, max: 10, required: false },
      resonance: { type: Number, min: 0, max: 10, required: false }
    }
  },

  // Overall Score (Extended Feature 3)
  overallScore: {
    type: Number,
    min: 0,
    max: 100,
    required: false,
    description: "Calculated overall score from evaluation criteria"
  },

  // Detailed Feedback (Extended Feature 5)
  detailedFeedback: {
    strengths: [String],
    areasForImprovement: [String],
    recommendations: [String],
    template: { type: String, required: false }
  },

  // Audio Analysis (Extended Feature 6)
  audioAnalysis: {
    duration: { type: Number, required: false },
    confidenceScore: { type: Number, min: 0, max: 100, required: false },
    noiseLevel: { type: String, enum: ['Low', 'Medium', 'High'], required: false },
    clarity: { type: Number, min: 0, max: 100, required: false }
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'evaluated', 'archived'],
    default: 'pending',
    index: true
  },
  
  // Progress Tracking
  sessionNumber: {
    type: Number,
    required: false,
    description: "Sequential session number for this child"
  },
  
  // Metadata
  duration: {
    type: Number,
    required: false,
    description: "Recording duration in seconds"
  },
  notes: {
    type: String,
    required: false,
    description: "Additional notes or observations"
  }
}, { 
  timestamps: true 
});

// Indexes for efficient queries
speechTherapySchema.index({ childId: 1, sessionDate: -1 });
speechTherapySchema.index({ status: 1 });
speechTherapySchema.index({ evaluatedBy: 1 });

// Virtual for progress calculation
speechTherapySchema.virtual('progressIndicator').get(function() {
  const ratingValues = { 'Poor': 1, 'Average': 2, 'Good': 3, 'Not Rated': 0 };
  return ratingValues[this.rating] || 0;
});

const SpeechTherapy = mongoose.model('SpeechTherapy', speechTherapySchema);

module.exports = SpeechTherapy;
