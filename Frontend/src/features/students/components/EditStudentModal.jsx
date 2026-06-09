import React, { useState } from 'react';
import { updateStudentService } from '../service/studentService';
import '../style/StudentModals.scss';

const EditStudentModal = ({ student, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: student?.name || '',
        usn: student?.usn || '',
        email: student?.email || '',
        department: student?.department || '',
        role: student?.role || 'student',
        semester: student?.semester || '',
        section: student?.section || '',
        password: '' 
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await updateStudentService(student._id, formData);
            onSuccess();
        } catch (error) {
            console.error(error);
            alert('Failed to update student.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-header">
                    <h2>Edit Student</h2>
                    <button className="close-button" onClick={onClose}><i className="ri-close-line"></i></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Full Name</label>
                            <input type="text" name="name" required value={formData.name} onChange={handleChange} />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>USN</label>
                                <input type="text" name="usn" required value={formData.usn} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" name="email" required value={formData.email} onChange={handleChange} />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Department</label>
                                <select name="department" required value={formData.department} onChange={handleChange}>
                                    <option value="">Select Department</option>
                                    <option value="CSE">CSE</option>
                                    <option value="CSE-AIML">CSE-AIML</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Role</label>
                                <select name="role" required value={formData.role} onChange={handleChange}>
                                    <option value="student">Student</option>
                                    <option value="president">President</option>
                                    <option value="pr">PR</option>
                                    <option value="grafik">Grafik Team</option>
                                </select>
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Semester</label>
                                <select name="semester" required value={formData.semester} onChange={handleChange}>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => <option key={sem} value={sem}>{sem}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Section</label>
                                <select name="section" required value={formData.section} onChange={handleChange}>
                                    {['A', 'B', 'C', 'D'].map(sec => <option key={sec} value={sec}>{sec}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Reset Password (Leave blank to keep current)</label>
                            <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="New password" />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={isLoading}>
                            {isLoading ? 'Updating...' : 'Update Student'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditStudentModal;