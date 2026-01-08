const mongoose = require('mongoose');

const gazeSnapshotSchema = new mongoose.Schema({
    imagePath: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    gazeDirection: { type: String },
    attentionScore: { type: Number },
    headPitch: { type: Number },
    headYaw: { type: Number },
    notes: { type: String, default: '' }
});

const gazeSessionSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: false },
    therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    isGuest: { type: Boolean, default: false },
    guestInfo: {
        childName: { type: String },
        parentName: { type: String },
        email: { type: String }
    },
    status: { type: String, enum: ['active', 'completed', 'pending_review', 'reviewed'], default: 'active' },
    snapshots: [gazeSnapshotSchema],
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date }
}, { timestamps: true });

const GazeSession = mongoose.model('GazeSession', gazeSessionSchema);

module.exports = GazeSession;
