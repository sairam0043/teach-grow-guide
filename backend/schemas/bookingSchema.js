const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tutor', required: true },
  tutorName: { type: String, required: true },
  timing: { type: String, required: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  subject: { type: String, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'rejected', 'completed', 'enrolled'], default: 'confirmed' },
  planType: { type: String },
  amountPaid: { type: Number },
  isRated: { type: Boolean, default: false },
  groupDetails: {
    isGroup: { type: Boolean, default: false },
    invitedEmails: [{
      email: String,
      status: { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending' },
      paidShare: { type: Boolean, default: false }
    }]
  }
}, { timestamps: true });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
