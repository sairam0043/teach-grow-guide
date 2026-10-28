const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  startTime: { type: String, required: true }, // e.g. "10:00"
  endTime: { type: String, required: true },   // e.g. "13:00"
  label: { type: String, default: "" }
}, { _id: true });

const dayScheduleSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  isEnabled: { type: Boolean, default: true },
  timeSlots: [timeSlotSchema]
}, { _id: true });

const defaultWeeklySchedule = [
  {
    day: 'Monday',
    isEnabled: true,
    timeSlots: [
      { startTime: '10:00', endTime: '13:00', label: 'Morning Session' },
      { startTime: '14:00', endTime: '17:00', label: 'Afternoon Session' }
    ]
  },
  {
    day: 'Tuesday',
    isEnabled: true,
    timeSlots: [
      { startTime: '10:00', endTime: '13:00', label: 'Morning Session' },
      { startTime: '14:00', endTime: '17:00', label: 'Afternoon Session' }
    ]
  },
  {
    day: 'Wednesday',
    isEnabled: true,
    timeSlots: [
      { startTime: '10:00', endTime: '13:00', label: 'Morning Session' },
      { startTime: '14:00', endTime: '17:00', label: 'Afternoon Session' }
    ]
  },
  {
    day: 'Thursday',
    isEnabled: true,
    timeSlots: [
      { startTime: '10:00', endTime: '13:00', label: 'Morning Session' },
      { startTime: '14:00', endTime: '17:00', label: 'Afternoon Session' }
    ]
  },
  {
    day: 'Friday',
    isEnabled: true,
    timeSlots: [
      { startTime: '10:00', endTime: '13:00', label: 'Morning Session' },
      { startTime: '14:00', endTime: '17:00', label: 'Afternoon Session' }
    ]
  },
  {
    day: 'Saturday',
    isEnabled: true,
    timeSlots: [
      { startTime: '10:00', endTime: '13:00', label: 'Morning Session' }
    ]
  },
  {
    day: 'Sunday',
    isEnabled: false,
    timeSlots: []
  }
];

const adminAvailabilitySchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  googleMeetLink: { type: String, default: '', trim: true },
  timezone: { type: String, default: 'Asia/Kolkata' },
  slotDurationMinutes: { type: Number, default: 30 },
  bufferMinutes: { type: Number, default: 0 },
  daysAhead: { type: Number, default: 14 },
  instructions: {
    type: String,
    default: 'Please be ready with your academic degree certificates, government ID, and a 10-minute demo lesson for the verification meeting.'
  },
  weeklySchedule: {
    type: [dayScheduleSchema],
    default: defaultWeeklySchedule
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const AdminAvailability = mongoose.model('AdminAvailability', adminAvailabilitySchema);

module.exports = AdminAvailability;
