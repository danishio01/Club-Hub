import Club from '../models/clubModel.js';

export const createClub = async (req, res) => {
    try {
        const club = new Club(req.body);
        await club.save();
        return res.status(201).json({ success: true, data: club });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to create club' });
    }
};

export const getClubs = async (req, res) => {
    try {
        const clubs = await Club.find().sort({ name: 1 });
        return res.status(200).json({ success: true, data: clubs });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch clubs' });
    }
};

export const updateClub = async (req, res) => {
    try {
        const { id } = req.params;
        const club = await Club.findByIdAndUpdate(id, req.body, { new: true });
        return res.status(200).json({ success: true, data: club });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update club' });
    }
};

export const deleteClub = async (req, res) => {
    try {
        const { id } = req.params;
        await Club.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: 'Club deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete club' });
    }
};