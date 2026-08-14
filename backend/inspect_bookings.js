const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Booking = require('./schemas/bookingSchema');

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("Connected to DB.");
    const bookings = await Booking.find({});
    console.log("Bookings count:", bookings.length);
    bookings.forEach(b => {
      console.log(`- ID: ${b._id}, Student: ${b.studentName}, Tutor: ${b.tutorName}, Subject: ${b.subject}, Status: ${b.status}, PlanType: ${b.planType}, Amount: ${b.amountPaid}, Timing: ${b.timing}`);
    });
    mongoose.connection.close();
  })
  .catch(err => {
    console.error("DB Connection Error:", err);
  });
