import Event from '../models/eventModel.js';
import Registration from '../models/registrationModel.js';
import Club from '../models/clubModel.js';
import Report from '../models/reportModel.js';
import { generatePosterBuffer } from '../services/bannerService.js';
import { uploadBannerToImageKit, deleteBannerFromImageKit } from '../services/imagekitService.js';

const populateEventQuery = (query) => query
    .populate('club', 'name isActive president members')
    .populate('creator.student', 'name usn email');

const getClubForUser = async (user, memberClub = null) => {
    if (user.role === 'president') {
        return await Club.findOne({ president: user._id });
    }
    if (memberClub) {
        return memberClub;
    }
    return await Club.findOne({ members: user._id });
};

const getCreatorPayload = (user, roleLabel) => ({
    student: user._id,
    name: user.name,
    usn: user.usn,
    role: roleLabel
});

const ownsClubEvent = (event, user) => event.club?.president?.toString() === user._id.toString();

const ownsCreatedEvent = (event, user) => event.creator?.student?.toString() === user._id.toString();

export const getPresidentEvents = async (req, res) => {
    try {
        const club = await getClubForUser(req.user, req.memberClub);
        if (!club) return res.status(200).json({ success: true, data: [] });

        const filter = req.user.role === 'president'
            ? { club: club._id }
            : { club: club._id, 'creator.student': req.user._id };

        const events = await populateEventQuery(Event.find(filter))
            .sort({ date: 1 })
            .lean();

        const eventsWithCounts = await Promise.all(events.map(async (event) => {
            const currentRegistrations = await Registration.countDocuments({ event: event._id });
            return { ...event, currentRegistrations };
        }));

        return res.status(200).json({ success: true, data: eventsWithCounts });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch president events' });
    }
};

export const createEvent = async (req, res) => {
    try {
        if (req.user.role === 'president') {
            const club = await Club.findOne({ president: req.user._id });
            if (!club) return res.status(403).json({ success: false, message: 'You are not assigned to any club.' });
            req.body.club = club._id; 
            req.body.status = 'review';
            req.body.creator = getCreatorPayload(req.user, 'President');
        } else if (req.memberClub) {
            req.body.club = req.memberClub._id;
            req.body.status = 'pending_president';
            req.body.creator = getCreatorPayload(req.user, 'Club Member');
        } else if (req.user.role === 'admin') {
            req.body.creator = {
                name: req.user.name || req.user.email || req.user.adminId || 'Admin',
                usn: null,
                role: 'Admin'
            };
        }

        const event = new Event(req.body);
        await event.save();
        const populatedEvent = await populateEventQuery(Event.findById(event._id));
        return res.status(201).json({ success: true, data: populatedEvent });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to create event' });
    }
};

export const getEvents = async (req, res) => {
    try {
        const events = await populateEventQuery(Event.find())
            .sort({ date: 1 })
            .lean();

        const eventsWithCounts = await Promise.all(events.map(async (event) => {
            const currentRegistrations = await Registration.countDocuments({ event: event._id });
            return { ...event, currentRegistrations };
        }));

        return res.status(200).json({ success: true, data: eventsWithCounts });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch events' });
    }
};

