import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginStudent, checkAuthStatus } from '../service/authService';
import '../style/AdminLogin.scss';

const StudentLogin = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, isLoading, error, isCheckingAuth } = useSelector((state) => state.auth);

    useEffect(() => {
        if (isCheckingAuth) {
            dispatch(checkAuthStatus());
        }
    }, [dispatch, isCheckingAuth]);

    useEffect(() => {
        if (!isCheckingAuth && user) {
            const role = user.role?.toLowerCase() || 'student';
            
            if (role === 'president') {
                navigate('/president/dashboard', { replace: true });
            } else if (user.isClubMember) {
                navigate('/president/dashboard', { replace: true });
            } else if (role === 'admin') {
                navigate('/faculty/dashboard', { replace: true });
            } else {
                navigate('/student/dashboard', { replace: true });
            }
        }
    }, [user, isCheckingAuth, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!identifier || !password) return;
        
        try {
            await dispatch(loginStudent({ identifier, password }));
            // Navigation relies on the useEffect state listener above
        } catch (err) {
            console.error("Login Process Error:", err);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="college-header">
                    <img src="https://ik.imagekit.io/p4nbkerbz/ClubHub/applogo.png" alt="ClubHub Logo" className="logo" />
                    <h1 className="college-name">Gopalan College of Engineering and Management</h1>
                    <h2 className="portal-title">Student Activity Portal</h2>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="identifier" className="input-label">Email ID or USN</label>
                        <input
                            id="identifier" type="text" className="input-field"
                            value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="Enter your USN or Email" required
                        />
                    </div>
                    
                    <div className="input-group">
                        <label htmlFor="password" className="input-label">Password</label>
                        <input
                            id="password" type="password" className="input-field"
                            value={password} onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password" required
                        />
                    </div>

                    <button type="submit" className="submit-button" disabled={isLoading || !identifier || !password || isCheckingAuth}>
                        {isLoading || isCheckingAuth ? 'Authenticating...' : 'Secure Login'}
                    </button>
                    <button type="button" className="submit-button" style={{ marginTop: '10px', background: '#334155' }} onClick={() => navigate('/staff/login')}>
                        Faculty / HOD Login
                    </button>
                    
                    <p style={{ textAlign: 'center', margin: '20px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                        If you don't have an account, please contact your Faculty Coordinator.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default StudentLogin;
