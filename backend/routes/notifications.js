const express = require('express');
const router = express.Router();

const notifications = [
  {
    id: '1',
    student_id: null,
    message: 'New screening completed',
    created_at: new Date(Date.now() - 5 * 60 * 1000)
  },
  {
    id: '2',
    student_id: null,
    message: 'Therapy session added',
    created_at: new Date(Date.now() - 30 * 60 * 1000)
  },
  {
    id: '3',
    student_id: null,
    message: 'Report generated',
    created_at: new Date(Date.now() - 60 * 60 * 1000)
  }
];

router.get('/', (req, res) => {
  try {
    const result = [...notifications]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((item) => ({
        ...item,
        timestamp: item.created_at
      }));

    return res.json(result);
  } catch (error) {
    console.error('GET /api/notifications error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
