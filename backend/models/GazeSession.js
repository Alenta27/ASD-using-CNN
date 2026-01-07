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
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    snapshots: [gazeSnapshotSchema],
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date }
}, { timestamps: true });

const GazeSession = mongoose.model('GazeSession', gazeSessionSchema);

module.exports = GazeSession;
