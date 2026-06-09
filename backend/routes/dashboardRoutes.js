const express = require('express');
const router = express.Router();
const User = require('../schemas/userSchema');
const Tutor = require('../schemas/tutorSchema');
const Booking = require('../schemas/bookingSchema');
const CoursePayment = require('../schemas/coursePaymentSchema');

// /api/dashboard/admin
router.get('/admin', async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const pendingTutors = await Tutor.countDocuments({ status: 'pending' });
    const activeTutors = await Tutor.countDocuments({ status: 'approved' });
    const totalBookings = await Booking.countDocuments();
    const enrolledBookings = await Booking.find({ status: { $in: ['enrolled', 'completed'] }, amountPaid: { $gt: 0 } });
    const totalRevenue = enrolledBookings.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);

    // Calculate direct platform course revenue (independent of tutors)
    const coursePayments = await CoursePayment.find({ status: 'completed' });
    const totalCourseRevenue = coursePayments.reduce((acc, curr) => acc + (curr.amountPaid || 0), 0);

    // Calculate real average rating
    const tutorsWithRatings = await Tutor.find({ rating: { $gt: 0 }, reviewCount: { $gt: 0 } });
    let totalRating = 0;
    tutorsWithRatings.forEach(t => totalRating += t.rating);
    const averageRating = tutorsWithRatings.length > 0 ? (totalRating / tutorsWithRatings.length).toFixed(1) : 0;

    res.json({
      pendingApprovals: pendingTutors,
      activeTutors,
      totalStudents,
      totalBookings,
      totalRevenue,
      totalCourseRevenue,
      averageRating
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// /api/dashboard/admin/bookings
router.get('/admin/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// /api/dashboard/admin/students
router.get('/admin/students', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// /api/dashboard/tutor/:tutorId
router.get('/tutor/:tutorId', async (req, res) => {
  try {
    const tutorId = req.params.tutorId;
    const tutor = await Tutor.findById(tutorId).populate('demoSlots');
    if (!tutor) return res.status(404).json({ message: "Tutor not found" });

    const totalStudents = await Booking.distinct('studentId', { tutorId });
    const demoRequests = await Booking.countDocuments({ tutorId, status: 'confirmed' }); // Simplification
    const upcomingClasses = await Booking.countDocuments({ tutorId });

    // Ensure array exists
    const availableTimings = tutor.availableTimings || [];
    const availability = tutor.availability || [];

    res.json({
      demoRequests,
      activeStudents: totalStudents.length,
      upcomingClasses,
      totalEarnings: demoRequests * tutor.hourlyRate,
      availableTimings,
      availability
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update specific tutor's timings
router.put('/tutor/:tutorId/timings', async (req, res) => {
  try {
    const { availableTimings, availability } = req.body;
    const updateData = {};
    if (availableTimings !== undefined) updateData.availableTimings = availableTimings;
    if (availability !== undefined) updateData.availability = availability;

    const tutor = await Tutor.findByIdAndUpdate(
      req.params.tutorId,
      updateData,
      { new: true }
    );
    res.json({ availableTimings: tutor.availableTimings, availability: tutor.availability });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// /api/dashboard/tutor/:tutorId/bookings
router.get('/tutor/:tutorId/bookings', async (req, res) => {
  try {
    const tutorObjId = req.params.tutorId;
    const bookings = await Booking.find({ tutorId: tutorObjId }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// /api/dashboard/student/:studentId
router.get('/student/:studentId', async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const upcomingClasses = await Booking.countDocuments({ studentId, status: 'confirmed' });
    const enrolledCourses = await Booking.countDocuments({ studentId, status: 'enrolled' });
    const completedSessions = await Booking.countDocuments({ studentId, status: 'completed' });
    
    res.json({
      enrolledCourses,
      upcomingClasses,
      completedSessions,
      savedTutors: 0
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// /api/dashboard/student/:studentId/bookings
router.get('/student/:studentId/bookings', async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const bookings = await Booking.find({ studentId }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const parseTimingStringToDate = (timingStr) => {
  try {
    const parts = timingStr.split(' at ');
    if (parts.length === 2) {
      const datePartCleaned = parts[0].replace(/(\d+)(st|nd|rd|th)/, '$1');
      const timePart = parts[1];
      const combined = `${datePartCleaned} ${timePart}`;
      const parsed = new Date(combined);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error parsing timing string on backend:", e);
  }
  return null;
};

const isBookingPast = (timingStr) => {
  const parsed = parseTimingStringToDate(timingStr);
  if (parsed) {
    const bufferMs = 2 * 60 * 60 * 1000; // 2 hours buffer
    return (parsed.getTime() + bufferMs) < Date.now();
  }
  return false;
};

// GET /api/dashboard/admin/payouts
router.get('/admin/payouts', async (req, res) => {
  try {
    const tutors = await Tutor.find().populate('userId', 'email phone');
    const payoutsReport = [];

    for (const tutor of tutors) {
      // Find all bookings for this tutor
      const tutorBookings = await Booking.find({ tutorId: tutor._id });

      // Group bookings by pricing period per subject
      let periods = tutor.pricingHistory || [];
      const allSubjects = Array.from(new Set([
        ...(tutor.subjects || []),
        ...(tutor.subjectRates || []).map(sr => sr.subject),
        ...tutorBookings.map(b => b.subject).filter(Boolean)
      ]));

      const periodsReport = [];

      for (const subject of allSubjects) {
        let subjectPeriods = periods.filter(p => p.subject === subject);
        if (subjectPeriods.length === 0) {
          const matchingRateObj = (tutor.subjectRates || []).find(sr => sr.subject === subject);
          const rate = matchingRateObj ? matchingRateObj.rate : (tutor.hourlyRate || 500);
          subjectPeriods = [{
            subject,
            rate,
            effectiveFrom: tutor.createdAt || new Date(0),
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

          let totalCollected = 0;
          let totalCompletedSessions = 0;
          const bookingsList = [];

          for (const booking of periodBookings) {
            if (booking.status !== 'enrolled' && booking.status !== 'completed') {
              continue;
            }

            const isPack = booking.sessions && booking.sessions.length > 0;
            let completedCount = 0;

            if (isPack) {
              completedCount = booking.sessions.filter(s => s.status === 'completed').length;
            } else if (booking.status === 'enrolled') {
              if (isBookingPast(booking.timing)) {
                completedCount = 1;
              }
            } else if (booking.status === 'completed') {
              completedCount = 1;
            }

            let payout = 0;
            if (booking.amountPaid) {
              if (isPack && booking.sessions.length > 0) {
                const sessionRate = booking.amountPaid / booking.sessions.length;
                payout = sessionRate * completedCount;
              } else {
                payout = booking.amountPaid * completedCount;
              }
            }

            const platformCommission = payout * 0.10;
            const netPayout = payout * 0.90;

            totalCollected += booking.amountPaid || 0;
            totalCompletedSessions += completedCount;

            bookingsList.push({
              bookingId: booking._id,
              studentName: booking.studentName,
              planType: booking.planType,
              subject: booking.subject,
              amountPaid: booking.amountPaid || 0,
              timing: booking.timing,
              completedSessions: completedCount,
              totalSessions: isPack ? booking.sessions.length : 1,
              grossPayout: payout,
              commission: platformCommission,
              netPayout: netPayout,
              status: booking.status,
              createdAt: booking.createdAt
            });
          }

          const periodCommission = bookingsList.reduce((acc, curr) => acc + curr.commission, 0);
          const periodNetPayout = bookingsList.reduce((acc, curr) => acc + curr.netPayout, 0);

          periodsReport.push({
            subject,
            rate: period.rate,
            effectiveFrom: period.effectiveFrom,
            effectiveTo: period.effectiveTo,
            bookingsCount: bookingsList.length,
            completedSessions: totalCompletedSessions,
            totalCollected,
            platformCommission: periodCommission,
            tutorPayout: periodNetPayout,
            bookings: bookingsList
          });
        }
      }

      const totalCollected = periodsReport.reduce((acc, curr) => acc + curr.totalCollected, 0);
      const totalCommission = periodsReport.reduce((acc, curr) => acc + curr.platformCommission, 0);
      const totalPayout = periodsReport.reduce((acc, curr) => acc + curr.tutorPayout, 0);
      const totalCompleted = periodsReport.reduce((acc, curr) => acc + curr.completedSessions, 0);

      payoutsReport.push({
        tutorId: tutor._id,
        tutorName: tutor.name,
        email: tutor.userId?.email || 'No email',
        phone: tutor.userId?.phone || 'No phone',
        currentRate: tutor.hourlyRate,
        totalCollected,
        totalCommission,
        totalPayout,
        totalCompletedSessions: totalCompleted,
        pricingPeriods: periodsReport
      });
    }

    res.json(payoutsReport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/admin/course-payments
router.get('/admin/course-payments', async (req, res) => {
  try {
    const payments = await CoursePayment.find().sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
