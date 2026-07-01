// backend/scripts/resetTutorPending.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Tutor = require('../schemas/tutorSchema');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/teachgrow';

async function run() {
  await mongoose.connect(MONGO_URI);
  await Tutor.updateOne({ name: "Sarah Johnson" }, { $set: { status: "pending", rejectionReason: "" } });
  await mongoose.disconnect();
  console.log("Sarah Johnson status set to pending successfully.");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
