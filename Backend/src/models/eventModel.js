import mongoose from 'mongoose';

const galleryImageSchema = new mongoose.Schema({
    url: { type: String, required: true },
    fileId: { type: String, required: true }
});

const feedbackQuestionSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: { type: String, enum: ['rating', 'mcq', 'paragraph'], required: true },
    text: { type: String, required: true },
    options: [{ type: String }], 
    allowMultiple: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    conditionalLogic: {
        threshold: { type: Number, default: 3 }, 
        ifLessOrEqual: [{
            id: { type: String },
            type: { type: String, enum: ['mcq', 'paragraph'] },
            text: { type: String },
            options: [{ type: String }],
            allowMultiple: { type: Boolean, default: false }
        }],
        ifGreater: [{
            id: { type: String },
            type: { type: String, enum: ['mcq', 'paragraph'] },
            text: { type: String },
            options: [{ type: String }],
            allowMultiple: { type: Boolean, default: false }
        }]
    }
});

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    venue: { type: String, required: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
    eventType: { type: String, enum: ['Free', 'Paid'], required: true },
    price: { type: Number, default: 0 },
    maxParticipants: { type: Number, required: true },
    tags: [{ type: String }],
    bannerUrl: { type: String, default: null },
    bannerFileId: { type: String, default: null },
    gallery: [galleryImageSchema],
    galleryStatus: { type: String, enum: ['draft', 'pending', 'approved', 'rejected'], default: 'draft' },
    galleryRejectionReason: { type: String, default: null },
    status: { 
        type: String, 
        enum: [
            'pending_president', 'pending_grafik_poster', 'poster_submitted',
            'pending_faculty', 'faculty_rejected', 'pending_hod', 'hod_rejected',
            'approved', 'rejected', 'president_rejected', 'banner_rejected',
            'completed', 'gallery_in_progress', 'gallery_submitted',
            'gallery_approved', 'closed', 'review', 'pending_admin'
        ],
        default: 'review' 
    },
    creator: {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
        name: { type: String, default: null },
        usn: { type: String, default: null },
        role: { type: String, default: null }
    },
    rejectedReason: { type: String, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, refPath: 'rejectedByModel', default: null },
    rejectedByModel: { type: String, enum: ['Admin', 'Student'], default: 'Admin' },
    rejectedAt: { type: Date, default: null },
    approvals: {
        president: {
            reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
            decidedAt: { type: Date, default: null },
            decision: { type: String, enum: ['approved', 'rejected', null], default: null },
            reason: { type: String, default: null }
        },
        faculty: {
            reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
            decidedAt: { type: Date, default: null },
            decision: { type: String, enum: ['approved', 'rejected', null], default: null },
            reason: { type: String, default: null }
        },
        hod: {
            reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
            decidedAt: { type: Date, default: null },
            decision: { type: String, enum: ['approved', 'rejected', null], default: null },
            reason: { type: String, default: null }
        }
    },
    
    feedbackTemplateType: { type: String, enum: ['default', 'custom'], default: 'default' },
    feedbackQuestions: [feedbackQuestionSchema]
}, { timestamps: true });

eventSchema.index({ status: 1, createdAt: -1 });
eventSchema.index({ club: 1, createdAt: -1 });

export default mongoose.model('Event', eventSchema);
