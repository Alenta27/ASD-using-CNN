const Screening = require('../models/screening');
const Patient = require('../models/patient');

/**
 * Records a completed screening event in the central Screening collection.
 * Call this whenever any module finishes a screening — it is fire-and-forget
 * (errors are logged but never propagate to the calling route).
 *
 * @param {Object} opts
 * @param {string}      [opts.patientId]      - MongoDB ObjectId of the patient (NEW multimodal system)
 * @param {string|null} [opts.userId]         - MongoDB ObjectId of the user (null for guests, backward compatibility)
 * @param {string}      opts.screeningType    - 'facial' | 'mri' | 'questionnaire' | 'behavioral' | 'gaze' | 'speech'
 * @param {number}      [opts.resultScore]    - Probability score 0-1 (NEW for multimodal)
 * @param {string}      [opts.resultLabel]    - 'ASD' | 'No ASD' | 'Low Risk' | 'Moderate Risk' | 'High Risk'
 * @param {number}      [opts.confidenceScore] - Model confidence 0-1
 * @param {string}      [opts.result]         - 'low_risk' | 'medium_risk' | 'high_risk' (legacy)
 * @param {string}      [opts.childName]      - Child's name (optional, for guest sessions)
 * @param {Object}      [opts.metrics]        - Module-specific metrics object
 * @param {string}      [opts.notes]          - Free-text notes (optional)
 * @param {string}      [opts.fileUrl]        - Associated file URL
 */
async function trackScreening({ 
    patientId, 
    userId, 
    screeningType, 
    resultScore, 
    resultLabel,
    confidenceScore,
    result = null, 
    childName = null, 
    metrics = null,
    notes = null,
    fileUrl = null
}) {
    try {
        const screeningData = {
            screeningType: screeningType || undefined,
            status: 'completed'
        };

        // Patient-based tracking (new multimodal system)
        if (patientId) {
            screeningData.patientId = patientId;
            
            // Update patient's last screening date and completed screenings
            try {
                await Patient.findByIdAndUpdate(patientId, {
                    lastScreeningDate: new Date(),
                    $addToSet: { completedScreenings: screeningType }
                });
            } catch (err) {
                console.error('⚠️  Failed to update patient screening record:', err.message);
            }
        }

        // Legacy user-based tracking (backward compatibility)
        if (userId) {
            screeningData.userId = userId;
        }

        // New multimodal fields
        if (resultScore !== undefined && resultScore !== null) {
            screeningData.resultScore = resultScore;
        }
        if (resultLabel) {
            screeningData.resultLabel = resultLabel;
        }
        if (confidenceScore !== undefined && confidenceScore !== null) {
            screeningData.confidenceScore = confidenceScore;
        }

        // Legacy result field
        if (result) {
            screeningData.result = result;
        }

        // Optional fields
        if (childName) {
            screeningData.childName = childName;
        }
        if (notes) {
            screeningData.notes = notes;
        }
        if (fileUrl) {
            screeningData.fileUrl = fileUrl;
        }

        // Module-specific metrics
        if (metrics) {
            if (screeningType === 'gaze') {
                screeningData.gazeMetrics = metrics;
            } else if (screeningType === 'behavioral') {
                screeningData.behavioralMetrics = metrics;
            } else if (screeningType === 'speech') {
                screeningData.speechMetrics = metrics;
            } else if (screeningType === 'mri') {
                screeningData.mriMetrics = metrics;
            }
        }

        const doc = new Screening(screeningData);
        await doc.save();
        
        console.log(`✅ [trackScreening] Recorded ${screeningType} screening` + 
            (patientId ? ` for patient: ${patientId}` : '') + 
            (userId ? ` (userId: ${userId})` : ' (guest)'));
        
        return doc;
    } catch (err) {
        // Never throw — tracking must never break the module's own response
        console.error(`⚠️  [trackScreening] Failed to record ${screeningType} screening:`, err.message);
        return null;
    }
}

module.exports = trackScreening;
