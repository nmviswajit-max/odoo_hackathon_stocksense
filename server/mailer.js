require('dotenv').config();
const nodemailer = require('nodemailer');

/**
 * Creates and returns the active email transporter based on configuration
 */
async function getTransporter() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_PASS;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  // 1. Gmail SMTP Configuration
  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser.trim(),
          pass: gmailPass.trim()
        }
      });
      console.log(`📧 Configured Gmail SMTP for account: ${gmailUser}`);
      return transporter;
    } catch (e) {
      console.warn('⚠️ Gmail SMTP Transporter creation failed:', e.message);
    }
  }

  // 2. Custom SMTP Configuration
  if (smtpHost && smtpUser && smtpPass) {
    console.log(`📧 Configured Custom SMTP (${smtpHost}:${smtpPort})`);
    return nodemailer.createTransport({
      host: smtpHost.trim(),
      port: parseInt(smtpPort, 10),
      secure: smtpPort == 465,
      auth: {
        user: smtpUser.trim(),
        pass: smtpPass.trim()
      }
    });
  }

  // 3. Fallback Development Mailer
  try {
    const testAccount = await nodemailer.createTestAccount();
    console.log(`📧 Created Ethereal Test Mailer (Dev Mode). User: ${testAccount.user}`);
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  } catch (err) {
    return nodemailer.createTransport({ jsonTransport: true });
  }
}

/**
 * Sends a 6-digit OTP email to the user's Gmail address
 */
async function sendOtpEmail(recipientEmail, otpCode, context = 'Account Creation Email Verification') {
  try {
    let mailer = await getTransporter();
    const sender = process.env.GMAIL_USER || 'no-reply@stocksense.com';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 25px; border: 1px solid #dce6e7; border-radius: 12px; background-color: #f6faf9;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #087f76; margin: 0; font-size: 24px;">StockSense Odoo IMS</h2>
          <p style="color: #607480; font-size: 14px; margin-top: 5px;">${context}</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 25px; border-radius: 10px; border: 1px solid #e1eeed; text-align: center;">
          <p style="font-size: 15px; color: #142c3a; margin-top: 0;">Your 6-Digit Gmail Verification OTP Code is:</p>
          <div style="font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #087f76; padding: 15px 25px; background: #e8f7f1; border-radius: 8px; display: inline-block; margin: 15px 0;">
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
      from: `"StockSense Security" <${sender}>`,
      to: recipientEmail,
      subject: `[${otpCode}] Your StockSense Gmail Verification OTP`,
      text: `Your StockSense 6-digit OTP verification code is: ${otpCode}. Valid for 10 minutes.`,
      html: htmlContent
    };

    let info;
    try {
      info = await mailer.sendMail(mailOptions);
    } catch (err) {
      console.warn(`⚠️ Gmail SMTP send failed (${err.message}). Retrying via Ethereal fallback mailer...`);
      const testAccount = await nodemailer.createTestAccount();
      const fallbackMailer = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass }
      });
      info = await fallbackMailer.sendMail(mailOptions);
    }

    console.log(`=======================================================`);
    console.log(`📩 GMAIL OTP DISPATCH TELEMETRY`);
    console.log(`Recipient: ${recipientEmail}`);
    console.log(`OTP Code : ${otpCode}`);
    if (info && info.messageId) console.log(`Message ID: ${info.messageId}`);
    
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 Ethereal Web Inbox Link: ${previewUrl}`);
    }
    console.log(`=======================================================`);

    return { success: true, info, previewUrl };

  } catch (err) {
    console.error(`❌ Mailer error sending OTP to ${recipientEmail}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendOtpEmail
};
