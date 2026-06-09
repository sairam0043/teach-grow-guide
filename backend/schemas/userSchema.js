const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false }, // Optional for OAuth users
  full_name: { type: String, required: true },
  googleId: { type: String },
  avatar: { type: String },
  phone: { type: String },
  role: { type: String, enum: ['admin', 'student', 'tutor'], default: 'student' },
  resetOtp: { type: String },
  resetOtpExpiry: { type: Date }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
