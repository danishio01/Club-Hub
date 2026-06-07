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

export const generateAndUploadReportPDF = async (reportData, eventTitle, clubName, presidentName) => {
    let logoBuffer = null;
    try {
        const response = await fetch('https://ik.imagekit.io/p4nbkerbz/ClubHub/image.png');
        if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            logoBuffer = Buffer.from(arrayBuffer);
        }
    } catch (err) {
        console.error("Failed to fetch logo for PDF:", err);
    }

    return new Promise((resolve, reject) => {
        // Increased top margin to 140 to make space for the wide header banner
        const doc = new PDFDocument({ 
            margins: { top: 140, bottom: 50, left: 50, right: 50 } 
        });
        const buffers = [];

        // Fixed sizing to preserve aspect ratio and stretch appropriately
        const addHeader = () => {
            if (logoBuffer) {
                // By providing only width, pdfkit scales height proportionally, preserving aspect ratio.
                const bannerWidth = 420;
                doc.image(logoBuffer, (doc.page.width - bannerWidth) / 2, 25, { width: bannerWidth });
            }
        };

        // Attach header event so the banner repeats cleanly on every page break
        doc.on('pageAdded', addHeader);
        doc.on('data', buffers.push.bind(buffers));
        
        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            const key = `reports/Report_${eventTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
            
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

        // Add header to the first page manually
        addHeader();

        // Construct PDF Content
        doc.fontSize(22).font('Helvetica-Bold').text('Institutional Event Post-Action Report', { align: 'center' });
        doc.moveDown(1.5);
        
        const basicInfo = [
            { label: 'Event', value: eventTitle },
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
            { title: '15. Registration Details / Attendance Sheet', content: reportData.registrationDetails },
            { title: '16. Feedback Form / Feedback Graphs', content: reportData.feedbackDetails },
            { title: '17. Flyers of the Event/Program', content: reportData.flyers },
            { title: '18. Photo Collage of the Event/Program', content: reportData.photoCollage },
        ];

        textSections.forEach(sec => {
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text(sec.title);
            doc.moveDown(0.3);
            doc.fontSize(11).font('Helvetica').fillColor('#475569').text(sec.content || 'N/A', { align: 'justify' });
            doc.moveDown(1);
        });

        // 19. Social Media Handles
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('19. Social Media Handles');
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica').fillColor('#475569')
            .text(`Instagram: ${reportData.socialMedia?.instagram || 'N/A'}`)
            .text(`Facebook: ${reportData.socialMedia?.facebook || 'N/A'}`)
            .text(`Twitter: ${reportData.socialMedia?.twitter || 'N/A'}`);
        doc.moveDown(1);

        // 20. Details of Resource Person
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('20. Details of Resource Person / Speaker / Expert / Judge');
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

        // 21 & 22. Coordinators
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('21. Names of Faculty Coordinators');
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica').fillColor('#475569').text(reportData.facultyCoordinators || 'N/A');
        doc.moveDown(1);

        doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('22. Names of Student Coordinators');
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica').fillColor('#475569').text(reportData.studentCoordinators || 'N/A');
        doc.moveDown(1);

        doc.end();
    });
};