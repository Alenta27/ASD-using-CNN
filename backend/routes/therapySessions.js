const express = require('express');
const router = express.Router();

const therapySessions = [];
let nextId = 1;

router.post('/', (req, res) => {
  try {
    const { student_id, exercise_type, score, notes, date } = req.body;

    if (!student_id || !exercise_type || score === undefined || score === null) {
      return res.status(400).json({
        message: 'student_id, exercise_type, and score are required'
      });
    }

    const session = {
      id: String(nextId++),
      student_id: String(student_id),
      exercise_type: String(exercise_type),
      score: Number(score),
      notes: notes ? String(notes) : '',
      date: date ? new Date(date) : new Date(),
      created_at: new Date()
    };

    therapySessions.push(session);
    return res.status(201).json(session);
  } catch (error) {
    console.error('POST /api/therapy-sessions error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', (req, res) => {
  try {
    const sessions = [...therapySessions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return res.json(sessions);
  } catch (error) {
    console.error('GET /api/therapy-sessions error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
