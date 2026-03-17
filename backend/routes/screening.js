const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const Screening = require('../models/screening');
const Patient = require('../models/patient');
const {
  saveScreeningResult,
  getLatestScreeningResult
} = require('../controllers/screeningController');

function normalizeQuestionnaireScore(score, testType, answers) {
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore) || numericScore < 0) {
    return 0;
  }

  if (numericScore <= 1) {
    return numericScore;
  }

  const maxByType = {
    'M-CHAT-R/F': 20,
    'SACS-R': 23,
    'SCSQ': 20,
    'AQ Test': 50,
  };

  const fallbackMax = answers && typeof answers === 'object' ? Object.keys(answers).length : 0;
  const maxScore = maxByType[testType] || fallbackMax || numericScore;
  const normalized = numericScore / maxScore;

  return Math.max(0, Math.min(1, normalized));
}

// @route   POST /api/screening/save
// @desc    Generate and save a unified screening result
// @access  Private
router.post('/save', verifyToken, async (req, res) => {
  return saveScreeningResult(req, res);
});

// @route   GET /api/screening/latest
// @desc    Get the most recent screening result for the logged-in user
// @access  Private
router.get('/latest', verifyToken, async (req, res) => {
  return getLatestScreeningResult(req, res);
});

// @route   POST /api/screening/submit
// @desc    Submit a screening questionnaire result
// @access  Private (Parent)
router.post('/submit', verifyToken, async (req, res) => {
  const { child_id, test_type, answers, score, risk_level } = req.body;

  console.log('[Screening Submit] Received request:', { child_id, test_type, has_answers: !!answers, score, risk_level });
  console.log('[Screening Submit] User info:', { userId: req.user?.id, role: req.user?.role });

  if (!child_id || !test_type || !answers || risk_level === undefined) {
    const missing = [];
    if (!child_id) missing.push('child_id');
    if (!test_type) missing.push('test_type');
    if (!answers) missing.push('answers');
    if (risk_level === undefined) missing.push('risk_level');
    console.error('[Screening Submit] Missing required fields:', missing);
    return res.status(400).json({ error: 'Missing required fields: ' + missing.join(', ') });
  }

  try {
    // Verify patient exists and belongs to the user (if parent)
      console.log('[Screening Submit] Looking up patient with ID:', child_id);
    const patient = await Patient.findById(child_id);
    if (!patient) {
        console.error('[Screening Submit] Patient not found:', child_id);
      return res.status(404).json({ error: 'Child profile not found' });
    }

    // If the user is a parent, ensure they own the child profile
    console.log('[Screening Submit] Patient found. User role:', req.user.role);
    if (req.user.role === 'parent' && patient.parent_id.toString() !== req.user.id) {
      console.error('[Screening Submit] Access denied - Parent mismatch', { userId: req.user.id, parentId: patient.parent_id.toString() });
      return res.status(403).json({ error: 'Access denied: This child profile does not belong to you' });
    }

    const normalizedScore = normalizeQuestionnaireScore(score, test_type, answers);
    console.log('[Screening Submit] Score normalization:', { rawScore: score, normalizedScore, test_type });

    const screening = new Screening({
      patientId: child_id,
      userId: req.user.id,
      screeningType: test_type,
      questionnaireAnswers: answers,
      resultScore: normalizedScore,
      resultLabel: risk_level,
      status: 'completed'
    });

    await screening.save();
  console.log('[Screening Submit] Screening saved successfully');

    // Update patient fields atomically to avoid full-document validation on legacy records.
    const mappedRiskLevel = risk_level.includes('High')
      ? 'High'
      : (risk_level.includes('Medium') || risk_level.includes('Moderate') ? 'Moderate' : 'Low');

    await Patient.updateOne(
      { _id: child_id },
      {
        $set: {
          lastScreeningDate: new Date(),
          riskLevel: mappedRiskLevel,
        },
        $addToSet: {
          completedScreenings: test_type,
        },
      }
    );
    console.log('[Screening Submit] Patient record updated via updateOne');

    res.status(201).json({
      message: 'Screening result submitted successfully',
      screeningId: screening.screeningId,
      result: screening
    });
  } catch (err) {
    console.error('[Screening Submit] FATAL ERROR:', err.message);
    console.error('[Screening Submit] Stack:', err.stack);
    res.status(500).json({ error: 'Server error: ' + err.message });
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
