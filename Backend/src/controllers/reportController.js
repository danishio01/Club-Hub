import Report from '../models/reportModel.js';
import Event from '../models/eventModel.js';
import Registration from '../models/registrationModel.js';
import { generateAndUploadReportPDF } from '../services/s3Service.js';
import { executeDynamicLifecycleBroadcasting } from '../services/notificationService.js';

export const getReportByEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        let report = await Report.findOne({ event: eventId }).populate('event').populate('president', 'name usn role');
        
        if (!report) {
            const event = await Event.findById(eventId);
            if (!event || event.status !== 'completed') {
                return res.status(400).json({ success: false, message: 'Invalid or incomplete event.' });
            }
            report = new Report({
                event: eventId,
                president: req.user._id,
                club: event.club,
                status: 'draft',
                content: {
                    socialMedia: { instagram: '', facebook: '', twitter: '' },
                    resourcePersons: []
                }
            });
            await report.save();
            report = await Report.findById(report._id).populate('event').populate('president', 'name usn role');
        }

        return res.status(200).json({ success: true, data: report });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Failed to fetch report' });
    }
};

export const saveDraft = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { content } = req.body;

        const report = await Report.findOneAndUpdate(
            { event: eventId, status: { $ne: 'reviewed' } },
            { content, president: req.user._id },
            { new: true }
        );

        if (!report) return res.status(404).json({ success: false, message: 'Report not found or locked.' });
        return res.status(200).json({ success: true, data: report, message: 'Draft saved.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Failed to save draft' });
    }
};

export const submitReport = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { content } = req.body; 

        const event = await Event.findById(eventId).populate('club');
        const registrations = await Registration.find({ event: eventId }).populate('student', 'name usn department semester section');
        
        const feedbackRegistrations = registrations.filter(r => r.feedbackResponses && r.feedbackResponses.length > 0);
        const totalResponses = feedbackRegistrations.length;
        
        let totalScore = 0;
        const questionStats = {};

        feedbackRegistrations.forEach(reg => {
            if (reg.rating) totalScore += reg.rating;

            reg.feedbackResponses.forEach(res => {
                if (!questionStats[res.questionId]) {
                    const templateQ = event.feedbackQuestions?.find(q => q.id === res.questionId);
                    const qType = templateQ ? templateQ.type : (typeof res.answer === 'number' ? 'rating' : (Array.isArray(res.answer) || ['Yes', 'No'].includes(res.answer) ? 'mcq' : 'paragraph'));
                    questionStats[res.questionId] = { text: res.questionText, type: qType, answers: [] };
                }
                
                if (Array.isArray(res.answer)) {
                    questionStats[res.questionId].answers.push(...res.answer);
                } else {
                    questionStats[res.questionId].answers.push(res.answer);
                }
            });
        });

        const averageRating = totalResponses > 0 ? (totalScore / totalResponses).toFixed(1) : 0;

        const analytics = Object.keys(questionStats).map(qId => {
            const data = questionStats[qId];
            if (data.type === 'rating') {
                const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                data.answers.forEach(a => { if (typeof a === 'number') counts[a] += 1; });
                const sum = data.answers.reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
                const avg = data.answers.length > 0 ? (sum / data.answers.length).toFixed(1) : 0;
                return { id: qId, text: data.text, type: 'rating', average: avg, breakdown: counts };
            } 
            else if (data.type === 'mcq') {
                const counts = {};
                data.answers.forEach(a => { if (a) { counts[a] = (counts[a] || 0) + 1; } });
                return { id: qId, text: data.text, type: 'mcq', breakdown: counts };
            } 
            else {
                return { id: qId, text: data.text, type: 'paragraph', rawAnswers: data.answers.filter(a => typeof a === 'string' && a.trim() !== '') };
            }
        });

        const feedbackData = { 
            total: totalResponses, 
            averageRating, 
            analytics
        };

        let pdfUrl = null;
        try {
            const submitterInfo = `${req.user.name} (${req.user.role === 'president' ? 'President' : 'Club Member'})`;
            pdfUrl = await generateAndUploadReportPDF(content, event, event.club.name, submitterInfo, registrations, feedbackData);
        } catch (s3Error) {
            console.error("PDF Generation/Upload Error:", s3Error);
        }

        const report = await Report.findOneAndUpdate(
            { event: eventId, status: { $ne: 'reviewed' } },
            { 
                content, 
                president: req.user._id,
                status: 'submitted', 
                submittedAt: new Date(),
                pdfUrl 
            },
            { new: true }
        );

        await executeDynamicLifecycleBroadcasting('REPORT_SUBMITTED', event);

        return res.status(200).json({ success: true, data: report, message: 'Report submitted successfully to Admin.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Failed to submit report' });
    }
};

export const getAllReportsAdmin = async (req, res) => {
    try {
        const reports = await Report.find({ status: { $in: ['submitted', 'reviewed', 'rejected'] } })
            .populate('event', 'title date')
            .populate('club', 'name')
            .populate('president', 'name usn role')
            .sort({ submittedAt: -1 });

        return res.status(200).json({ success: true, data: reports });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Failed to fetch reports' });
    }
};

export const reviewReportAdmin = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { adminRemarks } = req.body;

        const report = await Report.findByIdAndUpdate(
            reportId,
            { status: 'reviewed', adminRemarks, reviewedAt: new Date() },
            { new: true }
        );

        if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
        
        const event = await Event.findById(report.event);
        if (event) {
            await executeDynamicLifecycleBroadcasting('REPORT_APPROVED', event);
        }
        
        return res.status(200).json({ success: true, data: report, message: 'Report marked as reviewed.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Failed to review report' });
    }
};

export const rejectReportAdmin = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { adminRemarks } = req.body;
        if (!adminRemarks?.trim()) {
            return res.status(400).json({ success: false, message: 'Rejection feedback is required.' });
        }
        const report = await Report.findOneAndUpdate(
            { _id: reportId, status: 'submitted' },
            { status: 'rejected', adminRemarks: adminRemarks.trim(), reviewedAt: new Date() },
            { new: true }
        );
        if (!report) return res.status(404).json({ success: false, message: 'Submitted report not found.' });
        const event = await Event.findById(report.event);
        if (event) await executeDynamicLifecycleBroadcasting('REPORT_REJECTED', event);
        return res.status(200).json({ success: true, data: report, message: 'Report rejected with feedback.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to reject report.' });
    }
};
