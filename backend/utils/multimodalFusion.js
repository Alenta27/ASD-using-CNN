/**
 * Multimodal Decision Fusion Service
 * Combines results from multiple ASD screening modules into a final diagnosis
 * 
 * Fusion Algorithm:
 * FinalScore = (MRI × 0.30) + (Facial × 0.20) + (Questionnaire × 0.20) + 
 *              (Behavioral × 0.15) + (Gaze × 0.10) + (Speech × 0.05)
 */

const Screening = require('../models/screening');

// Weights for each screening modality (must sum to 1.0)
const FUSION_WEIGHTS = {
    mri: 0.30,           // MRI brain imaging - highest weight
    facial: 0.20,        // Facial feature analysis
    questionnaire: 0.20, // Parent/caregiver questionnaire
    behavioral: 0.15,    // Behavioral assessment
    gaze: 0.10,          // Eye gaze tracking
    speech: 0.05         // Speech/voice analysis
};

// Risk level thresholds
const RISK_THRESHOLDS = {
    LOW: 0.33,      // Score < 0.33 = Low Risk
    MODERATE: 0.67  // Score 0.33-0.67 = Moderate Risk, > 0.67 = High Risk
};

/**
 * Calculate multimodal ASD risk score for a patient
 * @param {string} patientId - MongoDB ObjectId of the patient
 * @returns {Object} Fusion result with score, risk level, and breakdown
 */
async function calculateMultimodalScore(patientId) {
    try {
        // Fetch all screening results for this patient
        const screenings = await Screening.find({ 
            patientId, 
            status: 'completed',
            resultScore: { $exists: true, $ne: null }
        }).sort({ createdAt: -1 });

        if (screenings.length === 0) {
            return {
                success: false,
                error: 'No completed screenings found for this patient',
                patientId
            };
        }

        // Get the most recent result for each screening type
        const latestScreenings = {};
        const availableModalities = [];
        
        for (const screening of screenings) {
            const type = screening.screeningType;
            if (!latestScreenings[type]) {
                latestScreenings[type] = screening;
                if (FUSION_WEIGHTS[type]) {
                    availableModalities.push(type);
                }
            }
        }

        // Calculate weighted sum
        let totalWeightedScore = 0;
        let totalAvailableWeight = 0;
        const breakdown = {};

        for (const modality of availableModalities) {
            const screening = latestScreenings[modality];
            const weight = FUSION_WEIGHTS[modality];
            const score = screening.resultScore;

            totalWeightedScore += score * weight;
            totalAvailableWeight += weight;

            breakdown[modality] = {
                score: score,
                weight: weight,
                contribution: (score * weight).toFixed(4),
                label: screening.resultLabel,
                confidenceScore: screening.confidenceScore,
                date: screening.createdAt,
                screeningId: screening.screeningId
            };
        }

        // Normalize score based on available weights
        const normalizedScore = totalAvailableWeight > 0 
            ? totalWeightedScore / totalAvailableWeight 
            : 0;

        // Determine risk level
        let riskLevel;
        if (normalizedScore < RISK_THRESHOLDS.LOW) {
            riskLevel = 'Low';
        } else if (normalizedScore < RISK_THRESHOLDS.MODERATE) {
            riskLevel = 'Moderate';
        } else {
            riskLevel = 'High';
        }

        // Generate recommendation
        const recommendation = generateRecommendation(riskLevel, availableModalities);

        // Calculate completeness percentage
        const totalModalities = Object.keys(FUSION_WEIGHTS).length;
        const completeness = (availableModalities.length / totalModalities * 100).toFixed(1);

        return {
            success: true,
            patientId,
            finalScore: Number(normalizedScore.toFixed(4)),
            riskLevel,
            confidence: calculateConfidence(latestScreenings, availableModalities),
            breakdown,
            availableModalities,
            missingModalities: Object.keys(FUSION_WEIGHTS).filter(m => !availableModalities.includes(m)),
            completeness: Number(completeness),
            totalScreenings: screenings.length,
            recommendation,
            calculatedAt: new Date()
        };

    } catch (error) {
        console.error('❌ Multimodal fusion error:', error);
        return {
            success: false,
            error: error.message,
            patientId
        };
    }
}

/**
 * Calculate overall confidence based on individual screening confidences
 */
function calculateConfidence(screenings, modalities) {
    let totalConfidence = 0;
    let count = 0;

    for (const modality of modalities) {
        if (screenings[modality] && screenings[modality].confidenceScore) {
            totalConfidence += screenings[modality].confidenceScore;
            count++;
        }
    }

    return count > 0 ? Number((totalConfidence / count).toFixed(4)) : null;
}

/**
 * Generate clinical recommendation based on risk level and available data
 */
function generateRecommendation(riskLevel, availableModalities) {
    const recommendations = {
        Low: {
            title: 'Low Risk - Continue Monitoring',
            actions: [
                'Results indicate low probability of ASD',
                'Continue routine developmental monitoring',
                'Encourage healthy social and communication development',
                'Consider follow-up screening in 6-12 months if concerns arise'
            ]
        },
        Moderate: {
            title: 'Moderate Risk - Further Evaluation Recommended',
            actions: [
                'Results indicate moderate probability of ASD',
                'Schedule comprehensive clinical evaluation with specialist',
                'Complete any missing screening modalities for better accuracy',
                'Implement early intervention strategies',
                'Regular follow-up assessments recommended'
            ]
        },
        High: {
            title: 'High Risk - Immediate Professional Assessment Required',
            actions: [
                'Results indicate high probability of ASD',
                'URGENT: Schedule immediate evaluation with ASD specialist',
                'Begin early intervention services without delay',
                'Connect with support services and resources',
                'Comprehensive diagnostic assessment strongly recommended'
            ]
        }
    };

    const baseRecommendation = recommendations[riskLevel];

    // Add modality-specific recommendations
    if (availableModalities.length < 4) {
        baseRecommendation.actions.push(
            `⚠️ Note: Only ${availableModalities.length} of 6 screening modalities completed. Complete remaining screenings for more accurate assessment.`
        );
    }

    return baseRecommendation;
}

/**
 * Get fusion weights (for documentation/UI display)
 */
function getFusionWeights() {
    return FUSION_WEIGHTS;
}

/**
 * Get screening completeness for a patient
 */
async function getScreeningCompleteness(patientId) {
    try {
        const screenings = await Screening.find({ 
            patientId, 
            status: 'completed' 
        }).distinct('screeningType');

        const completed = screenings.filter(type => FUSION_WEIGHTS[type]);
        const totalModalities = Object.keys(FUSION_WEIGHTS).length;
        
        return {
            completed: completed.length,
            total: totalModalities,
            percentage: Number((completed.length / totalModalities * 100).toFixed(1)),
            completedModalities: completed,
            missingModalities: Object.keys(FUSION_WEIGHTS).filter(m => !completed.includes(m))
        };
    } catch (error) {
        console.error('Error calculating completeness:', error);
        return null;
    }
}

module.exports = {
    calculateMultimodalScore,
    getFusionWeights,
    getScreeningCompleteness,
    FUSION_WEIGHTS,
    RISK_THRESHOLDS
};
