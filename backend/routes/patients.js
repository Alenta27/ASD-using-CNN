const express = require('express');
const router = express.Router();
const Patient = require('../models/patient');
const User = require('../models/user');
const GazeSession = require('../models/GazeSession');
const Screening = require('../models/screening');
const { calculateMultimodalScore, getScreeningCompleteness } = require('../utils/multimodalFusion');
const { verifyToken } = require('../middlewares/auth');

function sendError(res, status, message, extra = {}) {
    return res.status(status).json({
        success: false,
        message,
        error: message,
        ...extra
    });
}

function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parsePositiveInteger(value) {
    const parsedValue = Number.parseInt(value, 10);
    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

/**
 * @route POST /api/patients
 * @desc Create a new patient for therapist/admin workflows
 * @access Therapist/Admin
 */
router.post('/', verifyToken, async (req, res) => {
    try {
        if (!['therapist', 'admin'].includes(req.user.role)) {
            return sendError(res, 403, 'Only therapists or admins can create patients from this endpoint');
        }

        const patientName = String(req.body.patientName || req.body.name || '').trim();
        const patientGender = String(req.body.patientGender || req.body.gender || '').trim();
        const patientAge = parsePositiveInteger(req.body.patientAge ?? req.body.age);
        const parentName = String(req.body.parentName || '').trim();
        const parentEmail = normalizeEmail(req.body.parentEmail);
        const medicalHistory = String(req.body.medicalHistory || req.body.medical_history || '').trim();
        const linkToGuestEmail = normalizeEmail(req.body.linkToGuestEmail);

        if (!patientName || !patientAge || !patientGender || !parentEmail) {
            return sendError(res, 400, 'Patient name, age, gender, and parent email are required');
        }

        if (!isValidEmail(parentEmail)) {
            return sendError(res, 400, 'Please provide a valid parent email address');
        }

        let parent = await User.findOne({ email: parentEmail });

        if (parent && parent.role !== 'parent') {
            return sendError(res, 409, 'This email is already registered to a non-parent account. Use a different parent email.');
        }

        if (!parent) {
            parent = new User({
                username: parentName || 'Parent',
                email: parentEmail,
                role: 'parent',
                status: 'approved',
                isActive: true
            });
            await parent.save();
        }

        const patient = new Patient({
            name: patientName,
            age: patientAge,
            gender: patientGender,
            medical_history: medicalHistory,
            parent_id: parent._id,
            therapist_user_id: req.user.role === 'therapist' ? req.user.id : undefined,
            screeningStatus: 'pending',
            reportStatus: 'pending',
            registrationDate: new Date()
        });

        await patient.save();

        let linkedSessions = 0;
        if (linkToGuestEmail) {
            const guestSessions = await GazeSession.find({
                'guestInfo.email': linkToGuestEmail,
                isGuest: true
            });

            for (const session of guestSessions) {
                session.patientId = patient._id;
                session.therapistId = req.user.id;
                session.isGuest = false;
                session.sessionType = 'authenticated';
                await session.save();
            }

            linkedSessions = guestSessions.length;
        }

        return res.status(201).json({
            success: true,
            message: linkedSessions > 0
                ? 'Patient added successfully and guest sessions linked'
                : 'Patient added successfully',
            patient,
            linkedSessions
        });
    } catch (error) {
        console.error('❌ Patient creation error:', error);

        if (error.code === 11000 && error.keyPattern?.email) {
            return sendError(res, 409, 'This email is already in use. Please use a different parent email.');
        }

        return sendError(res, 500, error.message || 'Failed to create patient');
    }
});

/**
 * @route POST /api/patients/register
 * @desc Register a new patient with auto-generated CORTEXA ID
 * @access Parent/Admin
 */
router.post('/register', verifyToken, async (req, res) => {
    try {
        const { name, age, gender, dateOfBirth, grade, medical_history, preferredLanguage } = req.body;

        // Validate required fields
        if (!name || !age || !gender) {
            return sendError(res, 400, 'Name, age, and gender are required');
        }

        // Get parent ID from token
        const parentId = req.user.id;

        // Create new patient
        const patient = new Patient({
            name,
            age,
            gender,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            grade,
            medical_history,
            parent_id: parentId,
            preferredLanguage: preferredLanguage || 'en-US',
            registrationDate: new Date()
        });

        await patient.save();

        console.log(`✅ New patient registered: ${patient.cortexaId} - ${name}`);

        res.status(201).json({
            success: true,
            message: 'Patient registered successfully',
            patient: {
                id: patient._id,
                cortexaId: patient.cortexaId,
                name: patient.name,
                age: patient.age,
                gender: patient.gender,
                registrationDate: patient.registrationDate
            }
        });

    } catch (error) {
        console.error('❌ Patient registration error:', error);
        return sendError(res, 500, error.message || 'Failed to register patient', {
            details: error.message
        });
    }
});

/**
 * @route GET /api/patients
 * @desc Get all patients for current user (parent/admin/teacher)
 * @access Authenticated
 */
router.get('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        let query = {};

        // Filter based on role
        if (userRole === 'parent') {
            query.parent_id = userId;
        } else if (userRole === 'teacher') {
            query.assignedTeacherId = userId;
        } else if (userRole === 'therapist') {
            query.therapist_user_id = userId;
        } else if (userRole !== 'admin') {
            return sendError(res, 403, 'Unauthorized access');
        }

        const patients = await Patient.find(query)
            .populate('parent_id', 'name email')
            .populate('assignedTeacherId', 'name email')
            .populate('therapist_user_id', 'name email')
            .sort({ registrationDate: -1 });

        // Enrich with screening completeness data
        const enrichedPatients = await Promise.all(patients.map(async (patient) => {
            const completeness = await getScreeningCompleteness(patient._id);
            return {
                ...patient.toObject(),
                screeningCompleteness: completeness
            };
        }));

        res.json({
            success: true,
            count: enrichedPatients.length,
            patients: enrichedPatients
        });

    } catch (error) {
        console.error('❌ Error fetching patients:', error);
        return sendError(res, 500, error.message || 'Failed to fetch patients');
    }
});

