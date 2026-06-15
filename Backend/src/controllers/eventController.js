import Event from '../models/eventModel.js';
import Registration from '../models/registrationModel.js';
import Club from '../models/clubModel.js';
import Report from '../models/reportModel.js';
import { generatePosterBuffer } from '../services/bannerService.js';
import { uploadBannerToImageKit, deleteBannerFromImageKit } from '../services/imagekitService.js';
import { executeDynamicLifecycleBroadcasting } from '../services/notificationService.js';
import { emitWorkflowUpdate } from '../services/socketService.js';
import { activateTaskForEvent, createTaskForEvent, emitTaskChanged, finalizeTaskForEvent, reopenPosterTaskAfterStaffRejection } from './taskController.js';
import Admin from '../models/adminModel.js';
import EventTask from '../models/eventTaskModel.js';
import { canAccessEventThroughTask } from '../services/taskAccessService.js';

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
            .sort({ createdAt: -1 })
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
            req.body.status = 'pending_grafik_poster';
            req.body.creator = getCreatorPayload(req.user, 'President');
        } else if (req.memberClub) {
            req.body.club = req.memberClub._id;
            req.body.status = 'pending_president';
            req.body.creator = getCreatorPayload(req.user, 'Club Member');
        } else if (['admin', 'faculty_coordinator'].includes(req.user.role)) {
            req.body.creator = {
                name: req.user.name || req.user.email || req.user.adminId || 'Faculty Coordinator',
                usn: null,
                role: 'Faculty Coordinator'
            };
        }

        const event = new Event(req.body);
        if (event.status === 'pending_grafik_poster' && !await Club.exists({ specialRole: 'grafik' })) {
            return res.status(409).json({ success: false, message: 'Designate a Grafik club before submitting President-created events' });
        }
        await event.save();
        const populatedEvent = await populateEventQuery(Event.findById(event._id));
        
        if (populatedEvent.status === 'pending_president') {
            await executeDynamicLifecycleBroadcasting('EVENT_CREATED', populatedEvent);
        } else if (populatedEvent.status === 'pending_grafik_poster') {
            await createTaskForEvent(populatedEvent, 'poster', 'grafik');
            await executeDynamicLifecycleBroadcasting('EVENT_APPROVED', populatedEvent);
        }
        
        return res.status(201).json({ success: true, data: populatedEvent });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to create event' });
    }
};

