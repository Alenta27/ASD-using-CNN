const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { verifyToken, therapistCheck } = require('../middlewares/auth');
const GazeSession = require('../models/GazeSession');
const Patient = require('../models/patient');

// Ensure gaze uploads directory exists
const gazeUploadsDir = path.join(__dirname, '../uploads/gaze');
if (!fs.existsSync(gazeUploadsDir)) {
    fs.mkdirSync(gazeUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, gazeUploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'gaze-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// Shared logic for snapshot upload
async function handleSnapshotUpload(req, res, sessionId, analyze) {
    console.log(`📸 Handling snapshot upload for session: ${sessionId}`);
    if (!req.file) {
        console.error('❌ No file received in handleSnapshotUpload');
        return res.status(400).json({ error: 'No image uploaded' });
    }

    const session = await GazeSession.findById(sessionId);
    if (!session) {
        console.error(`❌ Session ${sessionId} not found`);
        return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'active') {
        return res.status(400).json({ error: 'Session is not active' });
    }

    const snapshotData = {
        imagePath: `/uploads/gaze/${req.file.filename}`,
        timestamp: new Date(),
        gazeDirection: req.body.gazeDirection || 'unknown',
        attentionScore: parseFloat(req.body.attentionScore) || 0,
        headPitch: parseFloat(req.body.headPitch) || 0,
        headYaw: parseFloat(req.body.headYaw) || 0,
        sessionId: sessionId.toString()
    };

    if (analyze === 'true') {
        const imagePath = path.resolve(req.file.path);
        const gazeWorkerPath = path.resolve(__dirname, '../gaze_worker.py');

        const result = await new Promise((resolve) => {
            const pythonProcess = spawn('py', ['-3.10', gazeWorkerPath, imagePath]);
            let output = '';
            let errorOutput = '';
            
            pythonProcess.stdout.on('data', (data) => output += data.toString());
            pythonProcess.stderr.on('data', (data) => errorOutput += data.toString());
            
            const timeout = setTimeout(() => {
                pythonProcess.kill();
                console.error('Snapshot analysis timed out');
                resolve({ error: 'Analysis timed out' });
            }, 60000);

            pythonProcess.on('close', (code) => {
                clearTimeout(timeout);
                try {
                    resolve(JSON.parse(output.trim()));
                } catch (e) {
                    console.error('Snapshot Python error:', errorOutput);
                    resolve({ error: 'Analysis failed' });
                }
            });
        });

        if (result && !result.error) {
            snapshotData.gazeDirection = result.gaze_direction;
            snapshotData.attentionScore = result.attention_score;
            snapshotData.headPitch = result.head_pitch;
            snapshotData.headYaw = result.head_yaw;
        }
    }

    session.snapshots.push(snapshotData);
    await session.save();

    // Emit real-time update via Socket.io
    const io = req.app.get('io');
    if (io) {
        io.to(sessionId.toString()).emit('new-snapshot', snapshotData);
    }

    return snapshotData;
}

// Analyze a single snapshot without saving to session
router.post('/analyze', async (req, res) => {
    let tempFilePath = null;
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64) return res.status(400).json({ error: 'No image data' });

        // Ensure gaze uploads directory exists
        if (!fs.existsSync(gazeUploadsDir)) {
            fs.mkdirSync(gazeUploadsDir, { recursive: true });
        }

        // Save base64 to temp file
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        tempFilePath = path.join(gazeUploadsDir, `temp-${Date.now()}-${Math.round(Math.random() * 1E9)}.png`);
        fs.writeFileSync(tempFilePath, base64Data, 'base64');

        const gazeWorkerPath = path.resolve(__dirname, '../gaze_worker.py');
        
        const result = await new Promise((resolve) => {
            const pythonProcess = spawn('py', ['-3.10', gazeWorkerPath, tempFilePath]);
            let output = '';
            let errorOutput = '';
            
            pythonProcess.stdout.on('data', (data) => output += data.toString());
            pythonProcess.stderr.on('data', (data) => errorOutput += data.toString());
            
            const timeout = setTimeout(() => {
                pythonProcess.kill();
                resolve({ error: 'Analysis timed out after 60s' });
            }, 60000);

            pythonProcess.on('close', (code) => {
                clearTimeout(timeout);
                try {
                    const parsed = JSON.parse(output.trim());
                    resolve(parsed);
                } catch (e) {
                    console.error('Python error output:', errorOutput);
                    resolve({ error: 'Analysis failed to parse output', details: errorOutput });
                }
            });
        });

        res.status(200).json(result);
    } catch (err) {
        console.error('Gaze analyze route error:', err);
        res.status(500).json({ error: 'Gaze analysis failed: ' + err.message });
    } finally {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try { fs.unlinkSync(tempFilePath); } catch (e) {}
        }
    }
});

