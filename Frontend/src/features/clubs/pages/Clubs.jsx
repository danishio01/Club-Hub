import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getClubsList, deleteClubService } from '../service/clubService';
import AddClubModal from '../components/AddClubModal';
import EditClubModal from '../components/EditClubModal';
import '../../students/style/Students.scss';

const Clubs = () => {
    const dispatch = useDispatch();
    const { clubs, isLoading } = useSelector((state) => state.clubs);
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingClub, setEditingClub] = useState(null);

    const loadClubs = useCallback(() => {
        dispatch(getClubsList());
    }, [dispatch]);

    useEffect(() => {
        loadClubs();
    }, [loadClubs]);

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

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    return (
        <div className="students-page">
            <div className="page-header-actions">
                <div className="title-section">
                    <h1>Club Management</h1>
                    <p>Manage campus clubs, view active status, and edit details.</p>
                </div>
                <div className="action-buttons">
                    <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
                        <i className="ri-group-line"></i> Create Club
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Club Name</th>
                            <th>Category</th>
                            <th>President</th>
                            <th>Status</th>
                            <th>Created On</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan="6" style={{textAlign: 'center'}}>Loading data...</td></tr>
                        ) : clubs.length === 0 ? (
                            <tr><td colSpan="6" style={{textAlign: 'center'}}>No clubs found.</td></tr>
                        ) : (
                            clubs.map(club => (
                                <tr key={club._id}>
                                    <td style={{ fontWeight: 600, color: '#0f172a' }}>{club.name}</td>
                                    <td>{club.category || 'General'}</td>
                                    <td>{club.president || 'N/A'}</td>
                                    <td>
                                        <span style={{ 
                                            padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600,
                                            backgroundColor: club.isActive ? '#dcfce7' : '#fee2e2',
                                            color: club.isActive ? '#166534' : '#991b1b'
                                        }}>
                                            {club.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>{formatDate(club.createdAt)}</td>
                                    <td>
                                        <button className="action-icon edit" onClick={() => setEditingClub(club)} title="Edit Club">
                                            <i className="ri-pencil-line"></i>
                                        </button>
                                        <button className="action-icon delete" onClick={() => handleDelete(club._id)} title="Delete Club">
                                            <i className="ri-delete-bin-line"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isAddModalOpen && <AddClubModal onClose={() => setIsAddModalOpen(false)} onSuccess={handleSuccess} />}
            {editingClub && <EditClubModal club={editingClub} onClose={() => setEditingClub(null)} onSuccess={handleSuccess} />}
        </div>
    );
};

export default Clubs;