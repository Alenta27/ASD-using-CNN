const mongoose = require('mongoose');

const careTeamMemberSchema = new mongoose.Schema(
  {
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    childId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    therapistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    role: { type: String, default: 'Therapist' },
    specialty: { type: String, default: 'ASD Therapy & Support' },
    location: { type: String, default: 'CORTEXA Therapy Center' },
    phone: { type: String, default: '(555) 000-0000' },
    email: { type: String, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

careTeamMemberSchema.index({ parentId: 1, childId: 1, therapistId: 1 }, { unique: true });

module.exports = mongoose.model('CareTeamMember', careTeamMemberSchema);
