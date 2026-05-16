import React from 'react';

const PrDashboard = () => {
    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ background: '#ffffff', padding: '40px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                <i className="ri-megaphone-line" style={{ fontSize: '4rem', color: '#8b5cf6', marginBottom: '16px', display: 'block' }}></i>
                <h1 style={{ color: '#0f172a', marginBottom: '12px', fontSize: '2rem' }}>PR Dashboard</h1>
                <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
                    Welcome to the Public Relations control panel. From here, you'll be able to manage event outreach, track engagement, and oversee promotional activities.
                </p>
                <div style={{ marginTop: '30px', padding: '20px', background: '#f8fafc', borderRadius: '8px', display: 'inline-block' }}>
                    <span style={{ color: '#3b82f6', fontWeight: 600 }}>Feature coming soon!</span>
                </div>
            </div>
        </div>
    );
};

export default PrDashboard;