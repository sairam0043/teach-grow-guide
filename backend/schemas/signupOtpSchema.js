const mongoose = require('mongoose');

const signupOtpSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 900 } // automatically deleted after 15 minutes (900 seconds)
}, { timestamps: true });

const SignupOtp = mongoose.model('SignupOtp', signupOtpSchema);

module.exports = SignupOtp;
