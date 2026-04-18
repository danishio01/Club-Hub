import React, { useEffect, useState, useCallback } from 'react';
import { getLeaderboardApi, resetLeaderboardApi } from '../service/leaderboardService';
import '../style/Leaderboard.scss';

const Leaderboard = ({ isAdmin }) => {
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadLeaderboard = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getLeaderboardApi();
            setStudents(data);
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            await loadLeaderboard();
        };
        fetchData();
    }, [loadLeaderboard]);

    const handleReset = async () => {
        if (window.confirm('Are you sure you want to reset the leaderboard? All student points will be set to 0.')) {
            try {
                const response = await resetLeaderboardApi();
                alert(response.message);
                await loadLeaderboard();
            } catch (error) {
                console.error('Reset failed:', error);
                alert('Failed to reset leaderboard.');
            }
        }
    };

    const getRankStyle = (rank) => {
        if (rank === 1) return 'rank-1';
        if (rank === 2) return 'rank-2';
        if (rank === 3) return 'rank-3';
        return 'rank-other';
    };

    return (
        <div className="leaderboard-wrapper">
            <div className="leaderboard-container">
                <div className="leaderboard-header">
                    <h2><i className="ri-trophy-line" style={{ color: '#eab308' }}></i> Campus Leaderboard</h2>
                    {isAdmin && (
                        <button className="btn-danger" onClick={handleReset}>
                            <i className="ri-refresh-line"></i> Reset Leaderboard
                        </button>
                    )}
                </div>

                <div className="leaderboard-table-container">
                    <table className="leaderboard-table">
                        <thead>
                            <tr>
                                <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                                <th>Student Name</th>
                                <th>USN</th>
                                <th style={{ width: '120px' }}>Total Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px' }}>Loading rankings...</td>
                                </tr>
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No points earned yet.</td>
                                </tr>
                            ) : (
                                students.map((student) => (
                                    <tr key={student._id}>
                                        <td data-label="Rank">
                                            <div style={{ margin: '0 auto' }} className={`rank-badge ${getRankStyle(student.rank)}`}>
                                                {student.rank}
                                            </div>
                                        </td>
                                        <td data-label="Name" style={{ fontWeight: 600, color: '#0f172a' }}>{student.name}</td>
                                        <td data-label="USN" style={{ color: '#475569' }}>{student.usn}</td>
                                        <td data-label="Points">
                                            <span className="points-badge">{student.points} pts</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;