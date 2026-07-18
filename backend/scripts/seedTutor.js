// node backend/scripts/seedTutor.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../schemas/userSchema');
const Tutor = require('../schemas/tutorSchema');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/teachgrow';

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB...");
    
    // Clear out any existing test tutor user/profile
    const existingUser = await User.findOne({ email: 'tutor@test.com' });
    if (existingUser) {
      await Tutor.deleteMany({ userId: existingUser._id });
      await User.deleteOne({ _id: existingUser._id });
      console.log("Cleared existing tutor@test.com");
    }

    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('secret123', salt);

    const user = new User({
      email: 'tutor@test.com',
      password,
      full_name: 'Sarah Johnson',
      phone: '1234567890',
      role: 'tutor'
    });

    await user.save();

    const tutor = new Tutor({
      userId: user._id,
      name: 'Sarah Johnson',
      category: 'Academic',
      mode: 'Online',
      experience: 5,
      qualification: 'M.Sc in Physics, B.Ed',
      bio: 'Enthusiastic physics tutor with 5+ years of experience helping students excel in academics.',
      subjects: ['Physics', 'Mathematics'],
      hourlyRate: 500,
      status: 'approved', // Seeded as approved so they can see the Welcome onboarding
      availability: [
        { day: 'Monday', startTime: '09:00', endTime: '17:00' },
        { day: 'Wednesday', startTime: '09:00', endTime: '17:00' }
      ]
    });

    await tutor.save();

    console.log("\n==============================");
    console.log("TEST TUTOR CREDENTIALS GENERATED:");
    console.log("------------------------------");
    console.log("Tutor User:");
    console.log("Email: tutor@test.com");
    console.log("Password: secret123");
    console.log("Status: approved");
    console.log("==============================\n");

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};

seed();
