require('dotenv').config({ debug: true });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const mongoose = require('mongoose');

const app = express();

// ✅ Simplified CORS for localhost & deployed front-end
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Ensure uploads and credentials directories exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const credentialsDir = path.join(__dirname, 'credentials');
if (!fs.existsSync(credentialsDir)) fs.mkdirSync(credentialsDir, { recursive: true });

app.use('/credentials', express.static(credentialsDir));

// ✅ Health Check Route (Render Requirement)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server running', timestamp: new Date().toISOString() });
});

// ✅ Auth Routes
try {
  app.use(require('./routes/auth'));
} catch (e) {
  console.error('Auth Routes Error:', e.message);
}

// ✅ Parent Routes
try {
  app.use('/api/parent', require('./routes/parent'));
} catch (e) {
  console.error('Parent Routes Error:', e.message);
}

// ✅ Teacher Routes
try {
  app.use('/api/teacher', require('./routes/teacher'));
} catch (e) {
  console.error('Teacher Routes Error:', e.message);
}

// ✅ Therapist Routes
try {
  app.use('/api/therapist', require('./routes/therapist'));
} catch (e) {
  console.error('Therapist Routes Error:', e.message);
}

// ✅ Researcher Routes
try {
  app.use('/api/researcher', require('./routes/researcher'));
} catch (e) {
  console.error('Researcher Routes Error:', e.message);
}

// ✅ Admin Routes
try {
  app.use('/api/admin', require('./routes/admin'));
} catch (e) {
  console.error('Admin Routes Error:', e.message);
}

// ✅ Image Prediction (CNN Face Model)
try {
  app.use('/api/predict', require('./routes/predictRoutes'));
} catch (e) {
  console.error('Predict Routes Error:', e.message);
}

// ✅ Gaze Analysis from base64 (JSON) -> uses Python module via stdin to avoid arg length limits
app.post('/api/gaze/analyze', async (req, res) => {
  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const pythonCode = `
import sys, json
from gaze_analysis import analyze_gaze_from_base64
base64_data = sys.stdin.read()
result = analyze_gaze_from_base64(base64_data)
print(json.dumps(result))
`;

    const python = spawn('python', ['-c', pythonCode], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (d) => { stdout += d.toString(); });
    python.stderr.on('data', (d) => { stderr += d.toString(); });

    // Write the base64 payload to Python stdin
    python.stdin.write(imageBase64);
    python.stdin.end();

    const timeout = setTimeout(() => {
      python.kill();
      console.error('Python gaze analysis timeout after 30s');
      return res.status(500).json({ error: 'Gaze analysis timed out' });
    }, 30000);

    python.on('close', (code) => {
      clearTimeout(timeout);
      if (stderr) {
        console.error('Python gaze stderr:', stderr);
      }
      if (!stdout.trim()) {
        return res.status(500).json({ error: 'No output from gaze analysis process' });
      }
      try {
        const result = JSON.parse(stdout.trim());
        // Return 200 with JSON even if it contains an error to avoid fetch network errors
        if (result && result.error) {
          return res.status(200).json({ error: result.error });
        }
        return res.status(200).json({
          gaze_direction: result.gaze_direction,
          attention_score: result.attention_score,
        });
      } catch (err) {
        console.error('Failed to parse Python gaze output:', err, 'raw:', stdout);
        return res.status(500).json({ error: 'Failed to parse gaze analysis response' });
      }
    });

    python.on('error', (err) => {
      console.error('Failed to start Python for gaze:', err);
      return res.status(500).json({ error: 'Gaze analysis process failed: ' + err.message });
    });
  } catch (err) {
    console.error('Gaze analyze route error:', err);
    return res.status(500).json({ error: 'Gaze analysis failed: ' + err.message });
  }
});

// ✅ MRI Scan Model: accept file upload and return stub JSON
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});

const upload = multer({ storage });

app.post('/api/predict-mri', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // TODO: integrate real MRI prediction pipeline. For now, return a stub prediction
    const diagnosis = Math.random() < 0.5 ? 'ASD' : 'Control';
    const confidence = Number((0.6 + Math.random() * 0.35).toFixed(2));
    const asd_probability = diagnosis === 'ASD' ? confidence : Number((1 - confidence).toFixed(2));
    const control_probability = Number((1 - asd_probability).toFixed(2));

    return res.status(200).json({
      diagnosis,
      confidence,
      asd_probability,
      control_probability,
      filename: req.file.filename,
    });
  } catch (err) {
    console.error('MRI prediction route error:', err);
    return res.status(500).json({ error: 'MRI prediction failed' });
  }
});