export const getEventById = async (req, res) => {
    try {
        const event = await populateEventQuery(Event.findById(req.params.id)).lean();
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        
        const currentRegistrations = await Registration.countDocuments({ event: event._id });
        const feedbackCount = await Registration.countDocuments({ event: event._id, feedbackSubmittedAt: { $ne: null } });
        const report = await Report.findOne({ event: event._id }).select('status');

        return res.status(200).json({ 
            success: true, 
            data: { 
                ...event, 
                currentRegistrations, 
                feedbackCount,
                reportStatus: report ? report.status : 'Not Started'
            } 
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch event details' });
    }
};

export const getGrafikEventById = async (req, res) => {
    try {
        const event = await populateEventQuery(Event.findById(req.params.id)).lean();
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        return res.status(200).json({ success: true, data: event });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch grafik event' });
    }
};

export const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };
        
        if (req.user.role === 'president') {
            const eventToUpdate = await Event.findById(id).populate('club');
            if (!eventToUpdate) return res.status(404).json({ message: 'Event not found' });
            if (!ownsClubEvent(eventToUpdate, req.user)) {
                return res.status(403).json({ message: 'Unauthorized: You do not own this event.' });
            }
            delete updateData.club;
            
            updateData.status = 'review';
            updateData.rejectedReason = null;
            updateData.rejectedBy = null;
            updateData.rejectedByModel = 'Admin';
            updateData.rejectedAt = null;
        } else if (req.memberClub) {
            const eventToUpdate = await Event.findById(id).populate('club');
            if (!eventToUpdate) return res.status(404).json({ message: 'Event not found' });
            if (!ownsCreatedEvent(eventToUpdate, req.user) || eventToUpdate.club._id.toString() !== req.memberClub._id.toString()) {
                return res.status(403).json({ message: 'Unauthorized: You do not own this proposal.' });
            }
            delete updateData.club;
            
            updateData.status = 'pending_president';
            updateData.rejectedReason = null;
            updateData.rejectedBy = null;
            updateData.rejectedByModel = 'Admin';
            updateData.rejectedAt = null;
        }

        const event = await populateEventQuery(Event.findByIdAndUpdate(id, updateData, { new: true }));
        return res.status(200).json({ success: true, data: event });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update event' });
    }
};

export const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.role === 'president') {
            const eventToDelete = await Event.findById(id).populate('club');
            if (!eventToDelete) return res.status(404).json({ message: 'Event not found' });
            if (!ownsClubEvent(eventToDelete, req.user)) {
                return res.status(403).json({ message: 'Unauthorized: You do not own this event.' });
            }
        } else if (req.memberClub) {
            const eventToDelete = await Event.findById(id).populate('club');
            if (!eventToDelete) return res.status(404).json({ message: 'Event not found' });
            if (!ownsCreatedEvent(eventToDelete, req.user) || eventToDelete.club._id.toString() !== req.memberClub._id.toString()) {
                return res.status(403).json({ message: 'Unauthorized: You do not own this proposal.' });
            }
        }

        const event = await Event.findById(id);
        if (event && event.bannerFileId) {
            try {
                await deleteBannerFromImageKit(event.bannerFileId);
            } catch (err) {}
        }
        
        if (event && event.gallery && event.gallery.length > 0) {
            for (const img of event.gallery) {
                try {
                    await deleteBannerFromImageKit(img.fileId);
                } catch (err) {}
            }
        }

        await Event.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: 'Event deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete event' });
    }
};

export const approveEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await Event.findByIdAndUpdate(
            id, 
            { status: 'approved', rejectedReason: null, rejectedBy: null, rejectedByModel: 'Admin', rejectedAt: null }, 
            { new: true }
        ).populate('club', 'name isActive president members').populate('creator.student', 'name usn email');
        
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        return res.status(200).json({ success: true, data: event, message: 'Event approved successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to approve event' });
    }
};

export const rejectEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason, rejectType } = req.body;

        if (!reason || reason.trim() === '') {
            return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
        }

        const eventToUpdate = await Event.findById(id);
        if (!eventToUpdate) return res.status(404).json({ success: false, message: 'Event not found' });

        const targetStatus = rejectType === 'banner' ? 'banner_rejected' : 'rejected';

        if (rejectType === 'event' && eventToUpdate.bannerFileId) {
            try {
                await deleteBannerFromImageKit(eventToUpdate.bannerFileId);
                eventToUpdate.bannerUrl = null;
                eventToUpdate.bannerFileId = null;
            } catch (err) {}
        }

        eventToUpdate.status = targetStatus;
        eventToUpdate.rejectedReason = reason;
        eventToUpdate.rejectedBy = req.user._id;
        eventToUpdate.rejectedByModel = 'Admin';
        eventToUpdate.rejectedAt = new Date();
        await eventToUpdate.save();

        const populatedEvent = await populateEventQuery(Event.findById(id));
        return res.status(200).json({ success: true, data: populatedEvent, message: 'Rejection processed successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to reject event' });
    }
};

