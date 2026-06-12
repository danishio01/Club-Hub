import mongoose from 'mongoose';

const notificationTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    userModel: {
        type: String,
        enum: ['Student', 'Admin'],
        required: true
    },
    role: {
        type: String,
        required: true,
        index: true
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    userAgent: String,
    platform: String,
    deviceLabel: String,
    active: {
        type: Boolean,
        default: true,
        index: true
    },
    lastSeenAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

notificationTokenSchema.index({ userId: 1, token: 1 }, { unique: true });

export default mongoose.model('NotificationToken', notificationTokenSchema);
