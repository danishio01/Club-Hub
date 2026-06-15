import Admin from '../models/adminModel.js';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/auth.js';

export const loginAdmin = async (req, res) => {
    try {
        const { adminId, password } = req.body;

        const admin = await Admin.findOne({ adminId: adminId?.trim().toUpperCase() });

        if (!admin || admin.active === false) {
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

        const role = admin.role || 'faculty_coordinator';
        const token = jwt.sign({ id: admin._id, role }, jwtSecret, {
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
            message: 'Staff member logged in successfully',
            data: {
                adminId: admin.adminId,
                _id: admin._id,
                name: admin.name,
                role,
                mustChangePassword: admin.mustChangePassword
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
            return res.status(404).json({ success: false, message: 'Staff account not found' });
        }
        res.status(200).json({
            success: true,
            data: {
                adminId: admin.adminId,
                _id: admin._id,
                name: admin.name,
                role: admin.role || 'faculty_coordinator',
                mustChangePassword: admin.mustChangePassword
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

export const listFacultyCoordinators = async (req, res) => {
    const accounts = await Admin.find({ role: 'faculty_coordinator' }).select('-password').sort({ createdAt: -1 });
    return res.json({ success: true, data: accounts });
};

export const createFacultyCoordinator = async (req, res) => {
    try {
        const account = await Admin.create({
            adminId: req.body.staffId?.trim().toUpperCase(),
            name: req.body.name,
            password: req.body.password,
            role: 'faculty_coordinator',
            active: true,
            mustChangePassword: true
        });
        return res.status(201).json({ success: true, data: { _id: account._id, staffId: account.adminId, name: account.name, role: account.role } });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.code === 11000 ? 'Staff ID already exists' : error.message });
    }
};

export const updateFacultyCoordinator = async (req, res) => {
    const update = {};
    if (typeof req.body.active === 'boolean') update.active = req.body.active;
    if (req.body.name) update.name = req.body.name;
    const account = await Admin.findOneAndUpdate(
        { _id: req.params.id, role: 'faculty_coordinator' },
        update,
        { new: true }
    ).select('-password');
    if (!account) return res.status(404).json({ success: false, message: 'Faculty Coordinator not found' });
    return res.json({ success: true, data: account });
};

export const resetFacultyPassword = async (req, res) => {
    const account = await Admin.findOne({ _id: req.params.id, role: 'faculty_coordinator' });
    if (!account) return res.status(404).json({ success: false, message: 'Faculty Coordinator not found' });
    account.password = req.body.password;
    account.mustChangePassword = true;
    await account.save();
    return res.json({ success: true, message: 'Temporary password set' });
};

export const changeStaffPassword = async (req, res) => {
    const account = await Admin.findById(req.user._id);
    if (!account || !await account.matchPassword(req.body.currentPassword)) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    account.password = req.body.newPassword;
    account.mustChangePassword = false;
    await account.save();
    return res.json({ success: true, message: 'Password changed' });
};
