require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
  },
});

console.log('Testing email transport with config:', {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER,
  secure: process.env.SMTP_PORT == 465,
});

transporter.verify(function (error, success) {
  if (error) {
    console.error('Transporter verification failed:', error);
  } else {
    console.log('Server is ready to take our messages');
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <noreply@cuvasoltutor.com>',
      to: 'n210043@rguktn.ac.in', // Using the email from the user's logs
      subject: 'Test Email',
      text: 'This is a test email.',
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Email sending failed:', error);
      } else {
        console.log('Email sent:', info.response);
      }
      process.exit(0);
    });
  }
});
