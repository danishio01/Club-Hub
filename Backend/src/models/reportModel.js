import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, unique: true },
    president: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
    content: {
        summary: { type: String, default: '' },
        objectives: { type: String, default: '' },
        activities: { type: String, default: '' },
        participation: { type: String, default: '' },
        outcomes: { type: String, default: '' },
        challenges: { type: String, default: '' },
        conclusion: { type: String, default: '' },
        additionalRemarks: { type: String, default: '' }
    },
    status: { type: String, enum: ['draft', 'submitted', 'reviewed'], default: 'draft' },
    adminRemarks: { type: String, default: '' },
    pdfUrl: { type: String, default: null }, // S3 Link
    submittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('Report', reportSchema);