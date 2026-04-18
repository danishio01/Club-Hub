import Registration from '../models/registrationModel.js';
import Event from '../models/eventModel.js';

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
        console.error(error);
        return res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
};