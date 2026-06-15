import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema({
    action: { type: String, required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, required: true },
    actorModel: { type: String, enum: ['Student', 'Admin'], required: true },
    note: { type: String, default: null },
    previousAssignee: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
    takenOverBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
    reason: { type: String, default: null },
    at: { type: Date, default: Date.now }
}, { _id: false });

const eventTaskSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    sourceClub: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true, index: true },
    responsibleClub: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true, index: true },
    type: { type: String, enum: ['poster', 'attendance', 'social_media', 'gallery_upload'], required: true },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null, index: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
    assignedAt: { type: Date, default: null },
    status: {
        type: String,
        enum: ['unassigned', 'assigned', 'in_progress', 'submitted', 'completed', 'reopened', 'cancelled'],
        default: 'unassigned',
        index: true
    },
    stage: {
        type: String,
        enum: [
            'assigned', 'in_progress', 'submitted_to_president', 'president_review',
            'rejected_by_president', 'approved_by_president', 'submitted_to_faculty',
            'rejected_by_faculty', 'submitted_to_hod', 'rejected_by_hod', 'completed'
        ],
        default: 'assigned',
        index: true
    },
    submission: {
        text: { type: String, default: null },
        url: { type: String, default: null }
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
    dueAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    audit: { type: [auditSchema], default: [] }
}, { timestamps: true });

eventTaskSchema.index({ event: 1, type: 1 }, { unique: true });
eventTaskSchema.index({ responsibleClub: 1, status: 1, createdAt: -1 });

export default mongoose.model('EventTask', eventTaskSchema);
