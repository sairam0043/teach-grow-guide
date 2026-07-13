const express = require('express');
const router = express.Router();

const getFrontendUrl = (req) => {
  let origin = req && (req.headers.origin || req.headers.referer);
  if (origin) {
    try {
      const urlObj = new URL(origin);
      origin = urlObj.origin;
    } catch (e) {
      origin = origin.replace(/\/$/, '');
    }
    if (typeof origin === 'string' && (origin.startsWith('http://') || origin.startsWith('https://'))) {
      return origin;
    }
  }

  if (process.env.FRONTEND_URL) {
    const urls = process.env.FRONTEND_URL.split(',')
      .map(u => u.replace(/["']/g, '').trim())
      .filter(Boolean);
    if (urls.length > 0) {
      const isProd = process.env.NODE_ENV === 'production';
      if (isProd) {
        const prodUrl = urls.find(url => !url.includes('localhost') && !url.includes('127.0.0.1'));
        if (prodUrl) return prodUrl;
      }
      return urls[0];
    }
  }
  return 'http://localhost:8080';
};

const User = require('../schemas/userSchema');
const Tutor = require('../schemas/tutorSchema');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const JWT_SECRET = process.env.JWT_SECRET || 'teachgrow_jwt_secret_key';
const isProduction = process.env.NODE_ENV === 'production';

// Mock transporter for development (Logs OTP to console if no SMTP configured)
console.log('[Transporter] Initializing with:', {
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  user: process.env.SMTP_USER || 'dummy',
  pass: process.env.SMTP_PASS ? 'SET (length: ' + process.env.SMTP_PASS.length + ')' : 'NOT_SET'
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
  auth: {
    user: (process.env.SMTP_USER || 'dummy').trim(),
    pass: (process.env.SMTP_PASS || 'dummy').replace(/[\s\n\r]+/g, '').trim(),
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

// Verify transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('[Transporter] Verification failed:', error.message);
  } else {
    console.log('[Transporter] Server is ready to take our messages');
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, phone, role, availableTimings, timezone, ...tutorData } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    if (role === 'tutor' && (!tutorData.verificationDocument || tutorData.verificationDocument.trim() === '')) {
      return res.status(400).json({ message: 'Resume/CV document is required for tutor registration.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ email, password: hashedPassword, full_name, phone, role, timezone: timezone || 'Asia/Kolkata' });
    await user.save();

    if (role === 'tutor') {
      let parsedSubjects = [];
      let parsedTimings = [];
      let parsedAvailability = [];
      let parsedSubjectRates = [];
      try {
        if (typeof tutorData.subjects === 'string') {
          parsedSubjects = JSON.parse(tutorData.subjects);
        } else if (Array.isArray(tutorData.subjects)) {
          parsedSubjects = tutorData.subjects;
        }
        if (typeof availableTimings === 'string') {
          parsedTimings = JSON.parse(availableTimings);
        } else if (Array.isArray(availableTimings)) {
          parsedTimings = availableTimings;
        }
        if (typeof tutorData.availability === 'string') {
          parsedAvailability = JSON.parse(tutorData.availability);
        } else if (Array.isArray(tutorData.availability)) {
          parsedAvailability = tutorData.availability;
        }
        if (typeof tutorData.subjectRates === 'string') {
          parsedSubjectRates = JSON.parse(tutorData.subjectRates);
        } else if (Array.isArray(tutorData.subjectRates)) {
          parsedSubjectRates = tutorData.subjectRates;
        }
      } catch (err) { }

      if (parsedSubjectRates.length === 0 && parsedSubjects.length > 0) {
        parsedSubjectRates = parsedSubjects.map(sub => ({
          subject: sub,
          rate: Number(tutorData.hourlyRate) || 500
        }));
      }

      const tutor = new Tutor({
        userId: user._id,
        name: full_name,
        category: tutorData.category || 'Academic',
        mode: tutorData.teaching_mode || 'Online',
        city: tutorData.city,
        experience: tutorData.experience || 0,
        qualification: tutorData.qualification || '',
        bio: tutorData.bio || '',
        hourlyRate: Number(tutorData.hourlyRate) || 500,
        subjects: parsedSubjects,
        subjectRates: parsedSubjectRates,
        availableTimings: parsedTimings,
        availability: parsedAvailability,
        photo: tutorData.photo || "https://ui-avatars.com/api/?name=" + encodeURIComponent(full_name) + "&background=random",
        verificationDocument: tutorData.verificationDocument || '',
        address: tutorData.address || '',
        googleMapsUrl: await (async () => {
          const rawUrl = tutorData.google_maps_url || tutorData.googleMapsUrl || '';
          const { expandGoogleMapsUrl } = require('../utils/urlHelper');
          return await expandGoogleMapsUrl(rawUrl);
        })(),
        timezone: tutorData.timezone || timezone || 'Asia/Kolkata',
        hearAboutUs: tutorData.hearAboutUs || ''
      });
      await tutor.save();
    }

    // If role is tutor, don't issue a token yet. They need approval.
    if (role === 'tutor') {
      return res.status(201).json({ 
        message: 'Tutor application submitted successfully. Please wait for admin approval.',
        user: { id: user._id.toString(), email, full_name, role } 
      });
    }

    // Send welcome email to new students
    if (role === 'student') {
      try {
        console.log(`[Auth] Attempting to send welcome email to student: ${email}`);
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || '"Cuvasol Support" <noreply@cuvasoltutor.com>',
          to: email,
          subject: 'Welcome to Cuvasol - Your Account is Ready!',
          text: `Hello ${full_name},\n\nWelcome to Cuvasol! Your student account has been successfully created under the email address: ${email}.\n\nHere are a few things you can do next:\n- Browse qualified tutors and book a Free Demo session.\n- Register for the AI Future Skills Program assessment (₹100) to build core coding & AI skills.\n\nBest regards,\nCuvasol Support Team`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
              <h2 style="color: #0d9488; text-align: center;">Welcome to Cuvasol!</h2>
              <p>Hello <strong>${full_name}</strong>,</p>
              <p>Your student account has been successfully created under the email: <strong>${email}</strong>.</p>
              
              <div style="background-color: #f0fdfa; padding: 15px; border-radius: 6px; border: 1px solid #ccfbf1; margin: 20px 0;">
                <h4 style="margin-top: 0; color: #0f766e;">Quick Start Checklist:</h4>
                <ul style="line-height: 1.6; margin-bottom: 0; padding-left: 20px;">
                  <li><strong>Browse Tutors:</strong> Find experienced tutors in various subjects and book a Free Demo.</li>
                  <li><strong>AI Skills Program:</strong> Register for the assessment exam (₹100) to join our special cohort-based learning program.</li>
                </ul>
              </div>

              <div style="text-align: center; margin: 25px 0;">
                <a href="${getFrontendUrl(req)}/login" 
                   style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Go to Dashboard
                </a>
              </div>

              <p>If you have any questions or need assistance, feel free to reply to this email or reach us at <a href="mailto:support@cuvasol.com">support@cuvasol.com</a>.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 11px; color: #777; text-align: center;">
                <strong>Cuvasol Technologies Private Limited</strong><br/>
                HD-169, We Work, 78 Old Madras Road, Bangalore 560016, Karnataka, IN
              </p>
            </div>
          `
        });
        console.log(`[Auth] Welcome email sent successfully to ${email}`);
      } catch (mailError) {
        console.error('[Auth] Failed to send welcome email:', mailError.message);
      }
    }

    // sign token for students/admins
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user: { id: user._id.toString(), email, full_name, role } });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Note: We now allow tutors to log in even if pending or rejected 
    // so they can access their settings, see warnings, and correct/re-submit credentials!

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user._id.toString(), email: user.email, full_name: user.full_name, role: user.role } });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { idToken, role, action, timezone } = req.body;

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ email });

    // If it's a login action but user doesn't exist, return error
    if (action === 'login' && !user) {
      return res.status(404).json({ message: 'No account found with this email. Please register first.' });
    }

    if (user) {
      // If user exists but doesn't have googleId, update it
      if (!user.googleId) {
        user.googleId = googleId;
        user.avatar = picture;
        await user.save();
      }
    } else {
      // Create new user
      user = new User({
        email,
        full_name: name,
        googleId,
        avatar: picture,
        role: role || 'student', // Use provided role or default to student
        timezone: timezone || 'Asia/Kolkata'
      });
      await user.save();

      // If role is tutor, create an initial tutor profile
      if (user.role === 'tutor') {
        const Tutor = require('../schemas/tutorSchema');
        const tutor = new Tutor({
          userId: user._id,
          name: user.full_name,
          category: 'Academic',
          mode: 'Online',
          experience: 0,
          hourlyRate: 500,
          photo: user.avatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.full_name) + "&background=random",
          timezone: timezone || 'Asia/Kolkata'
        });
        await tutor.save();

        // For new tutors, don't issue a token. They need approval.
        return res.status(201).json({
          message: 'Tutor account created successfully. Please wait for admin approval before logging in.',
          user: {
            id: user._id.toString(),
            email: user.email,
            full_name: user.full_name,
            role: user.role
          }
        });
      }
    }

    // Note: We now allow tutors to log in even if pending or rejected
    // so they can access their settings, see warnings, and correct/re-submit credentials!

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar: user.avatar
      }
    });

  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ message: 'Google authentication failed', error: error.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  console.log(`[Forgot Password] Request received for: ${email}`);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.warn(`[Forgot Password] User not found: ${email}`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiry to 15 mins from now
    user.resetOtp = otp;
    user.resetOtpExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();
    console.log(`[Forgot Password] OTP generated for: ${email}`);

    // Send email (strict in production, console fallback only in local/dev)
    const smtpConfig = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.EMAIL_FROM
    };

    console.log(`[Forgot Password] SMTP Configuration (Production: ${isProduction}):`, JSON.stringify(smtpConfig, null, 2));

    const smtpConfigured = Boolean(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );

    if (!smtpConfigured) {
      console.warn(`[Forgot Password] SMTP is NOT fully configured. Missing one or more of: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS`);
      if (isProduction) {
        console.error(`[Forgot Password] SMTP not configured in production. Failed to send OTP to: ${email}`);
        return res.status(500).json({
          message: 'Email service is not configured on server. Please contact support.'
        });
      }

      console.log(`\n======================================================`);
      console.log(`[DEVELOPMENT] PASSWORD RESET OTP FOR ${email}: ${otp}`);
      console.log(`======================================================\n`);
    } else {
      console.log(`[Forgot Password] Attempting to send email to: ${email} using ${process.env.SMTP_HOST}`);
      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <noreply@cuvasoltutor.com>',
          to: email,
          subject: 'Password Reset OTP',
          text: `Your OTP for password reset is: ${otp}. It is valid for 15 minutes.`,
          html: `<p>Your OTP for password reset is: <b>${otp}</b>.</p><p>It is valid for 15 minutes.</p>`,
        });
        console.log(`[Forgot Password] OTP email sent successfully to: ${email}`);
      } catch (mailError) {
        console.error(`[Forgot Password] Nodemailer Error for ${email}:`, mailError);
        
        // In dev, we log the OTP to the console so testing can continue
        if (!isProduction) {
          console.log(`\n======================================================`);
          console.log(`[DEVELOPMENT FALLBACK] OTP FOR ${email}: ${otp}`);
          console.log(`======================================================\n`);
          
          return res.json({ 
            message: 'OTP generated (Email delivery failed, check server console)',
            devFallback: true 
          });
        }
        
        // In production, we must throw to notify the user of the failure
        throw mailError;
      }
    }

    res.json({ message: 'OTP sent to email successfully' });
  } catch (error) {
    console.error(`[Forgot Password] Error for ${email}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  console.log(`[Reset Password] Request received for: ${email}`);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.warn(`[Reset Password] User not found: ${email}`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify OTP
    if (!user.resetOtp || user.resetOtp !== otp) {
      console.warn(`[Reset Password] Invalid OTP attempt for: ${email}`);
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (user.resetOtpExpiry < new Date()) {
      console.warn(`[Reset Password] Expired OTP attempt for: ${email}`);
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user
    user.password = hashedPassword;
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();

    console.log(`[Reset Password] Password reset successfully for: ${email}`);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error(`[Reset Password] Error for ${email}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/profile/:id', async (req, res) => {
  try {
    const { full_name, phone, timezone } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (full_name) user.full_name = full_name;
    if (phone !== undefined) user.phone = phone;
    if (timezone !== undefined) user.timezone = timezone;

    await user.save();

    // Also update tutor profile if they are a tutor
    if (user.role === 'tutor') {
      const updateData = { name: full_name };
      if (timezone !== undefined) updateData.timezone = timezone;
      await Tutor.findOneAndUpdate({ userId: user._id }, updateData);
    }

    res.json({ message: 'Profile updated successfully', user: { id: user._id.toString(), email: user.email, full_name: user.full_name, role: user.role, timezone: user.timezone } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  console.log(`[Contact Form] Submission received from ${name} (${email})`);

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const smtpConfigured = Boolean(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );

    if (!smtpConfigured) {
      console.warn(`[Contact Form] SMTP is NOT fully configured. Logging to console.`);
      if (isProduction) {
        console.error(`[Contact Form] SMTP not configured in production. Failed to send message from ${email}`);
        return res.status(500).json({
          message: 'Email service is not configured on server. Please contact support.'
        });
      }

      console.log(`\n======================================================`);
      console.log(`[DEVELOPMENT] SUPPORT INQUIRY FOR support@cuvasol.com`);
      console.log(`From: ${name} (${email})`);
      console.log(`Subject: ${subject}`);
      console.log(`Message: ${message}`);
      console.log(`======================================================\n`);
    } else {
      console.log(`[Contact Form] Attempting to send contact form email to support@cuvasol.com`);
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Cuvasol Contact Form" <noreply@cuvasoltutor.com>',
        to: 'support@cuvasol.com',
        replyTo: email,
        subject: `[Contact Form] ${subject}`,
        text: `New contact form submission:\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage:\n${message}`,
        html: `<h3>New Support Inquiry</h3>
               <p><strong>Name:</strong> ${name}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Subject:</strong> ${subject}</p>
               <p><strong>Message:</strong></p>
               <p style="white-space: pre-wrap; background-color: #f3f4f6; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">${message}</p>`,
      });
      console.log(`[Contact Form] Email sent successfully to support@cuvasol.com`);
    }

    res.json({ success: true, message: 'Your message has been sent successfully!' });
  } catch (error) {
    console.error(`[Contact Form] Error processing submission:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
