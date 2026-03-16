const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const AttentionGameResult = require('../models/AttentionGameResult');
const Patient = require('../models/patient');

/**
 * @route POST /api/attention-results
 * @desc Store attention game results
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { 
      childId, 
      gameType, 
      score, 
      accuracy, 
      reactionTime, 
      mistakes,
      reactionRounds,
      focusRounds,
      gameName,
      attentionScore,
      attentionLevel,
      completionTime
    } = req.body;

    if (!childId || !gameType) {
      return res.status(400).json({ error: 'childId and gameType are required' });
    }

    // Verify child belongs to parent
    const child = await Patient.findOne({ _id: childId, parent_id: req.user.id });
    if (!child) {
      return res.status(404).json({ error: 'Child not found or unauthorized' });
    }

    const result = new AttentionGameResult({
      childId,
      gameType,
      gameId: gameType, // For backward compatibility
      gameName,
      score,
      accuracy,
      reactionTime,
      mistakes,
      reactionRounds,
      focusRounds,
      attentionScore,
      attentionLevel,
      completionTime,
      // Optional fields with defaults
      playedAt: new Date()
    });

    await result.save();
    res.status(201).json(result);
  } catch (error) {
    console.error('Error saving attention result:', error);
    res.status(500).json({ error: 'Failed to save result' });
  }
});

/**
 * @route GET /api/attention-results
 * @desc Get latest result for a specific child and game
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const { childId, gameType } = req.query;

    if (!childId || !gameType) {
      return res.status(400).json({ error: 'childId and gameType are required' });
    }

    // Verify child belongs to parent
    const child = await Patient.findOne({ _id: childId, parent_id: req.user.id });
    if (!child) {
      return res.status(404).json({ error: 'Child not found or unauthorized' });
    }

    const result = await AttentionGameResult.findOne({ 
      childId, 
      gameType 
    }).sort({ playedAt: -1 });

    if (!result) {
      return res.status(404).json({ error: 'No results found for this game' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching attention result:', error);
    res.status(500).json({ error: 'Failed to fetch result' });
  }
});

module.exports = router;
