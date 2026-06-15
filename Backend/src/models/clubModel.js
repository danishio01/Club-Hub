import mongoose from 'mongoose';

const clubSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    specialRole: {
        type: String,
        enum: ['pr', 'grafik', null],
        default: null
    },
    logoUrl: { type: String, default: null },
    logoFileId: { type: String, default: null },
    president: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Student' 
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student'
    }]
}, { timestamps: true });

clubSchema.index(
    { specialRole: 1 },
    { unique: true, partialFilterExpression: { specialRole: { $type: 'string' } } }
);
clubSchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
clubSchema.index({ president: 1 });

export default mongoose.model('Club', clubSchema);