// Middleware to allow either authenticated user or guest (via sessionId)
const verifyGuestOrUser = async (req, res, next) => {
    // 1. Try Token
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        return verifyToken(req, res, next);
    }

    // 2. Try Guest Session ID from body or params or query
    const sessionId = req.params.sessionId || req.body.sessionId || req.query.sessionId;
    console.log(`🔍 Verifying access for sessionId: ${sessionId}`);

    if (sessionId) {
        try {
            const session = await GazeSession.findById(sessionId);
            if (session && session.isGuest && session.status === 'active') {
                req.isGuest = true;
                req.sessionId = sessionId;
                return next();
            } else if (session) {
                console.log(`⚠️ Session found but not eligible. Guest: ${session.isGuest}, Status: ${session.status}`);
            }
        } catch (err) {
            console.error("Guest verification error:", err);
        }
    }

    console.log('❌ Guest verification failed');
    return res.status(401).json({ error: 'Unauthorized: Authentication or Guest Session required' });
};

// Start a guest gaze analysis session
router.post('/session/guest/start', async (req, res) => {
    try {
        const { childName, parentName, email } = req.body;
        console.log('🚀 Starting guest session request:', { childName, parentName, email });
        
        const session = new GazeSession({
            isGuest: true,
            guestInfo: {
                childName: childName || 'Guest Child',
                parentName: parentName || 'Guest Parent',
                email: email || ''
            },
            status: 'active',
            snapshots: []
        });

        await session.save();
        console.log('✅ Guest session created:', session._id);
        res.status(201).json(session);
    } catch (err) {
        console.error('❌ Error starting guest gaze session:', err);
        res.status(500).json({ error: 'Failed to start guest gaze session: ' + err.message });
    }
});

// Start a new gaze analysis session (Authenticated)
router.post('/session/start', verifyToken, async (req, res) => {
    try {
        const { patientId } = req.body;
        
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        // If the user is a parent, assign the session to the patient's assigned therapist
        let therapistId = req.user.id;
        if (req.user.role === 'parent') {
            if (!patient.therapist_user_id) {
                return res.status(400).json({ error: 'No therapist assigned to this patient. Please contact support.' });
            }
            therapistId = patient.therapist_user_id;
        }

        const session = new GazeSession({
            patientId,
            therapistId,
            status: 'active',
            snapshots: []
        });

        await session.save();
        res.status(201).json(session);
    } catch (err) {
        console.error('Error starting gaze session:', err);
        res.status(500).json({ error: 'Failed to start gaze session' });
    }
});

// Upload a snapshot to an active session
router.post('/snapshot/:sessionId', verifyGuestOrUser, upload.single('image'), async (req, res) => {
    try {
        const result = await handleSnapshotUpload(req, res, req.params.sessionId, req.body.analyze);
        if (result) res.status(200).json(result);
    } catch (err) {
        console.error('Error uploading gaze snapshot:', err);
        res.status(500).json({ error: 'Failed to upload snapshot' });
    }
});

// Alias for snapshot upload to match user request
router.post('/session/snapshot', verifyGuestOrUser, upload.single('image'), async (req, res) => {
    try {
        const { sessionId, analyze } = req.body;
        if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
        
        const result = await handleSnapshotUpload(req, res, sessionId, analyze);
        if (result) res.status(200).json(result);
    } catch (err) {
        console.error('Error uploading gaze snapshot:', err);
        res.status(500).json({ error: 'Failed to upload snapshot' });
    }
});

// Alias for snapshot upload to match user request (legacy/extra)
router.post('/upload', verifyGuestOrUser, upload.single('image'), async (req, res) => {
    try {
        const { sessionId, analyze } = req.body;
        if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
        
        const result = await handleSnapshotUpload(req, res, sessionId, analyze);
        if (result) res.status(200).json(result);
    } catch (err) {
        console.error('Error uploading gaze snapshot:', err);
        res.status(500).json({ error: 'Failed to upload snapshot' });
    }
});

