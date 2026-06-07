import React, { useEffect, useState } from 'react';
import { getStudentAttendanceReportApi } from '../service/attendanceService';
import '../style/Attendance.scss';

const StudentAttendance = () => {
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        
        const fetchStudentRecords = async () => {
            setIsLoading(true);
            try {
                const data = await getStudentAttendanceReportApi();
                if (isMounted) setRecords(data);
            } catch (error) {
                console.error("Failed to load student attendance:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchStudentRecords();

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div className="attendance-page">
            <div className="attendance-header">
                <h1>My Attendance Tracker</h1>
                <p>Track your registration and attendance scans for all campus events.</p>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ width: '150px' }}>Date</th>
                            <th style={{ width: '120px' }}>Status</th>
                            <th>Event Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="3" style={{ textAlign: 'center', padding: '40px' }}>Loading records...</td></tr>
                        ) : records.length === 0 ? (
                            <tr><td colSpan="3" style={{ textAlign: 'center', padding: '40px' }}>No event days recorded yet.</td></tr>
                        ) : (
                            records.map((record, index) => (
                                <tr key={index}>
                                    <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{record.date}</td>
                                    <td>
                                        <span className={`status-badge ${record.status.replace(/\s+/g, '-').toLowerCase()}`}>
                                            {record.status}
                                        </span>
                                    </td>
                                    <td style={{ color: '#475569', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.5 }}>
                                        {record.eventName}
                                    </td>
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