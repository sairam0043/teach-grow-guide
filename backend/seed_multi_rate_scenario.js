require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./schemas/userSchema');
const Tutor = require('./schemas/tutorSchema');
const Booking = require('./schemas/bookingSchema');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/teachgrow';

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected.");

  try {
    // 1. Clean up old test data to ensure clean run
    console.log("Cleaning up previous test data if any...");
    const oldTutorUser = await User.findOne({ email: 'tutor_multi@test.com' });
    if (oldTutorUser) {
      const oldTutor = await Tutor.findOne({ userId: oldTutorUser._id });
      if (oldTutor) {
        await Booking.deleteMany({ tutorId: oldTutor._id });
        await Tutor.deleteOne({ _id: oldTutor._id });
      }
      await User.deleteOne({ _id: oldTutorUser._id });
    }
    await User.deleteMany({ email: { $in: [
      'student_alice@test.com',
      'student_bob@test.com',
      'student_charlie@test.com'
    ]}});

    // 2. Create Tutor User
    const tutorUser = new User({
      email: 'tutor_multi@test.com',
      password: await require('bcryptjs').hash('password123', 10),
      full_name: 'Multi-Subject Pro',
      phone: '9988776655',
      role: 'tutor'
    });
    await tutorUser.save();

    // 3. Create 3 Student Users
    const studentAlice = new User({
      email: 'student_alice@test.com',
      password: await require('bcryptjs').hash('password123', 10),
      full_name: 'Alice Smith',
      phone: '8877665544',
      role: 'student'
    });
    await studentAlice.save();

    const studentBob = new User({
      email: 'student_bob@test.com',
      password: await require('bcryptjs').hash('password123', 10),
      full_name: 'Bob Jones',
      phone: '7766554433',
      role: 'student'
    });
    await studentBob.save();

    const studentCharlie = new User({
      email: 'student_charlie@test.com',
      password: await require('bcryptjs').hash('password123', 10),
      full_name: 'Charlie Brown',
      phone: '6655443322',
      role: 'student'
    });
    await studentCharlie.save();

    // 4. Create Tutor Profile with Chess (300), Coding (500), Physics (800)
    // We will save it first to let pre-save hook initialize the base pricingHistory.
    const tutor = new Tutor({
      userId: tutorUser._id,
      name: tutorUser.full_name,
      category: 'Academic',
      mode: 'Both',
      hourlyRate: 500,
      subjects: ['Chess', 'Coding', 'Physics'],
      subjectRates: [
        { subject: 'Chess', rate: 300 },
        { subject: 'Coding', rate: 500 },
        { subject: 'Physics', rate: 800 }
      ],
      bio: 'Expert educator specializing in chess strategies, computer programming, and advanced college physics.',
      qualification: 'PhD in Computer Science & FIDE Master',
      experience: 10,
      city: 'Bangalore',
      status: 'approved',
      availableTimings: ['10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM']
    });
    await tutor.save();
    console.log("Tutor registered.");

    // Simulate rate change (Chess to 400, Coding to 600) to build pricingHistory transitions
    // We update pricingHistory directly to simulate an historical timeline that spans in the past
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);

    tutor.pricingHistory = [
      // Chess history
      { subject: 'Chess', rate: 300, effectiveFrom: twoHoursAgo, effectiveTo: oneHourAgo },
      { subject: 'Chess', rate: 400, effectiveFrom: oneHourAgo, effectiveTo: null },
      
      // Coding history
      { subject: 'Coding', rate: 500, effectiveFrom: twoHoursAgo, effectiveTo: oneHourAgo },
      { subject: 'Coding', rate: 600, effectiveFrom: oneHourAgo, effectiveTo: null },
      
      // Physics history (unaltered)
      { subject: 'Physics', rate: 800, effectiveFrom: twoHoursAgo, effectiveTo: null }
    ];
    tutor.subjectRates = [
      { subject: 'Chess', rate: 400 },
      { subject: 'Coding', rate: 600 },
      { subject: 'Physics', rate: 800 }
    ];
    await tutor.save();
    console.log("Tutor pricing periods simulated.");

    // 5. Create bookings in both periods (historical vs current)
    // We set createdAt timestamps to match the periods we constructed.
    
    // Booking 1: Alice books Chess at ₹300 (created 1.5 hours ago)
    const b1 = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing: "June 1st, 2026 at 10:00 AM", // past date so it's completed
      subject: "Chess",
      studentId: studentAlice._id,
      studentName: studentAlice.full_name,
      status: "enrolled",
      planType: "1-on-1 (Premium)",
      amountPaid: 300
    });
    b1.createdAt = new Date(now.getTime() - 90 * 60 * 1000); // 1.5 hours ago
    await b1.save();

    // Booking 2: Bob books Coding at ₹500 (created 1.5 hours ago)
    const b2 = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing: "June 1st, 2026 at 11:00 AM",
      subject: "Coding",
      studentId: studentBob._id,
      studentName: studentBob.full_name,
      status: "enrolled",
      planType: "1-on-1 (Premium)",
      amountPaid: 500
    });
    b2.createdAt = new Date(now.getTime() - 90 * 60 * 1000);
    await b2.save();

    // Booking 3: Charlie books Physics at ₹800 (created 1.5 hours ago)
    const b3 = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing: "June 1st, 2026 at 12:00 PM",
      subject: "Physics",
      studentId: studentCharlie._id,
      studentName: studentCharlie.full_name,
      status: "enrolled",
      planType: "1-on-1 (Premium)",
      amountPaid: 800
    });
    b3.createdAt = new Date(now.getTime() - 90 * 60 * 1000);
    await b3.save();

    // Booking 4: Alice books Chess at the new rate ₹400 (created 15 mins ago)
    const b4 = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing: "June 2nd, 2026 at 10:00 AM",
      subject: "Chess",
      studentId: studentAlice._id,
      studentName: studentAlice.full_name,
      status: "enrolled",
      planType: "1-on-1 (Premium)",
      amountPaid: 400
    });
    b4.createdAt = new Date(now.getTime() - 15 * 60 * 1000);
    await b4.save();

    // Booking 5: Bob books Coding at the new rate ₹600 (created 15 mins ago)
    const b5 = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing: "June 2nd, 2026 at 11:00 AM",
      subject: "Coding",
      studentId: studentBob._id,
      studentName: studentBob.full_name,
      status: "enrolled",
      planType: "1-on-1 (Premium)",
      amountPaid: 600
    });
    b5.createdAt = new Date(now.getTime() - 15 * 60 * 1000);
    await b5.save();

    // Booking 6: Charlie books Physics at ₹800 (created 15 mins ago)
    const b6 = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing: "June 2nd, 2026 at 12:00 PM",
      subject: "Physics",
      studentId: studentCharlie._id,
      studentName: studentCharlie.full_name,
      status: "enrolled",
      planType: "1-on-1 (Premium)",
      amountPaid: 800
    });
    b6.createdAt = new Date(now.getTime() - 15 * 60 * 1000);
    await b6.save();

    console.log("Database seeded successfully with tutor 'Multi-Subject Pro' and 6 enrolled bookings.");
    console.log("No clean up done. Data is persistent and ready for dashboard auditing!");

  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Database disconnected.");
  }
}

seed();
