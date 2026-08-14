require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./schemas/bookingSchema');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/teachgrow';

async function cleanBookings() {
  try {
    console.log('[Reset Utility] Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('[Reset Utility] Connected successfully!');

    console.log('[Reset Utility] Deleting all booking documents from the database...');
    const result = await Booking.deleteMany({});
    console.log(`[Reset Utility] Success! Removed ${result.deletedCount} booking documents.`);

  } catch (error) {
    console.error('[Reset Utility] Error during execution:', error);
  } finally {
    console.log('[Reset Utility] Closing database connection...');
    await mongoose.disconnect();
    console.log('[Reset Utility] Database connection closed.');
    process.exit(0);
  }
}

cleanBookings();