/**
 * @route GET /api/patients/:id
 * @desc Get single patient details with screening history
 * @access Authenticated
 */
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const patientId = req.params.id;
        
        const patient = await Patient.findById(patientId)
            .populate('parent_id', 'name email phone')
            .populate('assignedTeacherId', 'name email')
            .populate('therapist_user_id', 'name email');

        if (!patient) {
            return sendError(res, 404, 'Patient not found');
        }

        // Authorization check
        const userId = req.user.id;
        const userRole = req.user.role;
        
        const isAuthorized = 
            userRole === 'admin' ||
            (userRole === 'parent' && patient.parent_id._id.toString() === userId) ||
            (userRole === 'teacher' && patient.assignedTeacherId?.toString() === userId) ||
            (userRole === 'therapist' && patient.therapist_user_id?.toString() === userId);

        if (!isAuthorized) {
            return sendError(res, 403, 'Access denied');
        }

        // Get screening history
        const screenings = await Screening.find({ patientId })
            .sort({ createdAt: -1 })
            .limit(50);

        // Get screening completeness
        const completeness = await getScreeningCompleteness(patientId);

        res.json({
            success: true,
            patient: patient.toObject(),
            screenings,
            screeningCompleteness: completeness,
            totalScreenings: screenings.length
        });

    } catch (error) {
        console.error('❌ Error fetching patient:', error);
        return sendError(res, 500, error.message || 'Failed to fetch patient details');
    }
});

/**
 * @route PUT /api/patients/:id
 * @desc Update patient information
 * @access Parent/Admin
 */
router.put('/:id', verifyToken, async (req, res) => {
    try {
        const patientId = req.params.id;
        const updates = req.body;

        // Remove fields that shouldn't be updated directly
        delete updates.cortexaId;
        delete updates.parent_id;
        delete updates._id;
        delete updates.multimodalScore;
        delete updates.multimodalRiskLevel;

        const patient = await Patient.findById(patientId);
        if (!patient) {
            return sendError(res, 404, 'Patient not found');
        }

        // Authorization check
        const userId = req.user.id;
        const userRole = req.user.role;
        
        const isAuthorized = 
            userRole === 'admin' ||
            (userRole === 'parent' && patient.parent_id.toString() === userId);

        if (!isAuthorized) {
            return sendError(res, 403, 'Access denied');
        }

        // Update patient
        Object.assign(patient, updates);
        await patient.save();

        res.json({
            success: true,
            message: 'Patient updated successfully',
            patient
        });

    } catch (error) {
        console.error('❌ Error updating patient:', error);
        return sendError(res, 500, error.message || 'Failed to update patient');
    }
});

/**
 * @route DELETE /api/patients/:id
 * @desc Delete patient and all associated screenings
 * @access Admin only
 */
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false,
                error: 'Admin access required' 
            });
        }

        const patientId = req.params.id;
        
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ 
                success: false,
                error: 'Patient not found' 
            });
        }

        // Delete all associated screenings
        const deletedScreenings = await Screening.deleteMany({ patientId });
        
        // Delete patient
        await Patient.findByIdAndDelete(patientId);

        console.log(`🗑️ Deleted patient ${patient.cortexaId} and ${deletedScreenings.deletedCount} screenings`);

        res.json({
            success: true,
            message: 'Patient and associated screenings deleted',
            deletedScreenings: deletedScreenings.deletedCount
        });

    } catch (error) {
        console.error('❌ Error deleting patient:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to delete patient' 
        });
    }
});

