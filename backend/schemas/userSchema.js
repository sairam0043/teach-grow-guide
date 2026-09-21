const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['credit', 'debit'], required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  date: { type: Date, default: Date.now },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  referredStudentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { _id: true });

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false }, // Optional for OAuth users
  full_name: { type: String, required: true },
  googleId: { type: String },
  avatar: { type: String },
  phone: { type: String },
  student_class: { type: String },
  student_or_parent: { type: String, enum: ['Student', 'Parent'], default: 'Student' },
  student_name: { type: String },
  heard_about_us: { type: String },
  role: { type: String, enum: ['admin', 'hr', 'student', 'tutor'], default: 'student' },
  timezone: { type: String, default: 'Asia/Kolkata' },
  resetOtp: { type: String },
  resetOtpExpiry: { type: Date },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referralCode: { type: String, unique: true, sparse: true },
  marketingRefCode: { type: String, trim: true },
  walletBalance: { type: Number, default: 0 },
  walletHistory: [walletTransactionSchema]
}, { timestamps: true });

userSchema.pre('save', function() {
  if (!this.referralCode && this.role === 'student') {
    const rawName = (this.student_name || this.full_name || 'STUDENT').replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() || 'STU';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    this.referralCode = `${rawName}${randomNum}`;
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
