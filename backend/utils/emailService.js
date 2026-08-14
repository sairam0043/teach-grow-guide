const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const getTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.sendinblue.com',
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 2525,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: (process.env.SMTP_USER || '').trim(),
      pass: (process.env.SMTP_PASS || '').replace(/[\s\n\r]+/g, '').trim(),
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = getTransporter();
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <sairam44sairam@gmail.com>',
    to,
    subject,
    text: text || html.replace(/<[^>]*>?/gm, ''),
    html,
  };

  return await transporter.sendMail(mailOptions);
};

const sendProfileReminderEmail = async ({ name, email, role, missingFields = [], frontendUrl = 'https://tutor.cuvasol.com' }) => {
  const isTutor = role === 'tutor';
  const roleTitle = isTutor ? 'Tutor' : 'Student';
  const loginUrl = `${frontendUrl.replace(/\/$/, '')}/login`;

  const missingFieldsListHtml = missingFields.map(field => `
    <li style="margin-bottom: 8px; color: #b91c1c; font-weight: 600;">
      <span style="color: #1f2937; font-weight: 500;">${field}</span>
    </li>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Action Required: Complete Your Profile on Cuvasol Tutor</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px 25px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
        .content { padding: 30px 25px; color: #374151; font-size: 15px; line-height: 1.6; }
        .greeting { font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 15px; }
        .alert-box { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .alert-title { color: #991b1b; font-weight: 700; font-size: 16px; margin-bottom: 6px; }
        .missing-list { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px 20px; margin: 20px 0; }
        .cta-btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px; text-align: center; margin: 20px 0; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); }
        .cta-container { text-align: center; margin: 25px 0; }
        .footer { background-color: #f9fafb; padding: 20px 25px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Cuvasol Tutor</h1>
          <p>Action Required: Complete Your Member Profile</p>
        </div>
        <div class="content">
          <div class="greeting">Hello ${name || 'Member'},</div>
          <p>We are reaching out to remind you to complete your profile on <strong>Cuvasol Tutor</strong>.</p>
          
          <div class="alert-box">
            <div class="alert-title">⚠️ Mandatory Profile Information Required</div>
            <p style="margin:0;">To ensure your profile remains active and fully functional, you <strong>must select your Board and Class / Grade level</strong>, as well as complete any required profile details that are currently missing.</p>
          </div>

          ${missingFields.length > 0 ? `
            <p><strong>The following required field(s) are currently empty in your profile:</strong></p>
            <div class="missing-list">
              <ul style="margin: 0; padding-left: 20px;">
                ${missingFieldsListHtml}
              </ul>
            </div>
          ` : ''}

          <p>Please log in to your account and complete your profile selection today:</p>

          <div class="cta-container">
            <a href="${loginUrl}" class="cta-btn">Login & Update Profile</a>
          </div>

          <p style="font-size: 13px; color: #6b7280; margin-top: 25px;">
            If you have already updated your details recently, please ignore this notice. Need assistance? Reply to this email or contact our support team.
          </p>
        </div>
        <div class="footer">
          <p style="margin: 0 0 5px 0;">© ${new Date().getFullYear()} Cuvasol Tutor. All rights reserved.</p>
          <p style="margin: 0;">Empowering Teachers & Inspiring Learners Worldwide.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: 'Action Required: Select Your Board & Class on Cuvasol Tutor',
    html,
  });
};

module.exports = {
  getTransporter,
  sendEmail,
  sendProfileReminderEmail,
};
