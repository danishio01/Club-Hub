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
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

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

        // Construct PDF Content
        doc.fontSize(22).font('Helvetica-Bold').text('Event Post-Action Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).font('Helvetica-Bold').text(`Event: `, { continued: true }).font('Helvetica').text(eventTitle);
        doc.font('Helvetica-Bold').text(`Organizing Club: `, { continued: true }).font('Helvetica').text(clubName);
        doc.font('Helvetica-Bold').text(`Submitted By: `, { continued: true }).font('Helvetica').text(presidentName);
        doc.font('Helvetica-Bold').text(`Date Submitted: `, { continued: true }).font('Helvetica').text(new Date().toLocaleDateString());
        doc.moveDown(2);

        const sections = [
            { title: '1. Event Summary', content: reportData.summary },
            { title: '2. Objectives', content: reportData.objectives },
            { title: '3. Activities Conducted', content: reportData.activities },
            { title: '4. Participation Details', content: reportData.participation },
            { title: '5. Outcomes', content: reportData.outcomes },
            { title: '6. Challenges Faced', content: reportData.challenges },
            { title: '7. Conclusion', content: reportData.conclusion },
            { title: '8. Additional Remarks', content: reportData.additionalRemarks }
        ];

        sections.forEach(sec => {
            if (sec.content) {
                doc.fontSize(14).font('Helvetica-Bold').fillColor('#0f172a').text(sec.title);
                doc.moveDown(0.5);
                doc.fontSize(11).font('Helvetica').fillColor('#475569').text(sec.content, { align: 'justify' });
                doc.moveDown(1.5);
            }
        });

        doc.end();
    });
};