export const markEventCompleted = async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.role === 'president') {
            const eventToComplete = await Event.findById(id).populate('club');
            if (!eventToComplete) return res.status(404).json({ message: 'Event not found' });
            if (!ownsClubEvent(eventToComplete, req.user)) {
                return res.status(403).json({ message: 'Unauthorized.' });
            }
            if (eventToComplete.status !== 'approved') {
                return res.status(400).json({ message: 'Only approved events can be marked as completed.' });
            }
        } else if (req.memberClub) {
            const eventToComplete = await Event.findById(id).populate('club');
            if (!eventToComplete) return res.status(404).json({ message: 'Event not found' });
            if (!ownsCreatedEvent(eventToComplete, req.user) || eventToComplete.club._id.toString() !== req.memberClub._id.toString()) {
                return res.status(403).json({ message: 'Unauthorized.' });
            }
            if (eventToComplete.status !== 'approved') {
                return res.status(400).json({ message: 'Only approved events can be marked as completed.' });
            }
        }

        const event = await Event.findByIdAndUpdate(id, { status: 'completed' }, { new: true });
        return res.status(200).json({ success: true, data: event });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to mark event as completed' });
    }
};

export const getStudentEvents = async (req, res) => {
    try {
        const studentId = req.user._id;
        
        const events = await Event.find({ status: 'approved' })
            .populate('club', 'name isActive')
            .sort({ date: 1 })
            .lean();

        const eventsWithDetails = await Promise.all(events.map(async (event) => {
            const currentRegistrations = await Registration.countDocuments({ event: event._id });
            const isRegistered = await Registration.exists({ event: event._id, student: studentId });

            return { 
                ...event, 
                currentRegistrations,
                isRegistered: !!isRegistered 
            };
        }));

        return res.status(200).json({ success: true, data: eventsWithDetails });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch student events' });
    }
};

export const getStudentEventById = async (req, res) => {
    try {
        const eventId = req.params.id;
        const studentId = req.user._id;

        const event = await Event.findOne({ _id: eventId, status: 'approved' }).populate('club', 'name isActive').lean();
        if (!event) return res.status(404).json({ success: false, message: 'Event not found or not yet approved.' });

        const currentRegistrations = await Registration.countDocuments({ event: eventId });
        const registration = await Registration.findOne({ event: eventId, student: studentId });

        return res.status(200).json({ 
            success: true, 
            data: { 
                ...event, 
                currentRegistrations,
                isRegistered: !!registration,
                attendanceStatus: registration ? registration.status : null
            } 
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch event details' });
    }
};

export const getGrafikEvents = async (req, res) => {
    try {
        const events = await Event.find({ 
            status: { $in: ['review', 'pending_admin', 'banner_rejected', 'approved', 'completed'] } 
        }).populate('club', 'name isActive president members').populate('creator.student', 'name usn email').sort({ createdAt: -1 });
        
        return res.status(200).json({ success: true, data: events });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch grafik events' });
    }
};

export const generateEventBanner = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('club');
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        if (event.bannerFileId) {
            try {
                await deleteBannerFromImageKit(event.bannerFileId);
            } catch (err) {}
        }

        const buffer = await generatePosterBuffer(event);
        const safeTitle = event.title.replace(/[^a-zA-Z0-9]/g, '_');
        const uploadResult = await uploadBannerToImageKit(buffer, safeTitle);
        
        event.bannerUrl = uploadResult.url;
        event.bannerFileId = uploadResult.fileId;
        await event.save();
        
        return res.status(200).json({ success: true, data: uploadResult.url });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to generate flyer' });
    }
};

export const uploadCustomEventBanner = async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64) return res.status(400).json({ success: false, message: 'Image data is required' });

        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        if (event.bannerFileId) {
            try {
                await deleteBannerFromImageKit(event.bannerFileId);
            } catch (err) {}
        }

        const safeTitle = event.title.replace(/[^a-zA-Z0-9]/g, '_');
        const uploadResult = await uploadBannerToImageKit(imageBase64, safeTitle);

        event.bannerUrl = uploadResult.url;
        event.bannerFileId = uploadResult.fileId;
        await event.save();

        return res.status(200).json({ success: true, data: uploadResult.url });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to upload custom flyer' });
    }
};

