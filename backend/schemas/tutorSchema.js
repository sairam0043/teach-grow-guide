const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  date: { type: String, required: true },
  time: { type: String, required: true },
  available: { type: Boolean, default: true }
});

const tutorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  photo: { type: String },
  category: { type: String, required: true },
  mode: { type: String, required: true },
  qualification: { type: String },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  experience: { type: Number, default: 0 },
  city: { type: String },
  bio: { type: String },
  subjects: [{ type: String }],
  hourlyRate: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  featured: { type: Boolean, default: false },
  availableTimings: [{ type: String }],
  demoSlots: [slotSchema]
}, { timestamps: true });

const Tutor = mongoose.model('Tutor', tutorSchema);

module.exports = Tutor;
