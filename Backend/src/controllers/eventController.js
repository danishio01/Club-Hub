import Event from '../models/eventModel.js';
import Registration from '../models/registrationModel.js';

export const createEvent = async (req, res) => {
    try {
        const event = new Event(req.body);
        await event.save();
        const populatedEvent = await Event.findById(event._id).populate('club', 'name isActive');
        return res.status(201).json({ success: true, data: populatedEvent });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to create event' });
    }
};

export const getEvents = async (req, res) => {
    try {
        const events = await Event.find()
            .populate('club', 'name isActive')
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

export const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await Event.findByIdAndUpdate(id, req.body, { new: true })
            .populate('club', 'name isActive');
        return res.status(200).json({ success: true, data: event });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update event' });
    }
};

export const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        await Event.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: 'Event deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete event' });
    }
};

export const getStudentEvents = async (req, res) => {
    try {
        const studentId = req.user._id;
        
        const events = await Event.find()
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