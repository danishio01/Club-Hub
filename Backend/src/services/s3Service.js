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
        const jpgUrl = url + (url.includes('?') ? '&' : '?') + 'tr=f-jpg'; 
        const res = await fetch(jpgUrl);
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

        (async () => {
            // C. Attachments & Proofs
            doc.addPage();
            doc.fontSize(18).font('Helvetica-Bold').fillColor('#0f172a').text('C. Attachments & Proofs', { align: 'center' });
            doc.moveDown(2);

            doc.fontSize(14).text('1. Official Event Flyer');
            doc.moveDown();
            if (event.bannerUrl) {
                const flyerBuf = await fetchImageBuffer(event.bannerUrl);
                if (flyerBuf) {
                    doc.image(flyerBuf, (doc.page.width - 400) / 2, doc.y, { fit: [400, 550], align: 'center' });
                    doc.moveDown(20);
                } else {
                    doc.fontSize(11).font('Helvetica').fillColor('#475569').text('Flyer not uploaded.', { align: 'left' });
                    doc.moveDown();
                }
            } else {
                doc.fontSize(11).font('Helvetica').fillColor('#475569').text('Flyer not uploaded.', { align: 'left' });
                doc.moveDown();
            }

            doc.addPage();
            doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a').text('2. Post Event Photos (Gallery)');
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
                doc.fontSize(11).font('Helvetica').fillColor('#475569').text('Post-event photos not uploaded.', { align: 'left' });
            }

            doc.addPage();
            doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a').text('3. Attendance & Registration Sheet');
            doc.moveDown();
            
            let tableY = doc.y + 10;
            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('Student Name', 50, tableY);
            doc.text('USN', 220, tableY);
            doc.text('Dept', 340, tableY);
            doc.text('Reg Status', 420, tableY);
            doc.text('Attendance', 490, tableY);
            
            doc.moveTo(50, tableY + 15).lineTo(550, tableY + 15).strokeColor('#cbd5e1').stroke();
            tableY += 25;
            doc.font('Helvetica');
            
            registrations.forEach(reg => {
                if (tableY > 750) {
                    doc.addPage();
                    tableY = 50;
                    doc.font('Helvetica-Bold');
                    doc.text('Student Name', 50, tableY); doc.text('USN', 220, tableY); doc.text('Dept', 340, tableY); doc.text('Reg Status', 420, tableY); doc.text('Attendance', 490, tableY);
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
                doc.fontSize(11).font('Helvetica').fillColor('#475569').text('No registrations available.', { align: 'left' });
            }

            doc.addPage();
            doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a').text('4. Feedback Analytics');
            doc.moveDown();
            
            if (feedbackData.total === 0) {
                doc.fontSize(11).font('Helvetica').fillColor('#475569').text('No feedback submitted for this event.', { align: 'left' });
            } else {
                // Map the graph data to text format
                feedbackData.analytics.forEach((q, i) => {
                    doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text(`Q${i+1}. ${q.text}`);
                    if (q.type === 'rating') {
                        doc.fontSize(10).font('Helvetica').fillColor('#475569').text(`Average Rating: ${q.average} / 5.0 ⭐`);
                    } else if (q.type === 'mcq') {
                        Object.entries(q.breakdown).forEach(([opt, count]) => {
                            const pct = Math.round((count / feedbackData.total) * 100);
                            doc.fontSize(10).font('Helvetica').fillColor('#475569').text(`${opt}: ${count} votes (${pct}%)`);
                        });
                    } else if (q.type === 'paragraph') {
                        doc.fontSize(10).font('Helvetica').fillColor('#475569').text(`Received ${q.rawAnswers.length} written responses. AI summary below.`);
                    }
                    doc.moveDown(0.5);
                });
                
                doc.moveDown();
                doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('AI Feedback Synthesis');
                doc.moveDown(0.5);
                if (feedbackData.aiSummary) {
                    // Split the markdown into parts to render
                    const lines = feedbackData.aiSummary.split('\n');
                    lines.forEach(line => {
                        if (line.startsWith('###')) {
                            doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text(line.replace(/#/g, '').trim());
                        } else if (line.trim() !== '') {
                            doc.fontSize(10).font('Helvetica').fillColor('#475569').text(line.replace(/\*/g, '').trim());
                        }
                    });
                } else {
                    doc.fontSize(10).font('Helvetica').fillColor('#475569').text('AI summary not generated prior to report submission.');
                }
            }

            doc.addPage();
            doc.fontSize(18).font('Helvetica-Bold').fillColor('#0f172a').text('D. Coordination', { align: 'center' });
            doc.moveDown();
            
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('19. Details of Resource Person / Speaker / Expert / Judge');
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

            doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('20. Names of Faculty Coordinators');
            doc.moveDown(0.3);
            doc.fontSize(11).font('Helvetica').fillColor('#475569').text(reportData.facultyCoordinators || 'N/A');
            doc.moveDown(1);

            doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('21. Names of Student Coordinators');
            doc.moveDown(0.3);
            doc.fontSize(11).font('Helvetica').fillColor('#475569').text(reportData.studentCoordinators || 'N/A');

            doc.end();
        })();
    });
};