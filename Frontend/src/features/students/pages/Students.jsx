import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getStudentsList, deleteStudentService } from '../service/studentService';
import AddStudentModal from '../components/AddStudentModal';
import EditStudentModal from '../components/EditStudentModal';
import '../style/Students.scss';

const Students = () => {
    const dispatch = useDispatch();
    const { students, isLoading } = useSelector((state) => state.students);
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);

    const loadStudents = useCallback(() => {
        dispatch(getStudentsList());
    }, [dispatch]);

    useEffect(() => {
        loadStudents();
    }, [loadStudents]);

    const handleDelete = async (id) => {
        if(window.confirm('Are you sure you want to delete this student?')) {
            try {
                await deleteStudentService(id);
                loadStudents();
            } catch (error) {
                console.error(error);
                alert('Failed to delete student.');
            }
        }
    };

    const handleSuccess = () => {
        setIsAddModalOpen(false);
        setEditingStudent(null);
        loadStudents();
    };

    return (
        <div className="students-page">
            <div className="page-header-actions">
                <div className="title-section">
                    <h1>Student Directory</h1>
                    <p>Manage student accounts and access.</p>
                </div>
                <div className="action-buttons">
                    <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
                        <i className="ri-user-add-line"></i> Add Student
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>USN</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Department</th>
                            <th>Sem & Sec</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="6" style={{textAlign: 'center'}}>Loading data...</td></tr>
                        ) : students.length === 0 ? (
                            <tr><td colSpan="6" style={{textAlign: 'center'}}>No students found.</td></tr>
                        ) : (
                            students.map(student => (
                                <tr key={student._id}>
                                    <td style={{ fontWeight: 600 }}>{student.usn}</td>
                                    <td>{student.name}</td>
                                    <td>{student.email}</td>
                                    <td>{student.department}</td>
                                    <td>{student.semester} - {student.section}</td>
                                    <td>
                                        <button className="action-icon edit" onClick={() => setEditingStudent(student)} title="Edit Student">
                                            <i className="ri-pencil-line"></i>
                                        </button>
                                        <button className="action-icon delete" onClick={() => handleDelete(student._id)} title="Delete Student">
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
            {editingStudent && <EditStudentModal student={editingStudent} onClose={() => setEditingStudent(null)} onSuccess={handleSuccess} />}
        </div>
    );
};

export default Students;