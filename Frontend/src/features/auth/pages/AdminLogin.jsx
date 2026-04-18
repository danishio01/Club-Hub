import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginAdmin } from '../service/authService';
import '../style/AdminLogin.scss';

const AdminLogin = () => {
    const [adminId, setAdminId] = useState('');
    const [password, setPassword] = useState('');
    
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isLoading, error } = useSelector((state) => state.auth);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!adminId || !password) return;
        
        try {
            await dispatch(loginAdmin({ adminId, password }));
            navigate('/admin/dashboard');
        } catch (err) {
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="college-header">
                    <img 
                        src="https://ik.imagekit.io/p4nbkerbz/ClubHub/image.png?updatedAt=1776478146181" 
                        alt="ClubHub Logo" 
                        className="logo" 
                    />
                    <h1 className="college-name">Gopalan College of Engineering and Management</h1>
                    <h2 className="portal-title">Club Activity Management Portal</h2>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="adminId" className="input-label">Administrator ID</label>
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