export const getEvents = async (req, res) => {
    try {
        const events = await populateEventQuery(Event.find())
            .sort({ createdAt: -1 })
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
        if (!['admin', 'faculty_coordinator', 'hod'].includes(req.user.role)) {
            const ownsEventClub = event.club?.president?.toString() === req.user._id.toString()
                || event.club?.members?.some((member) => member.toString() === req.user._id.toString());
            const participatesInTask = await canAccessEventThroughTask(event._id, req.user);
            const isPublishedStudentEvent = req.user.role === 'student' && ['approved', 'completed'].includes(event.status);
            if (!ownsEventClub && !participatesInTask && !isPublishedStudentEvent) {
                return res.status(403).json({ success: false, message: 'You cannot access this event' });
            }
        }
        
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
        
        if (event.status === 'pending_president') {
            await executeDynamicLifecycleBroadcasting('EVENT_CREATED', event, { idempotencySuffix: String(event.updatedAt?.getTime?.() || Date.now()) });
        } else if (event.status === 'review') {
            await executeDynamicLifecycleBroadcasting('EVENT_APPROVED', event);
        }
        
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
        const posterTask = await EventTask.findOne({ event: id, type: 'poster' }).select('stage status');
        const posterReadyForFaculty = posterTask
            && (
                ['approved_by_president', 'submitted_to_faculty'].includes(posterTask.stage)
                || (!posterTask.stage && ['submitted', 'completed'].includes(posterTask.status))
            );
        if (!posterReadyForFaculty) {
            return res.status(409).json({ success: false, message: 'Grafik President must approve the poster before Faculty Coordinator approval' });
        }
        const event = await Event.findOneAndUpdate(
            { _id: id, status: { $in: ['pending_faculty', 'pending_admin'] } },
            {
                status: 'pending_hod',
                rejectedReason: null,
                rejectedBy: null,
                rejectedByModel: 'Admin',
                rejectedAt: null,
                'approvals.faculty': { reviewer: req.user._id, decidedAt: new Date(), decision: 'approved', reason: null }
            },
            { new: true }
        ).populate('club', 'name isActive president members').populate('creator.student', 'name usn email');
        
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        const updatedPosterTask = await EventTask.findOneAndUpdate(
            { event: event._id, type: 'poster' },
            { stage: 'submitted_to_hod' },
            { new: true }
        );
        if (updatedPosterTask) emitTaskChanged(updatedPosterTask);
        
        const hods = await Admin.find({ role: 'hod', active: true }).select('_id');
        await executeDynamicLifecycleBroadcasting('FACULTY_APPROVED', event);
        emitWorkflowUpdate(event, 'event:updated', { status: event.status });
        
        return res.status(200).json({ success: true, data: event, message: `Faculty approved. Sent to ${hods.length} HOD account(s).` });
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

        const eventToUpdate = await Event.findOne({ _id: id, status: { $in: ['pending_faculty', 'pending_admin'] } });
        if (!eventToUpdate) return res.status(404).json({ success: false, message: 'Event not found' });

        const targetStatus = rejectType === 'banner' ? 'banner_rejected' : 'faculty_rejected';

        eventToUpdate.status = targetStatus;
        eventToUpdate.rejectedReason = reason;
        eventToUpdate.rejectedBy = req.user._id;
        eventToUpdate.rejectedByModel = 'Admin';
        eventToUpdate.rejectedAt = new Date();
        eventToUpdate.approvals.faculty = { reviewer: req.user._id, decidedAt: new Date(), decision: 'rejected', reason };
        await eventToUpdate.save();

          const populatedEvent = await populateEventQuery(Event.findById(id));
          await reopenPosterTaskAfterStaffRejection(populatedEvent, 'rejected_by_faculty', req.user._id, reason.trim());
        
        if (targetStatus === 'banner_rejected') {
            await executeDynamicLifecycleBroadcasting('FLYER_REJECTED', populatedEvent);
        } else {
            await executeDynamicLifecycleBroadcasting('ADMIN_EVENT_REJECTED', populatedEvent);
        }
        emitWorkflowUpdate(populatedEvent, 'event:updated', { status: populatedEvent.status });
        
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

        const event = await populateEventQuery(Event.findByIdAndUpdate(id, { status: 'completed' }, { new: true }));
        await Promise.all([
            createTaskForEvent(event, 'gallery_upload', 'grafik'),
            activateTaskForEvent(event, 'social_media', 'pr', req.user._id)
        ]);
        await executeDynamicLifecycleBroadcasting('EVENT_COMPLETED', event, {
            actorId: req.user._id,
            actorRole: req.user.role
        });
        emitWorkflowUpdate(event, 'event:updated', { status: event.status });
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
        const isGrafikPresident = String(req.specialClub?.president || '') === String(req.user._id);
        const filter = {};
        if (isGrafikPresident) {
            filter.status = { $in: ['review', 'pending_grafik_poster', 'poster_submitted', 'pending_faculty', 'pending_hod', 'banner_rejected', 'faculty_rejected', 'hod_rejected', 'approved', 'completed', 'gallery_in_progress', 'gallery_submitted'] };
        } else {
            filter._id = { $in: await EventTask.distinct('event', { responsibleClub: req.specialClub._id, assignee: req.user._id, type: { $in: ['poster', 'gallery_upload'] } }) };
        }
        const events = await Event.find(filter).populate('club', 'name isActive president members').populate('creator.student', 'name usn email').sort({ createdAt: -1 });
        
        return res.status(200).json({ success: true, data: events });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch grafik events' });
    }
};

