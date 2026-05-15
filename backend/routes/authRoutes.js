const express = require('express');
const router = express.Router();
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
    const { email, password, full_name, phone, role, availableTimings, ...tutorData } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ email, password: hashedPassword, full_name, phone, role });
    await user.save();

    if (role === 'tutor') {
      let parsedSubjects = [];
      let parsedTimings = [];
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
      } catch (err) { }

      const tutor = new Tutor({
        userId: user._id,
        name: full_name,
        category: tutorData.category || 'Academic',
        mode: tutorData.teaching_mode || 'Online',
        city: tutorData.city,
        experience: tutorData.experience || 0,
        qualification: tutorData.qualification || '',
        bio: tutorData.bio || '',
        hourlyRate: tutorData.hourlyRate || 500,
        subjects: parsedSubjects,
        availableTimings: parsedTimings,
        photo: tutorData.photo || "https://ui-avatars.com/api/?name=" + encodeURIComponent(full_name) + "&background=random"
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

    // If user is a tutor, check approval status
    if (user.role === 'tutor') {
      const Tutor = require('../schemas/tutorSchema');
      const tutor = await Tutor.findOne({ userId: user._id });
      if (tutor && tutor.status !== 'approved') {
        return res.status(403).json({ 
          message: `Your tutor account is currently ${tutor.status}. Please wait for admin approval.`,
          status: tutor.status
        });
      }
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user._id.toString(), email: user.email, full_name: user.full_name, role: user.role } });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/google', async (req, res) => {
  try {
    const { idToken, role, action } = req.body;

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
        role: role || 'student' // Use provided role or default to student
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
          photo: user.avatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.full_name) + "&background=random"
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

    // If existing user is a tutor, check approval status
    if (user.role === 'tutor') {
      const Tutor = require('../schemas/tutorSchema');
      const tutor = await Tutor.findOne({ userId: user._id });
      if (tutor && tutor.status !== 'approved') {
        return res.status(403).json({
          message: `Your tutor account is currently ${tutor.status}. Please contact admin for approval.`,
          status: tutor.status
        });
      }
    }

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
    const { full_name, phone } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (full_name) user.full_name = full_name;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    // Also update tutor profile if they are a tutor
    if (user.role === 'tutor') {
      await Tutor.findOneAndUpdate({ userId: user._id }, { name: full_name });
    }

    res.json({ message: 'Profile updated successfully', user: { id: user._id.toString(), email: user.email, full_name: user.full_name, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
