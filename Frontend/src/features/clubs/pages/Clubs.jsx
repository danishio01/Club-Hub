import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axiosInstance from '../../../api/axiosInstance';
import { getClubsList, deleteClubService, addClubMemberService, removeClubMemberService } from '../service/clubService';
import AddClubModal from '../components/AddClubModal';
import EditClubModal from '../components/EditClubModal';
import '../style/Clubs.scss';

const Clubs = () => {
    const dispatch = useDispatch();
    const { clubs, isLoading } = useSelector((state) => state.clubs);
    const { user } = useSelector((state) => state.auth);
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingClub, setEditingClub] = useState(null);
    const [students, setStudents] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState({});
    const isPresidentView = user?.role === 'president';

    const loadClubs = useCallback(() => {
        dispatch(getClubsList());
    }, [dispatch]);

    useEffect(() => {
        loadClubs();
    }, [loadClubs]);

    useEffect(() => {
        const loadStudents = async () => {
            try {
                const res = await axiosInstance.get('/students?role=student');
                setStudents(res.data.data);
            } catch (error) {
                console.error(error);
            }
        };

        loadStudents();
    }, []);

    const handleDelete = async (id) => {
        if(window.confirm('Are you sure you want to delete this club?')) {
            try {
                await deleteClubService(id);
                loadClubs();
            } catch (error) {
                console.error(error);
                alert('Failed to delete club.');
            }
        }
    };

    const handleSuccess = () => {
        setIsAddModalOpen(false);
        setEditingClub(null);
        loadClubs();
    };

    const handleAddMember = async (clubId) => {
        const studentId = selectedStudents[clubId];
        if (!studentId) return alert('Select a student to add.');

        try {
            await addClubMemberService(clubId, studentId);
            setSelectedStudents(prev => ({ ...prev, [clubId]: '' }));
            loadClubs();
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || 'Failed to add club member.');
        }
    };

    const handleRemoveMember = async (clubId, studentId) => {
        if (!window.confirm('Remove this club member?')) return;

        try {
            await removeClubMemberService(clubId, studentId);
            loadClubs();
        } catch (error) {
            console.error(error);
            alert('Failed to remove club member.');
        }
    };

    const getAvailableStudents = (club) => {
        const memberIds = new Set((club.members || []).map(member => member._id));
        if (club.president?._id) memberIds.add(club.president._id);
        return students.filter(student => !memberIds.has(student._id));
    };

    return (
        <div className="clubs-page">
            <div className="page-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="title-section">
                    <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#0f172a' }}>{isPresidentView ? 'Club Members' : 'Clubs Management'}</h1>
                    <p style={{ color: '#64748b', marginTop: '4px' }}>{isPresidentView ? 'Review your club leadership and manage club members.' : 'Create and manage student activity clubs and presidents.'}</p>
                </div>
                {!isPresidentView && (
                    <button className="btn-primary" onClick={() => setIsAddModalOpen(true)} style={{ padding: '10px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
                        <i className="ri-add-line"></i> Add New Club
                    </button>
                )}
            </div>

            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading clubs...</div>
            ) : clubs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>No clubs found. Create one to get started!</div>
            ) : (
                <div className="clubs-grid">
                    {clubs.map(club => (
                        <div key={club._id} className="club-card">
                            <div className="club-header">
                                <h3>{club.name}</h3>
                                <span className={`status-badge ${club.isActive ? 'active' : 'inactive'}`}>
                                    {club.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '8px', fontWeight: 500 }}>
                                <i className="ri-user-star-line" style={{ color: '#2563eb', marginRight: '4px' }}></i> 
                                President: <span style={{ color: '#0f172a' }}>{club.president?.name || 'Not Assigned'}</span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px', fontWeight: 500 }}>
                                <i className="ri-group-line" style={{ color: '#16a34a', marginRight: '4px' }}></i>
                                Club Members: <span style={{ color: '#0f172a' }}>{club.members?.length || 0}</span>
                            </div>
                            <p className="club-description">{club.description}</p>
                            <div style={{ marginTop: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Members</div>
                                {club.members?.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {club.members.map(member => (
                                            <div key={member._id} className="member-item">
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{member.name}</div>
                                                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{member.usn} - {member.department}</div>
                                                </div>
                                                <button className="icon-btn delete" onClick={() => handleRemoveMember(club._id, member._id)} title="Remove member">
                                                    <i className="ri-user-unfollow-line"></i>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No club members assigned.</div>
                                )}
                                <div className="add-member-container">
                                    <select 
                                        className="member-select"
                                        value={selectedStudents[club._id] || ''} 
                                        onChange={(e) => setSelectedStudents(prev => ({ ...prev, [club._id]: e.target.value }))}
                                    >
                                        <option value="">Select student</option>
                                        {getAvailableStudents(club).map(student => (
                                            <option key={student._id} value={student._id}>{student.name} ({student.usn})</option>
                                        ))}
                                    </select>
                                    <button className="btn-primary add-btn" onClick={() => handleAddMember(club._id)}>
                                        Add
                                    </button>
                                </div>
                            </div>
                            <div className="club-actions">
                                {!isPresidentView && (
                                    <>
                                        <button className="icon-btn" onClick={() => setEditingClub(club)}>
                                            <i className="ri-pencil-line"></i>
                                        </button>
                                        <button className="icon-btn delete" onClick={() => handleDelete(club._id)}>
                                            <i className="ri-delete-bin-line"></i>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isAddModalOpen && <AddClubModal onClose={() => setIsAddModalOpen(false)} onSuccess={handleSuccess} />}
            {editingClub && <EditClubModal club={editingClub} onClose={() => setEditingClub(null)} onSuccess={handleSuccess} />}
        </div>
    );
};

export default Clubs;