const { Resend } = require('resend');
require('dotenv').config();

// Initialize Resend client
let resendClient = null;

function getResendClient() {
    if (!resendClient) {
        // Check if Resend API key is configured
        if (!process.env.RESEND_API_KEY) {
            console.warn('⚠️  Email service not configured. Please set RESEND_API_KEY in .env file');
            return null;
        }

        resendClient = new Resend(process.env.RESEND_API_KEY);
        console.log('✅ Resend email service configured');
    }
    return resendClient;
}

/**
 * Send student credentials via email using Resend
 * @param {string} email - Student's email address
 * @param {string} fullName - Student's full name
 * @param {string} password - Student's password
 * @param {string} institute - Student's institute
 */
async function sendCredentialsEmail(email, fullName, password, institute) {
    try {
        const resend = getResendClient();
        
        if (!resend) {
            console.warn(`⚠️  Email not sent to ${email} - Resend API not configured`);
            return {
                success: false,
                message: 'Email service not configured'
            };
        }

        const emailData = {
            from: process.env.RESEND_FROM_EMAIL || 'LMS-SHNOOR <LMS-SHNOOR@lms.shnoor.com>',
            to: [email],
            subject: 'Your Assessment Portal Login Credentials',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            line-height: 1.6;
                            color: #333;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            background-color: #f9f9f9;
                        }
                        .header {
                            background-color: #4CAF50;
                            color: white;
                            padding: 20px;
                            text-align: center;
                            border-radius: 5px 5px 0 0;
                        }
                        .content {
                            background-color: white;
                            padding: 30px;
                            border-radius: 0 0 5px 5px;
                        }
                        .credentials {
                            background-color: #f0f0f0;
                            padding: 15px;
                            border-left: 4px solid #4CAF50;
                            margin: 20px 0;
                        }
                        .credentials strong {
                            color: #4CAF50;
                        }
                        .button {
                            display: inline-block;
                            padding: 12px 30px;
                            background-color: #4CAF50;
                            color: white;
                            text-decoration: none;
                            border-radius: 5px;
                            margin-top: 20px;
                        }
                        .footer {
                            text-align: center;
                            margin-top: 20px;
                            color: #666;
                            font-size: 12px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Welcome to Assessment Portal</h1>
                        </div>
                        <div class="content">
                            <h2>Hello ${fullName}!</h2>
                            <p>Your account has been created successfully. Below are your login credentials for the Assessment Portal.</p>
                            
                            <div class="credentials">
                                <p><strong>Email:</strong> ${email}</p>
                                <p><strong>Password:</strong> ${password}</p>
                                <p><strong>Institute:</strong> ${institute}</p>
                            </div>
                            
                            <p><strong>Important:</strong> Please keep these credentials safe. You can change your password after logging in.</p>
                            
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="button">Login Now</a>
                            
                            <p style="margin-top: 30px;">If you have any questions or need assistance, please contact your administrator.</p>
                        </div>
                        <div class="footer">
                            <p>This is an automated email. Please do not reply to this message.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        console.log(`📧 Attempting to send email to ${email}...`);
        const result = await resend.emails.send(emailData);
        console.log(`✅ Email sent successfully to ${email}`);
        console.log(`Response:`, JSON.stringify(result, null, 2));
        
        return {
            success: true,
            messageId: result.id || result.data?.id || 'sent'
        };
    } catch (error) {
        console.error(`❌ Error sending email to ${email}:`);
        console.error(`Error details:`, error);
        console.error(`Error message:`, error.message);
        if (error.response) {
            console.error(`Response status:`, error.response.status);
            console.error(`Response data:`, error.response.data);
        }
        return {
            success: false,
            error: error.message || 'Failed to send email'
        };
    }
}

/**
 * Test email configuration
 */
async function testEmailConfig() {
    const resend = getResendClient();
    
    if (!resend) {
        return {
            success: false,
            message: 'Resend API not configured'
        };
    }

    try {
        console.log('✅ Resend email service is ready to send messages');
        return {
            success: true,
            message: 'Resend email service is ready'
        };
    } catch (error) {
        console.error('❌ Email service verification failed:', error.message);
        return {
            success: false,
            message: error.message
        };
    }
}

module.exports = {
    sendCredentialsEmail,
    testEmailConfig
};