import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './src/models/adminModel.js'; // Adjust path if needed

dotenv.config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        // Delete existing admins (optional)
        await Admin.deleteMany();

        const admin = await Admin.create({
            adminId: 'Admin',
            password: 'CH@admin1'
        });

        console.log('Admin seeded successfully');
        console.log(admin);

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedAdmin();