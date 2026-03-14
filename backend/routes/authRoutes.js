const express = require('express');
const router = express.Router();
const User = require('../schemas/userSchema');
const Tutor = require('../schemas/tutorSchema');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'teachgrow_jwt_secret_key';

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

module.exports = router;
