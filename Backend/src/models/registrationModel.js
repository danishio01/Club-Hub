import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    status: { type: String, enum: ['Registered', 'Attended', 'Cancelled'], default: 'Registered' },
    registeredAt: { type: Date, default: Date.now },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String }
});

export default mongoose.model('Registration', registrationSchema);