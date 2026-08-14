const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Tutor = require('./schemas/tutorSchema');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI not found in .env");
  process.exit(1);
}

console.log("Connecting to:", MONGO_URI.substring(0, 50) + "...");

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("Connected successfully to DB.");
    const tutors = await Tutor.find({}, 'name photo status hourlyRate');
    console.log("Tutors in database:");
    tutors.forEach(t => {
      console.log(`- ID: ${t._id}, Name: ${t.name}, Status: ${t.status}, Hourly Rate: ${t.hourlyRate}, Photo URL: ${t.photo}`);
    });
    mongoose.connection.close();
  })
  .catch(err => {
    console.error("DB Connection Error:", err);
  });
