import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateStudentInterestsAction } from '../service/profileService';
import '../style/Profile.scss';
import axiosInstance from '../../../api/axiosInstance';

const AVAILABLE_TAGS = [
    'Coding', 'Development', 'AI', 'Problem Solving', 'Tech Talk', 
    'Editing', 'Photography', 'Content Creation', 'Games', 'Dance', 
    'Music', 'Entertainment', 'Interaction', 'Social Media', 'Promotion'
];

const Profile = () => {
    const dispatch = useDispatch();
    const { user } = useSelector((state) => state.auth);
    
    const [selectedInterests, setSelectedInterests] = useState(user?.interests || []);
    const [isSaving, setIsSaving] = useState(false);
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });

    const toggleInterest = (tag) => {
        setSelectedInterests(prev => 
            prev.includes(tag) 
                ? prev.filter(t => t !== tag) 
                : [...prev, tag]
        );
    };

    const handleSaveInterests = async () => {
        setIsSaving(true);
        try {
            await dispatch(updateStudentInterestsAction(user._id, selectedInterests));
            alert('Interests updated successfully!');
        } catch (error) {
            alert('Failed to update interests. Please try again.');
            console.error(error)
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading Profile Data...</div>;

    const displaySemester = user.semester ? `Semester ${user.semester}` : 'Semester N/A';
    const displaySection = user.section ? `Section ${user.section}` : 'Section N/A';
    const isStaff = ['faculty_coordinator', 'hod', 'admin'].includes(user.role);
    const changePassword = async (event) => {
        event.preventDefault();
        try {
            await axiosInstance.patch(isStaff ? '/staff/password' : '/auth/student/password', passwords);
            setPasswords({ currentPassword: '', newPassword: '' });
            alert('Password changed successfully.');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to change password.');
        }
    };

    return (
        <div className="profile-page">
            <div className="profile-header">
                <h1>My Profile</h1>
                <p>Manage your personal information and campus interests.</p>
            </div>

            <div className="dashboard-grid">
                <div className="info-card">
                    <h2 className="card-title">Account Profile</h2>
                    <div className="info-list">
                        <div className="info-item">
                            <span className="label">Full Name</span>
                            <span className="value">{user.name || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                            <span className="label">{isStaff ? 'Staff ID' : 'USN'}</span>
                            <span className="value">{user.adminId || user.usn || 'N/A'}</span>
                        </div>
                        <div className="info-item"><span className="label">Role</span><span className="value">{user.role?.replaceAll('_', ' ')}</span></div>
                        {!isStaff && <div className="info-item"><span className="label">Club</span><span className="value">{user.clubName || 'Not assigned'}</span></div>}
                        <div className="info-item">
                            <span className="label">Email Address</span>
                            <span className="value">{user.email || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                            <span className="label">Department</span>
                            <span className="value">{user.department || 'N/A'}</span>
                        </div>
                        <div className="info-item">
                            <span className="label">Semester & Section</span>
                            <span className="value">{displaySemester} - {displaySection}</span>
                        </div>
                    </div>
                </div>

                {!isStaff && user.role === 'student' && !user.isClubMember && <div className="interests-card">
                    <h2 className="card-title">My Interests</h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '16px' }}>
                        Select the topics you are interested in. This helps clubs recommend relevant events to you!
                    </p>
                    
                    <div className="tags-selection-grid">
                        {AVAILABLE_TAGS.map(tag => (
                            <div 
                                key={tag} 
                                className={`interest-tag ${selectedInterests.includes(tag) ? 'selected' : ''}`}
                                onClick={() => toggleInterest(tag)}
                            >
                                {selectedInterests.includes(tag) && <i className="ri-check-line" style={{ marginRight: '6px' }}></i>}
                                {tag}
                            </div>
                        ))}
                    </div>

                    <div className="save-section">
                        <button 
                            className="btn-primary" 
                            onClick={handleSaveInterests}
                            disabled={isSaving}
                            style={{ padding: '10px 24px' }}
                        >
                            {isSaving ? 'Saving...' : 'Save Interests'}
                        </button>
                    </div>
                </div>}
                <form className="interests-card password-card" onSubmit={changePassword}>
                    <h2 className="card-title">Change Password</h2>
                    <input type="password" required placeholder="Current password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} />
                    <input type="password" required minLength="8" placeholder="New password (8+ characters)" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} />
                    <button className="btn-primary"><i className="ri-lock-password-line"></i> Change Password</button>
                </form>
            </div>
        </div>
    );
};

export default Profile;
