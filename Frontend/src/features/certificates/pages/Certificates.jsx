import React, { useEffect, useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { getCertificatesApi } from '../../studentEvents/service/studentEventsService';
import '../style/Certificates.scss';

const Certificates = () => {
    const [certificates, setCertificates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const signatureUrl = "https://ik.imagekit.io/p4nbkerbz/ClubHub/signature_updated.jpeg"; 
    const headerLogoUrl = "https://ik.imagekit.io/p4nbkerbz/ClubHub/image.png";

    const loadCertificates = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getCertificatesApi();
            setCertificates(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => { 
            await loadCertificates(); 
        };
        fetchData();
    }, [loadCertificates]);

    const getBase64ImageFromURL = (url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.setAttribute("crossOrigin", "anonymous");
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                const dataURL = canvas.toDataURL("image/png");
                resolve(dataURL);
            };
            img.onerror = (error) => reject(error);
            img.src = url;
        });
    };

    const downloadCertificate = async (cert) => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const width = doc.internal.pageSize.getWidth();
        const height = doc.internal.pageSize.getHeight();

        let headerLogoBase64 = null;
        try {
            headerLogoBase64 = await getBase64ImageFromURL(headerLogoUrl);
        } catch (error) {
            console.error("Failed to load header logo", error);
        }

        const dateObj = new Date(cert.eventDate);
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;

        const [hours, minutes] = cert.eventTime.split(':');
        let h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        const formattedTime = `${h}:${minutes} ${ampm}`;

        // Outer borders
        doc.setLineWidth(2);
        doc.rect(10, 10, width - 20, height - 20);
        doc.setLineWidth(0.5);
        doc.rect(12, 12, width - 24, height - 24);

        // Header Logo - Fixed Alignment and Scaling (Width 150mm, Height 30mm)
        if (headerLogoBase64) {
            const logoWidth = 150;
            const logoHeight = 30;
            doc.addImage(headerLogoBase64, 'PNG', (width - logoWidth) / 2, 15, logoWidth, logoHeight);
        }

        // College Name & Details pushed down to accommodate the header image
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42); 
        doc.text('GOPALAN COLLEGE OF ENGINEERING AND MANAGEMENT', width / 2, 55, { align: 'center' });
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'normal');
        doc.text('Bengaluru, Karnataka', width / 2, 63, { align: 'center' });

        doc.setFont('times', 'italic');
        doc.setFontSize(32);
        doc.setTextColor(59, 130, 246); 
        doc.text('Certificate of Participation', width / 2, 85, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(16);
        doc.setTextColor(71, 85, 105);
        doc.text('This is to certify that', width / 2, 105, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(15, 23, 42);
        doc.text(cert.studentName.toUpperCase(), width / 2, 120, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(16);
        doc.setTextColor(71, 85, 105);
        doc.text(`has actively participated in the event`, width / 2, 135, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(15, 23, 42);
        doc.text(`"${cert.eventName}"`, width / 2, 150, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(14);
        doc.text(`Organized by ${cert.clubName}`, width / 2, 160, { align: 'center' });

        doc.setFontSize(12);
        doc.text(`Date: ${formattedDate}`, 40, 180);
        doc.text(`Time: ${formattedTime}`, 40, 188);

        try {
            const signatureBase64 = await getBase64ImageFromURL(signatureUrl);
            doc.addImage(signatureBase64, 'JPEG', width - 75, 160, 40, 20);
        } catch (error) {
            console.error(error);
        }

        doc.line(width - 80, 180, width - 30, 180);
        doc.text('HOD', width - 55, 188, { align: 'center' });

        doc.save(`${cert.eventName}_Certificate.pdf`);
    };

    return (
        <div className="certificates-page">
            <div className="page-header">
                <h1>My Certificates</h1>
                <p>Download certificates for events you have successfully attended.</p>
            </div>

            <div className="certificates-grid">
                {isLoading ? (
                    <div className="empty-state">Loading your achievements...</div>
                ) : certificates.length === 0 ? (
                    <div className="empty-state">
                        <i className="ri-award-line"></i>
                        <p>No certificates available yet. Attend events to earn them!</p>
                    </div>
                ) : (
                    certificates.map((cert) => {
                        const dateObj = new Date(cert.eventDate);
                        const day = String(dateObj.getDate()).padStart(2, '0');
                        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                        const year = dateObj.getFullYear();
                        const cardDate = `${day}/${month}/${year}`;

                        return (
                            <div key={cert.registrationId} className="certificate-card">
                                <div className="card-info">
                                    <div className="club-tag">{cert.clubName}</div>
                                    <h3>{cert.eventName}</h3>
                                    <p><i className="ri-calendar-line"></i> {cardDate}</p>
                                </div>
                                <button className="download-btn" onClick={() => downloadCertificate(cert)}>
                                    <i className="ri-download-cloud-2-line"></i> Download PDF
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default Certificates;