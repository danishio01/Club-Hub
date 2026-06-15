import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/GrafikGalleriesList.scss';
import { formatDate } from '../../../utils/dateFormat';
import useAuthorizedTasks from '../../tasks/hooks/useAuthorizedTasks';
import { takeOverTaskApi } from '../../tasks/service/taskService';
import { useSelector } from 'react-redux';

const GrafikGalleriesList = () => {
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const { tasks, isLoading, refresh } = useAuthorizedTasks({ type: 'gallery_upload', specialRole: 'grafik' });
    const isGrafikPresident = user?.role === 'president' && user?.specialClubRole === 'grafik';

    const takeOver = async (task) => {
        await takeOverTaskApi(task._id);
        await refresh();
    };

    return (
        <div className="grafik-galleries-list-page">
            <div className="header-section">
                <h1>Post-Event Galleries</h1>
                <p>Curate and manage official photo galleries for completed events.</p>
            </div>
            
            {isLoading ? (
                <div className="loading-state">Loading completed events...</div>
            ) : tasks.length === 0 ? (
                <div className="placeholder-container">
                    <i className="ri-camera-off-fill placeholder-icon"></i>
                    <h2>No Completed Events Yet</h2>
                    <p>Only events that have successfully concluded will appear here for gallery curation.</p>
                </div>
            ) : (
                <div className="grafik-grid">
                    {tasks.map(task => {
                        const event = task.event;
                        if (!event) return null;
                        return <div key={task._id} className="grafik-card gallery-card">
                            <div className="card-info">
                                <div className="card-header-row">
                                    <span className="club-badge">{event.club?.name}</span>
                                    <span className="status-badge success">Completed</span>
                                </div>
                                <h3>{event.title}</h3>
                                <p><i className="ri-calendar-line"></i> {formatDate(event.date)}</p>
                                <p>Assigned: {formatDate(task?.assignedAt)}</p>
                                <p>Due: {formatDate(task?.dueAt)}</p>
                                
                                <div className="gallery-stats">
                                    <span className="stat-label">Gallery Status</span>
                                    <span className="stat-value">
                                        <i className="ri-image-2-fill"></i> {event.gallery ? event.gallery.length : 0} Photos
                                    </span>
                                </div>
                            </div>
                            
                            <div className="card-actions">
                                {!['completed', 'cancelled'].includes(task.status) && <button
                                    className="btn-manage gallery-btn" 
                                    onClick={() => navigate(`/president/grafik/events/${event._id}/gallery`)}
                                >
                                    <i className="ri-camera-lens-fill"></i> Manage Gallery
                                </button>}
                                {isGrafikPresident && task.assignee?._id !== user?._id && !['completed', 'cancelled'].includes(task.status) && (
                                    <button className="btn-manage gallery-btn" onClick={() => takeOver(task)}>Take Over</button>
                                )}
                            </div>
                        </div>;
                    })}
                </div>
            )}
        </div>
    );
};

export default GrafikGalleriesList;
