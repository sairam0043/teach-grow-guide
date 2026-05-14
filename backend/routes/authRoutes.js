const express = require('express');
const router = express.Router();
const User = require('../schemas/userSchema');
const Tutor = require('../schemas/tutorSchema');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'teachgrow_jwt_secret_key';
const isProduction = process.env.NODE_ENV === 'production';

// Mock transporter for development (Logs OTP to console if no SMTP configured)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'dummy',
    pass: (process.env.SMTP_PASS || 'dummy').replace(/\s+/g, ''),
  },
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
      } catch (err) {}
      
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

    // sign token
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

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, user: { id: user._id.toString(), email: user.email, full_name: user.full_name, role: user.role } });
    
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiry to 15 mins from now
    user.resetOtp = otp;
    user.resetOtpExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    // Send email (strict in production, console fallback only in local/dev)
    const smtpConfigured = Boolean(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );

    if (!smtpConfigured) {
      if (isProduction) {
        return res.status(500).json({
          message: 'Email service is not configured on server. Please contact support.'
        });
      }

      console.log(`\n======================================================`);
      console.log(`[DEVELOPMENT] PASSWORD RESET OTP FOR ${email}: ${otp}`);
      console.log(`======================================================\n`);
    } else {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <noreply@cuvasoltutor.com>',
        to: email,
        subject: 'Password Reset OTP',
        text: `Your OTP for password reset is: ${otp}. It is valid for 15 minutes.`,
        html: `<p>Your OTP for password reset is: <b>${otp}</b>.</p><p>It is valid for 15 minutes.</p>`,
      });
    }

    res.json({ message: 'OTP sent to email successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify OTP
    if (!user.resetOtp || user.resetOtp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (user.resetOtpExpiry < new Date()) {
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

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
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
