import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
    questionId: { type: String, required: true },
    questionText: { type: String, required: true },
    answer: { type: mongoose.Schema.Types.Mixed, required: true } 
});

const registrationSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    status: { type: String, enum: ['Registered', 'Scanned', 'Attended', 'Cancelled'], default: 'Registered' },
    registeredAt: { type: Date, default: Date.now },
    
    rating: { type: Number, min: 1, max: 5 }, 
    review: { type: String }, 
    
    feedbackResponses: [responseSchema],
    feedbackSubmittedAt: { type: Date, default: null }
});

export default mongoose.model('Registration', registrationSchema);