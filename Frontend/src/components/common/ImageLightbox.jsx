import React, { useEffect } from 'react';
import './ImageLightbox.scss';

const ImageLightbox = ({ imageUrl, onClose }) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden'; 
        
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [onClose]);

    if (!imageUrl) return null;

    return (
        <div className="lightbox-overlay" onClick={onClose}>
            <div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
                <button className="lightbox-close-btn" onClick={onClose}>
                    <i className="ri-close-line"></i>
                </button>
                <img src={imageUrl} alt="Fullscreen View" className="lightbox-image" />
            </div>
        </div>
    );
};

export default ImageLightbox;