import jwt from 'jsonwebtoken';
import Student from '../models/studentModel.js';
import Admin from '../models/adminModel.js';
import Club from '../models/clubModel.js';
import ClubAssignment from '../models/clubAssignmentModel.js';
import { jwtSecret } from '../config/auth.js';
import { findAccessibleEventTask } from '../services/taskAccessService.js';

export const protect = async (req, res, next) => {
    let token = req.cookies.jwt;

    if (token) {
        try {
            const decoded = jwt.verify(token, jwtSecret);
            
            if (['admin', 'faculty_coordinator', 'hod'].includes(decoded.role)) {
                req.user = await Admin.findById(decoded.id).select('-password');
                if (req.user && req.user.active === false) {
                    return res.status(403).json({ success: false, message: 'Staff account is inactive' });
                }
                if (req.user) req.user.role = req.user.role || 'faculty_coordinator';
            } else {
                req.user = await Student.findById(decoded.id).select('-password');
                if(req.user) {
                    req.user = req.user.toObject();
                    const presidentClub = await Club.findOne({ president: req.user._id }).select('_id name specialRole');
                    if (presidentClub) {
                        req.user.role = 'president';
                        req.user.isClubPresident = true;
                        req.user.presidentClub = presidentClub;
                    }
                    const clubAssignment = await ClubAssignment.findOne({ student: req.user._id }).select('club position');
                    if (clubAssignment) req.user.clubAssignment = clubAssignment;
                    const memberClub = await Club.findOne({ members: req.user._id }).select('_id name');
                    if (memberClub) {
                        req.user.isClubMember = true;
                        req.user.memberClub = memberClub;
                    }
                }
            }
            
            if (!req.user) {
                return res.status(401).json({ success: false, message: 'Not authorized, user no longer exists' });
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
    if (req.user && ['admin', 'faculty_coordinator'].includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Faculty Coordinator access required' });
    }
};

export const presidentOnly = (req, res, next) => {
    if (req.user && req.user.role === 'president') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Not authorized as a President' });
    }
};

export const staffOnly = (req, res, next) => {
    if (req.user && ['admin', 'faculty_coordinator', 'hod'].includes(req.user.role)) return next();
    return res.status(403).json({ success: false, message: 'Not authorized as staff' });
};

export const facultyOnly = (req, res, next) => {
    if (req.user && ['admin', 'faculty_coordinator'].includes(req.user.role)) return next();
    return res.status(403).json({ success: false, message: 'Faculty Coordinator access required' });
};

export const hodOnly = (req, res, next) => {
    if (req.user?.role === 'hod') return next();
    return res.status(403).json({ success: false, message: 'HOD access required' });
};

export const selfOrAdmin = (req, res, next) => {
    if (['admin', 'faculty_coordinator'].includes(req.user?.role) || req.user?._id?.toString() === req.params.id) {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Not authorized to update this profile' });
};

export const presidentOrClubMember = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (req.user.role === 'president') {
            return next();
        }

        const club = await Club.findOne({ members: req.user._id }).select('_id name');
        if (club) {
            req.memberClub = club;
            return next();
        }

        return res.status(403).json({ success: false, message: 'Not authorized as a club member' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to verify club membership' });
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
    if (req.user && (req.user.role === 'president' || ['admin', 'faculty_coordinator'].includes(req.user.role))) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Not authorized' });
    }
};

export const presidentOrStaff = (req, res, next) => {
    if (req.user && (req.user.role === 'president' || ['admin', 'faculty_coordinator', 'hod'].includes(req.user.role))) return next();
    return res.status(403).json({ success: false, message: 'Not authorized' });
};

const specialClubOnly = (specialRole) => async (req, res, next) => {
    if (!req.user) return res.status(403).json({ success: false, message: 'Not authorized' });
    const club = await Club.findOne({
        specialRole,
        $or: [{ president: req.user._id }, { members: req.user._id }]
    }).select('_id name specialRole president');
    if (!club) return res.status(403).json({ success: false, message: `Not authorized for the designated ${specialRole.toUpperCase()} club` });
    req.specialClub = club;
    return next();
};

export const grafikClubOnly = specialClubOnly('grafik');
export const prClubOnly = specialClubOnly('pr');

export const specialTaskWorkerOnly = (type, specialRole) => async (req, res, next) => {
    const club = await Club.findOne({
        specialRole,
        $or: [{ president: req.user?._id }, { members: req.user?._id }]
    }).select('_id president specialRole');
    if (!club) return res.status(403).json({ success: false, message: `Designated ${specialRole.toUpperCase()} club access required` });
    const taskTypes = Array.isArray(type) ? type : [type];
    const task = await findAccessibleEventTask({
        eventId: req.params.id || req.params.eventId,
        types: taskTypes,
        specialRole,
        user: req.user
    });
    if (!task) {
        return res.status(403).json({ success: false, message: 'This work must be assigned to you before you can open it' });
    }
    req.specialClub = club;
    req.eventTask = task;
    return next();
};

export const presidentClubMemberOrAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (req.user.role === 'president' || ['admin', 'faculty_coordinator'].includes(req.user.role)) {
            return next();
        }

        const club = await Club.findOne({ members: req.user._id }).select('_id name');
        if (club) {
            req.memberClub = club;
            return next();
        }

        return res.status(403).json({ success: false, message: 'Not authorized' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to verify permissions' });
    }
};
