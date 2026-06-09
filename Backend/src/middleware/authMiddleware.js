import jwt from 'jsonwebtoken';
import Student from '../models/studentModel.js';
import Admin from '../models/adminModel.js';

export const protect = async (req, res, next) => {
    let token = req.cookies.jwt;

    if (token) {
        try {
            const decoded = jwt.verify(token, 'clubhub_super_secret_key_123');
            
            if (decoded.role === 'admin') {
                req.user = await Admin.findById(decoded.id).select('-password');
                if(req.user) req.user.role = 'admin'; 
            } else {
                req.user = await Student.findById(decoded.id).select('-password');
                if(req.user) req.user.role = req.user.role;
            }
            
            next();
        } catch (error) {
            res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    } else {
        res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
};

export const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Not authorized as an admin' });
    }
};

export const presidentOnly = (req, res, next) => {
    if (req.user && req.user.role === 'president') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Not authorized as a President' });
    }
};

export const prOnly = (req, res, next) => {
    if (req.user && req.user.role === 'pr') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Not authorized as PR' });
    }
};

export const grafikOnly = (req, res, next) => {
    if (req.user && req.user.role === 'grafik') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Not authorized as Grafik Team' });
    }
};

export const presidentOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'president' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Not authorized' });
    }
};