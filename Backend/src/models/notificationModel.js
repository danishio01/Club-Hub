import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'recipientModel'
    },
    recipientModel: {
        type: String,
        required: true,
        enum: ['Student', 'Admin']
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            'EVENT_CREATED', 'EVENT_APPROVED', 'EVENT_REJECTED', 'ADMIN_EVENT_REJECTED', 'EVENT_COMPLETED',
            'FLYER_GENERATED', 'FLYER_APPROVED', 'FLYER_REJECTED',
            'REPORT_SUBMITTED', 'REPORT_APPROVED', 'REPORT_REJECTED',
            'GALLERY_UPLOADED', 'GALLERY_APPROVED', 'GALLERY_REJECTED',
            'TASK_CREATED', 'TASK_ASSIGNED', 'TASK_UPDATED', 'TASK_SUBMITTED', 'TASK_COMPLETED',
            'TASK_REASSIGNED', 'TASK_APPROVED', 'TASK_REJECTED', 'TASK_REOPENED',
            'FACULTY_REVIEW_REQUIRED', 'FACULTY_APPROVED', 'FACULTY_REJECTED', 'HOD_APPROVED', 'HOD_REJECTED',
            'SYSTEM'
        ]
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    isRead: {
        type: Boolean,
        default: false
    },
    idempotencyKey: { type: String, default: null }
}, { timestamps: true });

notificationSchema.index(
    { recipient: 1, idempotencyKey: 1 },
    { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);

export default mongoose.model('Notification', notificationSchema);
