const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const Screening = require('../models/screening');
const Patient = require('../models/patient');

// @route   POST /api/screening/submit
// @desc    Submit a screening questionnaire result
// @access  Private (Parent)
router.post('/submit', verifyToken, async (req, res) => {
  const { child_id, test_type, answers, score, risk_level } = req.body;

  if (!child_id || !test_type || !answers || risk_level === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Verify patient exists and belongs to the user (if parent)
    const patient = await Patient.findById(child_id);
    if (!patient) {
      return res.status(404).json({ error: 'Child profile not found' });
    }

    // If the user is a parent, ensure they own the child profile
    if (req.user.role === 'parent' && patient.parent_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: This child profile does not belong to you' });
    }

    const screening = new Screening({
      patientId: child_id,
      userId: req.user.id,
      screeningType: test_type,
      questionnaireAnswers: answers,
      resultScore: score,
      resultLabel: risk_level,
      status: 'completed'
    });

    await screening.save();

    // Update patient's last screening info
    patient.lastScreeningDate = new Date();
    patient.riskLevel = risk_level.includes('High') ? 'High' : (risk_level.includes('Medium') || risk_level.includes('Moderate') ? 'Moderate' : 'Low');
    if (!patient.completedScreenings.includes(test_type)) {
      patient.completedScreenings.push(test_type);
    }
    await patient.save();

    res.status(201).json({
      message: 'Screening result submitted successfully',
      screeningId: screening.screeningId,
      result: screening
    });
  } catch (err) {
    console.error('Error submitting screening:', err);
    res.status(500).json({ error: 'Server error while submitting screening' });
  }
});

// @route   GET /api/screening/results/:child_id
// @desc    Get screening results for a specific child
// @access  Private
router.get('/results/:child_id', verifyToken, async (req, res) => {
  const { child_id } = req.params;

  try {
    // Verify patient exists
    const patient = await Patient.findById(child_id);
    if (!patient) {
      return res.status(404).json({ error: 'Child profile not found' });
    }

    // Access control: parent can only see their own children
    if (req.user.role === 'parent' && patient.parent_id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch all questionnaire screenings for this child
    const results = await Screening.find({ 
      patientId: child_id,
      screeningType: { $in: ['M-CHAT-R/F', 'SACS-R', 'SCSQ', 'AQ Test', 'questionnaire'] }
    }).sort({ createdAt: -1 });

    res.json(results);
  } catch (err) {
    console.error('Error fetching screening results:', err);
    res.status(500).json({ error: 'Server error while fetching screening results' });
  }
});

module.exports = router;
