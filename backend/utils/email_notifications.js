const { getGmailClient } = require('../config/gmail');

exports.sendEmailNotification = async ({ message, email }) => {
    try {
        // Get Gmail client
        const gmail = getGmailClient();
        
        // Create email content
        const subject = 'Update on your ride!';
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const messageParts = [
            `From: RideShare <${process.env.GMAIL_SENDER_EMAIL}>`,
            `To: ${email}`,
            'Content-Type: text/html; charset=utf-8',
            'MIME-Version: 1.0',
            `Subject: ${utf8Subject}`,
            '',
            `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                <h2 style="color: #4285f4;">RideShare Notification</h2>
                <p style="font-size: 16px; line-height: 1.5;">${message}</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">This is an automated message from RideShare. Please do not reply to this email.</p>
            </div>`,
        ];
        
        // Encode the email to base64url format
        const emailContent = messageParts.join('\n');
        const encodedMessage = Buffer.from(emailContent)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        
        // Send email
        await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage,
            },
        });
        
        console.log(`Email notification sent to ${email} successfully`);
    } catch (error) {
        console.error('Error sending email notification:', error);
    }
}