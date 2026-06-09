import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getStudentsList, deleteStudentService } from '../service/studentService';
import AddStudentModal from '../components/AddStudentModal';
import BulkImportModal from '../components/BulkImportModal';
import EditStudentModal from '../components/EditStudentModal';
import BulkEditModal from '../components/BulkEditModal';
import '../style/Students.scss';

const Students = () => {
    const dispatch = useDispatch();
    const { students, isLoading } = useSelector((state) => state.students);
    
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [semesterFilter, setSemesterFilter] = useState('');
    const [sectionFilter, setSectionFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
    
    const [editingStudent, setEditingStudent] = useState(null);

    const loadStudents = useCallback(() => {
        dispatch(getStudentsList(semesterFilter, sectionFilter, departmentFilter, searchQuery));
    }, [dispatch, semesterFilter, sectionFilter, departmentFilter, searchQuery]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            loadStudents();
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [loadStudents]);

    const handleDelete = async (id) => {
        if(window.confirm('Are you sure you want to delete this user?')) {
            await deleteStudentService(id);
            loadStudents();
        }
    };

    const handleSuccess = () => {
        setIsAddModalOpen(false);
        setIsBulkImportOpen(false);
        setIsBulkEditOpen(false);
        setEditingStudent(null);
        loadStudents();
    };

    return (
        <div className="students-page">
            <div className="page-header-actions">
                <div className="title-section">
                    <h1>Student Management</h1>
                    <p>Manage student accounts, roles, departments, sections, and semesters.</p>
                </div>
                <div className="action-buttons">
                    <button className="btn-secondary" onClick={() => setIsBulkEditOpen(true)}>
                        <i className="ri-edit-box-line"></i> Bulk Edit
                    </button>
                    <button className="btn-secondary" onClick={() => setIsBulkImportOpen(true)}>
                        <i className="ri-file-excel-line"></i> Bulk Import
                    </button>
                    <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
                        <i className="ri-user-add-line"></i> Add Student
                    </button>
                </div>
            </div>

            <div className="filters-card" style={{ flexWrap: 'wrap' }}>
                <div className="filter-group" style={{ flex: '1', minWidth: '200px' }}>
                    <label>Search</label>
                    <input 
                        type="text" 
                        placeholder="Search by Name or USN..." 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
                    />
                </div>
                <div className="filter-group">
                    <label>Filter by Dept</label>
                    <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
                        <option value="">All Departments</option>
                        <option value="CSE">CSE</option>
                        <option value="CSE-AIML">CSE-AIML</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label>Filter by Sem</label>
                    <select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)}>
                        <option value="">All Sem</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => <option key={sem} value={sem}>Sem {sem}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Filter by Sec</label>
                    <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
                        <option value="">All Sec</option>
                        {['A', 'B', 'C', 'D'].map(sec => <option key={sec} value={sec}>Sec {sec}</option>)}
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
                            <th>Role</th>
                            <th>Dept</th>
                            <th>Sem</th>
                            <th>Sec</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="8" style={{textAlign: 'center'}}>Loading data...</td></tr>
                        ) : students.length === 0 ? (
                            <tr><td colSpan="8" style={{textAlign: 'center'}}>No users found.</td></tr>
                        ) : (
                            students.map(student => (
                                <tr key={student._id}>
                                    <td>{student.usn}</td>
                                    <td>{student.name}</td>
                                    <td>{student.email}</td>
                                    <td>
                                        <span style={{ 
                                            padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize',
                                            backgroundColor: student.role === 'president' ? '#fef08a' : student.role === 'pr' ? '#e9d5ff' : student.role === 'grafik' ? '#fbcfe8' : '#f1f5f9',
                                            color: student.role === 'president' ? '#854d0e' : student.role === 'pr' ? '#6b21a8' : student.role === 'grafik' ? '#831843' : '#475569'
                                        }}>
                                            {student.role}
                                        </span>
                                    </td>
                                    <td>{student.department}</td>
                                    <td>{student.semester}</td>
                                    <td>{student.section}</td>
                                    <td>
                                        <button className="action-icon edit" onClick={() => setEditingStudent(student)}>
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
            {isBulkImportOpen && <BulkImportModal onClose={() => setIsBulkImportOpen(false)} onSuccess={handleSuccess} />}
            {isBulkEditOpen && <BulkEditModal onClose={() => setIsBulkEditOpen(false)} onSuccess={handleSuccess} />}
            {editingStudent && <EditStudentModal student={editingStudent} onClose={() => setEditingStudent(null)} onSuccess={handleSuccess} />}
        </div>
    );
};

export default Students;