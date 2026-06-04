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
    // 1. Clean up or find a test tutor/user
    let tutorUser = await User.findOne({ email: 'tutor_test@example.com' });
    if (tutorUser) {
      await Booking.deleteMany({ tutorId: { $in: await Tutor.find({ userId: tutorUser._id }).map(t => t._id) } });
      await Tutor.deleteMany({ userId: tutorUser._id });
      await User.deleteOne({ _id: tutorUser._id });
    }
    
    tutorUser = new User({
      email: 'tutor_test@example.com',
      password: 'password123',
      full_name: 'Test Tutor',
      phone: '1234567890',
      role: 'tutor'
    });
    await tutorUser.save();

    const tutor = new Tutor({
      userId: tutorUser._id,
      name: tutorUser.full_name,
      category: 'Academic',
      mode: 'Online',
      hourlyRate: 500,
      subjects: ['Chess', 'Physics'],
      subjectRates: [
        { subject: 'Chess', rate: 300 },
        { subject: 'Physics', rate: 600 }
      ],
      status: 'approved'
    });
    await tutor.save();

    console.log("Tutor registered with Chess @ 300, Physics @ 600.");
    console.log("Pricing History count:", tutor.pricingHistory.length);
    tutor.pricingHistory.forEach(h => {
      console.log(`- Subject: ${h.subject}, Rate: ${h.rate}, EffectiveFrom: ${h.effectiveFrom}, EffectiveTo: ${h.effectiveTo}`);
    });

    // Verify initial history
    if (tutor.pricingHistory.length !== 2) {
      throw new Error(`Expected 2 history entries, got ${tutor.pricingHistory.length}`);
    }

    // 2. Book Chess class
    const bookingChess1 = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing: "June 5th, 2026 at 10:00 AM",
      subject: "Chess",
      studentId: "student_test_123",
      studentName: "Test Student",
      status: "enrolled",
      planType: "1-on-1 (Premium)",
      amountPaid: 300
    });
    await bookingChess1.save();
    console.log("Booked Chess @ 300");

    // Book Physics class
    const bookingPhysics = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing: "June 5th, 2026 at 11:00 AM",
      subject: "Physics",
      studentId: "student_test_123",
      studentName: "Test Student",
      status: "enrolled",
      planType: "1-on-1 (Premium)",
      amountPaid: 600
    });
    await bookingPhysics.save();
    console.log("Booked Physics @ 600");

    // 3. Update Chess rate to 400
    tutor.subjectRates = [
      { subject: 'Chess', rate: 400 },
      { subject: 'Physics', rate: 600 }
    ];
    // We wait 1 second to make sure effectiveTo is distinct
    await new Promise(r => setTimeout(r, 1000));
    await tutor.save();
    console.log("Updated Chess rate to 400.");
    console.log("New Pricing History count:", tutor.pricingHistory.length);
    tutor.pricingHistory.forEach(h => {
      console.log(`- Subject: ${h.subject}, Rate: ${h.rate}, EffectiveFrom: ${h.effectiveFrom}, EffectiveTo: ${h.effectiveTo}`);
    });

    // Book new Chess class
    const bookingChess2 = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing: "June 5th, 2026 at 12:00 PM",
      subject: "Chess",
      studentId: "student_test_123",
      studentName: "Test Student",
      status: "enrolled",
      planType: "1-on-1 (Premium)",
      amountPaid: 400
    });
    await bookingChess2.save();
    console.log("Booked Chess @ 400");

    // 4. Test Payout calculation
    const tutorsList = await Tutor.find({ _id: tutor._id }).populate('userId', 'email phone');

    for (const t of tutorsList) {
      const tutorBookings = await Booking.find({ tutorId: t._id });
      let periods = t.pricingHistory || [];
      const allSubjects = Array.from(new Set([
        ...(t.subjects || []),
        ...(t.subjectRates || []).map(sr => sr.subject),
        ...tutorBookings.map(b => b.subject).filter(Boolean)
      ]));

      for (const subject of allSubjects) {
        let subjectPeriods = periods.filter(p => p.subject === subject);
        if (subjectPeriods.length === 0) {
          const matchingRateObj = (t.subjectRates || []).find(sr => sr.subject === subject);
          const rate = matchingRateObj ? matchingRateObj.rate : (t.hourlyRate || 500);
          subjectPeriods = [{
            subject,
            rate,
            effectiveFrom: t.createdAt || new Date(0),
            effectiveTo: null
          }];
        }

        const subjectBookings = tutorBookings.filter(b => b.subject === subject);

        for (let i = 0; i < subjectPeriods.length; i++) {
          const period = subjectPeriods[i];
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

          console.log(`Auditing Subject: ${subject}, Rate: ${period.rate}, Found Bookings: ${periodBookings.length}`);
          periodBookings.forEach(b => {
            console.log(`  - Booking Date: ${b.createdAt}, AmountPaid: ${b.amountPaid}`);
          });

          // Assertions
          if (subject === 'Chess' && period.rate === 300) {
            if (periodBookings.length !== 1 || periodBookings[0].amountPaid !== 300) {
              throw new Error("Chess period rate 300 matching failed");
            }
          }
          if (subject === 'Chess' && period.rate === 400) {
            if (periodBookings.length !== 1 || periodBookings[0].amountPaid !== 400) {
              throw new Error("Chess period rate 400 matching failed");
            }
          }
          if (subject === 'Physics' && period.rate === 600) {
            if (periodBookings.length !== 1 || periodBookings[0].amountPaid !== 600) {
              throw new Error("Physics period rate 600 matching failed");
            }
          }
        }
      }
    }

    console.log("\nALL TESTS PASSED SUCCESSFULLY! 100% CORRECT CALCULATIONS!");

    // Cleanup test data
    await Booking.deleteMany({ tutorId: tutor._id });
    await Tutor.deleteOne({ _id: tutor._id });
    await User.deleteOne({ _id: tutorUser._id });
    console.log("Cleanup completed.");

  } catch (error) {
    console.error("Test failed with error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
  }
}

runTest();
