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

console.log("Connecting to database...");

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("Connected successfully to DB.");

    // Update Sairam Anakala
    const sairamUpdate = await Tutor.findOneAndUpdate(
      { name: "sairam anakala" },
      { photo: "/uploads/tutor-0e66da1b-c7c5-4c5a-8c05-d859aa8c9a4b.png" },
      { new: true }
    );
    if (sairamUpdate) {
      console.log(`Updated sairam anakala: ${sairamUpdate.photo}`);
    } else {
      console.log("Could not find tutor 'sairam anakala'");
    }

    // Update Harshith
    const harshithUpdate = await Tutor.findOneAndUpdate(
      { name: "harshith" },
      { photo: "/uploads/tutor-e77ab3e9-f7e9-447a-bd2a-84ca527166d3.png" },
      { new: true }
    );
    if (harshithUpdate) {
      console.log(`Updated harshith: ${harshithUpdate.photo}`);
    } else {
      console.log("Could not find tutor 'harshith'");
    }

    mongoose.connection.close();
    console.log("Database connection closed.");
  })
  .catch(err => {
    console.error("DB Connection Error:", err);
  });
