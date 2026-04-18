import React, { useEffect, useState, useCallback } from 'react';
import { getStudentAttendanceReportApi } from '../service/attendanceService';
import '../style/Attendance.scss';

const StudentAttendance = () => {
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadRecords = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getStudentAttendanceReportApi();
            setRecords(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => { await loadRecords(); };
        fetchData();
    }, [loadRecords]);

    return (
        <div className="attendance-page">
            <div className="attendance-header">
                <h1>My Attendance Tracker</h1>
                <p>Track your attendance for all past campus event days.</p>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Event Attended</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="3" style={{ textAlign: 'center' }}>Loading records...</td></tr>
                        ) : records.length === 0 ? (
                            <tr><td colSpan="3" style={{ textAlign: 'center' }}>No event days recorded yet.</td></tr>
                        ) : (
                            records.map((record, index) => (
                                <tr key={index}>
                                    <td style={{ fontWeight: 500 }}>{record.date}</td>
                                    <td>
                                        <span className={`status-badge ${record.status.toLowerCase()}`}>
                                            {record.status}
                                        </span>
                                    </td>
                                    <td style={{ color: '#475569' }}>{record.eventName}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StudentAttendance;