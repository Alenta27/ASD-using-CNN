const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { verifyToken, teacherCheck } = require('../middlewares/auth');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
const audioUploadsDir = path.join(uploadsDir, 'audio');
if (!fs.existsSync(audioUploadsDir)) {
  fs.mkdirSync(audioUploadsDir, { recursive: true });
}

const sanitizeStudentId = (value) => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, audioUploadsDir),
  filename: (req, file, cb) => {
    const studentId = sanitizeStudentId(req.body.studentId);
    const timestamp = Date.now();
    cb(null, `${studentId}_${timestamp}.webm`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

router.post('/upload', verifyToken, teacherCheck, upload.single('audio'), async (req, res) => {
  try {
    const studentId = sanitizeStudentId(req.body.studentId);

    if (!studentId) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: 'studentId is required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Audio file is required' });
    }

    return res.status(201).json({
      message: 'Audio uploaded successfully',
      recording: {
        filename: req.file.filename,
        url: `/uploads/audio/${req.file.filename}`,
        sizeBytes: req.file.size,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

router.get('/recordings/:studentId', verifyToken, teacherCheck, async (req, res) => {
  try {
    const studentId = sanitizeStudentId(req.params.studentId);
    if (!studentId) {
      return res.status(400).json({ message: 'Invalid studentId' });
    }

    const files = fs.readdirSync(audioUploadsDir);
    const matching = files
      .filter((file) => file.startsWith(`${studentId}_`) && file.endsWith('.webm'))
      .map((file) => {
        const fullPath = path.join(audioUploadsDir, file);
        const stats = fs.statSync(fullPath);
        const tsPart = file.replace(`${studentId}_`, '').replace('.webm', '');
        const parsedTs = Number(tsPart);
        const timestamp = Number.isFinite(parsedTs) && parsedTs > 0 ? parsedTs : stats.mtimeMs;

        return {
          filename: file,
          url: `/uploads/audio/${file}`,
          timestamp,
          uploadedAt: new Date(stats.mtimeMs).toISOString(),
          sizeBytes: stats.size
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    return res.json({ studentId, recordings: matching });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load recordings', error: error.message });
  }
});

router.delete('/recordings/:studentId/:filename', verifyToken, teacherCheck, async (req, res) => {
  try {
    const studentId = sanitizeStudentId(req.params.studentId);
    const filename = path.basename(req.params.filename || '');

    if (!studentId || !filename || !filename.startsWith(`${studentId}_`)) {
      return res.status(400).json({ message: 'Invalid recording path' });
    }

    const target = path.join(audioUploadsDir, filename);
    if (!fs.existsSync(target)) {
      return res.status(404).json({ message: 'Recording not found' });
    }

    fs.unlinkSync(target);
    return res.json({ message: 'Recording deleted', filename });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete recording', error: error.message });
  }
});

module.exports = router;
