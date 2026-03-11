const mongoose = require('mongoose');

// Counter for generating unique CORTEXA IDs
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

// Generate unique CORTEXA_XXX ID
async function getNextPatientId() {
    const counter = await Counter.findByIdAndUpdate(
        { _id: 'patientId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    const paddedNumber = String(counter.seq).padStart(3, '0');
    return `CORTEXA_${paddedNumber}`;
}

const patientSchema = new mongoose.Schema({
    // Unique CORTEXA ID (CORTEXA_001, CORTEXA_002, etc.)
    cortexaId: { type: String, unique: true, required: true, index: true },
    
    // Legacy fields for backward compatibility
    patient_id: { type: String, required: false, sparse: true },
    patientId: { type: String, required: false },
    
    // Basic patient information
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, required: true },
    dateOfBirth: { type: Date, required: false },
    grade: { type: String, required: false },
    medical_history: { type: String, required: false },
    
    // Relationships
    parent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    therapist_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    
    // Screening status
    riskLevel: { type: String, enum: ['Low', 'Moderate', 'High'], required: false },
    screeningType: { type: String, required: false },
    screeningStatus: { type: String, enum: ['pending', 'completed', 'in-progress'], default: 'pending' },
    reportStatus: { type: String, enum: ['pending', 'completed', 'in-review'], default: 'pending' },
    submittedDate: { type: Date, required: false },
    registrationDate: { type: Date, default: Date.now },
    
    // Multimodal screening results
    multimodalScore: { type: Number, required: false }, // Final combined score (0-1)
    multimodalRiskLevel: { type: String, enum: ['Low', 'Moderate', 'High'], required: false },
    lastScreeningDate: { type: Date, required: false },
    completedScreenings: { type: [String], default: [] }, // Array of completed screening types
    
    // Additional settings
    preferredLanguage: { type: String, default: 'en-US' },
    subscriptionStatus: { type: String, enum: ['active', 'expired', 'none'], default: 'none' },
    subscriptionExpiry: { type: Date, required: false },
}, { timestamps: true });

// Pre-save hook to generate CORTEXA ID
patientSchema.pre('save', async function(next) {
    if (this.isNew && !this.cortexaId) {
        this.cortexaId = await getNextPatientId();
    }
    next();
});

const Patient = mongoose.model("Patient", patientSchema);

module.exports = Patient;