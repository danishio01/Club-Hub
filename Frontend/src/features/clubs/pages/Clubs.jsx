import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getClubsList, deleteClubService } from '../service/clubService';
import AddClubModal from '../components/AddClubModal';
import EditClubModal from '../components/EditClubModal';
import '../style/Clubs.scss';

const Clubs = () => {
    const dispatch = useDispatch();
    const { clubs, isLoading } = useSelector((state) => state.clubs);
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingClub, setEditingClub] = useState(null);

    const loadClubs = () => {
        dispatch(getClubsList());
    };

    useEffect(() => {
        loadClubs();
    }, [dispatch]);

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

    return (
        <div className="clubs-page">
            <div className="page-header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="title-section">
                    <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#0f172a' }}>Clubs Management</h1>
                    <p style={{ color: '#64748b', marginTop: '4px' }}>Create and manage student activity clubs.</p>
                </div>
                <button className="btn-primary" onClick={() => setIsAddModalOpen(true)} style={{ padding: '10px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
                    <i className="ri-add-line"></i> Add New Club
                </button>
            </div>

            {isLoading ? (
                <div>Loading clubs...</div>
            ) : clubs.length === 0 ? (
                <div>No clubs found. Create one to get started!</div>
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
                            <p className="club-description">{club.description}</p>
                            <div className="club-actions">
                                <button className="icon-btn" onClick={() => setEditingClub(club)}>
                                    <i className="ri-pencil-line"></i>
                                </button>
                                <button className="icon-btn delete" onClick={() => handleDelete(club._id)}>
                                    <i className="ri-delete-bin-line"></i>
                                </button>
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