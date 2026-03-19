const express = require('express');
const router = express.Router();

const notes = [];
let nextId = 1;

router.post('/', (req, res) => {
  try {
    const { student_id, note, date } = req.body;

    if (!student_id || !note) {
      return res.status(400).json({ message: 'student_id and note are required' });
    }

    const noteDoc = {
      id: String(nextId++),
      student_id: String(student_id),
      note: String(note).trim(),
      date: date ? new Date(date) : new Date(),
      created_at: new Date()
    };

    notes.push(noteDoc);

    return res.status(201).json(noteDoc);
  } catch (error) {
    console.error('POST /api/notes error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:student_id', (req, res) => {
  try {
    const { student_id } = req.params;
    const filteredNotes = notes
      .filter((item) => item.student_id === String(student_id))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return res.json(filteredNotes);
  } catch (error) {
    console.error('GET /api/notes/:student_id error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
