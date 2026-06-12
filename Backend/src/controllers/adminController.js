import Admin from '../models/adminModel.js';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/auth.js';

export const loginAdmin = async (req, res) => {
    try {
        const { adminId, password } = req.body;

        const admin = await Admin.findOne({ adminId });

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const isMatch = await admin.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const token = jwt.sign({ id: admin._id, role: 'admin' }, jwtSecret, {
            expiresIn: '30d',
        });

        res.cookie('jwt', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            success: true,
            message: 'Admin logged in successfully',
            data: {
                adminId: admin.adminId,
                role: 'admin'
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

export const checkAdminAuth = async (req, res) => {
    try {
        const admin = await Admin.findById(req.user._id).select('-password');
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }
        res.status(200).json({
            success: true,
            data: {
                adminId: admin.adminId,
                role: 'admin'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

export const logoutAdmin = (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        expires: new Date(0),
    });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
};
