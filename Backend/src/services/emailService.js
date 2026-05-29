import dotenv from "dotenv";

dotenv.config();

console.log("Email service initialized: Using Gmail REST API (Bypassing Render SMTP block)");

export const sendEmailService = async ({ to, subject, html, text }) => {
    try {
        const content = html || text || '';
        const contentType = html
            ? 'text/html; charset=utf-8'
            : 'text/plain; charset=utf-8';

        const rawEmail = [
            `From: ${process.env.GOOGLE_USER}`,
            `To: ${to}`,
            `Subject: ${subject}`,
            `Content-Type: ${contentType}`,
            '',
            content
        ].join('\r\n');

        const encodedEmail = Buffer.from(rawEmail)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
                grant_type: 'refresh_token'
            })
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            throw new Error(`Failed to refresh Google token: ${errorText}`);
        }

        const { access_token } = await tokenResponse.json();

        const sendResponse = await fetch(
            'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ raw: encodedEmail })
            }
        );

        if (!sendResponse.ok) {
            const errorText = await sendResponse.text();
            throw new Error(`Failed to send email: ${errorText}`);
        }

        const details = await sendResponse.json();

        console.log("Email sent successfully via HTTP!");

        return details;

    } catch (error) {
        console.error("Email Service Error:", error);
        throw error;
    }
};
