const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const SpeechTherapy = require('../models/SpeechTherapy');
const Patient = require('../models/patient');
const { authenticateToken } = require('../middlewares/authMiddleware');

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/speech-therapy');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'speech-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /webm|mp3|wav|ogg|m4a|mp4/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'));
    }
  }
});

/**
 * @route   POST /api/speech-therapy/upload
 * @desc    Upload child's speech recording
 * @access  Authenticated (Parent/Teacher)
 */
router.post('/upload', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    const { childId, practicePrompt, sampleAudioPath } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    if (!childId) {
      return res.status(400).json({ error: 'Child ID is required' });
    }

    // Verify child exists
    const child = await Patient.findById(childId);
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Get session number for this child
    const sessionCount = await SpeechTherapy.countDocuments({ childId });
    
    // Create new speech therapy session
    const newSession = new SpeechTherapy({
      childId,
      audioFilePath: req.file.path,
      originalFileName: req.file.originalname,
      practicePrompt: practicePrompt || '',
      sampleAudioPath: sampleAudioPath || '',
      sessionNumber: sessionCount + 1,
      status: 'pending'
    });

    await newSession.save();

    res.status(201).json({
      message: 'Speech recording uploaded successfully',
      session: newSession
    });

  } catch (error) {
    console.error('Error uploading speech recording:', error);
    res.status(500).json({ error: 'Failed to upload speech recording' });
  }
});

/**
 * @route   GET /api/speech-therapy/child/:childId
 * @desc    Get all speech therapy sessions for a child
 * @access  Authenticated (Parent/Teacher/Therapist)
 */
router.get('/child/:childId', authenticateToken, async (req, res) => {
  try {
    const { childId } = req.params;

    const sessions = await SpeechTherapy.find({ childId })
      .populate('evaluatedBy', 'username email')
      .sort({ sessionDate: -1 });

    res.json(sessions);

  } catch (error) {
    console.error('Error fetching speech therapy sessions:', error);
    res.status(500).json({ error: 'Failed to fetch speech therapy sessions' });
  }
});

/**
 * @route   GET /api/speech-therapy/pending
 * @desc    Get all pending speech therapy sessions for evaluation
 * @access  Authenticated (Teacher/Therapist)
 */
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    // Only teachers and therapists can access
    if (!['teacher', 'therapist'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const pendingSessions = await SpeechTherapy.find({ status: 'pending' })
      .populate('childId', 'name age gender grade')
      .sort({ sessionDate: -1 });

    res.json(pendingSessions);

  } catch (error) {
    console.error('Error fetching pending sessions:', error);
    res.status(500).json({ error: 'Failed to fetch pending sessions' });
  }
});

/**
 * @route   PUT /api/speech-therapy/evaluate/:sessionId
 * @desc    Teacher evaluates a speech therapy session
 * @access  Authenticated (Teacher/Therapist)
 */
router.put('/evaluate/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { rating, feedback, notes } = req.body;

    // Only teachers and therapists can evaluate
    if (!['teacher', 'therapist'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!rating || !['Poor', 'Average', 'Good'].includes(rating)) {
      return res.status(400).json({ error: 'Valid rating is required (Poor/Average/Good)' });
    }

    const session = await SpeechTherapy.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.rating = rating;
    session.feedback = feedback || '';
    session.notes = notes || '';
    session.evaluatedBy = req.user.id;
    session.evaluatedAt = new Date();
    session.status = 'evaluated';

    await session.save();

    const updatedSession = await SpeechTherapy.findById(sessionId)
      .populate('childId', 'name age gender')
      .populate('evaluatedBy', 'username email');

    res.json({
      message: 'Session evaluated successfully',
      session: updatedSession
    });

  } catch (error) {
    console.error('Error evaluating session:', error);
    res.status(500).json({ error: 'Failed to evaluate session' });
  }
});

/**
 * @route   GET /api/speech-therapy/progress/:childId
 * @desc    Get progress report for a child
 * @access  Authenticated
 */
router.get('/progress/:childId', authenticateToken, async (req, res) => {
  try {
    const { childId } = req.params;

    const sessions = await SpeechTherapy.find({ childId })
      .sort({ sessionDate: 1 });

    if (sessions.length === 0) {
      return res.json({
        totalSessions: 0,
        evaluatedSessions: 0,
        averageRating: 0,
        improvement: 'No data yet',
        sessions: []
      });
    }

    // Calculate statistics
    const evaluatedSessions = sessions.filter(s => s.status === 'evaluated');
    const ratingValues = { 'Poor': 1, 'Average': 2, 'Good': 3 };
    
    const ratingsSum = evaluatedSessions.reduce((sum, s) => {
      return sum + (ratingValues[s.rating] || 0);
    }, 0);

    const averageRating = evaluatedSessions.length > 0 
      ? (ratingsSum / evaluatedSessions.length).toFixed(2)
      : 0;

    // Calculate improvement trend (comparing first 3 and last 3 sessions)
    let improvement = 'Insufficient data';
    if (evaluatedSessions.length >= 6) {
      const first3Avg = evaluatedSessions.slice(0, 3).reduce((sum, s) => 
        sum + (ratingValues[s.rating] || 0), 0) / 3;
      const last3Avg = evaluatedSessions.slice(-3).reduce((sum, s) => 
        sum + (ratingValues[s.rating] || 0), 0) / 3;
      
      const diff = last3Avg - first3Avg;
      if (diff > 0.3) improvement = 'Improving';
      else if (diff < -0.3) improvement = 'Needs attention';
      else improvement = 'Stable';
    }

    res.json({
      totalSessions: sessions.length,
      evaluatedSessions: evaluatedSessions.length,
      pendingSessions: sessions.length - evaluatedSessions.length,
      averageRating: parseFloat(averageRating),
      improvement,
      ratingDistribution: {
        poor: evaluatedSessions.filter(s => s.rating === 'Poor').length,
        average: evaluatedSessions.filter(s => s.rating === 'Average').length,
        good: evaluatedSessions.filter(s => s.rating === 'Good').length
      },
      sessions: sessions.map(s => ({
        date: s.sessionDate,
        sessionNumber: s.sessionNumber,
        rating: s.rating,
        feedback: s.feedback,
        practicePrompt: s.practicePrompt
      }))
    });

  } catch (error) {
    console.error('Error fetching progress report:', error);
    res.status(500).json({ error: 'Failed to fetch progress report' });
  }
});

/**
 * @route   GET /api/speech-therapy/audio/:sessionId
 * @desc    Stream audio file for a session
 * @access  Authenticated
 */
router.get('/audio/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await SpeechTherapy.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!fs.existsSync(session.audioFilePath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    // Stream the audio file
    const stat = fs.statSync(session.audioFilePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(session.audioFilePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/webm',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'audio/webm',
      };
      res.writeHead(200, head);
      fs.createReadStream(session.audioFilePath).pipe(res);
    }

  } catch (error) {
    console.error('Error streaming audio:', error);
    res.status(500).json({ error: 'Failed to stream audio' });
  }
});

/**
 * @route   DELETE /api/speech-therapy/:sessionId
 * @desc    Delete a speech therapy session
 * @access  Authenticated (Teacher/Therapist/Parent)
 */
router.delete('/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await SpeechTherapy.findById(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Delete audio file
    if (fs.existsSync(session.audioFilePath)) {
      fs.unlinkSync(session.audioFilePath);
    }

    // Delete session from database
    await SpeechTherapy.findByIdAndDelete(sessionId);

    res.json({ message: 'Session deleted successfully' });

  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

module.exports = router;
