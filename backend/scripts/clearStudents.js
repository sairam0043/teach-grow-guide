const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../schemas/userSchema');
const Booking = require('../schemas/bookingSchema');

const clearStudents = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Delete all users with role 'student'
    const userRes = await User.deleteMany({ role: 'student' });
    console.log(`Deleted ${userRes.deletedCount} student users.`);

    // Delete all bookings (since they are all from students)
    const bookingRes = await Booking.deleteMany({});
    console.log(`Deleted ${bookingRes.deletedCount} bookings.`);

    console.log('Database cleanup completed.');
    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
};

clearStudents();
