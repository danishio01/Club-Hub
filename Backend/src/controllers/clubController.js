import Club from '../models/clubModel.js';
import Student from '../models/studentModel.js';

const clubPopulate = [
    { path: 'president', select: 'name email usn' },
    { path: 'members', select: 'name email usn department semester section role' }
];

const getManagedClub = async (req, clubId) => {
    if (req.user?.role === 'admin') {
        return await Club.findById(clubId);
    }

    if (req.user?.role === 'president') {
        return await Club.findOne({ _id: clubId, president: req.user._id });
    }

    return null;
};

export const createClub = async (req, res) => {
    try {
        const club = new Club(req.body);
        await club.save();
        const populatedClub = await Club.findById(club._id).populate(clubPopulate);
        return res.status(201).json({ success: true, data: populatedClub });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to create club' });
    }
};

export const getClubs = async (req, res) => {
    try {
        const query = req.user?.role === 'president'
            ? { president: req.user._id }
            : req.user?.role === 'student'
                ? { members: req.user._id }
                : {};
        const clubs = await Club.find(query).populate(clubPopulate).sort({ name: 1 });
        return res.status(200).json({ success: true, data: clubs });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch clubs' });
    }
};

export const updateClub = async (req, res) => {
    try {
        const { id } = req.params;
        const club = await Club.findByIdAndUpdate(id, req.body, { new: true }).populate(clubPopulate);
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

export const addClubMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { studentId } = req.body;

        if (!studentId) {
            return res.status(400).json({ success: false, message: 'Student is required' });
        }

        const club = await getManagedClub(req, id);
        if (!club) {
            return res.status(403).json({ success: false, message: 'You cannot manage this club' });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        if (student.role !== 'student') {
            return res.status(400).json({ success: false, message: 'Only students can be assigned as club members' });
        }

        if (club.president?.toString() === studentId) {
            return res.status(400).json({ success: false, message: 'President is already assigned to this club' });
        }

        const existingClub = await Club.findOne({ members: studentId, _id: { $ne: id } });
        if (existingClub) {
            return res.status(400).json({ success: false, message: 'Student is already a member of another club' });
        }

        if (!club.members.some(member => member.toString() === studentId)) {
            club.members.push(studentId);
            await club.save();
        }

        const populatedClub = await Club.findById(id).populate(clubPopulate);
        return res.status(200).json({ success: true, data: populatedClub });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to add club member' });
    }
};

export const removeClubMember = async (req, res) => {
    try {
        const { id, studentId } = req.params;

        const club = await getManagedClub(req, id);
        if (!club) {
            return res.status(403).json({ success: false, message: 'You cannot manage this club' });
        }

        club.members = club.members.filter(member => member.toString() !== studentId);
        await club.save();

        const populatedClub = await Club.findById(id).populate(clubPopulate);
        return res.status(200).json({ success: true, data: populatedClub });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to remove club member' });
    }
};
