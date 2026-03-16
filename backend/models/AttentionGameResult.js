const mongoose = require('mongoose');

const attentionGameResultSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  gameType: {
    type: String,
    required: true,
    enum: [
      'chrono-code',
      'iconic-recall',
      'match-mastery',
      'numeric-shuffle',
      'odd-one-out',
      'pattern-match',
      'reflex-tap',
      'signal-switch'
    ]
  },
  gameId: {
    type: String,
    // Make optional for compatibility
    // required: true,
    enum: [
      'chrono-code',
      'iconic-recall',
      'match-mastery',
      'numeric-shuffle',
      'odd-one-out',
      'pattern-match',
      'reflex-tap',
      'signal-switch'
    ]
  },
  gameName: {
    type: String,
    // required: true
  },
  score: {
    type: Number,
    required: true
  },
  accuracy: {
    type: Number, // Percentage (0-100)
    required: true
  },
  reactionTime: {
    type: Number, // In seconds
    required: true
  },
  completionTime: {
    type: Number, // In seconds
    // required: true
  },
  mistakes: {
    type: Number,
    required: true,
    default: 0
  },
  attentionScore: {
    type: Number, // Calculated score (0-100)
    // required: true
  },
  attentionLevel: {
    type: String,
    // required: true,
    enum: ['Low', 'Moderate', 'High']
  },
  reactionRounds: {
    type: [Object],
    default: []
  },
  focusRounds: {
    type: [Object],
    default: []
  },
  playedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
attentionGameResultSchema.index({ childId: 1, playedAt: -1 });
attentionGameResultSchema.index({ childId: 1, gameType: 1 });
attentionGameResultSchema.index({ childId: 1, gameId: 1 });

const AttentionGameResult = mongoose.model('AttentionGameResult', attentionGameResultSchema);

module.exports = AttentionGameResult;
