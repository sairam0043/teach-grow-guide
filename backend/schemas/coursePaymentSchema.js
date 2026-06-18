const mongoose = require('mongoose');

const coursePaymentSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  purchaseType: { type: String, enum: ['assessment', 'full_course'], required: true },
  amountPaid: { type: Number, required: true },
  status: { type: String, enum: ['pending_payment', 'completed', 'failed'], default: 'pending_payment' },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  shortlisted: { type: Boolean, default: false },
  assessmentAttempted: { type: Boolean, default: false },
  assessmentAttemptedAt: { type: Date },
  assessmentAnswers: { type: mongoose.Schema.Types.Mixed },
  assessmentScore: { type: Number }
}, { timestamps: true });

const CoursePayment = mongoose.model('CoursePayment', coursePaymentSchema);

module.exports = CoursePayment;
