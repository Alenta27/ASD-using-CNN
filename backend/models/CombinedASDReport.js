const mongoose = require('mongoose');

const CombinedASDReportSchema = new mongoose.Schema({
  // Patient reference
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  
  // Individual module scores (0-1 range, representing probability/risk)
  facialScore: {
    type: Number,
    required: false,
    min: 0,
    max: 1,
    default: null
  },
  
  mriScore: {
    type: Number,
    required: false,
    min: 0,
    max: 1,
    default: null
  },
  
  gazeScore: {
    type: Number,
    required: false,
    min: 0,
    max: 1,
    default: null
  },
  
  behaviorScore: {
    type: Number,
    required: false,
    min: 0,
    max: 1,
    default: null
  },
  
  questionnaireScore: {
    type: Number,
    required: false,
    min: 0,
    max: 1,
    default: null
  },
  
  // Weighted final score
  finalScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  
  // Risk level classification
  riskLevel: {
    type: String,
    enum: ['Low', 'Moderate', 'High'],
    required: true
  },
  
  // Metadata about which modules were completed
  completedModules: {
    type: [String],
    default: []
  },
  
  // Total number of modules used in calculation
  modulesCount: {
    type: Number,
    required: true,
    default: 0
  },
  
  // References to individual screening records
  screeningReferences: {
    facialScreeningId: { type: mongoose.Schema.Types.ObjectId, ref: 'Screening', required: false },
    mriScreeningId: { type: mongoose.Schema.Types.ObjectId, ref: 'Screening', required: false },
    gazeSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'GazeSession', required: false },
    behavioralAssessmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'BehavioralAssessment', required: false },
    questionnaireScreeningId: { type: mongoose.Schema.Types.ObjectId, ref: 'Screening', required: false }
  },
  
  // Therapist who generated/reviewed the report
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  
  // Therapist decision
  therapistDecision: {
    type: String,
    enum: ['pending', 'consultation_scheduled', 'report_sent', 'marked_low_risk', 'needs_followup'],
    default: 'pending'
  },
  
  // Notes from therapist
  therapistNotes: {
    type: String,
    required: false
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['draft', 'completed', 'sent_to_parent'],
    default: 'draft'
  },
  
  // Timestamp when report was sent to parent
  sentToParentAt: {
    type: Date,
    required: false
  },
  
  // Timestamp when consultation was scheduled
  consultationScheduledAt: {
    type: Date,
    required: false
  },
  
  // Report generation details
  generatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Last updated timestamp
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes for efficient queries
CombinedASDReportSchema.index({ patientId: 1, generatedAt: -1 });
CombinedASDReportSchema.index({ riskLevel: 1 });
CombinedASDReportSchema.index({ status: 1 });

// Update the updatedAt timestamp before saving
CombinedASDReportSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('CombinedASDReport', CombinedASDReportSchema);