// Send session for review (bulk upload)
router.post('/session/send-for-review', verifyGuestOrUser, async (req, res) => {
    try {
        const { sessionId, snapshots, endTime } = req.body;
        console.log(`📩 Received send-for-review for session: ${sessionId}`);
        console.log(`📦 Snapshots in request: ${snapshots ? snapshots.length : 0}`);

        if (!sessionId) {
            return res.status(400).json({ error: 'Missing session ID' });
        }

        const session = await GazeSession.findById(sessionId);
        if (!session) {
            console.error(`❌ Session ${sessionId} not found in send-for-review`);
            return res.status(404).json({ error: 'Session not found' });
        }

        // Save each snapshot image to disk and add to session (if provided)
        if (snapshots && Array.isArray(snapshots) && snapshots.length > 0) {
            console.log(`💾 Processing ${snapshots.length} snapshots for session ${sessionId}`);
            const processedSnapshots = [];
            
            for (const snap of snapshots) {
                try {
                    // Avoid duplicating snapshots that might have been uploaded live
                    const isDuplicate = session.snapshots.some(existing => 
                        existing.timestamp && snap.timestamp && 
                        new Date(existing.timestamp).getTime() === new Date(snap.timestamp).getTime()
                    );
                    
                    if (isDuplicate) {
                        console.log(`⏭️ Skipping duplicate snapshot from ${snap.timestamp}`);
                        continue;
                    }

                    const base64Data = snap.image.replace(/^data:image\/\w+;base64,/, "");
                    const filename = `gaze-${Date.now()}-${Math.round(Math.random() * 1E9)}.png`;
                    const filePath = path.join(gazeUploadsDir, filename);
                    
                    fs.writeFileSync(filePath, base64Data, 'base64');
                    
                    processedSnapshots.push({
                        imagePath: `/uploads/gaze/${filename}`,
                        timestamp: snap.timestamp || new Date(),
                        attentionScore: snap.attentionScore || 0,
                        gazeDirection: snap.gazeDirection || 'unknown'
                    });
                } catch (err) {
                    console.error(`❌ Error processing snapshot:`, err.message);
                }
            }

            console.log(`✅ Processed ${processedSnapshots.length} snapshots for session ${sessionId}`);
            session.snapshots.push(...processedSnapshots);
        }
        
        session.status = 'pending_review';
        session.endTime = endTime || new Date();
        await session.save();
        console.log(`✅ Session ${sessionId} updated to pending_review`);

        res.status(200).json({ message: 'Session submitted for review', session });
    } catch (err) {
        console.error('❌ Error in send-for-review:', err);
        res.status(500).json({ error: 'Failed to submit session for review: ' + err.message });
    }
});

// End a gaze session
router.post('/session/end/:sessionId', verifyToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = await GazeSession.findByIdAndUpdate(
            sessionId, 
            { status: 'completed', endTime: new Date() },
            { new: true }
        );
        res.status(200).json(session);
    } catch (err) {
        res.status(500).json({ error: 'Failed to end session' });
    }
});

// Get active sessions for a therapist
router.get('/sessions/active', verifyToken, therapistCheck, async (req, res) => {
    try {
        const sessions = await GazeSession.find({ 
            $or: [
                { therapistId: req.user.id },
                { isGuest: true }
            ],
            status: 'active'
        }).populate('patientId', 'name');
        res.status(200).json(sessions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch active sessions' });
    }
});

// Get sessions pending review for a therapist
router.get('/sessions/pending-review', verifyToken, therapistCheck, async (req, res) => {
    try {
        const sessions = await GazeSession.find({ 
            $or: [
                { therapistId: req.user.id },
                { isGuest: true }
            ],
            status: { $in: ['pending_review', 'completed'] }
        }).populate('patientId', 'name age gender');
        res.status(200).json(sessions);
    } catch (err) {
        console.error('Error fetching pending review sessions:', err);
        res.status(500).json({ error: 'Failed to fetch pending review sessions' });
    }
});

// Update notes for a specific snapshot
router.put('/snapshot/:sessionId/:snapshotId/notes', verifyToken, therapistCheck, async (req, res) => {
    try {
        const { sessionId, snapshotId } = req.params;
        const { notes } = req.body;

        const session = await GazeSession.findById(sessionId);
        if (!session) return res.status(404).json({ error: 'Session not found' });

        const snapshot = session.snapshots.id(snapshotId);
        if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });

        snapshot.notes = notes;
        await session.save();

        res.status(200).json(snapshot);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update notes' });
    }
});

// Get received gaze snapshots for a specific session (Therapist View)
router.get('/therapist/sessions/:sessionId', verifyToken, therapistCheck, async (req, res) => {
    try {
        const session = await GazeSession.findById(req.params.sessionId).populate('patientId', 'name age gender');
        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.status(200).json(session);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch session details' });
    }
});

module.exports = router;
