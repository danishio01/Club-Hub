import Registration from '../models/registrationModel.js';
import Event from '../models/eventModel.js';
import Student from '../models/studentModel.js';
import jwt from 'jsonwebtoken';
import { ChatMistralAI } from "@langchain/mistralai";
import { HumanMessage } from "@langchain/core/messages";

export const registerForEvent = async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const studentId = req.user._id; 

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        const existingRegistration = await Registration.findOne({ student: studentId, event: eventId });
        if (existingRegistration) return res.status(400).json({ success: false, message: 'You are already registered for this event.' });

        const currentRegistrations = await Registration.countDocuments({ event: eventId });
        if (currentRegistrations >= event.maxParticipants) return res.status(400).json({ success: false, message: 'Sorry, this event is full!' });

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
        
        // Strict Ownership validation for Presidents
        if (req.user.role === 'president') {
            const event = await Event.findById(eventId).populate('club');
            if (!event || event.club?.president?.toString() !== req.user._id.toString()) {
                return res.status(403).json({ success: false, message: 'Unauthorized: You do not have permission to view this club\'s registrations.' });
            }
        }

        const registrations = await Registration.find({ event: eventId })
            .populate('student', 'name usn email department semester section')
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, data: registrations });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch registrations' });
    }
};

// ... remaining registrationController methods unchanged (generateAttendanceToken, markAttendance, getAttendedEvents, getStudentAttendanceReport, getAdminAttendanceReport, submitReview, getEventReviews, summarizeReviews)
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
        if (decoded.eventId !== eventId) return res.status(400).json({ success: false, message: 'Invalid QR Code for this event.' });

        const registration = await Registration.findOne({ event: eventId, student: studentId });
        if (!registration) return res.status(404).json({ success: false, message: 'You are not registered for this event.' });
        if (registration.status === 'Attended') return res.status(400).json({ success: false, message: 'Attendance already recorded.' });

        registration.status = 'Attended';
        await registration.save();
        await Student.findByIdAndUpdate(studentId, { $inc: { points: 100 } });

        return res.status(200).json({ success: true, message: 'Attendance recorded! You earned 100 points.' });
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired QR Code.' });
    }
};

export const getAttendedEvents = async (req, res) => {
    try {
        const studentId = req.user._id;
        const attended = await Registration.find({ student: studentId, status: 'Attended' }).populate({ path: 'event', populate: { path: 'club', select: 'name' } });

        const data = attended.map(reg => ({
            registrationId: reg._id,
            eventName: reg.event.title,
            eventDate: reg.event.date,
            eventTime: reg.event.time,
            clubName: reg.event.club?.name || 'Campus Club',
            studentName: req.user.name 
        }));

        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch certificates' });
    }
};

export const getStudentAttendanceReport = async (req, res) => {
    try {
        const today = new Date();
        const events = await Event.find({ date: { $lte: today } }).sort({ date: -1 }).lean();
        const uniqueDates = [];
        const eventDateMap = {};

        events.forEach(e => {
            const d = new Date(e.date);
            const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

            if (!eventDateMap[formattedDate]) {
                eventDateMap[formattedDate] = [];
                uniqueDates.push(formattedDate);
            }
            eventDateMap[formattedDate].push(e);
        });

        const studentId = req.user._id;
        const attendedRegs = await Registration.find({ student: studentId, status: 'Attended' }).populate('event').lean();

        const attendedMap = {};
        attendedRegs.forEach(reg => {
            if(reg.event) {
                const d = new Date(reg.event.date);
                const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                attendedMap[formattedDate] = reg.event.title;
            }
        });

        const report = uniqueDates.map(date => ({
            date,
            status: attendedMap[date] ? 'Present' : 'Absent',
            eventName: attendedMap[date] || '-'
        }));

        return res.status(200).json({ success: true, data: report });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch report' });
    }
};

export const getAdminAttendanceReport = async (req, res) => {
    try {
        const today = new Date();
        const events = await Event.find({ date: { $lte: today } }).sort({ date: -1 }).lean();
        const uniqueDates = [];
        const eventDateMap = {};

        events.forEach(e => {
            const d = new Date(e.date);
            const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

            if (!eventDateMap[formattedDate]) {
                eventDateMap[formattedDate] = [];
                uniqueDates.push({ raw: d, formatted: formattedDate });
            }
            eventDateMap[formattedDate].push(e._id.toString());
        });

        const students = await Student.find().select('name usn department section semester').lean();
        const allAttended = await Registration.find({ status: 'Attended' }).populate('event').lean();

        const attendanceMap = {};
        allAttended.forEach(reg => {
            if(reg.event && reg.student) {
                const sId = reg.student.toString();
                const d = new Date(reg.event.date);
                const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

                if (!attendanceMap[sId]) attendanceMap[sId] = {};
                attendanceMap[sId][formattedDate] = reg.event.title;
            }
        });

        const report = [];
        students.forEach(student => {
            uniqueDates.forEach(dateObj => {
                const sId = student._id.toString();
                const isPresent = attendanceMap[sId]?.[dateObj.formatted];
                report.push({
                    studentName: student.name, usn: student.usn, department: student.department,
                    semester: student.semester || '-', section: student.section || '-',
                    date: dateObj.formatted, rawDate: dateObj.raw, status: isPresent ? 'Present' : 'Absent',
                    eventName: isPresent || '-'
                });
            });
        });

        report.sort((a, b) => b.rawDate - a.rawDate);
        return res.status(200).json({ success: true, data: report });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch admin report' });
    }
};

export const submitReview = async (req, res) => {
    try {
        const { rating, review } = req.body;
        const registration = await Registration.findOneAndUpdate(
            { event: req.params.eventId, student: req.user._id, status: 'Attended' },
            { rating, review }, { new: true }
        );
        if (!registration) return res.status(400).json({ success: false, message: 'Must attend the event to review.' });
        return res.status(200).json({ success: true, message: 'Review submitted successfully!' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to submit review' });
    }
};

export const getEventReviews = async (req, res) => {
    try {
        const reviews = await Registration.find({ event: req.params.eventId, rating: { $exists: true } })
            .populate('student', 'name email').select('rating review student');
            
        const totalRating = reviews.reduce((sum, req) => sum + req.rating, 0);
        const averageRating = reviews.length > 0 ? (totalRating / reviews.length).toFixed(1) : 0;

        return res.status(200).json({ success: true, data: { reviews, averageRating, total: reviews.length } });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
    }
};

export const summarizeReviews = async (req, res) => {
    try {
        const reviews = await Registration.find({ event: req.params.eventId, review: { $exists: true, $ne: "" } });
        if (reviews.length === 0) return res.status(400).json({ success: false, message: 'No written reviews to summarize.' });

        const reviewTexts = reviews.map(r => r.review).join(' | ');
        const model = new ChatMistralAI({ model: "mistral-medium-latest", apiKey: process.env.MISTRAL_API_KEY });
        
        const promptText = `Here are the student reviews for an event: "${reviewTexts}". Provide a professional summary. RULES: 1. Use ONLY provided info. 2. If short, a single sentence is perfect.`;

        const response = await model.invoke([new HumanMessage(promptText)]);
        return res.status(200).json({ success: true, data: response.content });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to generate summary' });
    }
};