// ✅ Gaze Snapshot Analysis: capture and analyze gaze from webcam snapshot

app.post('/api/predict-gaze-snapshot', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const imagePath = path.resolve(req.file.path);
    const gazeWorkerPath = path.resolve(__dirname, 'gaze_worker.py');

    console.log('📷 Processing gaze snapshot:', imagePath);
    console.log('📍 Gaze worker path:', gazeWorkerPath);
    console.log('📝 File exists:', fs.existsSync(imagePath));
    console.log('📝 Worker exists:', fs.existsSync(gazeWorkerPath));

    return new Promise((resolve) => {
      const pythonProcess = spawn('python', [gazeWorkerPath, imagePath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      const timeout = setTimeout(() => {
        pythonProcess.kill();
        console.error('Python process timeout after 30 seconds');
        resolve(res.status(500).json({
          error: 'Gaze analysis timed out',
          gaze_direction: 'unknown',
          attention_score: 0,
          head_pitch: 0,
          head_yaw: 0,
        }));
      }, 30000);

      pythonProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        console.log('📊 Python process exit code:', code);
        console.log('📊 Python stdout length:', output.length);
        console.log('📊 Python stderr length:', errorOutput.length);
        
        if (errorOutput) {
          console.error('Python stderr:', errorOutput);
        }

        if (!output.trim()) {
          console.error('No output from Python process');
          return resolve(res.status(500).json({
            error: 'No output from gaze analysis process. Check Python dependencies.',
            gaze_direction: 'unknown',
            attention_score: 0,
            head_pitch: 0,
            head_yaw: 0,
          }));
        }

        try {
          const result = JSON.parse(output.trim());

          if (result.error) {
            console.error('Gaze analysis error:', result.error);
            return resolve(res.status(400).json({
              error: result.error || 'Gaze analysis failed',
              gaze_direction: 'unknown',
              attention_score: 0,
              head_pitch: 0,
              head_yaw: 0,
            }));
          }

          console.log('✅ Gaze analysis complete:', result);

          resolve(res.status(200).json({
            gaze_direction: result.gaze_direction,
            attention_score: Number(result.attention_score.toFixed(3)),
            head_pitch: Number(result.head_pitch.toFixed(2)),
            head_yaw: Number(result.head_yaw.toFixed(2)),
            filename: req.file.filename,
          }));
        } catch (parseError) {
          console.error('JSON parse error:', parseError, 'output:', output);
          resolve(res.status(500).json({
            error: 'Failed to parse gaze analysis response',
            gaze_direction: 'unknown',
            attention_score: 0,
            head_pitch: 0,
            head_yaw: 0,
          }));
        }
      });

      pythonProcess.on('error', (err) => {
        console.error('Python process error:', err);
        resolve(res.status(500).json({
          error: 'Gaze analysis process failed: ' + err.message,
          gaze_direction: 'unknown',
          attention_score: 0,
          head_pitch: 0,
          head_yaw: 0,
        }));
      });
    });
  } catch (err) {
    console.error('Gaze prediction route error:', err);
    return res.status(500).json({
      error: 'Gaze analysis failed: ' + err.message,
      gaze_direction: 'unknown',
      attention_score: 0,
      head_pitch: 0,
      head_yaw: 0,
    });
  }
});

// ✅ Start Server + Connect DB
const PORT = process.env.PORT || 5000;

async function start() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.warn('⚠ MONGO_URI is missing. Set it in Render environment variables.');
  } else {
    try {
      await mongoose.connect(mongoUri);
      console.log('✅ MongoDB Connected');
    } catch (err) {
      console.error('❌ MongoDB Connection Failed:', err.message);
    }
  }
app.get('/', (req, res) => {
  res.send('✅ ASD Backend Server is Running');
});

  // Fallback JSON for unknown /api routes to avoid HTML responses
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  app.listen(PORT, () => console.log(`🚀 Server Live on Port ${PORT}`));
}

start();
