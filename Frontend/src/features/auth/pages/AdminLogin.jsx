import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginAdmin } from '../service/authService';
import axiosInstance from '../../../api/axiosInstance';
import '../style/AdminLogin.scss';

const AdminLogin = () => {
    const [adminId, setAdminId] = useState('');
    const [password, setPassword] = useState('');
    
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isLoading, error } = useSelector((state) => state.auth);

    useEffect(() => {
        const verifyAdminStatus = async () => {
            try {
                const response = await axiosInstance.get('/staff/me');
                navigate(response.data.data.role === 'hod' ? '/hod/dashboard' : '/faculty/dashboard', { replace: true });
            } catch (error) {
                // Not authenticated as admin, safe to remain on login screen
                console.log("Awaiting Admin Login...");
                console.error(error)
            }
        };
        verifyAdminStatus();
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!adminId || !password) return;
        
        try {
            const account = await dispatch(loginAdmin({ adminId, password }));
            navigate(account.role === 'hod' ? '/hod/dashboard' : '/faculty/dashboard', { replace: true });
        } catch (err) {
            console.error("Admin Login Failed:", err);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="college-header">
                    <img 
                        src="https://ik.imagekit.io/p4nbkerbz/ClubHub/applogo.png" 
                        alt="ClubHub Logo" 
                        className="logo" 
                    />
                    <h1 className="college-name">Gopalan College of Engineering and Management</h1>
                    <h2 className="portal-title">Club Activity Management Portal</h2>
                    <h3 className="portal-title">Faculty / HOD Login</h3>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="adminId" className="input-label">Staff ID</label>
                        <input
                            id="adminId"
                            type="text"
                            className="input-field"
                            value={adminId}
                            onChange={(e) => setAdminId(e.target.value)}
                            required
                        />
                    </div>
                    
                    <div className="input-group">
                        <label htmlFor="password" className="input-label">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="input-field"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        className="submit-button"
                        disabled={isLoading || !adminId || !password}
                    >
                        {isLoading ? 'Authenticating...' : 'Secure Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
