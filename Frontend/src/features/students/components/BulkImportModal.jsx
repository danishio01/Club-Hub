import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { bulkImportStudentsService } from '../service/studentService';
import '../style/StudentModals.scss';

const BulkImportModal = ({ onClose, onSuccess }) => {
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!file) {
            alert('Please select an Excel file to upload.');
            return;
        }

        setIsLoading(true);

        const reader = new FileReader();
        
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                const json = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    alert("The uploaded Excel file appears to be empty.");
                    setIsLoading(false);
                    return;
                }

                const requiredColumns = ['name', 'usn', 'email', 'department', 'semester', 'section', 'role', 'password'];
                const importedHeaders = Object.keys(json[0]).map(header => header.toLowerCase());
                
                const missingColumns = requiredColumns.filter(col => !importedHeaders.includes(col));

                if (missingColumns.length > 0) {
                    alert(`Upload Failed! Missing required columns: ${missingColumns.join(', ')}`);
                    setIsLoading(false);
                    return;
                }

                const formattedData = json.map(student => ({
                    name: String(student.name || ''),
                    usn: String(student.usn || '').trim(),
                    email: String(student.email || '').trim(),
                    department: String(student.department || ''),
                    semester: Number(student.semester),
                    section: String(student.section || '').trim(),
                    role: String(student.role || 'student').toLowerCase().trim(),
                    password: String(student.password || '')
                }));

                await bulkImportStudentsService(formattedData);
                onSuccess();
                
            } catch (error) {
                console.error(error);
                alert('Import failed. Please check your data formatting or ensure there are no duplicate USNs/Emails. Ensure role is one of: student, president, pr, grafik.');
            } finally {
                setIsLoading(false);
            }
        };

        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container">
                <div className="modal-header">
                    <h2>Bulk Import Students (Excel)</h2>
                    <button className="close-button" onClick={onClose}><i className="ri-close-line"></i></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: '1.5' }}>
                            Upload an Excel file (.xlsx or .xls). Ensure the first row of your sheet contains these exact headers (lowercase): <br/><br/>
                            <strong>name, usn, email, department, semester, section, role, password</strong><br/><br/>
                            <em>Note: 'role' must be exactly 'student', 'president', 'pr', or 'grafik'.</em>
                        </p>
                        
                        <div className="form-group" style={{ marginTop: '16px' }}>
                            <input 
                                type="file" 
                                accept=".xlsx, .xls" 
                                onChange={handleFileChange}
                                required
                                style={{ padding: '10px 0', border: 'none' }}
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={isLoading || !file}>
                            {isLoading ? 'Processing...' : 'Upload and Import'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BulkImportModal;