const express = require('express');
const router = express.Router();

const schedules = [];
let nextId = 1;

router.post('/', (req, res) => {
  try {
    const { student_id, date, type } = req.body;

    if (!student_id || !date || !type) {
      return res.status(400).json({ message: 'student_id, date, and type are required' });
    }

    const schedule = {
      id: String(nextId++),
      student_id: String(student_id),
      date: new Date(date),
      type: String(type),
      created_at: new Date()
    };

    schedules.push(schedule);

    return res.status(201).json(schedule);
  } catch (error) {
    console.error('POST /api/schedule error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', (req, res) => {
  try {
    const sessions = [...schedules].sort((a, b) => new Date(a.date) - new Date(b.date));
    return res.json(sessions);
  } catch (error) {
    console.error('GET /api/schedule error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
