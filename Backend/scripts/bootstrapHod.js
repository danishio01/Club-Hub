import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../src/models/adminModel.js';

dotenv.config();
const { MONGO_URI, HOD_STAFF_ID, HOD_NAME, HOD_PASSWORD } = process.env;
if (!MONGO_URI || !HOD_STAFF_ID || !HOD_PASSWORD) throw new Error('MONGO_URI, HOD_STAFF_ID and HOD_PASSWORD are required');
await mongoose.connect(MONGO_URI);
const existing = await Admin.findOne({ role: 'hod' });
if (existing) throw new Error('An HOD account already exists. Use an account recovery procedure instead.');
await Admin.create({
    adminId: HOD_STAFF_ID.trim().toUpperCase(),
    name: HOD_NAME || 'Head of Department',
    password: HOD_PASSWORD,
    role: 'hod',
    active: true,
    mustChangePassword: true
});
console.log('Initial HOD account created.');
await mongoose.disconnect();
