const nodemailer = require('nodemailer');

// Configure Email Transporter
let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;

  if (gmailUser && gmailPass) {
    // Production / Active Gmail SMTP Configuration
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });
    console.log(`📧 Configured Nodemailer with Gmail SMTP account: ${gmailUser}`);
  } else {
    // Development / Ethereal Real Email Testing Account
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log(`📧 Configured Nodemailer with Ethereal Test Account: ${testAccount.user}`);
    } catch (err) {
      console.warn('⚠️ Could not create Ethereal test account, using JSON transport fallback.');
      transporter = nodemailer.createTransport({ jsonTransport: true });
    }
  }

  return transporter;
}

/**
 * Sends a 6-digit OTP email to the user's Gmail address
 */
async function sendOtpEmail(recipientEmail, otpCode, context = 'Account Verification') {
  try {
    const mail = await getTransporter();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #dce6e7; border-radius: 12px; background-color: #f6faf9;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #087f76; margin: 0; font-size: 24px;">StockSense Odoo IMS</h2>
          <p style="color: #607480; font-size: 14px; margin-top: 5px;">${context}</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 25px; border-radius: 10px; border: 1px solid #e1eeed; text-align: center;">
          <p style="font-size: 15px; color: #142c3a; margin-top: 0;">Your 6-Digit Gmail Verification OTP Code is:</p>
          <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #087f76; padding: 15px; background: #e8f7f1; border-radius: 8px; display: inline-block; margin: 15px 0;">
            ${otpCode}
          </div>
          <p style="font-size: 13px; color: #607480; margin-bottom: 0;">This OTP code will expire in <strong>10 minutes</strong>. Do not share this code with anyone.</p>
        </div>

        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #9bb0b5;">
          Sent by StockSense Security Systems &bull; Odoo IMS Security
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"StockSense Security" <no-reply@stocksense.com>`,
      to: recipientEmail,
      subject: `[${otpCode}] StockSense Gmail Verification OTP`,
      text: `Your StockSense 6-digit OTP verification code is: ${otpCode}. Valid for 10 minutes.`,
      html: htmlContent
    };

    const info = await mail.sendMail(mailOptions);
    console.log(`✅ Real Gmail OTP Email sent to ${recipientEmail}. Message ID: ${info.messageId}`);
    
    // Log preview link if Ethereal account was used
    if (nodemailer.getTestMessageUrl(info)) {
      console.log(`🔗 Ethereal Inbox Email Preview Link: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return info;
  } catch (err) {
    console.error(`❌ Failed to send OTP email to ${recipientEmail}:`, err);
    throw err;
  }
}

module.exports = {
  sendOtpEmail
};