export const generateEventBanner = async (req, res) => {
    try {
          const event = await Event.findOne({ _id: req.params.id, status: { $in: ['review', 'pending_grafik_poster', 'banner_rejected', 'faculty_rejected', 'hod_rejected'] } }).populate('club');
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

          const event = await Event.findOne({ _id: req.params.id, status: { $in: ['review', 'pending_grafik_poster', 'banner_rejected', 'faculty_rejected', 'hod_rejected'] } });
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
        const task = req.eventTask || await EventTask.findOne({ event: req.params.id, type: 'poster' });
        if (!task) return res.status(404).json({ success: false, message: 'Poster task not found' });
        const isGrafikPresident = String(req.specialClub?.president || '') === String(req.user._id);

        if (!isGrafikPresident) {
            if (String(task.assignee || '') !== String(req.user._id)) {
                return res.status(403).json({ success: false, message: 'Only the assigned Grafik member can submit this poster' });
            }
            const event = await Event.findOneAndUpdate(
                  { _id: req.params.id, status: { $in: ['review', 'pending_grafik_poster', 'banner_rejected', 'faculty_rejected', 'hod_rejected'] }, bannerUrl: { $ne: null } },
                { status: 'poster_submitted' },
                { new: true }
            );
            if (!event) return res.status(409).json({ success: false, message: 'Upload a poster before submitting it' });
              task.status = 'submitted';
              task.stage = 'submitted_to_president';
            task.submission = { url: event.bannerUrl, text: 'Poster submitted to Grafik President for review.' };
            task.audit.push({ action: 'submitted', actor: req.user._id, actorModel: 'Student', note: 'Submitted from Grafik workspace' });
            await task.save();
            emitTaskChanged(task);
            emitWorkflowUpdate(event, 'event:updated', { status: event.status });
            return res.status(200).json({ success: true, data: event, message: 'Poster submitted to Grafik President' });
        }

        if (task.status !== 'submitted') {
            return res.status(409).json({ success: false, message: 'The assigned Grafik worker must submit the poster before President approval' });
        }
        const event = await Event.findOneAndUpdate(
            { _id: req.params.id, status: 'poster_submitted', bannerUrl: { $ne: null } },
            { status: 'pending_faculty' },
            { new: true }
        ).populate('club', 'name isActive president members').populate('creator.student', 'name usn email');
        
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        const updatedPosterTask = await EventTask.findOneAndUpdate(
            { event: event._id, type: 'poster' },
            {
                  status: 'submitted',
                  stage: 'submitted_to_faculty',
                reviewedBy: req.user._id,
                  completedAt: null,
                $push: { audit: { action: 'approved', actor: req.user._id, actorModel: 'Student', note: 'Poster approved from Grafik workspace' } }
            },
            { new: true }
        );
        if (updatedPosterTask) emitTaskChanged(updatedPosterTask);
        await executeDynamicLifecycleBroadcasting('FLYER_GENERATED', event);
        emitWorkflowUpdate(event, 'event:updated', { status: event.status });
        return res.status(200).json({ success: true, data: event, message: 'Poster approved. Event submitted to Faculty Coordinator.' });
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
        event.galleryStatus = 'pending';
        event.galleryRejectionReason = null;
        await event.save();

        const updatedEvent = await populateEventQuery(Event.findById(event._id));
        await executeDynamicLifecycleBroadcasting('GALLERY_UPLOADED', updatedEvent);
        emitWorkflowUpdate(updatedEvent, 'gallery:changed', { galleryStatus: updatedEvent.galleryStatus });

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
        event.galleryStatus = event.gallery.length > 0 ? 'pending' : 'draft';
        await event.save();
        emitWorkflowUpdate(event, 'gallery:changed', { galleryStatus: event.galleryStatus });

        return res.status(200).json({ success: true, data: event.gallery, message: 'Image deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete gallery image' });
    }
};

