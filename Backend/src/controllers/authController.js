import Student from '../models/studentModel.js';
import Club from '../models/clubModel.js';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/auth.js';

const buildStudentSession = async (student) => {
    let clubName = null;
    let clubId = null;
    let isClubMember = false;
    let clubMemberRole = null;

    if (student.role === 'president') {
        const club = await Club.findOne({ president: student._id });
        if (club) {
            clubName = club.name;
            clubId = club._id;
        }
    } else {
        const club = await Club.findOne({ members: student._id });
        if (club) {
            clubName = club.name;
            clubId = club._id;
            isClubMember = true;
            clubMemberRole = 'clubMember';
        }
    }

    return {
        _id: student._id,
        name: student.name,
        usn: student.usn,
        email: student.email,
        department: student.department,
        semester: student.semester,
        section: student.section,
        interests: student.interests,
        role: student.role,
        clubName,
        clubId,
        isClubMember,
        clubMemberRole
    };
};

export const studentLogin = async (req, res) => {
    try {
        const { identifier, password } = req.body;
        
        const student = await Student.findOne({
            $or: [{ email: identifier }, { usn: identifier }]
        });

        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found.' });
        }

        const isMatch = await student.matchPassword(password);
        
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid password.' });
        }

        const token = jwt.sign(
            { id: student._id, role: student.role }, 
            jwtSecret,
            { expiresIn: '1d' }
        );

        res.cookie('jwt', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            success: true,
            data: await buildStudentSession(student)
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error during login.' });
    }
};

export const studentLogout = (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        expires: new Date(0)
    });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const getMe = async (req, res) => {
    try {
        const student = await Student.findById(req.user._id).select('-password');
        if (!student) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({
            success: true,
            data: await buildStudentSession(student)
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error retrieving user data.' });
    }
};
