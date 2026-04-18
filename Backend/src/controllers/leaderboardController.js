import Student from '../models/studentModel.js';

export const getLeaderboard = async (req, res) => {
    try {
        const students = await Student.find()
            .select('name usn points department')
            .sort({ points: -1, name: 1 })
            .lean();

        const rankedStudents = students.map((student, index) => ({
            ...student,
            rank: index + 1
        }));

        return res.status(200).json({ success: true, data: rankedStudents });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
    }
};

export const resetLeaderboard = async (req, res) => {
    try {
        await Student.updateMany({}, { points: 0 });
        return res.status(200).json({ success: true, message: 'Leaderboard reset successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to reset leaderboard' });
    }
};