const { v4: uuidv4 } = require('uuid');

const tutors = [
  {
    "id": "1",
    "name": "David Sharma",
    "photo": "https://i.pravatar.cc/150?u=a042581f4e29026704d",
    "category": "Academic",
    "mode": "Online",
    "qualification": "M.Sc Mathematics",
    "rating": 4.9,
    "reviewCount": 128,
    "experience": 8,
    "city": "Mumbai",
    "bio": "Passionate mathematics teacher with 8 years of experience helping students excel in competitive exams.",
    "subjects": ["Advanced Math", "Physics", "Calculus"],
    "hourlyRate": 800,
    "demoSlots": [
      { "id": uuidv4(), "date": "15 Mar", "time": "10:00 AM", "available": true },
      { "id": uuidv4(), "date": "16 Mar", "time": "4:00 PM", "available": true }
    ]
  }
];

const bookings = [];

module.exports = { tutors, bookings };
