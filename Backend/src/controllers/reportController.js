import Report from '../models/reportModel.js';
import Event from '../models/eventModel.js';
import { generateAndUploadReportPDF } from '../services/s3Service.js';

export const getReportByEvent = async (req, res) => {
    try {
        const { eventId } = req.params;
        let report = await Report.findOne({ event: eventId }).populate('event').populate('president', 'name usn');
        
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
            { event: eventId, president: req.user._id, status: { $ne: 'reviewed' } },
            { content },
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
        
        let pdfUrl = null;
        try {
            pdfUrl = await generateAndUploadReportPDF(content, event.title, event.club.name, req.user.name);
        } catch (s3Error) {
            console.error(s3Error);
        }

        const report = await Report.findOneAndUpdate(
            { event: eventId, president: req.user._id },
            { 
                content, 
                status: 'submitted', 
                submittedAt: new Date(),
                pdfUrl 
            },
            { new: true }
        );

        return res.status(200).json({ success: true, data: report, message: 'Report submitted successfully to Admin.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Failed to submit report' });
    }
};

export const getAllReportsAdmin = async (req, res) => {
    try {
        const reports = await Report.find({ status: { $in: ['submitted', 'reviewed'] } })
            .populate('event', 'title date')
            .populate('club', 'name')
            .populate('president', 'name usn')
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
        return res.status(200).json({ success: true, data: report, message: 'Report marked as reviewed.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Failed to review report' });
    }
};