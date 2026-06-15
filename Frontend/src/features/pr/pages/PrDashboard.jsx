import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../style/PrDashboard.scss';
import { formatDate } from '../../../utils/dateFormat';
import useAuthorizedTasks from '../../tasks/hooks/useAuthorizedTasks';

const PrDashboard = () => {
    const navigate = useNavigate();
    const { tasks, isLoading } = useAuthorizedTasks({ specialRole: 'pr' });
    const events = [...new Map(tasks.filter((task) => ['attendance', 'social_media'].includes(task.type) && task.event)
        .map((task) => [task.event._id, task.event])).values()];

    return (
        <div className="pr-dashboard-page">
            <div className="header-section">
                <h1>Attendance Operations & Promotion</h1>
                <p>View approved promotional materials and manage student attendance for active events.</p>
            </div>

            {isLoading ? (
                <div className="loading-state">Loading active events...</div>
            ) : events.length === 0 ? (
                <div className="empty-state">No approved active events currently require attendance management.</div>
            ) : (
                <div className="events-grid">
                    {events.map(event => {
                        const eventTasks = tasks.filter((task) => task.event?._id === event._id);
                        return (
                        <div key={event._id} className="pr-event-card">
                            {event.bannerUrl ? (
                                <div className="card-banner">
                                    <img src={event.bannerUrl} alt="Event Promotion" />
                                </div>
                            ) : (
                                <div className="card-banner placeholder">
                                    <i className="ri-image-line"></i>
                                    <span>No Promotional Banner</span>
                                </div>
                            )}
                            
                            <div className="card-content-wrapper">
                                <div className="card-info">
                                    <h3>{event.title}</h3>
                                    <p><i className="ri-user-line"></i> {event.creator?.name || 'Unknown'} ({event.creator?.role || 'N/A'})</p>
                                    <p><i className="ri-map-pin-line"></i> {event.venue}</p>
                                    <p><i className="ri-time-line"></i> {event.time}</p>
                                    {eventTasks.map((task) => (
                                        <React.Fragment key={task._id}>
                                            <p><i className="ri-task-line"></i> {task.type.replace('_', ' ')}: {task.assignee?.name || 'Unassigned'} ({task.status})</p>
                                            <p><i className="ri-calendar-check-line"></i> Assigned: {formatDate(task.assignedAt)} · Due: {formatDate(task.dueAt)}</p>
                                        </React.Fragment>
                                    ))}
                                </div>
                                {eventTasks.some((task) => task.type === 'attendance' && !['completed', 'cancelled'].includes(task.status)) && (
                                    <button className="btn-manage-trigger" onClick={() => navigate(`/president/pr/events/${event._id}`)}>
                                        <i className="ri-group-line"></i> Open Attendance Work
                                    </button>
                                )}
                                {eventTasks.some((task) => task.type === 'social_media' && !['completed', 'cancelled'].includes(task.status)) && event.status === 'completed' && (
                                    <button className="btn-manage-trigger" onClick={() => navigate('/president/pr/galleries')}>
                                        <i className="ri-share-forward-line"></i> Open Social-Media Work
                                    </button>
                                )}
                            </div>
                        </div>
                    )})}
                </div>
            )}
        </div>
    );
};

export default PrDashboard;