export const getPrCompletedEvents = async (req, res) => {
    try {
        const isPrPresident = String(req.specialClub?.president || '') === String(req.user._id);
        const taskFilter = { responsibleClub: req.specialClub._id, type: 'social_media' };
        if (!isPrPresident) taskFilter.assignee = req.user._id;
        const filter = {
            status: 'completed',
            _id: { $in: await EventTask.distinct('event', taskFilter) }
        };
        const events = await Event.find(filter)
            .populate('club', 'name isActive president members')
            .populate('creator.student', 'name usn email')
            .sort({ createdAt: -1 })
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
        if (!await Club.exists({ specialRole: 'grafik' })) {
            return res.status(409).json({ success: false, message: 'Designate a Grafik club before approving event proposals' });
        }

        event.status = 'pending_grafik_poster';
        event.approvals.president = { reviewer: req.user._id, decidedAt: new Date(), decision: 'approved', reason: null };
        event.rejectedReason = null;
        event.rejectedBy = null;
        event.rejectedByModel = 'Admin';
        event.rejectedAt = null;
        await event.save();

        const populatedEvent = await populateEventQuery(Event.findById(id));
        await createTaskForEvent(populatedEvent, 'poster', 'grafik');
        await executeDynamicLifecycleBroadcasting('EVENT_APPROVED', populatedEvent);
        
        return res.status(200).json({ success: true, data: populatedEvent, message: 'Proposal approved and sent to Grafik' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to approve proposal' });
    }
};

export const getPrEvents = async (req, res) => {
    try {
        const isPrPresident = String(req.specialClub?.president || '') === String(req.user._id);
        const filter = isPrPresident ? { status: { $in: ['approved', 'completed'] } } : {};
        if (!isPrPresident) {
            filter._id = { $in: await EventTask.distinct('event', { responsibleClub: req.specialClub._id, assignee: req.user._id, type: { $in: ['attendance', 'social_media'] } }) };
        }
        const events = await Event.find(filter).populate('club', 'name').populate('creator.student', 'name usn email').sort({ createdAt: -1 });
        return res.json({ success: true, data: events });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch PR events' });
    }
};

export const approveEventByHod = async (req, res) => {
    if (!await Club.exists({ specialRole: 'pr' })) {
        return res.status(409).json({ success: false, message: 'Designate a PR club before final event approval' });
    }
    const event = await populateEventQuery(Event.findOneAndUpdate(
        { _id: req.params.id, status: 'pending_hod' },
        {
            status: 'approved',
            'approvals.hod': { reviewer: req.user._id, decidedAt: new Date(), decision: 'approved', reason: null }
        },
        { new: true }
    ));
      if (!event) return res.status(404).json({ success: false, message: 'Event awaiting HOD approval not found' });
      await finalizeTaskForEvent(event, 'poster', req.user._id);
    await Promise.all([
        createTaskForEvent(event, 'attendance', 'pr'),
        createTaskForEvent(event, 'social_media', 'pr')
    ]);
    await executeDynamicLifecycleBroadcasting('HOD_APPROVED', event);
    emitWorkflowUpdate(event, 'event:updated', { status: event.status });
    return res.json({ success: true, data: event, message: 'Event published to students' });
};

export const rejectEventByHod = async (req, res) => {
    if (!req.body.reason?.trim()) return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    const event = await populateEventQuery(Event.findOneAndUpdate(
        { _id: req.params.id, status: 'pending_hod' },
        {
            status: 'hod_rejected',
            rejectedReason: req.body.reason.trim(),
            rejectedBy: req.user._id,
            rejectedByModel: 'Admin',
            rejectedAt: new Date(),
            'approvals.hod': { reviewer: req.user._id, decidedAt: new Date(), decision: 'rejected', reason: req.body.reason.trim() }
        },
        { new: true }
    ));
      if (!event) return res.status(404).json({ success: false, message: 'Event awaiting HOD approval not found' });
      await reopenPosterTaskAfterStaffRejection(event, 'rejected_by_hod', req.user._id, req.body.reason.trim());
    await executeDynamicLifecycleBroadcasting('HOD_REJECTED', event);
    emitWorkflowUpdate(event, 'event:updated', { status: event.status });
    return res.json({ success: true, data: event });
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
        await executeDynamicLifecycleBroadcasting('EVENT_REJECTED', populatedEvent);
        
        return res.status(200).json({ success: true, data: populatedEvent, message: 'Proposal rejected' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to reject proposal' });
    }
};

export const reviewGallery = async (req, res) => {
    try {
        const { decision, reason } = req.body;
        if (!['approved', 'rejected'].includes(decision)) {
            return res.status(400).json({ success: false, message: 'Decision must be approved or rejected.' });
        }
        if (decision === 'rejected' && !reason?.trim()) {
            return res.status(400).json({ success: false, message: 'A rejection reason is required.' });
        }

        const event = await populateEventQuery(Event.findOne({ _id: req.params.id, status: 'completed', 'gallery.0': { $exists: true } }));
        if (!event) return res.status(404).json({ success: false, message: 'Completed event gallery not found.' });

        event.galleryStatus = decision;
        event.galleryRejectionReason = decision === 'rejected' ? reason.trim() : null;
        await event.save();
        await executeDynamicLifecycleBroadcasting(
            decision === 'approved' ? 'GALLERY_APPROVED' : 'GALLERY_REJECTED',
            event
        );
        return res.status(200).json({ success: true, data: event, message: `Gallery ${decision}.` });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to review gallery.' });
    }
};
