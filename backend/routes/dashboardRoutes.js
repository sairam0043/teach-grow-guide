const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../schemas/userSchema');
const Tutor = require('../schemas/tutorSchema');
const Booking = require('../schemas/bookingSchema');
const CoursePayment = require('../schemas/coursePaymentSchema');
const AdminAvailability = require('../schemas/adminAvailabilitySchema');
const { syncStudentWalletAndReferrals } = require('../utils/referralWalletHelper');
const { validateAndNormalizePhone } = require('../utils/phoneValidator');
const { sendVerificationSlotBookedEmail } = require('../utils/emailService');

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

      // Ensure cancelledBy, cancellationReason, and cancelledAt are populated
      if (b.status === 'cancelled' || b.status === 'rejected') {
        if (!obj.cancelledBy) {
          if (b.status === 'rejected') {
            obj.cancelledBy = 'Tutor';
          } else if (b.studentId === 'admin') {
            obj.cancelledBy = 'Admin';
          } else {
            obj.cancelledBy = 'Student';
          }
        }
        if (!obj.cancelledAt) {
          obj.cancelledAt = b.updatedAt || b.createdAt;
        }
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
    const students = await User.find({ role: 'student' }).sort({ createdAt: -1 });

    // Collect all valid referredBy IDs
    const referrerIds = students
      .map(s => s.referredBy)
      .filter(id => id && mongoose.Types.ObjectId.isValid(id));

    // Look up referrer Users
    const referrerUsers = await User.find({ _id: { $in: referrerIds } })
      .select('full_name student_name email phone role referralCode avatar');
    const userMap = new Map();
    referrerUsers.forEach(u => userMap.set(u._id.toString(), u));

    // Look up referrer Tutors (by userId or _id)
    const referrerTutors = await Tutor.find({
      $or: [
        { userId: { $in: referrerIds } },
        { _id: { $in: referrerIds } }
      ]
    }).select('userId name photo email phone referralCode category');
    
    const tutorByUserIdMap = new Map();
    const tutorByIdMap = new Map();
    referrerTutors.forEach(t => {
      if (t.userId) tutorByUserIdMap.set(t.userId.toString(), t);
      tutorByIdMap.set(t._id.toString(), t);
    });

    // Also collect all referral codes used (usedReferralCode or marketingRefCode)
    const extraCodes = students
      .map(s => s.usedReferralCode || s.marketingRefCode)
      .filter(Boolean)
      .map(c => String(c).trim().toUpperCase());

    const extraTutorsMap = new Map();
    const extraUsersMap = new Map();

    if (extraCodes.length > 0) {
      const extraTutors = await Tutor.find({ referralCode: { $in: extraCodes } })
        .select('userId name photo email phone referralCode category');
      extraTutors.forEach(t => {
        if (t.referralCode) extraTutorsMap.set(t.referralCode.toUpperCase(), t);
      });

      const extraUsers = await User.find({ referralCode: { $in: extraCodes } })
        .select('full_name student_name email phone role referralCode avatar');
      extraUsers.forEach(u => {
        if (u.referralCode) extraUsersMap.set(u.referralCode.toUpperCase(), u);
      });
    }

    const formattedStudents = students.map(s => {
      const sObj = s.toObject();
      let referrerDetails = null;
      let usedCode = s.usedReferralCode || s.marketingRefCode || null;

      if (s.referredBy) {
        const refIdStr = s.referredBy.toString();
        const refTutor = tutorByUserIdMap.get(refIdStr) || tutorByIdMap.get(refIdStr);
        const refUser = userMap.get(refIdStr);

        if (refTutor) {
          referrerDetails = {
            id: refTutor._id.toString(),
            userId: refUser?._id?.toString() || (refTutor.userId ? refTutor.userId.toString() : refIdStr),
            name: refTutor.name || refUser?.full_name || 'Tutor',
            email: refUser?.email || refTutor.email || '',
            phone: refUser?.phone || refTutor.phone || '',
            role: 'tutor',
            referralCode: refTutor.referralCode || refUser?.referralCode || '',
            avatar: refTutor.photo || refUser?.avatar || '',
            category: refTutor.category || ''
          };
          if (!usedCode) {
            usedCode = refTutor.referralCode || refUser?.referralCode || '';
          }
        } else if (refUser) {
          referrerDetails = {
            id: refUser._id.toString(),
            userId: refUser._id.toString(),
            name: refUser.student_name || refUser.full_name || 'Student',
            email: refUser.email || '',
            phone: refUser.phone || '',
            role: refUser.role || 'student',
            referralCode: refUser.referralCode || '',
            avatar: refUser.avatar || ''
          };
          if (!usedCode) {
            usedCode = refUser.referralCode || '';
          }
        } else {
          referrerDetails = {
            id: refIdStr,
            name: 'Referred User',
            role: 'user',
            referralCode: usedCode || ''
          };
        }
      } else if (usedCode) {
        const upperCode = usedCode.toUpperCase();
        const matchedTutor = extraTutorsMap.get(upperCode);
        const matchedUser = extraUsersMap.get(upperCode);

        if (matchedTutor) {
          referrerDetails = {
            id: matchedTutor._id.toString(),
            userId: matchedTutor.userId ? matchedTutor.userId.toString() : '',
            name: matchedTutor.name,
            email: matchedTutor.email || '',
            phone: matchedTutor.phone || '',
            role: 'tutor',
            referralCode: matchedTutor.referralCode,
            avatar: matchedTutor.photo || '',
            category: matchedTutor.category || ''
          };
        } else if (matchedUser) {
          referrerDetails = {
            id: matchedUser._id.toString(),
            userId: matchedUser._id.toString(),
            name: matchedUser.student_name || matchedUser.full_name,
            email: matchedUser.email || '',
            phone: matchedUser.phone || '',
            role: matchedUser.role || 'student',
            referralCode: matchedUser.referralCode,
            avatar: matchedUser.avatar || ''
          };
        } else {
          referrerDetails = {
            id: '',
            name: `Marketing Campaign / Affiliate`,
            role: 'affiliate',
            referralCode: usedCode
          };
        }
      }

      sObj.referralInfo = {
        hasReferral: Boolean(s.referredBy || usedCode || referrerDetails),
        usedReferralCode: usedCode || null,
        referrer: referrerDetails
      };

      // Also set top-level helper fields
      sObj.usedReferralCode = usedCode || null;
      sObj.referrerName = referrerDetails ? referrerDetails.name : null;
      sObj.referrerRole = referrerDetails ? referrerDetails.role : null;
      sObj.referrerEmail = referrerDetails ? referrerDetails.email : null;
      sObj.referrerCode = referrerDetails ? referrerDetails.referralCode : null;

      return sObj;
    });

    res.json(formattedStudents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/dashboard/admin/students/:id
router.put('/admin/students/:id', async (req, res) => {
  try {
    const studentId = req.params.id;
    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return res.status(404).json({ message: 'Student account not found' });
    }

    const {
      full_name,
      email,
      phone,
      student_class,
      student_or_parent,
      student_name,
      interested_subject,
      subject_interests,
      heard_about_us,
      timezone
    } = req.body;

    // Email uniqueness check if changed
    if (email && email.trim() !== '' && email.trim().toLowerCase() !== (student.email || '').toLowerCase()) {
      const emailLower = email.trim().toLowerCase();
      const existing = await User.findOne({ email: emailLower, _id: { $ne: student._id } });
      if (existing) {
        return res.status(400).json({ message: 'Another user with this email address already exists' });
      }
      student.email = emailLower;
    }

    if (phone !== undefined && phone !== null && phone.toString().trim() !== '') {
      const phoneCheck = validateAndNormalizePhone(phone);
      if (!phoneCheck.valid) {
        return res.status(400).json({ message: phoneCheck.error || 'Please enter a valid mobile number.' });
      }
      student.phone = phoneCheck.normalized;
    } else if (phone !== undefined) {
      student.phone = phone.trim();
    }

    if (full_name !== undefined && full_name.trim() !== '') {
      student.full_name = full_name.trim();
    }

    if (student_class !== undefined) {
      student.student_class = student_class;
    }

    if (student_or_parent !== undefined) {
      student.student_or_parent = student_or_parent;
    }

    if (student_name !== undefined) {
      student.student_name = student_name.trim();
    }

    if (interested_subject !== undefined) {
      student.interested_subject = interested_subject.trim();
    }

    if (subject_interests !== undefined) {
      if (Array.isArray(subject_interests)) {
        student.subject_interests = subject_interests;
      } else if (typeof subject_interests === 'string') {
        student.subject_interests = subject_interests.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    if (heard_about_us !== undefined) {
      student.heard_about_us = heard_about_us;
    }

    if (timezone !== undefined) {
      student.timezone = timezone;
    }

    await student.save();

    // Sync updated name/email/phone across active student bookings
    try {
      const bookingUpdates = {};
      if (student.full_name) bookingUpdates.studentName = student.full_name;
      if (student.email) bookingUpdates.studentEmail = student.email;
      if (student.phone) bookingUpdates.studentPhone = student.phone;
      if (Object.keys(bookingUpdates).length > 0) {
        await Booking.updateMany(
          { studentId: student._id.toString() },
          { $set: bookingUpdates }
        );
      }
    } catch (bErr) {
      console.warn('[Sync Bookings Warning]:', bErr.message);
    }

    res.json({
      message: 'Student profile updated successfully',
      student: student.toObject()
    });
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
            (b.status === 'completed' || (b.sessions && b.sessions.some(s => s.status === 'completed')))
          );
          if (hasRegularClass) {
            completedCount++;
          }
        }

        referralStats = {
          invitedCount,
          completedCount,
          earnings: Math.min(completedCount * 500, 5000)
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
    const tutor = await Tutor.findById(tutorObjId).select('googleMeetLink');
    const bookings = await Booking.find({ tutorId: tutorObjId }).sort({ createdAt: -1 });

    const formatted = bookings.map(b => {
      const obj = b.toObject();
      if (tutor && tutor.googleMeetLink && tutor.googleMeetLink.trim() && obj.subject !== 'Verification Demo Class') {
        let directLink = tutor.googleMeetLink.trim();
        if (!/^https?:\/\//i.test(directLink)) {
          directLink = `https://${directLink}`;
        }
        obj.meetingLink = directLink;
        if (obj.sessions && Array.isArray(obj.sessions)) {
          obj.sessions = obj.sessions.map(s => ({ ...s, meetingLink: directLink }));
        }
      }
      return obj;
    });

    res.json(formatted);
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

    // Synchronize referral metrics and wallet balance
    const walletAndReferralData = await syncStudentWalletAndReferrals(studentId);
    
    res.json({
      enrolledCourses,
      upcomingClasses,
      completedSessions: demoBookings, // for backward compatibility
      demoBookings,
      savedTutors: 0,
      walletBalance: walletAndReferralData.walletBalance,
      walletHistory: walletAndReferralData.walletHistory,
      referralCode: walletAndReferralData.referralCode,
      referralStats: walletAndReferralData.referralStats
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// /api/dashboard/student/:studentId/bookings
router.get('/student/:studentId/bookings', async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const bookings = await Booking.find({ studentId }).populate('tutorId', 'address googleMapsUrl googleMeetLink mode city timezone').sort({ createdAt: -1 });
    const formatted = bookings.map(b => {
      const obj = b.toObject();
      if (b.tutorId) {
        obj.tutorAddress = b.tutorId.address;
        obj.tutorGoogleMapsUrl = b.tutorId.googleMapsUrl;
        obj.tutorGoogleMeetLink = b.tutorId.googleMeetLink;
        obj.tutorMode = b.tutorId.mode;
        obj.tutorCity = b.tutorId.city;
        obj.tutorTimezone = b.tutorId.timezone;
        obj.tutorId = b.tutorId._id.toString();

        let directLink = (b.tutorId.googleMeetLink || '').trim();
        if (directLink && !/^https?:\/\//i.test(directLink)) {
          directLink = `https://${directLink}`;
        }
        obj.tutorGoogleMeetLink = directLink;

        if (directLink && obj.subject !== 'Verification Demo Class') {
          obj.meetingLink = directLink;
          if (obj.sessions && Array.isArray(obj.sessions)) {
            obj.sessions = obj.sessions.map(s => ({ ...s, meetingLink: directLink }));
          }
        }
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
      userId: tutor.userId?._id || tutor.userId || null,
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

// GET /api/dashboard/admin/referrals-leaderboard
router.get('/admin/referrals-leaderboard', async (req, res) => {
  try {
    // 1. Fetch all registered students who were referred by someone
    const referredStudents = await User.find({ 
      referredBy: { $ne: null }, 
      role: 'student' 
    }).select('full_name student_name email phone student_class createdAt referredBy heard_about_us');

    // 2. Fetch all tutors with their user accounts
    const tutors = await Tutor.find().populate('userId', 'email phone full_name avatar');

    // 3. Fetch all students who might be referrers
    const allStudents = await User.find({ role: 'student' }).select('full_name student_name email phone student_class referralCode walletBalance walletHistory createdAt avatar');

    // 4. Batch fetch all bookings for referred students
    const referredStudentIds = referredStudents.map(s => s._id.toString());
    const bookings = await Booking.find({ 
      studentId: { $in: referredStudentIds } 
    }).select('studentId planType status sessions createdAt subject');

    // Map bookings by studentId
    const bookingsByStudentId = new Map();
    for (const b of bookings) {
      if (!b.studentId) continue;
      const sId = b.studentId.toString();
      if (!bookingsByStudentId.has(sId)) {
        bookingsByStudentId.set(sId, []);
      }
      bookingsByStudentId.get(sId).push(b);
    }

    // Build enhanced referred students list with completion status
    const studentStatusMap = new Map(); // studentId -> status object
    const referredStudentsByReferrer = new Map(); // referrerId -> array of student summaries

    for (const student of referredStudents) {
      const sId = student._id.toString();
      const sBookings = bookingsByStudentId.get(sId) || [];

      // Check if student completed any regular (paid / non-demo) class
      const completedRegularBookings = sBookings.filter(b => {
        if (!b.planType || b.planType === 'Free Demo Class' || b.planType.toLowerCase().includes('demo')) {
          return false;
        }
        return b.status === 'completed' || (b.sessions && b.sessions.some(sess => sess.status === 'completed'));
      });

      const isCompleted = completedRegularBookings.length > 0;
      const isEnrolled = sBookings.some(b => ['confirmed', 'enrolled', 'pending_payment'].includes(b.status));
      const status = isCompleted ? 'completed' : isEnrolled ? 'enrolled' : 'registered';

      const studentSummary = {
        id: sId,
        name: student.student_name || student.full_name || 'Student',
        email: student.email || '',
        phone: student.phone || '',
        studentClass: student.student_class || '–',
        registeredAt: student.createdAt,
        status, // 'completed' | 'enrolled' | 'registered'
        completedClassesCount: completedRegularBookings.length,
        totalBookingsCount: sBookings.length
      };

      studentStatusMap.set(sId, studentSummary);

      const refKey = student.referredBy ? student.referredBy.toString() : '';
      if (refKey) {
        if (!referredStudentsByReferrer.has(refKey)) {
          referredStudentsByReferrer.set(refKey, []);
        }
        referredStudentsByReferrer.get(refKey).push(studentSummary);
      }
    }

    // Map tutor ID / tutor userId to tutor entity
    const tutorByUserId = new Map();
    const tutorByTutorId = new Map();
    for (const t of tutors) {
      if (t.userId?._id) {
        tutorByUserId.set(t.userId._id.toString(), t);
      } else if (t.userId) {
        tutorByUserId.set(t.userId.toString(), t);
      }
      tutorByTutorId.set(t._id.toString(), t);
    }

    const leaderboard = [];
    const processedUserIds = new Set();

    // 5. Process all Tutors
    for (const tutor of tutors) {
      const tutorUserId = tutor.userId?._id ? tutor.userId._id.toString() : (tutor.userId ? tutor.userId.toString() : null);
      const tutorId = tutor._id.toString();

      // Collect referred students for this tutor (check both user ID and tutor ID)
      const studentsFromUserId = tutorUserId ? (referredStudentsByReferrer.get(tutorUserId) || []) : [];
      const studentsFromTutorId = referredStudentsByReferrer.get(tutorId) || [];
      
      // Combine unique students
      const combinedStudentsMap = new Map();
      [...studentsFromUserId, ...studentsFromTutorId].forEach(s => combinedStudentsMap.set(s.id, s));
      const myReferredStudents = Array.from(combinedStudentsMap.values());

      if (tutorUserId) processedUserIds.add(tutorUserId);
      processedUserIds.add(tutorId);

      const invitedCount = myReferredStudents.length;
      const completedCount = myReferredStudents.filter(s => s.status === 'completed').length;
      const pendingCount = invitedCount - completedCount;
      const conversionRate = invitedCount > 0 ? Math.round((completedCount / invitedCount) * 100) : 0;
      const totalEarnings = completedCount * 500;

      // Lazy generate referral code if missing
      let refCode = tutor.referralCode;
      if (!refCode) {
        const cleanName = (tutor.name || 'TUTOR').replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase();
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        refCode = `${cleanName}${randomNum}`;
        tutor.referralCode = refCode;
        tutor.save().catch(e => console.error("Lazy tutor refCode save err:", e));
      }

      leaderboard.push({
        id: tutorId,
        userId: tutorUserId || tutorId,
        name: tutor.name || tutor.userId?.full_name || 'Tutor',
        email: tutor.userId?.email || '',
        phone: tutor.userId?.phone || tutor.phone || '',
        avatar: tutor.photo || tutor.avatar || tutor.userId?.avatar || '',
        role: 'tutor',
        city: tutor.city || 'Remote',
        category: tutor.category || 'General',
        referralCode: refCode,
        invitedCount,
        completedCount,
        pendingCount,
        conversionRate,
        totalEarnings,
        referredStudents: myReferredStudents.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()),
        createdAt: tutor.createdAt
      });
    }

    // 6. Process all Students
    for (const student of allStudents) {
      const studentUserId = student._id.toString();
      if (processedUserIds.has(studentUserId)) continue;
      processedUserIds.add(studentUserId);

      const myReferredStudents = referredStudentsByReferrer.get(studentUserId) || [];
      const invitedCount = myReferredStudents.length;
      const completedCount = myReferredStudents.filter(s => s.status === 'completed').length;
      const pendingCount = invitedCount - completedCount;
      const conversionRate = invitedCount > 0 ? Math.round((completedCount / invitedCount) * 100) : 0;
      
      // Calculate earnings directly from completed referrals or wallet
      const totalEarnings = completedCount * 500;

      leaderboard.push({
        id: studentUserId,
        userId: studentUserId,
        name: student.student_name || student.full_name || 'Student',
        email: student.email || '',
        phone: student.phone || '',
        avatar: student.avatar || '',
        role: 'student',
        studentClass: student.student_class || '–',
        referralCode: student.referralCode || '',
        walletBalance: student.walletBalance || 0,
        invitedCount,
        completedCount,
        pendingCount,
        conversionRate,
        totalEarnings,
        referredStudents: myReferredStudents.sort((a, b) => new Date(b.registeredAt).getTime() - new Date(a.registeredAt).getTime()),
        createdAt: student.createdAt
      });
    }

    // 7. Sort leaderboard descending: most successful completed referrals first, then invited, then earnings
    leaderboard.sort((a, b) => {
      if (b.completedCount !== a.completedCount) {
        return b.completedCount - a.completedCount;
      }
      if (b.invitedCount !== a.invitedCount) {
        return b.invitedCount - a.invitedCount;
      }
      if (b.totalEarnings !== a.totalEarnings) {
        return b.totalEarnings - a.totalEarnings;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    // 8. Compute Platform Summary Statistics
    let totalInvited = 0;
    let totalCompleted = 0;
    let totalRewardsDistributed = 0;

    let tutorInvited = 0;
    let tutorCompleted = 0;
    let tutorEarnings = 0;
    let tutorActiveReferrers = 0;

    let studentInvited = 0;
    let studentCompleted = 0;
    let studentEarnings = 0;
    let studentActiveReferrers = 0;

    for (const item of leaderboard) {
      totalInvited += item.invitedCount;
      totalCompleted += item.completedCount;
      totalRewardsDistributed += item.totalEarnings;

      if (item.role === 'tutor') {
        tutorInvited += item.invitedCount;
        tutorCompleted += item.completedCount;
        tutorEarnings += item.totalEarnings;
        if (item.invitedCount > 0) tutorActiveReferrers++;
      } else if (item.role === 'student') {
        studentInvited += item.invitedCount;
        studentCompleted += item.completedCount;
        studentEarnings += item.totalEarnings;
        if (item.invitedCount > 0) studentActiveReferrers++;
      }
    }

    const platformConversionRate = totalInvited > 0 ? Math.round((totalCompleted / totalInvited) * 100) : 0;
    const tutorConversionRate = tutorInvited > 0 ? Math.round((tutorCompleted / tutorInvited) * 100) : 0;
    const studentConversionRate = studentInvited > 0 ? Math.round((studentCompleted / studentInvited) * 100) : 0;

    const topReferrer = leaderboard.length > 0 && leaderboard[0].completedCount > 0 ? {
      name: leaderboard[0].name,
      role: leaderboard[0].role,
      referralCode: leaderboard[0].referralCode,
      completedCount: leaderboard[0].completedCount,
      totalEarnings: leaderboard[0].totalEarnings
    } : null;

    res.json({
      stats: {
        totalInvited,
        totalCompleted,
        platformConversionRate,
        totalRewardsDistributed,
        activeReferrersCount: tutorActiveReferrers + studentActiveReferrers,
        topReferrer,
        tutorStats: {
          totalInvited: tutorInvited,
          totalCompleted: tutorCompleted,
          conversionRate: tutorConversionRate,
          totalEarnings: tutorEarnings,
          activeReferrers: tutorActiveReferrers
        },
        studentStats: {
          totalInvited: studentInvited,
          totalCompleted: studentCompleted,
          conversionRate: studentConversionRate,
          totalEarnings: studentEarnings,
          activeReferrers: studentActiveReferrers
        }
      },
      leaderboard
    });
  } catch (err) {
    console.error('[Referrals Leaderboard] Error generating leaderboard:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ADMIN AVAILABILITY & TUTOR VERIFICATION ROUTES
// ==========================================

const sanitizeGoogleMeetLink = (link) => {
  if (!link) return '';
  let cleaned = link.trim();
  if (cleaned && !/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
};

// GET /api/dashboard/admin/availability - Fetch admin availability settings
router.get('/admin/availability', async (req, res) => {
  try {
    let availability = await AdminAvailability.findOne();
    if (!availability) {
      availability = new AdminAvailability();
      await availability.save();
    }
    res.json({ success: true, availability });
  } catch (err) {
    console.error('[Admin Availability] Fetch error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/dashboard/admin/availability - Update admin availability settings
router.put('/admin/availability', async (req, res) => {
  try {
    const {
      googleMeetLink,
      timezone,
      slotDurationMinutes,
      bufferMinutes,
      daysAhead,
      instructions,
      weeklySchedule,
      isActive
    } = req.body;

    const updateData = {};
    if (googleMeetLink !== undefined) updateData.googleMeetLink = sanitizeGoogleMeetLink(googleMeetLink);
    if (timezone !== undefined) updateData.timezone = timezone;
    if (slotDurationMinutes !== undefined) updateData.slotDurationMinutes = Number(slotDurationMinutes) || 30;
    if (bufferMinutes !== undefined) updateData.bufferMinutes = Number(bufferMinutes) || 0;
    if (daysAhead !== undefined) updateData.daysAhead = Number(daysAhead) || 14;
    if (instructions !== undefined) updateData.instructions = instructions;
    if (weeklySchedule !== undefined) updateData.weeklySchedule = weeklySchedule;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    let availability = await AdminAvailability.findOneAndUpdate(
      {},
      { $set: updateData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      message: 'Admin availability and Google Meet settings saved successfully.',
      availability
    });
  } catch (err) {
    console.error('[Admin Availability] Update error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dashboard/admin/availability/slots - Get calculated available verification slots for tutors
router.get('/admin/availability/slots', async (req, res) => {
  try {
    let availability = await AdminAvailability.findOne();
    if (!availability) {
      availability = new AdminAvailability();
      await availability.save();
    }

    if (!availability.isActive) {
      return res.json({
        success: true,
        isActive: false,
        message: 'Admin verification bookings are currently unavailable.',
        googleMeetLink: availability.googleMeetLink,
        availableDates: []
      });
    }

    const tz = availability.timezone || 'Asia/Kolkata';
    const slotDuration = availability.slotDurationMinutes || 30;
    const daysAhead = Math.min(Math.max(availability.daysAhead || 14, 3), 30);

    // Fetch existing active verification demo bookings to filter out already-booked slots
    const existingBookings = await Booking.find({
      subject: 'Verification Demo Class',
      status: { $in: ['pending', 'confirmed', 'enrolled'] }
    }).select('timing utcTiming');

    const formatTime12h = (hour, min) => {
      const h = hour % 12 || 12;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const m = min.toString().padStart(2, '0');
      return `${h}:${m} ${ampm}`;
    };

    const availableDates = [];
    const now = new Date();
    const minBookingTime = new Date(now.getTime() + 60 * 60 * 1000);

    for (let i = 0; i < daysAhead; i++) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + i);

      const formatterDate = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'long'
      });
      const parts = formatterDate.formatToParts(targetDate);
      const year = parts.find(p => p.type === 'year')?.value;
      const month = parts.find(p => p.type === 'month')?.value;
      const dayNum = parts.find(p => p.type === 'day')?.value;
      const weekday = parts.find(p => p.type === 'weekday')?.value;
      const dateStr = `${year}-${month}-${dayNum}`;

      const daySchedule = (availability.weeklySchedule || []).find(d => d.day === weekday);
      if (!daySchedule || !daySchedule.isEnabled || !daySchedule.timeSlots || daySchedule.timeSlots.length === 0) {
        continue;
      }

      const slotsForDay = [];

      for (const window of daySchedule.timeSlots) {
        if (!window.startTime || !window.endTime) continue;
        const [startHour, startMin] = window.startTime.split(':').map(Number);
        const [endHour, endMin] = window.endTime.split(':').map(Number);

        let currentMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        while (currentMinutes + slotDuration <= endMinutes) {
          const slotStartH = Math.floor(currentMinutes / 60);
          const slotStartM = currentMinutes % 60;
          const slotEndMinutes = currentMinutes + slotDuration;
          const slotEndH = Math.floor(slotEndMinutes / 60);
          const slotEndM = slotEndMinutes % 60;

          const startStr = `${slotStartH.toString().padStart(2, '0')}:${slotStartM.toString().padStart(2, '0')}`;
          const endStr = `${slotEndH.toString().padStart(2, '0')}:${slotEndM.toString().padStart(2, '0')}`;
          const displayTime = `${formatTime12h(slotStartH, slotStartM)} - ${formatTime12h(slotEndH, slotEndM)}`;

          const tempDate = new Date(`${dateStr}T${startStr}:00`);
          const displayDate = targetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: tz });
          const displayTimingStr = `${displayDate} at ${formatTime12h(slotStartH, slotStartM)}`;

          const isPast = tempDate <= minBookingTime;

          let isBooked = false;
          if (!isPast) {
            isBooked = existingBookings.some(b => {
              if (b.utcTiming && Math.abs(new Date(b.utcTiming).getTime() - tempDate.getTime()) < slotDuration * 60 * 1000) {
                return true;
              }
              if (b.timing && b.timing.includes(dateStr) && b.timing.includes(formatTime12h(slotStartH, slotStartM))) {
                return true;
              }
              if (b.timing === displayTimingStr) {
                return true;
              }
              return false;
            });
          }

          slotsForDay.push({
            id: `${dateStr}_${startStr}`,
            date: dateStr,
            startTime: startStr,
            endTime: endStr,
            displayTime,
            displayTimingStr,
            utcTiming: tempDate.toISOString(),
            isAvailable: !isPast && !isBooked,
            isPast,
            isBooked
          });

          currentMinutes += slotDuration;
        }
      }

      if (slotsForDay.length > 0) {
        availableDates.push({
          date: dateStr,
          dayName: weekday,
          formattedDate: targetDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: tz }),
          fullDateText: targetDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: tz }),
          slots: slotsForDay
        });
      }
    }

    res.json({
      success: true,
      isActive: true,
      googleMeetLink: availability.googleMeetLink,
      timezone: tz,
      slotDurationMinutes: slotDuration,
      instructions: availability.instructions,
      availableDates
    });
  } catch (err) {
    console.error('[Admin Availability Slots] Calculation error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/dashboard/tutor/book-verification-slot - Tutor books an admin verification slot
router.post('/tutor/book-verification-slot', async (req, res) => {
  try {
    const { tutorId, timing, utcTiming, topicToLearn, notes } = req.body;

    if (!tutorId) return res.status(400).json({ success: false, message: 'Tutor ID is required.' });
    if (!timing) return res.status(400).json({ success: false, message: 'Preferred timing is required.' });

    const tutor = await Tutor.findById(tutorId);
    if (!tutor) return res.status(404).json({ success: false, message: 'Tutor not found.' });

    // Check if tutor already has an active verification demo
    const existingDemo = await Booking.findOne({
      tutorId: tutor._id,
      subject: 'Verification Demo Class',
      status: { $in: ['pending', 'confirmed'] }
    });
    if (existingDemo) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active verification demo scheduled. Please reschedule or cancel the existing one before booking a new slot.',
        existingBooking: existingDemo
      });
    }

    const slotDate = utcTiming ? new Date(utcTiming) : new Date();
    if (slotDate < new Date()) {
      return res.status(400).json({ success: false, message: 'Cannot book a verification slot in the past.' });
    }

    let adminAvail = await AdminAvailability.findOne();
    if (!adminAvail) {
      adminAvail = new AdminAvailability();
      await adminAvail.save();
    }

    const meetingLink = adminAvail.googleMeetLink && adminAvail.googleMeetLink.trim()
      ? adminAvail.googleMeetLink.trim()
      : 'https://meet.google.com/cuvasol-admin-verify';

    const newBooking = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing,
      utcTiming: slotDate,
      subject: 'Verification Demo Class',
      studentId: 'admin',
      studentName: 'Platform Administrator',
      topicToLearn: notes || topicToLearn || 'Tutor Profile Verification',
      status: 'confirmed',
      meetingLink
    });

    await newBooking.save();

    try {
      const tutorUser = await User.findById(tutor.userId);
      const tutorEmail = tutorUser?.email;
      if (tutorEmail) {
        await sendVerificationSlotBookedEmail({
          tutorName: tutor.name,
          tutorEmail,
          timing,
          googleMeetLink: meetingLink,
          instructions: adminAvail.instructions,
          isForAdmin: false
        });
      }
      await sendVerificationSlotBookedEmail({
        tutorName: tutor.name,
        tutorEmail: tutorEmail || '',
        timing,
        googleMeetLink: meetingLink,
        instructions: notes || '',
        isForAdmin: true
      });
    } catch (mailErr) {
      console.error('[Verification Booking] Error sending email notification:', mailErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Verification demo slot booked successfully!',
      booking: newBooking
    });
  } catch (err) {
    console.error('[Book Verification Slot] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dashboard/tutor/:tutorId/verification-booking - Get tutor's current verification booking
router.get('/tutor/:tutorId/verification-booking', async (req, res) => {
  try {
    const { tutorId } = req.params;
    const tutor = await Tutor.findById(tutorId);
    if (!tutor) return res.status(404).json({ success: false, message: 'Tutor not found.' });

    const booking = await Booking.findOne({
      tutorId: tutor._id,
      subject: 'Verification Demo Class'
    }).sort({ createdAt: -1 });

    let adminAvail = await AdminAvailability.findOne();

    res.json({
      success: true,
      booking,
      isVerified: Boolean(tutor.isVerified),
      tutorStatus: tutor.status,
      googleMeetLink: adminAvail?.googleMeetLink || (booking?.meetingLink || ''),
      instructions: adminAvail?.instructions || ''
    });
  } catch (err) {
    console.error('[Get Tutor Verification Booking] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/dashboard/tutor/cancel-verification-slot - Cancel a verification demo
router.post('/tutor/cancel-verification-slot', async (req, res) => {
  try {
    const { tutorId, bookingId, reason } = req.body;
    const booking = await Booking.findOne({
      _id: bookingId,
      tutorId,
      subject: 'Verification Demo Class'
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Verification booking not found.' });
    }

    booking.status = 'cancelled';
    booking.cancelledBy = 'Tutor';
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || 'Cancelled by tutor to reschedule';
    await booking.save();

    res.json({
      success: true,
      message: 'Verification demo booking cancelled. You may now choose another preferred slot.',
      booking
    });
  } catch (err) {
    console.error('[Cancel Verification Booking] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;



