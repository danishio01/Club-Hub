import React, { useEffect, useState, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { getAdminAttendanceReportApi } from '../service/attendanceService';
import '../style/Attendance.scss';

const AdminAttendance = () => {
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [filterSemester, setFilterSemester] = useState('');
    const [filterSection, setFilterSection] = useState('');

    const loadRecords = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getAdminAttendanceReportApi();
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

    const filteredRecords = useMemo(() => {
        let result = records;

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(r => 
                r.studentName.toLowerCase().includes(lowerSearch) || 
                r.usn.toLowerCase().includes(lowerSearch)
            );
        }

        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            result = result.filter(r => new Date(r.rawDate) >= start);
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            result = result.filter(r => new Date(r.rawDate) <= end);
        }

        if (filterStatus) {
            result = result.filter(r => r.status === filterStatus);
        }

        if (filterDepartment) {
            result = result.filter(r => r.department === filterDepartment);
        }

        if (filterSemester) {
            result = result.filter(r => r.semester === filterSemester);
        }

        if (filterSection) {
            result = result.filter(r => r.section === filterSection);
        }

        return result;
    }, [searchTerm, startDate, endDate, filterStatus, filterDepartment, filterSemester, filterSection, records]);

    const stats = useMemo(() => {
        let present = 0;
        let absent = 0;
        filteredRecords.forEach(r => {
            if (r.status === 'Present') present++;
            else absent++;
        });
        return { total: filteredRecords.length, present, absent };
    }, [filteredRecords]);

    const clearFilters = () => {
        setSearchTerm('');
        setStartDate('');
        setEndDate('');
        setFilterStatus('');
        setFilterDepartment('');
        setFilterSemester('');
        setFilterSection('');
    };

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(filteredRecords.map(r => ({
            'Student Name': r.studentName,
            'USN': r.usn,
            'Department': r.department,
            'Semester': r.semester,
            'Section': r.section,
            'Date': r.date,
            'Status': r.status,
            'Event Attended': r.eventName
        })));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Range Report");
        XLSX.writeFile(workbook, "Campus_Attendance_Range_Report.xlsx");
    };

    const uniqueDepartments = [...new Set(records.map(r => r.department))].filter(Boolean).sort();
    const uniqueSemesters = [...new Set(records.map(r => r.semester))].filter(Boolean).sort();
    const uniqueSections = [...new Set(records.map(r => r.section))].filter(Boolean).sort();

    return (
        <div className="attendance-page">
            <div className="attendance-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Master Attendance Report</h1>
                    <p>Track student participation with advanced range filtering and analytics.</p>
                </div>
            </div>

            <div className="summary-stats">
                <div className="stat-card total">
                    <span className="stat-label">Total Records Found</span>
                    <span className="stat-value">{stats.total}</span>
                </div>
                <div className="stat-card present">
                    <span className="stat-label">Total Present</span>
                    <span className="stat-value">{stats.present}</span>
                </div>
                <div className="stat-card absent">
                    <span className="stat-label">Total Absent</span>
                    <span className="stat-value">{stats.absent}</span>
                </div>
            </div>

            <div className="filters-panel">
                <div className="filters-header">
                    <h3>Filter Records</h3>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn-clear" onClick={clearFilters}>Clear Filters</button>
                        <button className="btn-export" onClick={exportToExcel}>
                            <i className="ri-file-excel-2-line"></i> Export XLSX
                        </button>
                    </div>
                </div>

                <div className="filters-grid">
                    <div className="filter-group">
                        <label>Search Student</label>
                        <input 
                            type="text" 
                            className="filter-input" 
                            placeholder="Name or USN..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="filter-group">
                        <label>Start Date</label>
                        <input 
                            type="date" 
                            className="filter-input" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <label>End Date</label>
                        <input 
                            type="date" 
                            className="filter-input" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <label>Department</label>
                        <select className="filter-input" value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}>
                            <option value="">All Departments</option>
                            {uniqueDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Semester</label>
                        <select className="filter-input" value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)}>
                            <option value="">All Semesters</option>
                            {uniqueSemesters.map(sem => <option key={sem} value={sem}>{sem}</option>)}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Section</label>
                        <select className="filter-input" value={filterSection} onChange={(e) => setFilterSection(e.target.value)}>
                            <option value="">All Sections</option>
                            {uniqueSections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Status</label>
                        <select className="filter-input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option value="">All Statuses</option>
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Student Details</th>
                            <th>Dept, Sem & Section</th>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Event Attended</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center' }}>Loading reports...</td></tr>
                        ) : filteredRecords.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center' }}>No records match your filters.</td></tr>
                        ) : (
                            filteredRecords.map((record, index) => (
                                <tr key={index}>
                                    <td>
                                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{record.studentName}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{record.usn}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{record.department}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                            Sem: {record.semester} | Sec: {record.section}
                                        </div>
                                    </td>
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

export default AdminAttendance;