import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getStudentsList, deleteStudentService } from '../service/studentService';
import AddStudentModal from '../components/AddStudentModal';
import BulkImportModal from '../components/BulkImportModal';
import '../style/Students.scss';

const Students = () => {
    const dispatch = useDispatch();
    const { students, isLoading } = useSelector((state) => state.students);
    
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [semesterFilter, setSemesterFilter] = useState('');
    const [sectionFilter, setSectionFilter] = useState('');
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

    const loadStudents = () => {
        dispatch(getStudentsList(semesterFilter, sectionFilter, departmentFilter));
    };

    useEffect(() => {
        loadStudents();
    }, [dispatch, semesterFilter, sectionFilter, departmentFilter]);

    const handleDelete = async (id) => {
        if(window.confirm('Are you sure you want to delete this student?')) {
            await deleteStudentService(id);
            loadStudents();
        }
    };

    const handleSuccess = () => {
        setIsAddModalOpen(false);
        setIsBulkModalOpen(false);
        loadStudents();
    };

    return (
        <div className="students-page">
            <div className="page-header-actions">
                <div className="title-section">
                    <h1>Student Management</h1>
                    <p>Manage student accounts, departments, sections, and semesters.</p>
                </div>
                <div className="action-buttons">
                    <button className="btn-secondary" onClick={() => setIsBulkModalOpen(true)}>
                        <i className="ri-file-excel-line"></i> Bulk Import
                    </button>
                    <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
                        <i className="ri-user-add-line"></i> Add Student
                    </button>
                </div>
            </div>

            <div className="filters-card">
                <div className="filter-group">
                    <label>Filter by Department</label>
                    <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                        <option value="">All Departments</option>
                        <option value="CSE">CSE</option>
                        <option value="CSE-AIML">CSE-AIML</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label>Filter by Semester</label>
                    <select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)}>
                        <option value="">All Semesters</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                            <option key={sem} value={sem}>Semester {sem}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Filter by Section</label>
                    <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
                        <option value="">All Sections</option>
                        {['A', 'B', 'C', 'D'].map(sec => (
                            <option key={sec} value={sec}>Section {sec}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>USN</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Dept</th>
                            <th>Sem</th>
                            <th>Sec</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="7" style={{textAlign: 'center'}}>Loading data...</td></tr>
                        ) : students.length === 0 ? (
                            <tr><td colSpan="7" style={{textAlign: 'center'}}>No students found for this selection.</td></tr>
                        ) : (
                            students.map(student => (
                                <tr key={student._id}>
                                    <td>{student.usn}</td>
                                    <td>{student.name}</td>
                                    <td>{student.email}</td>
                                    <td>{student.department}</td>
                                    <td>{student.semester}</td>
                                    <td>{student.section}</td>
                                    <td>
                                        <button className="action-icon edit">
                                            <i className="ri-pencil-line"></i>
                                        </button>
                                        <button className="action-icon delete" onClick={() => handleDelete(student._id)}>
                                            <i className="ri-delete-bin-line"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isAddModalOpen && <AddStudentModal onClose={() => setIsAddModalOpen(false)} onSuccess={handleSuccess} />}
            {isBulkModalOpen && <BulkImportModal onClose={() => setIsBulkModalOpen(false)} onSuccess={handleSuccess} />}
        </div>
    );
};

export default Students;