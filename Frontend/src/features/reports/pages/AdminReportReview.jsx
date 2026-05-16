import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllAdminReportsList, reviewReportApi } from '../service/reportService';
import '../style/AdminReportReview.scss';

const AdminReportReview = () => {
    const dispatch = useDispatch();
    const { reports, isLoading } = useSelector((state) => state.reports);
    
    const [selectedReport, setSelectedReport] = useState(null);
    const [remarks, setRemarks] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        dispatch(getAllAdminReportsList());
    }, [dispatch]);

    const handleReviewSubmit = async () => {
        setIsSubmitting(true);
        try {
            await reviewReportApi(selectedReport._id, remarks);
            setSelectedReport(null);
            setRemarks('');
            dispatch(getAllAdminReportsList());
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderReportDetails = () => (
        <div className="report-modal-overlay">
            <div className="report-modal-container">
                <div className="modal-header">
                    <div>
                        <h2>{selectedReport.event?.title}</h2>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Submitted by {selectedReport.president?.name} ({selectedReport.club?.name})</p>
                    </div>
                    <button className="close-btn" onClick={() => setSelectedReport(null)}><i className="ri-close-line"></i></button>
                </div>
                <div className="modal-body">
                    {Object.entries(selectedReport.content).map(([key, value]) => (
                        <div key={key} className="report-block">
                            <h4>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</h4>
                            <p>{value || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No data provided.</span>}</p>
                        </div>
                    ))}
                    
                    {selectedReport.pdfUrl && (
                        <div className="pdf-download-section">
                            <i className="ri-file-pdf-fill"></i>
                            <div>
                                <strong>System Generated PDF Available</strong>
                                <a href={selectedReport.pdfUrl} target="_blank" rel="noreferrer">Download / View Document</a>
                            </div>
                        </div>
                    )}

                    <div className="admin-remarks-input">
                        <label>Admin Feedback / Remarks</label>
                        <textarea 
                            rows="3" 
                            placeholder="Add internal remarks or feedback for the club..."
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            disabled={selectedReport.status === 'reviewed'}
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={() => setSelectedReport(null)}>Close</button>
                    {selectedReport.status === 'submitted' && (
                        <button className="btn-primary" onClick={handleReviewSubmit} disabled={isSubmitting}>
                            {isSubmitting ? 'Processing...' : 'Mark as Reviewed'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="admin-report-review-page">
            <div className="page-header">
                <h1>Report Reviews</h1>
                <p>Review and archive Post-Action Event Reports submitted by Club Presidents.</p>
            </div>

            {isLoading ? (
                <div className="empty-state">Loading submitted reports...</div>
            ) : reports.length === 0 ? (
                <div className="empty-state">
                    <i className="ri-file-list-3-line" style={{ fontSize: '3rem', display: 'block', marginBottom: '12px' }}></i>
                    <h3>No Reports Available</h3>
                    <p>There are currently no submitted reports waiting for your review.</p>
                </div>
            ) : (
                <div className="reports-grid">
                    {reports.map(report => (
                        <div key={report._id} className="report-card">
                            <div className="card-header">
                                <span className={`status-badge ${report.status}`}>{report.status}</span>
                                <span className="date-text">{new Date(report.submittedAt).toLocaleDateString()}</span>
                            </div>
                            <h3>{report.event?.title}</h3>
                            <div className="meta-text">
                                <i className="ri-team-line"></i> {report.club?.name}
                            </div>
                            <div className="meta-text">
                                <i className="ri-user-line"></i> {report.president?.name}
                            </div>
                            <button className="btn-primary outline" onClick={() => {
                                setSelectedReport(report);
                                setRemarks(report.adminRemarks || '');
                            }}>
                                Open Report
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {selectedReport && renderReportDetails()}
        </div>
    );
};

export default AdminReportReview;