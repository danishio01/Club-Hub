import Student from '../models/studentModel.js';
import Club from '../models/clubModel.js';
import Event from '../models/eventModel.js';

export const getDashboardStats = async (req, res) => {
    try {
        const totalStudents = await Student.countDocuments();
        const totalClubs = await Club.countDocuments();
        const totalEvents = await Event.countDocuments();

        const activeClubAggregation = await Event.aggregate([
            {
                $group: {
                    _id: '$club',
                    eventCount: { $sum: 1 }
                }
            },
            {
                $sort: { eventCount: -1 }
            },
            {
                $limit: 1
            },
            {
                $lookup: {
                    from: 'clubs',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'clubDetails'
                }
            },
            {
                $unwind: '$clubDetails'
            }
        ]);

        const mostActiveClub = activeClubAggregation.length > 0 
            ? activeClubAggregation[0].clubDetails.name 
            : "No active clubs";

        const totalParticipation = 0;

        const stats = {
            totalStudents,
            totalClubs,
            totalEvents,
            totalParticipation,
            mostActiveClub
        };

        return res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching dashboard stats'
        });
    }
};