import React from 'react';
import { useRouteError, useNavigate } from 'react-router-dom';
import './ErrorBoundary.scss';

const ErrorBoundary = () => {
    const error = useRouteError();
    const navigate = useNavigate();

    return (
        <div className="error-boundary-wrapper">
            <div className="error-card">
                <i className="ri-alert-fill error-icon"></i>
                <h1>Oops! Something went wrong.</h1>
                <p>We encountered an unexpected error while rendering this page.</p>
                
                <div className="error-details">
                    {error?.message || 'An unknown layout or data mapping error occurred.'}
                </div>
                
                <div className="error-actions">
                    <button className="btn-primary" onClick={() => navigate(-1)}>
                        <i className="ri-arrow-left-line"></i> Go Back
                    </button>
                    <button className="btn-secondary" onClick={() => window.location.href = '/'}>
                        <i className="ri-home-4-line"></i> Return Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ErrorBoundary;