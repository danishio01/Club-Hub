import Club from '../models/clubModel.js';
import Student from '../models/studentModel.js';
import ClubAssignment from '../models/clubAssignmentModel.js';
import { uploadImageToImageKit, deleteBannerFromImageKit } from '../services/imagekitService.js';
import { emitToRooms } from '../services/socketService.js';

const emitClubChanged = (clubId, action) => emitToRooms(
    ['role:faculty_coordinator', 'role:hod', clubId ? `club:${clubId}` : null],
    'clubs:changed',
    { clubId: clubId ? String(clubId) : null, action }
);

const clubPopulate = [
    { path: 'president', select: 'name email usn' },
    { path: 'members', select: 'name email usn department semester section role' }
];

const normalizeClubInput = (body) => ({
    ...body,
    name: body.name?.trim(),
    description: body.description?.trim(),
    specialRole: body.specialRole || null,
    president: body.president || null
});

const sendClubError = (res, error, fallback) => {
    console.error(`[CLUB] ${fallback}`, error);
    if (error?.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0];
        const messages = {
            name: 'A club with this name already exists',
            president: 'This President is already assigned to another club',
            specialRole: `A club is already designated for this special responsibility`,
            student: 'This student is already assigned to another club'
        };
        return res.status(409).json({ success: false, message: messages[field] || 'Club assignment already exists' });
    }
    if (error?.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: fallback });
};

const reserveAssignment = async (student, club, position) => {
    if (!student) return null;
    return ClubAssignment.create({ student, club, position });
};

const releaseClubAssignments = (club) => ClubAssignment.deleteMany({ club });

const getManagedClub = async (req, clubId) => {
    if (['admin', 'faculty_coordinator', 'hod'].includes(req.user?.role)) {
        return await Club.findById(clubId);
    }

    if (req.user?.role === 'president') {
        return await Club.findOne({ _id: clubId, president: req.user._id });
    }

    return null;
};

export const createClub = async (req, res) => {
    let club;
    try {
        const input = normalizeClubInput(req.body);
        if (input.president) {
            const occupied = await Club.findOne({
                $or: [{ president: input.president }, { members: input.president }]
            });
            if (occupied) return res.status(409).json({ success: false, message: 'President is already assigned to another club' });
        }
        if (input.specialRole) {
            const existing = await Club.findOne({ specialRole: input.specialRole });
            if (existing) return res.status(409).json({ success: false, message: `A ${input.specialRole.toUpperCase()} club is already designated` });
        }
        club = new Club(input);
        await club.save();
        await reserveAssignment(input.president, club._id, 'president');
        const populatedClub = await Club.findById(club._id).populate(clubPopulate);
        emitClubChanged(club._id, 'created');
        return res.status(201).json({ success: true, data: populatedClub });
    } catch (error) {
        if (club?._id) {
            await releaseClubAssignments(club._id).catch(() => {});
            await Club.deleteOne({ _id: club._id }).catch(() => {});
        }
        return sendClubError(res, error, 'Failed to create club');
    }
};

export const getClubs = async (req, res) => {
    try {
        const query = req.user?.role === 'president'
            ? { president: req.user._id }
            : req.user?.role === 'student'
                ? { members: req.user._id }
                : {};
        const clubsQuery = Club.find(query).populate(clubPopulate).sort({ createdAt: -1 });
        const clubs = await clubsQuery;
        return res.status(200).json({ success: true, data: clubs });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch clubs' });
    }
};

export const updateClub = async (req, res) => {
    let reservedPresident = null;
    let releasedPresident = null;
    try {
        const { id } = req.params;
        const input = normalizeClubInput(req.body);
        const current = await Club.findById(id);
        if (!current) return res.status(404).json({ success: false, message: 'Club not found' });
        if (input.president) {
            const occupied = await Club.findOne({
                _id: { $ne: id },
                $or: [{ president: input.president }, { members: input.president }]
            });
            if (occupied) return res.status(409).json({ success: false, message: 'President is already assigned to another club' });
        }
        if (input.specialRole) {
            const existing = await Club.findOne({ _id: { $ne: id }, specialRole: input.specialRole });
            if (existing) return res.status(409).json({ success: false, message: `A ${input.specialRole.toUpperCase()} club is already designated` });
        }
        if (String(current.president || '') !== String(input.president || '')) {
            if (input.president) {
                await reserveAssignment(input.president, id, 'president');
                reservedPresident = input.president;
            }
            if (current.president) {
                await ClubAssignment.deleteOne({ student: current.president, club: id });
                releasedPresident = current.president;
            }
        }
        const club = await Club.findByIdAndUpdate(id, input, { new: true, runValidators: true }).populate(clubPopulate);
        emitClubChanged(id, 'updated');
        return res.status(200).json({ success: true, data: club });
    } catch (error) {
        if (reservedPresident) await ClubAssignment.deleteOne({ student: reservedPresident, club: req.params.id }).catch(() => {});
        if (releasedPresident) await reserveAssignment(releasedPresident, req.params.id, 'president').catch(() => {});
        return sendClubError(res, error, 'Failed to update club');
    }
};

