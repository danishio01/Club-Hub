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

    const processedData = useMemo(() => {
        if (!records || records.length === 0) return { columns: [], rows: [] };

        const dateMap = new Map();
        records.forEach(r => {
            if (!dateMap.has(r.date)) {
                dateMap.set(r.date, new Date(r.rawDate));
            }
        });

        let columns = Array.from(dateMap.entries())
            .sort((a, b) => a[1] - b[1])
            .map(entry => ({ label: entry[0], raw: entry[1] }));

        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            columns = columns.filter(c => c.raw >= start);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            columns = columns.filter(c => c.raw <= end);
        }

        const studentMap = new Map();
        records.forEach(r => {
            if (!studentMap.has(r.usn)) {
                studentMap.set(r.usn, {
                    studentName: r.studentName || 'Unknown Student',
                    usn: r.usn || 'N/A',
                    department: r.department,
                    semester: r.semester,
                    section: r.section,
                    attendance: {}
                });
            }
            studentMap.get(r.usn).attendance[r.date] = r.eventName !== '-' ? r.eventName : 'Absent';
        });

        let rows = Array.from(studentMap.values());

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            rows = rows.filter(r => 
                r.studentName.toLowerCase().includes(lowerSearch) || 
                r.usn.toLowerCase().includes(lowerSearch)
            );
        }
        if (filterDepartment) rows = rows.filter(r => r.department === filterDepartment);
        if (filterSemester) rows = rows.filter(r => r.semester === filterSemester);
        if (filterSection) rows = rows.filter(r => r.section === filterSection);

        if (filterStatus) {
            rows = rows.filter(r => {
                return columns.some(col => {
                    const val = r.attendance[col.label];
                    if (filterStatus === 'Present') return val !== 'Absent';
                    return val === 'Absent';
                });
            });
        }

        return { columns, rows };
    }, [records, searchTerm, startDate, endDate, filterStatus, filterDepartment, filterSemester, filterSection]);

    const stats = useMemo(() => {
        let present = 0;
        let absent = 0;
        processedData.rows.forEach(r => {
            processedData.columns.forEach(c => {
                if (r.attendance[c.label] !== 'Absent') present++;
                else absent++;
            });
        });
        return { totalStudents: processedData.rows.length, present, absent };
    }, [processedData]);

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
        const exportData = processedData.rows.map(row => {
            const obj = {
                'Student Name': row.studentName,
                'USN': row.usn,
                'Department': row.department,
                'Semester': row.semester,
                'Section': row.section,
            };
            processedData.columns.forEach(col => {
                obj[col.label] = row.attendance[col.label] || 'Absent';
            });
            return obj;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Grid");
        XLSX.writeFile(workbook, "Campus_Attendance_Grid_Report.xlsx");
    };

    const uniqueDepartments = [...new Set(records.map(r => r.department))].filter(Boolean).sort();
    const uniqueSemesters = [...new Set(records.map(r => r.semester))].filter(Boolean).sort();
    const uniqueSections = [...new Set(records.map(r => r.section))].filter(Boolean).sort();

    return (
        <div className="attendance-page">
            <div className="attendance-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Master Attendance Grid</h1>
                    <p>Track student participation across all events dynamically.</p>
                </div>
            </div>

            <div className="summary-stats">
                <div className="stat-card total">
                    <span className="stat-label">Students in Grid</span>
                    <span className="stat-value">{stats.totalStudents}</span>
                </div>
                <div className="stat-card present">
                    <span className="stat-label">Total Participations</span>
                    <span className="stat-value">{stats.present}</span>
                </div>
                <div className="stat-card absent">
                    <span className="stat-label">Total Absences</span>
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
                        <select className="filter-input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} title="Filters students who were Present/Absent on ANY of the visible dates">
                            <option value="">Any Status</option>
                            <option value="Present">Has Attended</option>
                            <option value="Absent">Has Absences</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="table-container" style={{ overflowX: 'auto' }}>
                <table style={{ whiteSpace: 'nowrap' }}>
                    <thead>
                        <tr>
                            <th style={{ minWidth: '200px', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 1 }}>Student Details</th>
                            <th style={{ minWidth: '150px' }}>Dept, Sem & Sec</th>
                            {processedData.columns.map(col => (
                                <th key={col.label} style={{ minWidth: '150px' }}>{col.label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={processedData.columns.length + 2} style={{ textAlign: 'center' }}>Loading reports...</td></tr>
                        ) : processedData.rows.length === 0 ? (
                            <tr><td colSpan={processedData.columns.length + 2} style={{ textAlign: 'center' }}>No records match your filters.</td></tr>
                        ) : (
                            processedData.rows.map((row, index) => (
                                <tr key={index}>
                                    <td style={{ position: 'sticky', left: 0, background: '#ffffff', zIndex: 1, borderRight: '1px solid #e2e8f0' }}>
                                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.studentName}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{row.usn}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{row.department}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                            Sem: {row.semester} | Sec: {row.section}
                                        </div>
                                    </td>
                                    {processedData.columns.map(col => {
                                        const status = row.attendance[col.label] || 'Absent';
                                        return (
                                            <td key={col.label}>
                                                {status === 'Absent' ? (
                                                    <span className="status-badge absent">Absent</span>
                                                ) : (
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#16a34a' }}>
                                                        <i className="ri-check-line"></i> {status}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
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