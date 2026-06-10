import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import '../style/PresidentDashboard.scss';

const PresidentDashboard = () => {
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);

    const hasClub = !!user?.clubName;
    const isClubMember = !!user?.isClubMember;

    return (
        <div className="president-dashboard">
            {!hasClub ? (
                <div className="unassigned-banner">
                    <i className="ri-error-warning-fill"></i>
                    <div>
                        <h2>Club is not assigned</h2>
                        <p>You cannot create or manage events until you are linked to an active club.</p>
                    </div>
                </div>
            ) : (
                <div className="welcome-banner">
                    <div className="banner-content">
                        <h1>{isClubMember ? 'Club Member Workspace' : 'President Command Center'}</h1>
                        <p>{isClubMember ? 'Create event proposals, track approvals, and use AI support for' : 'Oversee operations, manage events, and leverage AI insights for'} <strong>{user.clubName}</strong>.</p>
                    </div>
                    <i className="ri-vip-crown-2-fill banner-icon"></i>
                </div>
            )}

            <div className="action-grid">
                <div className={`action-card ${!hasClub ? 'disabled' : ''}`} onClick={() => hasClub && navigate('/president/events')}>
                    <div className="icon-wrapper events-icon">
                        <i className="ri-calendar-event-fill"></i>
                    </div>
                    <h3>Event Management</h3>
                    <p>{isClubMember ? 'Create proposals and track their approval status.' : 'Create, edit, and track all upcoming and completed events.'}</p>
                </div>

                {!isClubMember && (
                    <div className={`action-card ${!hasClub ? 'disabled' : ''}`} onClick={() => hasClub && navigate('/president/club')}>
                        <div className="icon-wrapper events-icon">
                            <i className="ri-team-fill"></i>
                        </div>
                        <h3>Club Members</h3>
                        <p>Assign students to your club and review member access.</p>
                    </div>
                )}

                <div className={`action-card ${!hasClub ? 'disabled' : ''}`} onClick={() => hasClub && navigate('/president/ai-agent')}>
                    <div className="icon-wrapper ai-icon">
                        <i className="ri-robot-2-fill"></i>
                    </div>
                    <h3>AI Assistant</h3>
                    <p>Automate emails, summarize feedback, and organize tasks.</p>
                </div>
            </div>
        </div>
    );
};

export default PresidentDashboard;
