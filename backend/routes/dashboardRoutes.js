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
    const activeStudentIds = await Booking.distinct('studentId');
    const validActiveStudentIds = activeStudentIds.filter(id => id && /^[0-9a-fA-F]{24}$/.test(id));
    const activeStudents = await User.countDocuments({ _id: { $in: validActiveStudentIds }, role: 'student' });
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

    // Geographic Analytics aggregation
    const tutorsForGeo = await Tutor.find({}, 'city');
    const geoStats = {
      North: 0,
      South: 0,
      East: 0,
      West: 0,
      Unspecified: 0
    };

    const southKeywords = [
      'bangalore', 'bengaluru', 'chennai', 'hyderabad', 'hyderbad', 'nuzvid', 'eluru', 'vijayawada', 'visakhapatnam', 'vizag',
      'guntur', 'nellore', 'tirupati', 'coimbatore', 'madurai', 'mysore', 'mysuru', 'kochi', 'cochin', 'trivandrum', 
      'thiruvananthapuram', 'thrissur', 'calicut', 'vellore', 'kozhikode', 'mangalore', 'mangaluru', 'pondicherry', 
      'puducherry', 'hosur', 'trichy', 'tamil nadu', 'kerala', 'karnataka', 'andhra pradesh', 'telangana', 'batlagundu', 
      'gudalur', 'raichur', 'koppal', 'kanjirappally', 'shimoga', 'narasaraopet', 'palnadu'
    ];
    
    const westKeywords = [
      'mumbai', 'pune', 'ahmedabad', 'surat', 'vadodara', 'baroda', 'rajkot', 'nagpur', 'indore', 'bhopal', 'goa', 
      'panaji', 'nashik', 'thane', 'navi mumbai', 'gandhinagar', 'udaipur', 'jodhpur', 'rajasthan', 'gujarat', 
      'maharashtra', 'dhar', 'shivpuri', 'gwalior', 'madhya pradesh', 'chhattisgarh'
    ];
    
    const northKeywords = [
      'delhi', 'new delhi', 'noida', 'gurgaon', 'gurugram', 'jaipur', 'lucknow', 'kanpur', 'ghaziabad', 'faridabad', 
      'chandigarh', 'jalandhar', 'ludhiana', 'agra', 'amritsar', 'srinagar', 'jammu', 'shimla', 'dehradun', 'uttarakhand', 
      'punjab', 'haryana', 'uttar pradesh', 'himachal pradesh', 'jammu & kashmir', 'cheeka', 'zirakpur', 'haldwani', 'ramnagar'
    ];
    
    const eastKeywords = [
      'kolkata', 'patna', 'ranchi', 'bhubaneswar', 'guwahati', 'imphal', 'shillong', 'agartala', 'gangtok', 'itanagar', 
      'aizawl', 'kohima', 'siliguri', 'cuttack', 'jamshedpur', 'bihar', 'jharkhand', 'odisha', 'west bengal', 'assam', 
      'sikkim', 'meghalaya', 'mizoram', 'manipur', 'nagaland', 'arunachal pradesh', 'tripura', 'chinsurah', 'hooghly', 
      'kanchrapara', 'puri'
    ];

    tutorsForGeo.forEach(t => {
      const city = (t.city || '').toLowerCase().trim();
      if (!city) {
        geoStats.Unspecified++;
      } else if (southKeywords.some(kw => city.includes(kw))) {
        geoStats.South++;
      } else if (westKeywords.some(kw => city.includes(kw))) {
        geoStats.West++;
      } else if (northKeywords.some(kw => city.includes(kw))) {
        geoStats.North++;
      } else if (eastKeywords.some(kw => city.includes(kw))) {
        geoStats.East++;
      } else {
        geoStats.Unspecified++;
      }
    });

    const cityCount = {};
    tutorsForGeo.forEach(t => {
      let city = (t.city || '').trim();
      if (city) {
        city = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
        if (city === 'Bengaluru') city = 'Bangalore';
        if (city === 'New delhi') city = 'New Delhi';
        cityCount[city] = (cityCount[city] || 0) + 1;
      } else {
        cityCount['Unspecified'] = (cityCount['Unspecified'] || 0) + 1;
      }
    });

    const topCities = Object.entries(cityCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      pendingApprovals: pendingTutors,
      activeTutors,
      totalStudents,
      activeStudents,
      totalBookings,
      totalRevenue,
      totalCourseRevenue,
      averageRating,
      geoStats,
      topCities
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// /api/dashboard/admin/bookings
router.get('/admin/bookings', async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate({
        path: 'tutorId',
        populate: { path: 'userId', select: 'email phone' }
      })
      .sort({ createdAt: -1 });

    const studentIds = bookings
      .map(b => b.studentId)
      .filter(id => id && /^[0-9a-fA-F]{24}$/.test(id));
    const students = await User.find({ _id: { $in: studentIds } }, 'email phone full_name student_class student_or_parent student_name');
    const studentMap = new Map(students.map(s => [s._id.toString(), s]));

    const formatted = bookings.map(b => {
      const obj = b.toObject();
      const student = studentMap.get(b.studentId);
      if (student) {
        obj.studentEmail = student.email;
        obj.studentPhone = student.phone;
        obj.studentClass = student.student_class || '';
        obj.parentName = student.student_or_parent === 'Parent' ? student.full_name : 'N/A';
      }
      if (b.tutorId) {
        obj.tutorEmail = b.tutorId.userId?.email || '';
        obj.tutorPhone = b.tutorId.userId?.phone || '';
        obj.tutorUserId = b.tutorId.userId?._id?.toString() || '';
        obj.tutorVerificationDocument = b.tutorId.verificationDocument || '';
        // Set tutorId back to its ID string so we don't break simple components
        obj.tutorId = b.tutorId._id.toString();
      }
      return obj;
    });

    res.json(formatted);
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

// DELETE /api/dashboard/admin/students/:id
router.delete('/admin/students/:id', async (req, res) => {
  try {
    const studentId = req.params.id;
    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Student account not found' });
    }

    // Delete the student User record
    await User.findByIdAndDelete(studentId);

    // Delete associated bookings
    await Booking.deleteMany({ studentId: studentId.toString() });

    // Delete associated course payments
    await CoursePayment.deleteMany({ studentId: studentId.toString() });

    res.json({ message: 'Student and associated bookings and payments deleted successfully' });
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

    // Lazy generate referralCode if not present
    if (!tutor.referralCode) {
      const cleanName = (tutor.name || 'TUTOR').replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      tutor.referralCode = `${cleanName}${randomNum}`;
      await tutor.save();
    }

    const totalStudents = await Booking.distinct('studentId', { tutorId });
    const demoRequests = await Booking.countDocuments({ tutorId, status: { $in: ['pending', 'confirmed'] } });
    const upcomingClasses = await Booking.countDocuments({ tutorId });

    // Ensure array exists
    const availableTimings = tutor.availableTimings || [];
    const availability = tutor.availability || [];

    // Calculate referral stats
    let referralStats = { invitedCount: 0, completedCount: 0, earnings: 0 };
    if (tutor.userId) {
      const referredStudents = await User.find({ referredBy: tutor.userId, role: 'student' });
      const invitedCount = referredStudents.length;

      if (invitedCount > 0) {
        const studentIds = referredStudents.map(student => student._id.toString());
        const bookings = await Booking.find({
          studentId: { $in: studentIds }
        });

        let completedCount = 0;
        for (const studentId of studentIds) {
          const studentBookings = bookings.filter(b => b.studentId === studentId);
          const hasRegularClass = studentBookings.some(b => 
            b.planType && 
            b.planType !== 'Free Demo Class' && 
            !b.planType.toLowerCase().includes('demo') &&
            b.status === 'completed'
          );
          if (hasRegularClass) {
            completedCount++;
          }
        }

        referralStats = {
          invitedCount,
          completedCount,
          earnings: Math.min(completedCount * 100, 5000)
        };
      }
    }

    res.json({
      demoRequests,
      activeStudents: totalStudents.length,
      upcomingClasses,
      totalEarnings: demoRequests * tutor.hourlyRate,
      availableTimings,
      availability,
      referralStats,
      referralCode: tutor.referralCode
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update specific tutor's timings
router.put('/tutor/:tutorId/timings', async (req, res) => {
  try {
    const { availableTimings, availability } = req.body || {};
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
    
    // Count enrolled courses
    const enrolledCourses = await Booking.countDocuments({ studentId, status: 'enrolled' });
    
    // Count upcoming classes (enrolled classes in the future)
    const enrolledBookings = await Booking.find({ studentId, status: 'enrolled' });
    let upcomingClasses = 0;
    
    for (const booking of enrolledBookings) {
      if (booking.sessions && booking.sessions.length > 0) {
        // Pack booking
        for (const session of booking.sessions) {
          if (session.status === 'scheduled') {
            let isPast = false;
            if (session.utcDate) {
              const bufferMs = 2 * 60 * 60 * 1000;
              isPast = (new Date(session.utcDate).getTime() + bufferMs) < Date.now();
            } else {
              const parsed = parseSessionStringToDate(session.date, session.time);
              if (parsed) {
                const bufferMs = 2 * 60 * 60 * 1000;
                isPast = (parsed.getTime() + bufferMs) < Date.now();
              }
            }
            if (!isPast) {
              upcomingClasses++;
            }
          }
        }
      } else {
        // Standard booking
        let isPast = false;
        if (booking.utcTiming) {
          const bufferMs = 2 * 60 * 60 * 1000;
          isPast = (new Date(booking.utcTiming).getTime() + bufferMs) < Date.now();
        } else {
          isPast = isBookingPast(booking.timing);
        }
        if (!isPast) {
          upcomingClasses++;
        }
      }
    }

    // Count demo bookings (pending, confirmed, completed)
    const demoBookings = await Booking.countDocuments({
      studentId,
      status: { $in: ['pending', 'confirmed', 'completed'] }
    });
    
    res.json({
      enrolledCourses,
      upcomingClasses,
      completedSessions: demoBookings, // for backward compatibility
      demoBookings,
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
    const bookings = await Booking.find({ studentId }).populate('tutorId', 'address googleMapsUrl mode city timezone').sort({ createdAt: -1 });
    const formatted = bookings.map(b => {
      const obj = b.toObject();
      if (b.tutorId) {
        obj.tutorAddress = b.tutorId.address;
        obj.tutorGoogleMapsUrl = b.tutorId.googleMapsUrl;
        obj.tutorMode = b.tutorId.mode;
        obj.tutorCity = b.tutorId.city;
        obj.tutorTimezone = b.tutorId.timezone;
        obj.tutorId = b.tutorId._id.toString();
      }
      return obj;
    });
    res.json(formatted);
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

const parseSessionStringToDate = (dateStr, timeStr) => {
  try {
    const datePartCleaned = dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1');
    const combined = `${datePartCleaned} ${timeStr}`;
    const parsed = new Date(combined);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch (e) {
    console.error("Error parsing session date/time:", e);
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

// Reusable Tutor Payouts Report Engine (Optimized with single bulk query)
const calculateTutorPayoutsReport = async () => {
  const [tutors, allBookings] = await Promise.all([
    Tutor.find().populate('userId', 'email phone full_name'),
    Booking.find({})
  ]);

  // Group all bookings by tutorId in memory for O(1) instant lookup
  const bookingsByTutor = new Map();
  for (const b of allBookings) {
    if (!b.tutorId) continue;
    const tId = b.tutorId._id ? b.tutorId._id.toString() : b.tutorId.toString();
    if (!bookingsByTutor.has(tId)) {
      bookingsByTutor.set(tId, []);
    }
    bookingsByTutor.get(tId).push(b);
  }

  const payoutsReport = [];

  for (const tutor of tutors) {
    const tutorBookings = bookingsByTutor.get(tutor._id.toString()) || [];
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

    const pastPayouts = tutor.payoutHistory || [];
    const totalPaidOut = pastPayouts.reduce((acc, p) => acc + (p.amount || 0), 0);
    const pendingPayout = Math.max(0, totalPayout - totalPaidOut);

    const hasBankDetails = Boolean(
      tutor.paymentDetails &&
      tutor.paymentDetails.accountNumber &&
      tutor.paymentDetails.accountNumber.trim() !== ''
    );

    let payoutStatus = 'no_earnings';
    if (totalPayout > 0) {
      if (pendingPayout <= 0) {
        payoutStatus = 'paid';
      } else if (!hasBankDetails) {
        payoutStatus = 'needs_bank_details';
      } else {
        payoutStatus = 'pending';
      }
    }

    payoutsReport.push({
      tutorId: tutor._id,
      tutorName: tutor.name,
      email: tutor.userId?.email || 'No email',
      phone: tutor.userId?.phone || 'No phone',
      photo: tutor.photo,
      category: tutor.category,
      city: tutor.city,
      currentRate: tutor.hourlyRate,
      paymentDetails: tutor.paymentDetails || null,
      hasBankDetails,
      totalCollected,
      totalCommission,
      totalPayout,
      totalPaidOut,
      pendingPayout,
      payoutStatus,
      totalCompletedSessions: totalCompleted,
      payoutHistory: pastPayouts,
      pricingPeriods: periodsReport
    });
  }

  return payoutsReport;
};

// GET /api/dashboard/admin/payouts & GET /api/dashboard/hr/payouts
const handleGetPayouts = async (req, res) => {
  try {
    const report = await calculateTutorPayoutsReport();
    res.json(report);
  } catch (err) {
    console.error('[Payouts] Error generating payouts report:', err);
    res.status(500).json({ error: err.message });
  }
};

router.get('/admin/payouts', handleGetPayouts);
router.get('/hr/payouts', handleGetPayouts);

// POST /api/dashboard/admin/payouts/record & POST /api/dashboard/hr/payouts/record
const handleRecordPayout = async (req, res) => {
  try {
    const { tutorId, amount, paymentMode, transactionReference, periodMonth, notes, sendEmail, disbursedBy } = req.body;

    if (!tutorId) {
      return res.status(400).json({ message: 'Tutor ID is required' });
    }
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Valid payout amount is required' });
    }

    const tutor = await Tutor.findById(tutorId).populate('userId', 'email full_name phone');
    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found' });
    }

    const payoutEntry = {
      amount: Number(amount),
      periodMonth: periodMonth || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      paymentMode: paymentMode || 'Bank Transfer (NEFT/IMPS)',
      transactionReference: transactionReference || `TXN${Date.now()}`,
      disbursedAt: new Date(),
      disbursedBy: disbursedBy || 'Admin/HR Finance',
      notes: notes || '',
      receiptSent: Boolean(sendEmail)
    };

    if (!tutor.payoutHistory) {
      tutor.payoutHistory = [];
    }
    tutor.payoutHistory.push(payoutEntry);
    await tutor.save();

    // Send email receipt if requested
    if (sendEmail && tutor.userId?.email) {
      try {
        const { sendPayoutReceiptEmail } = require('../utils/emailService');
        await sendPayoutReceiptEmail({
          tutorName: tutor.name || tutor.userId.full_name,
          tutorEmail: tutor.userId.email,
          amount: Number(amount),
          periodMonth: payoutEntry.periodMonth,
          paymentMode: payoutEntry.paymentMode,
          transactionReference: payoutEntry.transactionReference,
          bankDetails: tutor.paymentDetails
        });
        console.log(`[Payouts] Payout receipt email sent to ${tutor.userId.email}`);
      } catch (mailErr) {
        console.error('[Payouts] Failed to send receipt email:', mailErr.message);
      }
    }

    res.json({
      message: `Payout of ₹${amount} recorded successfully for ${tutor.name}!`,
      payoutEntry,
      payoutHistory: tutor.payoutHistory
    });
  } catch (err) {
    console.error('[Payouts] Error recording payout disbursement:', err);
    res.status(500).json({ error: err.message });
  }
};

router.post('/admin/payouts/record', handleRecordPayout);
router.post('/hr/payouts/record', handleRecordPayout);

// POST /api/dashboard/admin/send-bank-reminder & POST /api/dashboard/hr/send-bank-reminder
const handleSendBankReminder = async (req, res) => {
  try {
    const { tutorId, testEmail } = req.body || {};
    const { sendBankDetailsReminderEmail } = require('../utils/emailService');

    let targetTutors = [];
    if (testEmail) {
      targetTutors = [{
        name: 'Test Tutor',
        userId: { email: testEmail },
        paymentDetails: null
      }];
    } else if (tutorId && tutorId !== 'all') {
      const single = await Tutor.findById(tutorId).populate('userId', 'email full_name');
      if (single) targetTutors = [single];
    } else {
      // Find all tutors with missing bank accounts
      const all = await Tutor.find().populate('userId', 'email full_name');
      targetTutors = all.filter(t => 
        t.userId?.email && 
        (!t.paymentDetails || !t.paymentDetails.accountNumber || t.paymentDetails.accountNumber.trim() === '')
      );
    }

    let successCount = 0;
    let failCount = 0;

    for (const t of targetTutors) {
      const email = t.userId?.email;
      if (!email) continue;

      try {
        await sendBankDetailsReminderEmail({
          tutorName: t.name,
          tutorEmail: email,
          pendingAmount: 0
        });
        successCount++;
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        failCount++;
        console.error(`[Bank Reminder] Failed to send to ${email}:`, err.message);
      }
    }

    res.json({
      message: `Bank details setup reminders dispatched.`,
      successCount,
      failCount,
      totalTargeted: targetTutors.length
    });
  } catch (err) {
    console.error('[Bank Reminder] Error dispatching reminder emails:', err);
    res.status(500).json({ error: err.message });
  }
};

router.post('/admin/send-bank-reminder', handleSendBankReminder);
router.post('/hr/send-bank-reminder', handleSendBankReminder);

// GET /api/dashboard/admin/course-payments
router.get('/admin/course-payments', async (req, res) => {
  try {
    const payments = await CoursePayment.find().sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dashboard/admin/send-profile-emails
router.post('/admin/send-profile-emails', async (req, res) => {
  try {
    const { testEmail, onlyIncomplete = true } = req.body || {};
    const { sendProfileReminderEmail } = require('../utils/emailService');

    const users = await User.find({});
    const tutors = await Tutor.find({});

    const tutorMap = new Map();
    tutors.forEach(t => {
      if (t.userId) tutorMap.set(t.userId.toString(), t);
    });

    let targetUsers = testEmail ? users.filter(u => u.email.toLowerCase() === testEmail.toLowerCase()) : users;

    if (testEmail && targetUsers.length === 0) {
      targetUsers = [{
        full_name: 'Test Member',
        email: testEmail,
        role: 'tutor',
      }];
    }

    let successCount = 0;
    let failCount = 0;
    const results = [];

    let frontendUrl = 'https://tutor.cuvasol.com';
    if (process.env.FRONTEND_URL) {
      const urls = process.env.FRONTEND_URL.split(',')
        .map(u => u.replace(/["']/g, '').trim())
        .filter(Boolean);
      const prodUrl = urls.find(url => !url.includes('localhost') && !url.includes('127.0.0.1'));
      if (prodUrl) frontendUrl = prodUrl;
    }

    for (const user of targetUsers) {
      const isTutor = user.role === 'tutor';
      const tutorDoc = isTutor ? (tutorMap.get(user._id ? user._id.toString() : '') || tutors.find(t => t.name === user.full_name)) : null;

      const missingFields = [];
      if (isTutor) {
        if (!tutorDoc || !tutorDoc.boardsTaught || tutorDoc.boardsTaught.length === 0) {
          missingFields.push('Board Taught (e.g. CBSE, ICSE, State Board, IB)');
        }
        if (!tutorDoc || !tutorDoc.classesTaught || tutorDoc.classesTaught.length === 0) {
          missingFields.push('Class / Grade Taught (e.g. Class 1-12, College)');
        }
        if (!user.phone || user.phone.trim() === '') {
          missingFields.push('Phone Number');
        }
        if (!tutorDoc || !tutorDoc.city || tutorDoc.city.trim() === '') {
          missingFields.push('City / Location');
        }
        if (!tutorDoc || !tutorDoc.qualification || tutorDoc.qualification.trim() === '') {
          missingFields.push('Qualification');
        }
        if (!tutorDoc || !tutorDoc.subjects || tutorDoc.subjects.length === 0) {
          missingFields.push('Subjects Offered');
        }
        if (!tutorDoc || !tutorDoc.bio || tutorDoc.bio.trim() === '') {
          missingFields.push('Profile Bio / Description');
        }
      } else {
        if (!user.student_class || user.student_class.trim() === '') {
          missingFields.push('Class / Grade Level');
        }
        if (!user.phone || user.phone.trim() === '') {
          missingFields.push('Phone Number');
        }
      }

      if (onlyIncomplete && missingFields.length === 0 && !testEmail) {
        results.push({ email: user.email, status: 'skipped', reason: 'Profile Complete' });
        continue;
      }

      try {
        await sendProfileReminderEmail({
          name: user.full_name,
          email: user.email,
          role: user.role,
          missingFields,
          frontendUrl,
        });
        successCount++;
        results.push({ email: user.email, status: 'sent', missingFields });
      } catch (err) {
        failCount++;
        results.push({ email: user.email, status: 'failed', error: err.message });
      }

      await new Promise(r => setTimeout(r, 250));
    }

    res.json({
      message: `Profile reminder emails processing completed.`,
      totalProcessed: targetUsers.length,
      successCount,
      failCount,
      results,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dashboard/admin/send-referral-emails
router.post('/admin/send-referral-emails', async (req, res) => {
  try {
    const { testEmail } = req.body || {};
    const { sendReferralIntroEmail } = require('../utils/emailService');

    // Fetch all tutors in the database and populate user accounts
    const tutors = await Tutor.find({}).populate('userId');

    // Filter out tutors that do not have associated user information or email addresses
    let targetTutors = tutors.filter(t => t.userId && t.userId.email);

    if (testEmail) {
      const emailList = testEmail.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      const matchedTutors = [];
      for (const email of emailList) {
        const matching = targetTutors.find(t => t.userId && t.userId.email && t.userId.email.toLowerCase() === email);
        if (matching) {
          matchedTutors.push(matching);
        } else {
          matchedTutors.push({
            name: 'Test Tutor',
            referralCode: 'TESTCODE123',
            userId: {
              email: email
            }
          });
        }
      }
      targetTutors = matchedTutors;
    }

    let successCount = 0;
    let failCount = 0;
    const results = [];

    let frontendUrl = 'https://tutor.cuvasol.com';
    if (process.env.FRONTEND_URL) {
      const urls = process.env.FRONTEND_URL.split(',')
        .map(u => u.replace(/["']/g, '').trim())
        .filter(Boolean);
      const prodUrl = urls.find(url => !url.includes('localhost') && !url.includes('127.0.0.1'));
      if (prodUrl) frontendUrl = prodUrl;
    }

    for (const tutor of targetTutors) {
      try {
        if (!tutor.referralCode) {
          const cleanName = (tutor.name || 'TUTOR').replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase();
          const randomNum = Math.floor(1000 + Math.random() * 9000);
          tutor.referralCode = `${cleanName}${randomNum}`;
          if (typeof tutor.save === 'function') {
            await tutor.save();
          }
        }
        await sendReferralIntroEmail({
          name: tutor.name,
          email: tutor.userId.email,
          referralCode: tutor.referralCode,
          frontendUrl,
        });
        successCount++;
        results.push({ email: tutor.userId.email, status: 'sent' });
      } catch (err) {
        failCount++;
        results.push({ email: tutor.userId.email, status: 'failed', error: err.message });
      }

      // Small rate limiting delay between deliveries
      await new Promise(r => setTimeout(r, 250));
    }

    res.json({
      message: `Referral program introduction emails processing completed.`,
      totalProcessed: targetTutors.length,
      successCount,
      failCount,
      results,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