/**
 * @route GET /api/patients/:id/multimodal-report
 * @desc Generate multimodal ASD screening report for patient
 * @access Authenticated (parent/admin/teacher/therapist)
 */
router.get('/:id/multimodal-report', verifyToken, async (req, res) => {
    try {
        const patientId = req.params.id;
        
        const patient = await Patient.findById(patientId)
            .populate('parent_id', 'name email phone')
            .populate('assignedTeacherId', 'name email')
            .populate('therapist_user_id', 'name email');

        if (!patient) {
            return res.status(404).json({ 
                success: false,
                error: 'Patient not found' 
            });
        }

        // Authorization check
        const userId = req.user.id;
        const userRole = req.user.role;
        
        const isAuthorized = 
            userRole === 'admin' ||
            (userRole === 'parent' && patient.parent_id._id.toString() === userId) ||
            (userRole === 'teacher' && patient.assignedTeacherId?.toString() === userId) ||
            (userRole === 'therapist' && patient.therapist_user_id?.toString() === userId);

        if (!isAuthorized) {
            return res.status(403).json({ 
                success: false,
                error: 'Access denied' 
            });
        }

        // Calculate multimodal score
        const fusionResult = await calculateMultimodalScore(patientId);

        if (!fusionResult.success) {
            return res.status(400).json(fusionResult);
        }

        // Update patient record with latest multimodal results
        patient.multimodalScore = fusionResult.finalScore;
        patient.multimodalRiskLevel = fusionResult.riskLevel;
        patient.lastScreeningDate = new Date();
        await patient.save();

        // Prepare comprehensive report
        const report = {
            success: true,
            reportId: `RPT_${Date.now()}`,
            generatedAt: new Date(),
            patient: {
                cortexaId: patient.cortexaId,
                name: patient.name,
                age: patient.age,
                gender: patient.gender,
                registrationDate: patient.registrationDate
            },
            multimodalAnalysis: {
                finalScore: fusionResult.finalScore,
                riskLevel: fusionResult.riskLevel,
                confidence: fusionResult.confidence,
                completeness: fusionResult.completeness
            },
            screeningBreakdown: fusionResult.breakdown,
            availableModalities: fusionResult.availableModalities,
            missingModalities: fusionResult.missingModalities,
            recommendation: fusionResult.recommendation,
            totalScreenings: fusionResult.totalScreenings
        };

        res.json(report);

    } catch (error) {
        console.error('❌ Error generating multimodal report:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to generate multimodal report' 
        });
    }
});

/**
 * @route GET /api/patients/search/by-cortexa-id/:cortexaId
 * @desc Search patient by CORTEXA ID
 * @access Authenticated
 */
router.get('/search/by-cortexa-id/:cortexaId', verifyToken, async (req, res) => {
    try {
        const { cortexaId } = req.params;
        
        const patient = await Patient.findOne({ cortexaId })
            .populate('parent_id', 'name email');

        if (!patient) {
            return res.status(404).json({ 
                success: false,
                error: 'Patient not found' 
            });
        }

        // Authorization check (simplified - expand as needed)
        const userId = req.user.id;
        const userRole = req.user.role;
        
        if (userRole !== 'admin' && patient.parent_id._id.toString() !== userId) {
            return sendError(res, 403, 'Access denied');
        }

        res.json({
            success: true,
            patient
        });

    } catch (error) {
        console.error('❌ Error searching patient:', error);
        res.status(500).json({ 
            success: false,
            error: 'Search failed' 
        });
    }
});

/**
 * @route GET /api/patients/:id/screenings/:type
 * @desc Get all screenings of a specific type for a patient
 * @access Authenticated
 */
router.get('/:id/screenings/:type', verifyToken, async (req, res) => {
    try {
        const { id: patientId, type: screeningType } = req.params;
        
        // Verify patient exists and user has access
        const patient = await Patient.findById(patientId);
        if (!patient) {
            return res.status(404).json({ 
                success: false,
                error: 'Patient not found' 
            });
        }

        const screenings = await Screening.find({ 
            patientId, 
            screeningType 
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: screenings.length,
            screeningType,
            screenings
        });

    } catch (error) {
        console.error('❌ Error fetching screenings:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch screenings' 
        });
    }
});

module.exports = router;
