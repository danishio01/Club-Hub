export const getDashboardStats = async (req, res) => {
    try {
        const stats = {
            totalStudents: 1245,
            totalClubs: 14,
            totalEvents: 36,
            totalCertificates: 850,
            totalParticipation: 3200,
            mostActiveClub: "Robotics Club"
        };

        return res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error while fetching dashboard stats'
        });
    }
};