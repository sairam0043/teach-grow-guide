// Script to create one tutor programmatically using the Mongoose
// Usage: node scripts/createTutor.js
require('dotenv').config();
const mongoose = require('mongoose');
const Tutor = require('../schemas/tutorSchema');

const newTutorAuthData = {
  name: "Anita Desai",
  photo: "https://i.pravatar.cc/150?u=a04258114e29026702d",
  category: "Academic",
  mode: "Both",
  qualification: "B.Ed, English Literature",
  rating: 4.7,
  reviewCount: 95,
  experience: 5,
  city: "Bangalore",
  bio: "Interactive and engaging teaching styles to master English Literature and grammar.",
  subjects: ["English", "History"],
  hourlyRate: 600,
  demoSlots: [
    { date: "16 Mar", time: "11:00 AM", available: true },
    { date: "17 Mar", time: "2:00 PM", available: true }
  ]
};

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/teachgrow';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB. Creating Tutor...');
    
    try {
      const tutor = new Tutor(newTutorAuthData);
      await tutor.save();
      console.log("Tutor created successfully!");
      console.log(tutor);
    } catch (err) {
      console.error("Error creating tutor:", err);
    } finally {
      mongoose.connection.close();
    }
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });
