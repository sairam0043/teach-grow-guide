// node backend/scripts/seedCredentials.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../schemas/userSchema');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/teachgrow';

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB...");
    
    // Clear out testing users
    await User.deleteMany({ email: { $in: ['student@test.com', 'admin@test.com'] } });

    const salt = await bcrypt.genSalt(10);
    const password = await bcrypt.hash('secret123', salt);

    const student = new User({
      email: 'student@test.com',
      password,
      full_name: 'Beta Student Worker',
      phone: '1234567890',
      role: 'student'
    });

    const admin = new User({
      email: 'admin@test.com',
      password,
      full_name: 'Lead Admin',
      phone: '0987654321',
      role: 'admin'
    });

    await student.save();
    await admin.save();

    console.log("\n==============================");
    console.log("TEST CREDENTIALS GENERATED:");
    console.log("------------------------------");
    console.log("Student User:");
    console.log("Email: student@test.com");
    console.log("Password: secret123");
    console.log("------------------------------");
    console.log("Admin User:");
    console.log("Email: admin@test.com");
    console.log("Password: secret123");
    console.log("==============================\n");

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};

seed();
