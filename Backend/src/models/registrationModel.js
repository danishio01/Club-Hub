import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema({
    student: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Student', 
        required: true 
    },
    event: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Event', 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['Registered', 'Attended'], 
        default: 'Registered' 
    }
}, { timestamps: true });

registrationSchema.index({ student: 1, event: 1 }, { unique: true });

export default mongoose.model('Registration', registrationSchema);