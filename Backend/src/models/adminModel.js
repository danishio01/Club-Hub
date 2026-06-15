import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const adminSchema = new mongoose.Schema({
    adminId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    name: { type: String, default: 'Faculty Coordinator' },
    role: {
        type: String,
        enum: ['faculty_coordinator', 'hod'],
        default: 'faculty_coordinator',
        index: true
    },
    active: { type: Boolean, default: true, index: true },
    mustChangePassword: { type: Boolean, default: false },
    password: {
        type: String,
        required: true
    },
    fcmTokens: {
        type: [String],
        default: []
    }
}, { timestamps: true });

adminSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

adminSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('Admin', adminSchema);
