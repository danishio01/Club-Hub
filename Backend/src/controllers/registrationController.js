import Registration from '../models/registrationModel.js';
import Event from '../models/eventModel.js';
import Student from '../models/studentModel.js';
import jwt from 'jsonwebtoken';

export const registerForEvent = async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const studentId = req.user._id; 

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        const existingRegistration = await Registration.findOne({ student: studentId, event: eventId });
        if (existingRegistration) {
            return res.status(400).json({ success: false, message: 'You are already registered for this event.' });
        }

        const currentRegistrations = await Registration.countDocuments({ event: eventId });
        if (currentRegistrations >= event.maxParticipants) {
            return res.status(400).json({ success: false, message: 'Sorry, this event is full!' });
        }

        const registration = new Registration({ student: studentId, event: eventId });
        await registration.save();

        return res.status(201).json({ success: true, message: 'Successfully registered for the event!' });

    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
};

export const getEventRegistrations = async (req, res) => {
    try {
        const { eventId } = req.params;
        
        const registrations = await Registration.find({ event: eventId })
            .populate('student', 'name usn email department semester section')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, data: registrations });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch registrations' });
    }
};

export const generateAttendanceToken = async (req, res) => {
    try {
        const { eventId } = req.params;
        const token = jwt.sign({ eventId }, 'clubhub_super_secret_key_123', { expiresIn: '12h' });
        return res.status(200).json({ success: true, data: token });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to generate attendance token' });
    }
};

export const markAttendance = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { token } = req.body;
        const studentId = req.user._id;

        const decoded = jwt.verify(token, 'clubhub_super_secret_key_123');
        
        if (decoded.eventId !== eventId) {
            return res.status(400).json({ success: false, message: 'Invalid QR Code for this event.' });
        }

        const registration = await Registration.findOne({ event: eventId, student: studentId });
        
        if (!registration) {
            return res.status(404).json({ success: false, message: 'You are not registered for this event.' });
        }

        if (registration.status === 'Attended') {
            return res.status(400).json({ success: false, message: 'Attendance already recorded.' });
        }

        registration.status = 'Attended';
        await registration.save();

        await Student.findByIdAndUpdate(studentId, { $inc: { points: 100 } });

        return res.status(200).json({ success: true, message: 'Attendance recorded! You earned 100 points.' });

    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired QR Code.' });
    }
};