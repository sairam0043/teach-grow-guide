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

const sendReferralIntroEmail = async ({ name, email, referralCode, frontendUrl = 'https://tutor.cuvasol.com' }) => {
  const referralLink = `${frontendUrl.replace(/\/$/, '')}/register/student?ref=${referralCode}`;
  const dashboardUrl = `${frontendUrl.replace(/\/$/, '')}/login`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>🎉 250+ Tutors & a Special Referral Reward for You!</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px 25px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
        .content { padding: 30px 25px; color: #374151; font-size: 15px; line-height: 1.6; }
        .greeting { font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 15px; }
        .section-title { font-size: 16px; font-weight: 700; color: #1e3a8a; margin-top: 25px; margin-bottom: 10px; }
        .rewards-table { width: 100%; border-collapse: collapse; margin: 15px 0; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
        .rewards-table th, .rewards-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .rewards-table th { background-color: #f3f4f6; font-weight: 600; color: #374151; }
        .rewards-table tr:last-child td { border-bottom: none; }
        .highlight { color: #059669; font-weight: 700; }
        .step-list { padding-left: 20px; margin: 10px 0; }
        .step-list li { margin-bottom: 8px; }
        .link-box { background-color: #eff6ff; border: 1px dashed #3b82f6; border-radius: 8px; padding: 15px; margin: 20px 0; word-break: break-all; font-family: monospace; font-size: 14px; color: #2563eb; text-align: center; }
        .cta-btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px; text-align: center; margin: 20px 0; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); }
        .cta-container { text-align: center; margin: 25px 0; }
        .footer { background-color: #f9fafb; padding: 25px; text-align: center; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Cuvasol Tutor Referral Program</h1>
          <p>Earn rewards by sharing Cuvasol with your students</p>
        </div>
        <div class="content">
          <div class="greeting">Hi ${name || 'Tutor'},</div>
          <p>We’re happy to share an exciting milestone — Cuvasol has now grown to a community of <strong>250+ tutors!</strong> 🎉</p>
          <p>Thank you for being an important part of the Cuvasol tutor community and helping us grow.</p>
          <p>To celebrate this milestone, we’re excited to introduce the <strong>Cuvasol Tutor Referral Program</strong>, giving you an opportunity to earn additional rewards by bringing students to Cuvasol.</p>
          
          <div class="section-title">🎁 How It Works</div>
          <p>Share your unique referral link with students who may be looking for a tutor or online classes:</p>
          <ol class="step-list">
            <li>Share your referral link with students.</li>
            <li>Student registers through your unique referral link.</li>
            <li>Student completes a class on Cuvasol.</li>
            <li><strong>You earn your referral reward! 🎉</strong></li>
          </ol>

          <div class="section-title">💰 Your Referral Rewards</div>
          <table class="rewards-table">
            <thead>
              <tr>
                <th>Successful Referrals</th>
                <th>Total Reward</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1 Successful Referral</td>
                <td class="highlight">₹100</td>
              </tr>
              <tr>
                <td>3 Successful Referrals</td>
                <td class="highlight">₹300</td>
              </tr>
              <tr>
                <td>5 Successful Referrals</td>
                <td class="highlight">₹500</td>
              </tr>
            </tbody>
          </table>
          <p style="font-size: 13px; color: #6b7280; margin-top: 5px; margin-bottom: 20px;">
            You can invite as many students as you like. However, the maximum referral reward is capped at <strong>₹5,000 per tutor</strong>.
          </p>

          <div class="section-title">⏰ Special Offer Valid Until September 30, 2026</div>
          <p>This referral reward offer is available until <strong>September 30, 2026</strong>.</p>
          <p>So, start sharing your referral link today and make the most of this limited-time opportunity!</p>

          <div class="section-title">✅ What is a Successful Referral?</div>
          <p>A successful referral is counted when a student registers through your unique referral link and completes a class on Cuvasol.</p>
          <p style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px; font-size: 14px; color: #b45309; margin: 15px 0;">
            <strong>Please note:</strong> Registrations alone do not qualify for a referral reward. The referred student must complete a class on Cuvasol for the referral to be considered successful.
          </p>

          <div class="section-title">🚀 Start Referring Today</div>
          <p>Share Cuvasol with your students, friends, family, and other learners who may benefit from online tutoring.</p>
          
          <p style="margin-bottom: 5px;"><strong>Your Referral Link:</strong></p>
          <div class="link-box">
            <a href="${referralLink}" target="_blank" style="color: #2563eb; text-decoration: none; font-weight: 600;">${referralLink}</a>
          </div>

          <p>Log in to your Cuvasol tutor account to access your unique referral link and track your successful referrals and rewards.</p>

          <div class="cta-container">
            <a href="${dashboardUrl}" class="cta-btn">View My Referral Dashboard</a>
          </div>

          <p>Thank you for being a valued part of the 250+ strong Cuvasol tutor community. We look forward to growing together!</p>
          
          <p style="margin-top: 25px; margin-bottom: 0;">Best Regards,</p>
          <p style="margin: 0; font-weight: 700; color: #111827;">Cuvasol Tutor Referral Team</p>
          <p style="margin: 0;"><a href="https://www.cuvasol.com" target="_blank" style="color: #3b82f6;">www.cuvasol.com</a></p>
        </div>
        <div class="footer">
          <p style="margin: 0 0 5px 0;">© ${new Date().getFullYear()} Cuvasol. All rights reserved.</p>
          <p style="margin: 0;">Empowering Teachers & Inspiring Learners Worldwide.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: email,
    subject: '🎉 250+ Tutors & a Special Referral Reward for You!',
    html,
  });
};

const sendPayoutReceiptEmail = async ({
  tutorName,
  tutorEmail,
  amount,
  periodMonth,
  paymentMode,
  transactionReference,
  bankDetails,
  frontendUrl = 'https://tutor.cuvasol.com'
}) => {
  const dashboardUrl = `${frontendUrl.replace(/\/$/, '')}/dashboard/tutor`;
  const maskedAcc = bankDetails?.accountNumber 
    ? `••••${bankDetails.accountNumber.slice(-4)}` 
    : 'Registered Account';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Payment Receipt: Tutor Payout Disbursed</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px 25px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
        .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
        .content { padding: 30px 25px; color: #374151; font-size: 15px; line-height: 1.6; }
        .amount-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
        .amount-title { font-size: 13px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 1px; }
        .amount-val { font-size: 32px; font-weight: 800; color: #15803d; margin: 6px 0; }
        .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; background: #f9fafb; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
        .details-table td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        .details-table td:first-child { color: #6b7280; font-weight: 600; width: 45%; }
        .details-table td:last-child { color: #111827; font-weight: 700; text-align: right; }
        .details-table tr:last-child td { border-bottom: none; }
        .cta-btn { display: inline-block; background-color: #059669; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 15px; text-align: center; margin: 15px 0; }
        .footer { background-color: #f9fafb; padding: 20px 25px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Cuvasol Tutor Payout</h1>
          <p>Payment Disbursed Successfully</p>
        </div>
        <div class="content">
          <p>Hello <strong>${tutorName || 'Tutor'}</strong>,</p>
          <p>We are pleased to inform you that your tutor payout for <strong>${periodMonth || 'the recent billing cycle'}</strong> has been successfully processed and transferred to your bank account.</p>
          
          <div class="amount-box">
            <div class="amount-title">Total Payout Amount</div>
            <div class="amount-val">₹${amount}</div>
            <div style="font-size: 12px; color: #166534;">Transferred via ${paymentMode || 'Bank Transfer'}</div>
          </div>

          <table class="details-table">
            <tr>
              <td>Beneficiary Bank</td>
              <td>${bankDetails?.bankName || 'Registered Bank'}</td>
            </tr>
            <tr>
              <td>Account Number</td>
              <td>${maskedAcc}</td>
            </tr>
            ${bankDetails?.ifscCode ? `<tr><td>IFSC Code</td><td>${bankDetails.ifscCode}</td></tr>` : ''}
            ${transactionReference ? `<tr><td>Transaction UTR / Ref</td><td>${transactionReference}</td></tr>` : ''}
            <tr>
              <td>Transfer Date</td>
              <td>${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
            </tr>
          </table>

          <p style="font-size: 13px; color: #4b5563;">Depending on your bank, IMPS/NEFT transfers may take anywhere from a few minutes to a few hours to reflect in your passbook.</p>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${dashboardUrl}" class="cta-btn">View Tutor Earnings Ledger</a>
          </div>

          <p style="font-size: 13px; color: #6b7280;">Thank you for delivering exceptional teaching sessions on Cuvasol Tutor!</p>
        </div>
        <div class="footer">
          <p style="margin: 0 0 5px 0;">© ${new Date().getFullYear()} Cuvasol Tutor. All rights reserved.</p>
          <p style="margin: 0;">Cuvasol Technologies Private Limited</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: tutorEmail,
    subject: `💰 Payout Disbursed: ₹${amount} - Cuvasol Tutor`,
    html,
  });
};

const sendBankDetailsReminderEmail = async ({
  tutorName,
  tutorEmail,
  pendingAmount = 0,
  frontendUrl = 'https://tutor.cuvasol.com'
}) => {
  const paymentTabUrl = `${frontendUrl.replace(/\/$/, '')}/dashboard/tutor`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Action Required: Setup Your Payout Bank Account</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px 25px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
        .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
        .content { padding: 30px 25px; color: #374151; font-size: 15px; line-height: 1.6; }
        .alert-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .cta-btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 16px; text-align: center; margin: 20px 0; }
        .footer { background-color: #f9fafb; padding: 20px 25px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Cuvasol Tutor</h1>
          <p>Action Required: Setup Payment Account</p>
        </div>
        <div class="content">
          <p>Hello <strong>${tutorName || 'Tutor'}</strong>,</p>
          <p>Our finance and HR team is preparing monthly tutor payout disbursements.</p>
          
          <div class="alert-box">
            <p style="margin:0; font-weight: 600; color: #1e40af;">
              ⚠️ Bank details missing: We noticed you have not configured your payout bank account on your dashboard.
            </p>
            ${pendingAmount > 0 ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #1e3a8a;">You currently have <strong>₹${pendingAmount}</strong> in pending earnings awaiting disbursement.</p>` : ''}
          </div>

          <p>To ensure your earnings are directly and securely deposited into your bank account via RazorpayX, please update your bank details today:</p>
          
          <ul style="color: #4b5563; font-size: 14px; line-height: 1.8;">
            <li>Account Holder Name (as on bank passbook)</li>
            <li>Bank Name & Account Number</li>
            <li>IFSC Code & Account Type</li>
          </ul>

          <div style="text-align: center; margin: 25px 0;">
            <a href="${paymentTabUrl}" class="cta-btn">Setup Payment Account Now</a>
          </div>

          <p style="font-size: 13px; color: #6b7280;">If you need any assistance, please reply directly to this email or reach us at <a href="mailto:support@cuvasol.com" style="color: #2563eb;">support@cuvasol.com</a>.</p>
        </div>
        <div class="footer">
          <p style="margin: 0 0 5px 0;">© ${new Date().getFullYear()} Cuvasol Tutor. All rights reserved.</p>
          <p style="margin: 0;">Cuvasol Technologies Private Limited</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({
    to: tutorEmail,
    subject: `💳 Action Required: Setup Your Payout Bank Account - Cuvasol Tutor`,
    html,
  });
};

module.exports = {
  getTransporter,
  sendEmail,
  sendProfileReminderEmail,
  sendReferralIntroEmail,
  sendPayoutReceiptEmail,
  sendBankDetailsReminderEmail,
};

