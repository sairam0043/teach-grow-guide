const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tutor', required: true },
  tutorName: { type: String, required: true },
  timing: { type: String, required: true },
  utcTiming: { type: Date },
  studentId: { type: String, required: true },
  studentName: { type: String, required: true },
  subject: { type: String, required: true },
  status: { type: String, enum: ['pending', 'pending_payment', 'confirmed', 'cancelled', 'rejected', 'completed', 'enrolled'], default: 'confirmed' },
  planType: { type: String },
  amountPaid: { type: Number },
  originalAmount: { type: Number },
  walletUsed: { type: Number, default: 0 },
  isRated: { type: Boolean, default: false },
  meetingLink: { type: String },
  cancellationReason: { type: String },
  cancelledBy: { type: String, enum: ['Student', 'Tutor', 'Admin', ''], default: '' },
  cancelledAt: { type: Date },
  groupDetails: {
    isGroup: { type: Boolean, default: false },
    invitedEmails: [{
      email: String,
      status: { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending' },
      paidShare: { type: Boolean, default: false }
    }]
  },
  packDetails: {
    startDate: { type: String },
    endDate: { type: String },
    daysPerWeek: { type: Number },
    schedule: [{
      day: { type: String },
      time: { type: String }
    }]
  },
  sessions: [{
    date: { type: String, required: true },
    time: { type: String, required: true },
    utcDate: { type: Date },
    meetingLink: { type: String },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' }
  }],
  rescheduleRequest: {
    requestedTiming: { type: String },
    requestedUtcTiming: { type: Date },
    requestedBy: { type: String, enum: ['Student', 'Tutor', 'Admin', ''], default: '' },
    reason: { type: String },
    requestedAt: { type: Date },
    status: { type: String, enum: ['pending', 'approved', 'declined', ''], default: '' },
    declinedReason: { type: String }
  },
  rescheduledAt: { type: Date },
  rescheduledBy: { type: String, enum: ['Student', 'Tutor', 'Admin', ''], default: '' }
}, { timestamps: true });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;

