const mongoose = require('mongoose');

const parentTherapistQuerySchema = new mongoose.Schema(
  {
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    childId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    careTeamMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'CareTeamMember', required: true },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    replies: [
      {
        senderRole: { type: String, enum: ['parent', 'therapist'], required: true },
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        message: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now }
      }
    ],
    status: { type: String, enum: ['unread', 'read', 'replied'], default: 'unread', index: true },
    readAt: { type: Date },
  },
  { timestamps: true }
);

parentTherapistQuerySchema.index({ therapistId: 1, createdAt: -1 });

module.exports = mongoose.model('ParentTherapistQuery', parentTherapistQuerySchema);
