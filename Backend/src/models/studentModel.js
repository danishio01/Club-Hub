import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    usn: { type: String, required: true, unique: true, trim: true, uppercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    department: { type: String, required: true },
    semester: { type: String, required: true },
    section: { type: String, required: true },
    interests: [{ type: String }],
    role: { type: String, enum: ['student', 'president'], default: 'student', index: true },
    points: { type: Number, default: 0 },
    fcmTokens: { type: [String], default: [] }
}, { timestamps: true });

studentSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

studentSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('Student', studentSchema);
