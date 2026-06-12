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
            'EVENT_CREATED', 'EVENT_APPROVED', 'EVENT_REJECTED', 'ADMIN_EVENT_REJECTED',
            'FLYER_GENERATED', 'FLYER_APPROVED', 'FLYER_REJECTED',
            'REPORT_SUBMITTED', 'REPORT_APPROVED', 'REPORT_REJECTED',
            'GALLERY_UPLOADED', 'GALLERY_APPROVED', 'GALLERY_REJECTED',
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
    }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
