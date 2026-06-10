import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import PDFDocument from 'pdfkit';
import dotenv from 'dotenv';

dotenv.config();

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const fetchImageBuffer = async (url) => {
    try {
        const res = await fetch(url);
        if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
    } catch (e) {
        console.error("Failed to fetch image for PDF:", url, e);
    }
    return null;
};

export const uploadImageToS3 = async (buffer, filename) => {
    const key = `banners/${filename}_${Date.now()}.png`;
    const uploadParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: 'image/png'
    };
    try {
        await s3.send(new PutObjectCommand(uploadParams));
        return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;
    } catch (err) {
        console.error("S3 Image Upload Failed:", err);
        throw err;
    }
};

export const generateAndUploadReportPDF = async (reportData, event, clubName, presidentName, registrations, feedbackData) => {
    let logoBuffer = null;
    try {
        logoBuffer = await fetchImageBuffer('https://ik.imagekit.io/p4nbkerbz/ClubHub/image.png');
    } catch (err) {
        console.error("Failed to fetch logo for PDF:", err);
    }

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ 
            margins: { top: 140, bottom: 50, left: 50, right: 50 } 
        });
        const buffers = [];

        const addHeader = () => {
            if (logoBuffer) {
                const bannerWidth = 420;
                doc.image(logoBuffer, (doc.page.width - bannerWidth) / 2, 25, { width: bannerWidth });
            }
        };

        doc.on('pageAdded', addHeader);
        doc.on('data', buffers.push.bind(buffers));
        
        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            const key = `reports/Report_${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
            
            try {
                const uploadParams = {
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: key,
                    Body: pdfData,
                    ContentType: 'application/pdf'
                };
                await s3.send(new PutObjectCommand(uploadParams));
                const url = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;
                resolve(url);
            } catch (err) {
                console.error("S3 Upload Failed:", err);
                reject(err);
            }
        });

        addHeader();

        // 1. Basic Text Content
        doc.fontSize(22).font('Helvetica-Bold').text('Institutional Event Post-Action Report', { align: 'center' });
        doc.moveDown(1.5);
        
        const basicInfo = [
            { label: 'Event', value: event.title },
            { label: 'Organizing Club', value: clubName },
            { label: 'Submitted By', value: presidentName },
            { label: 'Date Submitted', value: new Date().toLocaleDateString() }
        ];

        basicInfo.forEach(info => {
            doc.fontSize(12).font('Helvetica-Bold').text(`${info.label}: `, { continued: true })
               .font('Helvetica').text(info.value || 'N/A');
        });
        doc.moveDown(2);

        const textSections = [
            { title: '1. Activity/Event Name', content: reportData.activityName },
            { title: '2. Thrust Area of the Event/Program', content: reportData.thrustArea },
            { title: '3. Level of the Activity/Program', content: reportData.level },
            { title: '4. Semester of the Event Conducted', content: reportData.semester },
            { title: '5. Quarter of the Event Conducted', content: reportData.quarter },
            { title: '6. Date of the Event/Program', content: reportData.date },
            { title: '7. Duration of the Event/Program', content: reportData.duration },
            { title: '8. Number of Faculty Participations', content: reportData.facultyCount },
            { title: '9. Number of Students Participated', content: reportData.studentCount },
            { title: '10. Funds Utilized for the Event/Program', content: reportData.fundsUtilized },
            { title: '11. Department', content: reportData.department },
            { title: '12. Objective', content: reportData.objective },
            { title: '13. Summary', content: reportData.summary },
            { title: '14. Benefits', content: reportData.benefits },
        ];

        textSections.forEach(sec => {
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text(sec.title);
            doc.moveDown(0.3);
            doc.fontSize(11).font('Helvetica').fillColor('#475569').text(sec.content || 'N/A', { align: 'justify' });
            doc.moveDown(1);
        });

        doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('15. Social Media Handles');
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica').fillColor('#475569')
            .text(`Instagram: ${reportData.socialMedia?.instagram || 'N/A'}`)
            .text(`Facebook: ${reportData.socialMedia?.facebook || 'N/A'}`)
            .text(`Twitter: ${reportData.socialMedia?.twitter || 'N/A'}`);
        doc.moveDown(1);

        doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('16. Details of Resource Person / Speaker / Expert / Judge');
        doc.moveDown(0.5);
        if (reportData.resourcePersons && reportData.resourcePersons.length > 0) {
            reportData.resourcePersons.forEach((rp, i) => {
                doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text(`Resource Person ${i + 1}`);
                doc.font('Helvetica').fillColor('#475569')
                    .text(`Name: ${rp.name || 'N/A'}`)
                    .text(`Industry/Company/Organization: ${rp.industry || 'N/A'}`)
                    .text(`Designation: ${rp.designation || 'N/A'}`)
                    .text(`Mobile Number: ${rp.mobile || 'N/A'}`)
                    .text(`Email ID: ${rp.email || 'N/A'}`)
                    .text(`Address: ${rp.address || 'N/A'}`);
                doc.moveDown(0.5);
            });
        } else {
            doc.fontSize(11).font('Helvetica').fillColor('#475569').text('No resource persons added.');
        }
        doc.moveDown(1);

        doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('17. Names of Faculty Coordinators');
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica').fillColor('#475569').text(reportData.facultyCoordinators || 'N/A');
        doc.moveDown(1);

        doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('18. Names of Student Coordinators');
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica').fillColor('#475569').text(reportData.studentCoordinators || 'N/A');
        
        // Ensure async fetching runs before ending document
        (async () => {
            // 2. Attachments & Proofs
            doc.addPage();
            doc.fontSize(18).font('Helvetica-Bold').fillColor('#0f172a').text('Event Flyer', { align: 'center' });
            doc.moveDown();
            if (event.bannerUrl) {
                const flyerBuf = await fetchImageBuffer(event.bannerUrl);
                if (flyerBuf) {
                    // Center the image dynamically
                    doc.image(flyerBuf, (doc.page.width - 450) / 2, doc.y, { fit: [450, 600], align: 'center' });
                }
            }

            doc.addPage();
            doc.fontSize(18).font('Helvetica-Bold').fillColor('#0f172a').text('Photo Gallery Collage', { align: 'center' });
            doc.moveDown();
            if (event.gallery && event.gallery.length > 0) {
                let x = 50;
                let y = doc.y;
                for (let i = 0; i < event.gallery.length; i++) {
                    const imgBuf = await fetchImageBuffer(event.gallery[i].url);
                    if (imgBuf) {
                        if (i % 2 === 0 && i !== 0) { x = 50; y += 220; }
                        if (y > 650) { doc.addPage(); y = 50; }
                        doc.image(imgBuf, x, y, { fit: [230, 200] });
                        x += 250;
                    }
                }
            } else {
                doc.fontSize(12).font('Helvetica').fillColor('#475569').text('No official photos were uploaded for this event.', { align: 'center' });
            }

            doc.addPage();
            doc.fontSize(18).font('Helvetica-Bold').fillColor('#0f172a').text('Attendance & Registration Sheet', { align: 'center' });
            doc.moveDown();
            
            let tableY = doc.y + 10;
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('Student Name', 50, tableY);
            doc.text('USN', 220, tableY);
            doc.text('Dept', 340, tableY);
            doc.text('Status', 420, tableY);
            doc.text('Attendance', 490, tableY);
            
            doc.moveTo(50, tableY + 15).lineTo(550, tableY + 15).strokeColor('#cbd5e1').stroke();
            tableY += 25;
            doc.font('Helvetica');
            
            registrations.forEach(reg => {
                if (tableY > 750) {
                    doc.addPage();
                    tableY = 50;
                    doc.font('Helvetica-Bold');
                    doc.text('Student Name', 50, tableY); doc.text('USN', 220, tableY); doc.text('Dept', 340, tableY); doc.text('Status', 420, tableY); doc.text('Attendance', 490, tableY);
                    doc.moveTo(50, tableY + 15).lineTo(550, tableY + 15).stroke();
                    tableY += 25;
                    doc.font('Helvetica');
                }
                const student = reg.student || {};
                const attStatus = (reg.status === 'Attended') ? 'Present' : 'Absent';
                
                doc.text(student.name?.substring(0, 25) || 'N/A', 50, tableY, { width: 160, lineBreak: false });
                doc.text(student.usn || 'N/A', 220, tableY);
                doc.text(student.department || 'N/A', 340, tableY);
                doc.text('Registered', 420, tableY);
                doc.text(attStatus, 490, tableY);
                tableY += 20;
            });

            if (registrations.length === 0) {
                doc.fontSize(12).font('Helvetica').fillColor('#475569').text('No registrations recorded for this event.', { align: 'center' });
            }

            doc.addPage();
            doc.fontSize(18).font('Helvetica-Bold').fillColor('#0f172a').text('Feedback Analytics', { align: 'center' });
            doc.moveDown();
            
            doc.fontSize(14).font('Helvetica-Bold').text(`Average Rating: ${feedbackData.averageRating} / 5.0 ⭐`, { align: 'center' });
            doc.fontSize(12).font('Helvetica').text(`Total Reviews Submitted: ${feedbackData.total}`, { align: 'center' });
            doc.moveDown(2);

            if (feedbackData.reviews && feedbackData.reviews.length > 0) {
                doc.fontSize(14).font('Helvetica-Bold').text('Recent Student Reviews:');
                doc.moveDown();
                doc.fontSize(11).font('Helvetica');
                
                // Show up to 10 latest reviews
                feedbackData.reviews.slice(0, 10).forEach(r => {
                    const stars = '⭐'.repeat(r.rating);
                    doc.font('Helvetica-Bold').text(`${r.student?.name || 'Anonymous'} - ${stars}`);
                    doc.font('Helvetica').text(`"${r.review}"`);
                    doc.moveDown();
                });
            } else {
                doc.fontSize(12).font('Helvetica').fillColor('#475569').text('No written feedback provided yet.', { align: 'center' });
            }

            doc.end();
        })();
    });
};