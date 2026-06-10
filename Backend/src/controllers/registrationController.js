import Registration from '../models/registrationModel.js';
import Event from '../models/eventModel.js';
import Student from '../models/studentModel.js';
import Club from '../models/clubModel.js';
import jwt from 'jsonwebtoken';
import { ChatMistralAI } from "@langchain/mistralai";
import { HumanMessage } from "@langchain/core/messages";

const blockClubMemberStudentFeature = (req, res) => {
    if (req.user?.isClubMember) {
        res.status(403).json({ success: false, message: 'Club members do not have access to student attendance or review features.' });
        return true;
    }
    return false;
};

export const registerForEvent = async (req, res) => {
    try {
        if (blockClubMemberStudentFeature(req, res)) return;

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

        if (req.user?.isClubMember) {
            return res.status(403).json({ success: false, message: 'Club members do not have access to attendance registrations.' });
        }
        
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
        if (blockClubMemberStudentFeature(req, res)) return;

        const { eventId } = req.params;
        const { token } = req.body;
        const studentId = req.user._id;

        const decoded = jwt.verify(token, 'clubhub_super_secret_key_123');
        if (decoded.eventId !== eventId) return res.status(400).json({ success: false, message: 'Invalid QR Code for this event.' });

        const registration = await Registration.findOne({ event: eventId, student: studentId });
        if (!registration) return res.status(404).json({ success: false, message: 'You are not registered for this event.' });
        if (registration.status === 'Attended') return res.status(400).json({ success: false, message: 'Attendance already recorded.' });
        if (registration.status === 'Scanned') return res.status(400).json({ success: false, message: 'QR already scanned. Please submit your review to complete attendance.' });

        registration.status = 'Scanned';
        await registration.save();

        return res.status(200).json({ success: true, message: 'QR Scanned! Please submit a review to mark your attendance and earn points.' });
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid or expired QR Code.' });
    }
};

export const getAttendedEvents = async (req, res) => {
    try {
        if (blockClubMemberStudentFeature(req, res)) return;

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
        if (blockClubMemberStudentFeature(req, res)) return;

        const events = await Event.find({ status: { $in: ['approved', 'completed', 'Completed'] } }).sort({ date: -1 }).lean();
        const uniqueDates = [];
        const eventDateMap = {};

        events.forEach(e => {
            const d = new Date(e.date);
            const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

            if (!eventDateMap[formattedDate]) {
                eventDateMap[formattedDate] = [];
                uniqueDates.push({ raw: d, formatted: formattedDate });
            }
            eventDateMap[formattedDate].push(e);
        });

        const studentId = req.user._id.toString();
        const studentRegs = await Registration.find({ student: studentId }).lean();
        
        const regMap = {};
        studentRegs.forEach(reg => {
            regMap[reg.event.toString()] = reg.status;
        });

        const report = uniqueDates.map(dateObj => {
            const eventsOnDate = eventDateMap[dateObj.formatted];
            let finalStatus = 'Absent';
            let finalEventName = '-';
            let foundReg = false;

            for (const ev of eventsOnDate) {
                const evId = ev._id.toString();
                const regStatus = regMap[evId];
                
                if (regStatus) {
                    foundReg = true;
                    finalEventName = ev.title;
                    if (regStatus === 'Attended') {
                        finalStatus = 'Attended';
                        break; 
                    } else if (regStatus === 'Scanned') {
                        finalStatus = 'Pending Review';
                        break;
                    } else {
                        if (ev.status === 'completed' || ev.status === 'Completed') {
                            finalStatus = 'Absent';
                        } else {
                            finalStatus = 'Pending';
                        }
                    }
                }
            }

            if (!foundReg && eventsOnDate.length > 0) {
                finalEventName = eventsOnDate[0].title;
            }

            return {
                date: dateObj.formatted,
                rawDate: dateObj.raw,
                status: finalStatus,
                eventName: finalEventName
            };
        });

        report.sort((a, b) => b.rawDate - a.rawDate);
        return res.status(200).json({ success: true, data: report });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch report' });
    }
};

export const getAdminAttendanceReport = async (req, res) => {
    try {
        const events = await Event.find({ status: { $in: ['approved', 'completed', 'Completed'] } }).sort({ date: -1 }).lean();
        const uniqueDates = [];
        const eventDateMap = {};

        events.forEach(e => {
            const d = new Date(e.date);
            const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

            if (!eventDateMap[formattedDate]) {
                eventDateMap[formattedDate] = [];
                uniqueDates.push({ raw: d, formatted: formattedDate });
            }
            eventDateMap[formattedDate].push(e);
        });

        const clubs = await Club.find().select('members').lean();
        const memberIds = new Set(clubs.flatMap(club => (club.members || []).map(member => member.toString())));
        const students = await Student.find({ role: 'student' }).select('name usn department section semester').lean();
        const attendanceStudents = students.filter(student => !memberIds.has(student._id.toString()));
        const allRegs = await Registration.find().lean();

        const regMap = {};
        allRegs.forEach(reg => {
            const sId = reg.student.toString();
            const eId = reg.event.toString();
            if (!regMap[sId]) regMap[sId] = {};
            regMap[sId][eId] = reg.status;
        });

        const report = [];
        attendanceStudents.forEach(student => {
            uniqueDates.forEach(dateObj => {
                const sId = student._id.toString();
                const eventsOnDate = eventDateMap[dateObj.formatted];
                
                let finalStatus = 'Absent';
                let finalEventName = '-';
                let foundReg = false;

                for (const ev of eventsOnDate) {
                    const evId = ev._id.toString();
                    const regStatus = regMap[sId]?.[evId];
                    
                    if (regStatus) {
                        foundReg = true;
                        finalEventName = ev.title;
                        if (regStatus === 'Attended') {
                            finalStatus = 'Attended';
                            break;
                        } else if (regStatus === 'Scanned') {
                            finalStatus = 'Pending Review';
                            break;
                        } else {
                            if (ev.status === 'completed' || ev.status === 'Completed') {
                                finalStatus = 'Absent';
                            } else {
                                finalStatus = 'Pending';
                            }
                        }
                    }
                }

                if (!foundReg && eventsOnDate.length > 0) {
                    finalEventName = eventsOnDate[0].title;
                }

                report.push({
                    studentName: student.name, usn: student.usn, department: student.department,
                    semester: student.semester || '-', section: student.section || '-',
                    date: dateObj.formatted, rawDate: dateObj.raw, status: finalStatus, eventName: finalEventName
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
        if (blockClubMemberStudentFeature(req, res)) return;

        const { rating, review } = req.body;
        const registration = await Registration.findOne({ event: req.params.eventId, student: req.user._id });
        
        if (!registration || !['Scanned', 'Attended'].includes(registration.status)) {
            return res.status(400).json({ success: false, message: 'Must scan QR code at the event before reviewing.' });
        }

        registration.rating = rating;
        registration.review = review;
        
        if (registration.status === 'Scanned') {
            registration.status = 'Attended';
            await Student.findByIdAndUpdate(req.user._id, { $inc: { points: 100 } });
        }
        
        await registration.save();
        
        return res.status(200).json({ success: true, message: 'Review submitted successfully! Attendance marked and 100 points awarded.' });
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