export const deleteClub = async (req, res) => {
    try {
        const { id } = req.params;
        await releaseClubAssignments(id);
        await Club.findByIdAndDelete(id);
        emitClubChanged(id, 'deleted');
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

        const existingClub = await Club.findOne({
            _id: { $ne: id },
            $or: [{ members: studentId }, { president: studentId }]
        });
        if (existingClub) {
            return res.status(409).json({ success: false, message: 'Student is already a member of another club' });
        }

        if (!club.members.some(member => member.toString() === studentId)) {
            await reserveAssignment(studentId, id, 'member');
            club.members.push(studentId);
            await club.save();
        }

        const populatedClub = await Club.findById(id).populate(clubPopulate);
        emitClubChanged(id, 'member_added');
        return res.status(200).json({ success: true, data: populatedClub });
    } catch (error) {
        return sendClubError(res, error, 'Failed to add club member');
    }
};

export const uploadClubLogo = async (req, res) => {
    try {
        const { imageBase64 } = req.body;
        if (!imageBase64 || !/^data:image\/(png|jpe?g|webp);base64,/i.test(imageBase64)) {
            return res.status(400).json({ success: false, message: 'A PNG, JPG, or WebP logo is required' });
        }
        if (Buffer.byteLength(imageBase64, 'base64') > 5 * 1024 * 1024) {
            return res.status(413).json({ success: false, message: 'Logo must be smaller than 5 MB' });
        }
        const club = await Club.findById(req.params.id);
        if (!club) return res.status(404).json({ success: false, message: 'Club not found' });
        const result = await uploadImageToImageKit(imageBase64, club.name.replace(/[^a-z0-9]/gi, '_'), '/ClubHub/ClubLogos/');
        if (club.logoFileId) await deleteBannerFromImageKit(club.logoFileId).catch(() => {});
        club.logoUrl = result.url;
        club.logoFileId = result.fileId;
        await club.save();
        emitClubChanged(club._id, 'logo_updated');
        return res.json({ success: true, data: { logoUrl: club.logoUrl } });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to upload club logo' });
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
        await ClubAssignment.deleteOne({ club: id, student: studentId, position: 'member' });

        const populatedClub = await Club.findById(id).populate(clubPopulate);
        emitClubChanged(id, 'member_removed');
        return res.status(200).json({ success: true, data: populatedClub });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to remove club member' });
    }
};

export const getAvailableClubStudents = async (req, res) => {
    try {
        const { position = 'member', search = '', clubId } = req.query;
        const [clubMembers, clubPresidents] = await Promise.all([
            Club.distinct('members'),
            Club.distinct('president')
        ]);
        const assignmentIds = await ClubAssignment.distinct('student');
        const excluded = [...new Set([...clubMembers, ...clubPresidents, ...assignmentIds].filter(Boolean).map(String))];
        if (clubId) {
            const current = await Club.findById(clubId).select('president');
            if (current?.president) {
                const index = excluded.indexOf(String(current.president));
                if (index >= 0) excluded.splice(index, 1);
            }
        }
        const filter = {
            role: position === 'president' ? 'president' : 'student',
            _id: { $nin: excluded }
        };
        if (search.trim()) {
            const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.$or = [
                { name: { $regex: escaped, $options: 'i' } },
                { usn: { $regex: escaped, $options: 'i' } }
            ];
        }
        const students = await Student.find(filter).select('name usn email role department semester section').sort({ name: 1 }).limit(100);
        return res.json({ success: true, data: students });
    } catch (error) {
        return sendClubError(res, error, 'Failed to fetch available students');
    }
};
