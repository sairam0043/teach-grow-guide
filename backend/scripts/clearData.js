const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../schemas/userSchema');
const Tutor = require('../schemas/tutorSchema');
const Booking = require('../schemas/bookingSchema');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/teachgrow';

async function clearData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Delete all Bookings
    const bookingResult = await Booking.deleteMany({});
    console.log(`Deleted ${bookingResult.deletedCount} bookings.`);

    // 2. Delete all Tutors
    const tutorResult = await Tutor.deleteMany({});
    console.log(`Deleted ${tutorResult.deletedCount} tutor profiles.`);

    // 3. Delete all Users who are NOT admins
    const userResult = await User.deleteMany({ role: { $ne: 'admin' } });
    console.log(`Deleted ${userResult.deletedCount} users (students and tutors).`);

    console.log('Data cleanup completed successfully. Only admin accounts remain.');
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

clearData();
