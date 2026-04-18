import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginStudent } from '../service/authService';
import '../style/AdminLogin.scss';

const StudentLogin = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isLoading, error } = useSelector((state) => state.auth);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!identifier || !password) return;
        
        try {
            await dispatch(loginStudent({ identifier, password }));
            navigate('/student/dashboard');
        } catch (err) {
            console.error(err);
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
                    <h2 className="portal-title">Student Activity Portal</h2>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="identifier" className="input-label">Email ID or USN</label>
                        <input
                            id="identifier"
                            type="text"
                            className="input-field"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="Enter your USN or Email"
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
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button 
                        type="submit" 
                        className="submit-button"
                        disabled={isLoading || !identifier || !password}
                    >
                        {isLoading ? 'Signing In...' : 'Student Login'}
                    </button>
                    
                    <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: '#64748b' }}>
                        If you don't have an account, please contact your department admin.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default StudentLogin;