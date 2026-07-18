require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./schemas/userSchema');
const Tutor = require('./schemas/tutorSchema');
const Booking = require('./schemas/bookingSchema');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/teachgrow';

async function runTest() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected.");

  try {
    // 1. Clean up old test data
    console.log("Cleaning up old test users and bookings...");
    await User.deleteMany({ email: { $in: [
      'multi_tutor@example.com', 
      'student_a@example.com', 
      'student_b@example.com', 
      'student_c@example.com'
    ]}});
    
    // Create Tutor User
    const tutorUser = new User({
      email: 'multi_tutor@example.com',
      password: 'password123',
      full_name: 'Multi-Subject Expert',
      phone: '9999999999',
      role: 'tutor'
    });
    await tutorUser.save();

    // Create 3 Student Users
    const studentUserA = new User({
      email: 'student_a@example.com',
      password: 'password123',
      full_name: 'Student Alice',
      phone: '8888888888',
      role: 'student'
    });
    await studentUserA.save();

    const studentUserB = new User({
      email: 'student_b@example.com',
      password: 'password123',
      full_name: 'Student Bob',
      phone: '7777777777',
      role: 'student'
    });
    await studentUserB.save();

    const studentUserC = new User({
      email: 'student_c@example.com',
      password: 'password123',
      full_name: 'Student Charlie',
      phone: '6666666666',
      role: 'student'
    });
    await studentUserC.save();

    // Create Tutor Profile with 3 subjects and rates: Math @ 400, Science @ 600, English @ 800
    const tutor = new Tutor({
      userId: tutorUser._id,
      name: tutorUser.full_name,
      category: 'Academic',
      mode: 'Online',
      hourlyRate: 400,
      subjects: ['Math', 'Science', 'English'],
      subjectRates: [
        { subject: 'Math', rate: 400 },
        { subject: 'Science', rate: 600 },
        { subject: 'English', rate: 800 }
      ],
      status: 'approved'
    });
    await tutor.save();
    console.log("Tutor profile registered.");
    console.log("Initial pricingHistory initialized by pre-save hook:");
    tutor.pricingHistory.forEach(h => {
      console.log(`- ${h.subject}: ₹${h.rate}/hr (From: ${h.effectiveFrom})`);
    });

    // 2. Bookings phase 1
    // Student A books Math @ 400
    const booking1 = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing: "June 6th, 2026 at 10:00 AM",
      subject: "Math",
      studentId: studentUserA._id,
      studentName: studentUserA.full_name,
      status: "enrolled",
      planType: "1-on-1 (Premium)",
      amountPaid: 400
    });
    await booking1.save();
    console.log(`Booked: ${studentUserA.full_name} -> Math @ ₹400`);

    // Student B books Science @ 600
    const booking2 = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing: "June 6th, 2026 at 11:00 AM",
      subject: "Science",
      studentId: studentUserB._id,
      studentName: studentUserB.full_name,
      status: "enrolled",
      planType: "1-on-1 (Premium)",
      amountPaid: 600
    });
    await booking2.save();
    console.log(`Booked: ${studentUserB.full_name} -> Science @ ₹600`);

    // Student C books English @ 800
    const booking3 = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing: "June 6th, 2026 at 12:00 PM",
      subject: "English",
      studentId: studentUserC._id,
      studentName: studentUserC.full_name,
      status: "enrolled",
      planType: "1-on-1 (Premium)",
      amountPaid: 800
    });
    await booking3.save();
    console.log(`Booked: ${studentUserC.full_name} -> English @ ₹800`);

    // 3. Update tutor rates: Math to 500, Science to 700 (English remains 800)
    tutor.subjectRates = [
      { subject: 'Math', rate: 500 },
      { subject: 'Science', rate: 700 },
      { subject: 'English', rate: 800 }
    ];
    await new Promise(r => setTimeout(r, 1000)); // Make timestamps distinct
    await tutor.save();
    console.log("\nTutor rates updated: Math to ₹500, Science to ₹700.");
    console.log("Updated pricingHistory:");
    tutor.pricingHistory.forEach(h => {
      console.log(`- ${h.subject}: ₹${h.rate}/hr (From: ${h.effectiveFrom} To: ${h.effectiveTo || 'Active'})`);
    });

    // Bookings phase 2
    // Student A books Math @ 500
    const booking4 = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing: "June 7th, 2026 at 10:00 AM",
      subject: "Math",
      studentId: studentUserA._id,
      studentName: studentUserA.full_name,
      status: "enrolled",
      planType: "1-on-1 (Premium)",
      amountPaid: 500
    });
    await booking4.save();
    console.log(`Booked: ${studentUserA.full_name} -> Math @ ₹500`);

    // Student B books Science @ 700
    const booking5 = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing: "June 7th, 2026 at 11:00 AM",
      subject: "Science",
      studentId: studentUserB._id,
      studentName: studentUserB.full_name,
      status: "enrolled",
      planType: "1-on-1 (Premium)",
      amountPaid: 700
    });
    await booking5.save();
    console.log(`Booked: ${studentUserB.full_name} -> Science @ ₹700`);

    // Student C books English @ 800 (rate hasn't changed)
    const booking6 = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing: "June 7th, 2026 at 12:00 PM",
      subject: "English",
      studentId: studentUserC._id,
      studentName: studentUserC.full_name,
      status: "enrolled",
      planType: "1-on-1 (Premium)",
      amountPaid: 800
    });
    await booking6.save();
    console.log(`Booked: ${studentUserC.full_name} -> English @ ₹800`);

    // 4. Test Payout calculation periods
    console.log("\nAuditing Payout periods matching...");
    const tutorBookings = await Booking.find({ tutorId: tutor._id });
    let periods = tutor.pricingHistory || [];
    const allSubjects = ['Math', 'Science', 'English'];

    let auditSuccess = true;

    for (const subject of allSubjects) {
      let subjectPeriods = periods.filter(p => p.subject === subject);
      const subjectBookings = tutorBookings.filter(b => b.subject === subject);

      console.log(`\n--- Subject: ${subject} ---`);
      for (const period of subjectPeriods) {
        const start = new Date(period.effectiveFrom);
        const end = period.effectiveTo ? new Date(period.effectiveTo) : new Date();

        const periodBookings = subjectBookings.filter(b => {
          const bookingDate = new Date(b.createdAt);
          if (period.effectiveTo) {
            return bookingDate >= start && bookingDate <= end;
          } else {
            return bookingDate >= start;
          }
        });

        console.log(`Period Rate: ₹${period.rate}/hr (From: ${period.effectiveFrom.toISOString()} To: ${period.effectiveTo ? period.effectiveTo.toISOString() : 'Active'})`);
        console.log(`Matched bookings count: ${periodBookings.length}`);
        periodBookings.forEach(b => {
          console.log(`  - Student: ${b.studentName}, Booking Date: ${b.createdAt.toISOString()}, Paid: ₹${b.amountPaid}`);
        });

        // Verification checks
        if (subject === 'Math' && period.rate === 400 && periodBookings.length !== 1) {
          console.error("FAIL: Math ₹400 period should match exactly 1 booking!");
          auditSuccess = false;
        }
        if (subject === 'Math' && period.rate === 500 && periodBookings.length !== 1) {
          console.error("FAIL: Math ₹500 period should match exactly 1 booking!");
          auditSuccess = false;
        }
        if (subject === 'Science' && period.rate === 600 && periodBookings.length !== 1) {
          console.error("FAIL: Science ₹600 period should match exactly 1 booking!");
          auditSuccess = false;
        }
        if (subject === 'Science' && period.rate === 700 && periodBookings.length !== 1) {
          console.error("FAIL: Science ₹700 period should match exactly 1 booking!");
          auditSuccess = false;
        }
        if (subject === 'English' && period.rate === 800 && periodBookings.length !== 2) {
          console.error("FAIL: English ₹800 period should match exactly 2 bookings!");
          auditSuccess = false;
        }
      }
    }

    if (auditSuccess) {
      console.log("\nALL SCENARIOS VERIFIED successfully! Grouping and timelines are 100% accurate.");
    } else {
      console.error("\nSome matching validations FAILED. Please review the output above.");
      process.exit(1);
    }

    // Clean up test data
    console.log("\nCleaning up test entries...");
    await Booking.deleteMany({ tutorId: tutor._id });
    await Tutor.deleteOne({ _id: tutor._id });
    await User.deleteMany({ email: { $in: [
      'multi_tutor@example.com', 
      'student_a@example.com', 
      'student_b@example.com', 
      'student_c@example.com'
    ]}});
    console.log("Cleanup complete.");

  } catch (err) {
    console.error("Test error:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Database disconnected.");
  }
}

runTest();
