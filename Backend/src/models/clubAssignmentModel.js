import mongoose from 'mongoose';

const clubAssignmentSchema = new mongoose.Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true, index: true },
    position: { type: String, enum: ['president', 'member'], required: true, index: true }
}, { timestamps: true });

clubAssignmentSchema.index({ club: 1, position: 1 });

export default mongoose.model('ClubAssignment', clubAssignmentSchema);