export const approveEventBanner = async (req, res) => {
    try {
        const event = await Event.findByIdAndUpdate(
            req.params.id, 
            { status: 'pending_admin' }, 
            { new: true }
        ).populate('club', 'name isActive president members').populate('creator.student', 'name usn email');
        
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        return res.status(200).json({ success: true, data: event, message: 'Flyer approved. Event submitted to Admin.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to approve flyer' });
    }
};

export const uploadGalleryImage = async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64) return res.status(400).json({ success: false, message: 'Image data is required' });

        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        
        if (event.status !== 'completed') {
            return res.status(400).json({ success: false, message: 'Galleries can only be uploaded to completed events.' });
        }

        const safeTitle = event.title.replace(/[^a-zA-Z0-9]/g, '_') + '_gallery';
        const uploadResult = await uploadBannerToImageKit(imageBase64, safeTitle);

        event.gallery.push({ url: uploadResult.url, fileId: uploadResult.fileId });
        await event.save();

        return res.status(200).json({ success: true, data: event.gallery });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to upload gallery image' });
    }
};

export const deleteGalleryImage = async (req, res) => {
    try {
        const { id, fileId } = req.params;
        
        const event = await Event.findById(id);
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        const imageExists = event.gallery.some(img => img.fileId === fileId);
        if (!imageExists) return res.status(404).json({ success: false, message: 'Image not found in gallery' });

        try {
            await deleteBannerFromImageKit(fileId);
        } catch (err) {
            console.error("ImageKit Deletion Error:", err);
        }

        event.gallery = event.gallery.filter(img => img.fileId !== fileId);
        await event.save();

        return res.status(200).json({ success: true, data: event.gallery, message: 'Image deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete gallery image' });
    }
};

export const getPrCompletedEvents = async (req, res) => {
    try {
        const events = await Event.find({ status: 'completed', 'gallery.0': { $exists: true } })
            .populate('club', 'name isActive president members')
            .populate('creator.student', 'name usn email')
            .sort({ date: -1 })
            .lean();
        return res.status(200).json({ success: true, data: events });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch PR galleries' });
    }
};

export const approveClubMemberProposal = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await Event.findById(id).populate('club');

        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        if (!ownsClubEvent(event, req.user)) {
            return res.status(403).json({ success: false, message: 'You cannot approve this proposal' });
        }
        if (event.status !== 'pending_president') {
            return res.status(400).json({ success: false, message: 'Only pending club member proposals can be approved' });
        }

        event.status = 'review';
        event.rejectedReason = null;
        event.rejectedBy = null;
        event.rejectedByModel = 'Admin';
        event.rejectedAt = null;
        await event.save();

        const populatedEvent = await populateEventQuery(Event.findById(id));
        return res.status(200).json({ success: true, data: populatedEvent, message: 'Proposal approved and sent to Grafik' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to approve proposal' });
    }
};

export const rejectClubMemberProposal = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason || reason.trim() === '') {
            return res.status(400).json({ success: false, message: 'Rejection reason is required.' });
        }

        const event = await Event.findById(id).populate('club');
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        if (!ownsClubEvent(event, req.user)) {
            return res.status(403).json({ success: false, message: 'You cannot reject this proposal' });
        }
        if (event.status !== 'pending_president') {
            return res.status(400).json({ success: false, message: 'Only pending club member proposals can be rejected' });
        }

        event.status = 'president_rejected';
        event.rejectedReason = reason;
        event.rejectedBy = req.user._id;
        event.rejectedByModel = 'Student';
        event.rejectedAt = new Date();
        await event.save();

        const populatedEvent = await populateEventQuery(Event.findById(id));
        return res.status(200).json({ success: true, data: populatedEvent, message: 'Proposal rejected' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to reject proposal' });
    }
};