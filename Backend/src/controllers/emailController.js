import { sendEmailService } from '../services/emailService.js';

export const sendTestEmail = async (req, res) => {
    try {
        const { to, subject, text, html } = req.body;

        if (!to || !subject) {
            return res.status(400).json({ success: false, message: 'Recipient (to) and subject are required.' });
        }

        const details = await sendEmailService({ to, subject, text, html });

        return res.status(200).json({ 
            success: true, 
            message: `Email successfully sent to ${to}`,
            data: details
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};