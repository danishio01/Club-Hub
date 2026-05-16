import mongoose from 'mongoose';

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
    status: { 
        type: String, 
        enum: ['review', 'approved', 'rejected', 'completed'], 
        default: 'review' 
    },
    rejectedReason: { type: String, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    rejectedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('Event', eventSchema);