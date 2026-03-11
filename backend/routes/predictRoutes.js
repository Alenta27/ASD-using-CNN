const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const trackScreening = require('../utils/trackScreening');

const upload = multer({ dest: 'uploads/' });
const router = express.Router();

router.post('/', upload.single('image'), (req, res) => {
    console.log('🔷 [Facial Prediction] Request received');
    
    if (!req.file) {
        console.log('❌ [Facial Prediction] No file uploaded');
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    const imagePath = req.file.path;
    const patientId = req.body.patientId || null;
    
    console.log('📸 [Facial Prediction] File uploaded:', {
        originalName: req.file.originalname,
        path: imagePath,
        size: req.file.size,
        mimetype: req.file.mimetype,
        patientId: patientId
    });

    // Verify file exists and is readable
    if (!fs.existsSync(imagePath)) {
        console.error('❌ [Facial Prediction] Uploaded file not found:', imagePath);
        return res.status(500).json({ error: 'File upload failed.' });
    }

    const pythonScriptPath = path.join(__dirname, '..', 'ai_model', 'predict.py');
    console.log('🐍 [Facial Prediction] Spawning Python process:', pythonScriptPath);

    const pythonProcess = spawn('python', [pythonScriptPath, imagePath]);

    let predictionData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
        predictionData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        // Capture warnings but don't treat them as errors
        errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
        console.log(`🐍 [Facial Prediction] Python process exited with code ${code}`);
        
        // Log any stderr output (warnings, info messages)
        if (errorData) {
            console.log('📋 [Facial Prediction] Python stderr output:', errorData.substring(0, 200));
        }

        // Check the exit code
        if (code !== 0) {
            console.error('❌ [Facial Prediction] Python script failed');
            console.error('Error details:', errorData);
            return res.status(500).json({ error: 'Prediction script failed. Please try again.' });
        }

        try {
            // Parse the prediction result
            console.log('📊 [Facial Prediction] Raw Python output:', predictionData.substring(0, 200));
            const predictionResult = JSON.parse(predictionData);
            
            // Check if there's an error in the result (like "No face detected")
            if (predictionResult.error) {
                console.log('⚠️  [Facial Prediction] Prediction error:', predictionResult.error);
                return res.status(400).json({ error: predictionResult.error });
            }
            
            // Map prediction to risk level
            const riskMap = { 
                'ASD Detected': 'high_risk', 
                'No ASD': 'low_risk',
                'ASD': 'high_risk', 
                'Non-ASD': 'low_risk' 
            };
            const resultLabel = predictionResult.prediction;
            const resultScore = predictionResult.confidence || 0.5;
            
            console.log('✅ [Facial Prediction] Success:', {
                prediction: resultLabel,
                confidence: resultScore,
                riskLevel: riskMap[resultLabel]
            });
            
            // Track this facial screening in the central Screening collection
            trackScreening({
                patientId: patientId,
                userId: req.user?.id || null,
                screeningType: 'facial',
                resultScore: resultScore,
                resultLabel: resultLabel,
                confidenceScore: resultScore,
                result: riskMap[resultLabel] || null,
                fileUrl: `/uploads/${req.file.filename}`
            });
            
            res.json(predictionResult);
        } catch (e) {
            console.error('❌ [Facial Prediction] Failed to parse prediction result:', e);
            console.error('Raw output from Python:', predictionData);
            res.status(500).json({ error: 'Failed to parse prediction result. Please try again.' });
        }
    });
});

module.exports = router;
