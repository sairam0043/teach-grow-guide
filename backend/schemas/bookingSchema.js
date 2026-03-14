const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tutor', required: true },
  tutorName: { type: String, required: true },
  timing: { type: String, required: true },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  status: { type: String, enum: ['confirmed', 'cancelled', 'rejected'], default: 'confirmed' }
}, { timestamps: true });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
