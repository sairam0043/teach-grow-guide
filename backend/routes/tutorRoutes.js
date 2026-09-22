const express = require('express');
const Tutor = require('../schemas/tutorSchema');
const User = require('../schemas/userSchema');
const Booking = require('../schemas/bookingSchema');
const nodemailer = require('nodemailer');
const { generateMeetingLinkForBooking } = require('../utils/googleMeetService');
const { rewardReferrerOnClassCompletion, refundWalletOnBookingCancel } = require('../utils/referralWalletHelper');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: (process.env.SMTP_USER || 'dummy').trim(),
    pass: (process.env.SMTP_PASS || 'dummy').replace(/[\s\n\r]+/g, '').trim(),
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

const router = express.Router();

const getFrontendUrl = (req) => {
  let origin = req && (req.headers.origin || req.headers.referer);
  if (origin) {
    try {
      const urlObj = new URL(origin);
      origin = urlObj.origin;
    } catch (e) {
      origin = origin.replace(/\/$/, '');
    }
    if (typeof origin === 'string' && (origin.startsWith('http://') || origin.startsWith('https://'))) {
      return origin;
    }
  }

  if (process.env.FRONTEND_URL) {
    const urls = process.env.FRONTEND_URL.split(',')
      .map(u => u.replace(/["']/g, '').trim())
      .filter(Boolean);
    if (urls.length > 0) {
      const isProd = process.env.NODE_ENV === 'production';
      if (isProd) {
        const prodUrl = urls.find(url => !url.includes('localhost') && !url.includes('127.0.0.1'));
        if (prodUrl) return prodUrl;
      }
      return urls[0];
    }
  }
  return 'http://localhost:8080';
};

const parseTimingStringToDate = (timingStr) => {
  try {
    const parts = timingStr.split(' at ');
    if (parts.length === 2) {
      // Clean ordinal suffixes from the date part (e.g. "May 20th, 2026" -> "May 20, 2026")
      const datePartCleaned = parts[0].replace(/(\d+)(st|nd|rd|th)/, '$1');
      const timePart = parts[1];
      const combined = `${datePartCleaned} ${timePart}`;
      const parsed = new Date(combined);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error parsing timing string:", e);
  }
  return null;
};

const parseSessionToDate = (dateStr, timeStr) => {
  return parseTimingStringToDate(`${dateStr} at ${timeStr}`);
};

const getBookingSessionTimestamps = (booking) => {
  const activeStatuses = ['pending', 'pending_payment', 'confirmed', 'enrolled'];
  if (!activeStatuses.includes(booking.status)) {
    return [];
  }
  if (booking.sessions && booking.sessions.length > 0) {
    const timestamps = [];
    for (const session of booking.sessions) {
      if (session.status !== 'cancelled' && session.status !== 'completed') {
        if (session.utcDate) {
          timestamps.push(new Date(session.utcDate).getTime());
        } else {
          const parsed = parseSessionToDate(session.date, session.time);
          if (parsed) {
            timestamps.push(parsed.getTime());
          }
        }
      }
    }
    return timestamps;
  } else if (booking.timing) {
    if (booking.utcTiming) {
      return [new Date(booking.utcTiming).getTime()];
    }
    const parsed = parseTimingStringToDate(booking.timing);
    return parsed ? [parsed.getTime()] : [];
  }
  return [];
};

const checkTutorScheduleConflict = async (tutorId, requestedTiming, requestedSessions, isPack, requestedUtcTiming, excludeBookingId = null) => {
  const requestedTimestamps = [];
  if (isPack && requestedSessions && requestedSessions.length > 0) {
    for (const s of requestedSessions) {
      if (s.utcDate) {
        requestedTimestamps.push(new Date(s.utcDate).getTime());
      } else {
        const parsed = parseSessionToDate(s.date, s.time);
        if (parsed) {
          requestedTimestamps.push(parsed.getTime());
        }
      }
    }
  } else if (requestedUtcTiming) {
    requestedTimestamps.push(new Date(requestedUtcTiming).getTime());
  } else if (requestedTiming) {
    const parsed = parseTimingStringToDate(requestedTiming);
    if (parsed) {
      requestedTimestamps.push(parsed.getTime());
    }
  }

  if (requestedTimestamps.length === 0) {
    return null;
  }

  const query = {
    tutorId,
    status: { $in: ['pending', 'pending_payment', 'confirmed', 'enrolled'] }
  };
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const activeBookings = await Booking.find(query);

  for (const booking of activeBookings) {
    const existingTimestamps = getBookingSessionTimestamps(booking);
    for (const reqTs of requestedTimestamps) {
      if (existingTimestamps.includes(reqTs)) {
        return {
          conflictTimestamp: reqTs,
          bookingId: booking._id,
          studentName: booking.studentName,
          subject: booking.subject
        };
      }
    }
  }

  return null;
};

// Helper to validate whether a requested date/time falls within tutor's availability
const validateTutorAvailability = (tutor, timingStr, utcTiming) => {
  if (!tutor) return { valid: true };

  let dateObj = null;
  if (utcTiming) {
    dateObj = new Date(utcTiming);
  } else if (timingStr) {
    dateObj = parseTimingStringToDate(timingStr);
  }
  if (!dateObj || isNaN(dateObj.getTime())) {
    return { valid: false, message: 'Invalid timing date or format' };
  }

  const hasDynamicAvailability = tutor.availability && tutor.availability.length > 0;
  const tutorTz = tutor.timezone || 'Asia/Kolkata';

  if (hasDynamicAvailability) {
    // Determine weekday in tutor's timezone
    const tutorWeekday = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      timeZone: tutorTz
    }).format(dateObj);

    // Format local hour and minute in tutor timezone
    const tutorTimeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      timeZone: tutorTz
    });
    const parts = tutorTimeFormatter.formatToParts(dateObj);
    let hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    if (hour === 24) hour = 0;
    const min = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    const sessionTimeMinutes = hour * 60 + min;

    // Filter tutor's availability matching this weekday
    const dayAvailabilities = tutor.availability.filter(a => a.day === tutorWeekday);
    if (dayAvailabilities.length === 0) {
      const availableDays = [...new Set(tutor.availability.map(a => a.day))].join(', ');
      return {
        valid: false,
        message: `Tutor is not available on ${tutorWeekday}. Available working days: ${availableDays}.`
      };
    }

    const fitsInWindow = dayAvailabilities.some(avail => {
      if (!avail.startTime || !avail.endTime) return false;
      const [sh, sm] = avail.startTime.split(':').map(Number);
      const [eh, em] = avail.endTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      return sessionTimeMinutes >= startMin && sessionTimeMinutes < endMin;
    });

    if (!fitsInWindow) {
      const windows = dayAvailabilities.map(a => `${a.startTime} - ${a.endTime}`).join(', ');
      return {
        valid: false,
        message: `Requested time (${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')} ${tutorTz}) is outside tutor's working hours on ${tutorWeekday} (${windows}).`
      };
    }

    return { valid: true };
  } else if (tutor.availableTimings && tutor.availableTimings.length > 0) {
    const timePart = timingStr.includes(' at ') ? timingStr.split(' at ')[1] : timingStr;
    const matches = tutor.availableTimings.some(t => t.trim().toLowerCase() === timePart.trim().toLowerCase());
    if (!matches) {
      return {
        valid: false,
        message: `Requested slot (${timePart}) is not in tutor's available timings (${tutor.availableTimings.join(', ')}).`
      };
    }
    return { valid: true };
  }

  return { valid: true };
};

// Helper to securely calculate backend prices for a booking plan
const calculatePlanPrice = (tutor, subject, planType) => {
  if (planType === 'Free Demo Class') {
    return 0;
  }
  
  // Find subject rate
  let subjectRate = tutor.hourlyRate || 300;
  if (tutor.subjectRates && Array.isArray(tutor.subjectRates)) {
    const rateObj = tutor.subjectRates.find(sr => sr.subject === subject);
    if (rateObj) {
      subjectRate = rateObj.rate;
    }
  }

  switch (planType) {
    case '1-on-1 (Premium)':
      return subjectRate;
    case '2 Students':
      return Math.round(subjectRate * 0.75);
    case '3–5 Students':
      return Math.round(subjectRate * 0.55);
    case '2 Days/Week (Monthly Pack)':
      return Math.round(subjectRate * 8 * 0.85);
    case '3 Days/Week (Monthly Pack)':
      return Math.round(subjectRate * 12 * 0.70);
    default:
      return subjectRate;
  }
};


// Get all tutors
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.featured) filter.featured = req.query.featured === 'true';

    // Cache public approved tutor listings
    if (req.query.status === 'approved') {
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    }

    const tutors = await Tutor.find(filter).populate('userId', 'email phone avatar');

    // Optimization: Bulk fetch all referral data in only 2 queries to avoid N+1 DB load
    const referredMap = new Map();
    const bookingsMap = new Map();
    
    if (req.query.status !== 'approved') {
      const tutorUserIds = tutors.map(t => t.userId?._id || t.userId).filter(Boolean);
      const referredStudents = await User.find({ 
        referredBy: { $in: tutorUserIds }, 
        role: 'student' 
      });
      
      referredStudents.forEach(s => {
        if (s.referredBy) {
          const refStr = s.referredBy.toString();
          if (!referredMap.has(refStr)) {
            referredMap.set(refStr, []);
          }
          referredMap.get(refStr).push(s);
        }
      });

      const referredStudentIds = referredStudents.map(s => s._id);
      const bookings = await Booking.find({ studentId: { $in: referredStudentIds } });

      bookings.forEach(b => {
        if (b.studentId) {
          const sidStr = b.studentId.toString();
          if (!bookingsMap.has(sidStr)) {
            bookingsMap.set(sidStr, []);
          }
          bookingsMap.get(sidStr).push(b);
        }
      });
    }

    // Transform _id to id for frontend compatibility and calculate referral metrics
    const formattedTutors = await Promise.all(tutors.map(async t => {
      const obj = t.toObject();
      obj.id = obj._id.toString();

      // Lazy generate referralCode on-the-fly if missing
      if (!t.referralCode) {
        const cleanName = (t.name || 'TUTOR').replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase();
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        t.referralCode = `${cleanName}${randomNum}`;
        await t.save();
        obj.referralCode = t.referralCode;
      }
      if (obj.userId) {
        obj.email = obj.userId.email;
        obj.phone = obj.userId.phone;
        obj.avatar = obj.userId.avatar;

        // Skip expensive referral DB queries for public tutor listings to avoid N+1 DB load
        if (req.query.status === 'approved') {
          obj.referralsInvited = 0;
          obj.referralsCompleted = 0;
          obj.referralsEarnings = 0;
        } else {
          const tutorUserIdStr = obj.userId._id ? obj.userId._id.toString() : obj.userId.toString();
          const tutorReferredStudents = referredMap.get(tutorUserIdStr) || [];
          const invitedCount = tutorReferredStudents.length;
          let completedCount = 0;

          if (invitedCount > 0) {
            for (const student of tutorReferredStudents) {
              const studentBookings = bookingsMap.get(student._id.toString()) || [];
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
          }
          obj.referralsInvited = invitedCount;
          obj.referralsCompleted = completedCount;
          obj.referralsEarnings = Math.min(completedCount * 500, 5000);
        }
      } else {
        obj.referralsInvited = 0;
        obj.referralsCompleted = 0;
        obj.referralsEarnings = 0;
      }
      if (obj.demoSlots) {
        obj.demoSlots = obj.demoSlots.map(s => ({...s, id: s._id.toString()}));
      }
      return obj;
    }));
    res.json(formattedTutors);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tutors', error: error.message });
  }
});

// Get a single tutor by database ID
router.get('/:id', async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id).populate('userId', 'email phone avatar');
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });
    
    // Cache public approved tutor profile page responses
    if (tutor.status === 'approved') {
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    }

    const obj = tutor.toObject();
    obj.id = obj._id.toString();
    if (obj.userId) {
      obj.email = obj.userId.email;
      obj.phone = obj.userId.phone;
      obj.avatar = obj.userId.avatar;
    }
    if (obj.demoSlots) {
      obj.demoSlots = obj.demoSlots.map(s => ({...s, id: s._id.toString()}));
    }
    
    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tutor', error: error.message });
  }
});

// Get a tutor by associated user ID
router.get('/user/:userId', async (req, res) => {
  try {
    const tutor = await Tutor.findOne({ userId: req.params.userId }).populate('userId', 'email phone avatar');
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });
    
    const obj = tutor.toObject();
    obj.id = obj._id.toString();
    if (obj.userId) {
      obj.email = obj.userId.email;
      obj.phone = obj.userId.phone;
      obj.avatar = obj.userId.avatar;
    }
    if (obj.demoSlots) {
      obj.demoSlots = obj.demoSlots.map(s => ({...s, id: s._id.toString()}));
    }
    
    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tutor', error: error.message });
  }
});

// Teachers can create timings (demo slots)
router.post('/:id/slots', async (req, res) => {
  try {
    const { date, time } = req.body;
    
    if (!date || !time) {
      return res.status(400).json({ message: 'Date and time are required to create a timing slot.' });
    }

    const tutor = await Tutor.findById(req.params.id);
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    tutor.demoSlots.push({ date, time, available: true });
    await tutor.save();
    
    // Return the newly created slot (which is the last one in the array)
    const newSlot = tutor.demoSlots[tutor.demoSlots.length - 1];
    res.status(201).json({ message: 'Timing slot created successfully', slot: newSlot });
  } catch (error) {
    res.status(500).json({ message: 'Error creating slot', error: error.message });
  }
});

// Students can book a session from available ones
router.post('/:id/book', async (req, res) => {
  try {
    const tutorId = req.params.id;
    const { timing, subject, studentId, studentName, utcTiming } = req.body;
    
    if (!timing) return res.status(400).json({ message: 'Timing is required' });
    if (!subject) return res.status(400).json({ message: 'Subject is required' });

    const tutor = await Tutor.findById(tutorId);
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });


    // Validate slot timing is at least 3 hours in the future
    const bookingDate = parseTimingStringToDate(timing);
    if (bookingDate) {
      const minTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
      if (bookingDate < minTime) {
        return res.status(400).json({ message: 'You can only book sessions that are at least 3 hours in the future.' });
      }
    }

    // Validate tutor availability (working days and hours)
    const availabilityCheck = validateTutorAvailability(tutor, timing, utcTiming);
    if (!availabilityCheck.valid) {
      return res.status(400).json({ message: availabilityCheck.message });
    }

    // Check for tutor schedule conflicts
    const conflict = await checkTutorScheduleConflict(tutor._id, timing, null, false, utcTiming);
    if (conflict) {
      return res.status(400).json({ message: `The tutor is already booked or has a pending session at ${timing}.` });
    }

    // Check if the student already has a pending or active demo with this tutor for this subject
    const existingDemo = await Booking.findOne({ 
      tutorId: tutor._id, 
      studentId,
      subject,
      status: { $in: ['pending', 'confirmed', 'completed', 'enrolled'] } 
    });
    if (existingDemo) {
       return res.status(400).json({ message: `You have already requested or booked a demo for ${subject} with this tutor.` });
    }

    // Create a booking record
    const newBooking = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing,
      utcTiming: utcTiming ? new Date(utcTiming) : undefined,
      subject,
      studentId: studentId || "anonymous_student",
      studentName: studentName || "Anonymous",
      status: 'pending'
    });
    newBooking.meetingLink = await generateMeetingLinkForBooking({
      tutor,
      studentId,
      subject,
      timing,
      utcTiming,
      fallbackJitsiPrefix: `cuvasol-tutor-demo-${newBooking._id}`
    });
    await newBooking.save();
    console.log(`[Booking] Demo session saved for student: ${studentName} with status: pending`);
    
    // Notify Tutor
    try {
      const tutorUser = await User.findById(tutor.userId);
      if (tutorUser && tutorUser.email) {
        console.log(`[Booking] Attempting to notify tutor: ${tutorUser.email}`);
        transporter.sendMail({
          from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <noreply@cuvasoltutor.com>',
          to: tutorUser.email,
          subject: 'New Demo Session Requested (Pending Approval)',
          text: `Hello ${tutor.name},\n\nStudent ${studentName} has requested a demo session for ${subject} at ${timing}.\n\nPlease log in to your dashboard to Accept or Reject this request.\n\nBest regards,\nCuvasol Tutor Team`,
          html: `<h3>New Demo Session Requested</h3>
                 <p>Hello <b>${tutor.name}</b>,</p>
                 <p>Student <b>${studentName}</b> has requested a demo session for <b>${subject}</b> at <b>${timing}</b>.</p>
                 <p>Please log in to your <a href="${getFrontendUrl(req)}/dashboard/tutor">dashboard</a> to Accept or Reject this request.</p>
                 <p>Best regards,<br/>Cuvasol Tutor Team</p>`,
        }).then(() => {
          console.log(`[Booking] Tutor notification email sent to: ${tutorUser.email}`);
        }).catch((mailError) => {
          console.error('[Booking] Failed to send tutor notification:', mailError.message);
        });
      } else {
        console.warn(`[Booking] Could not find email for tutor user: ${tutor.userId}`);
      }
    } catch (mailError) {
      console.error('[Booking] Failed to send tutor notification:', mailError.message);
      // We don't fail the whole booking if email fails
    }

    res.status(200).json({ message: 'Session booked successfully', booking: newBooking });
  } catch (error) {
    res.status(500).json({ message: 'Error booking session', error: error.message });
  }
});

// Admin can request a verification demo class with the tutor
router.post('/:id/book-verification-demo', async (req, res) => {
  try {
    const tutorId = req.params.id;
    const { timing, utcTiming } = req.body;
    
    if (!timing) return res.status(400).json({ message: 'Timing is required' });

    const tutor = await Tutor.findById(tutorId);
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    // Check if there is already an active verification demo booking
    const existingDemo = await Booking.findOne({ 
      tutorId: tutor._id, 
      studentId: 'admin',
      subject: 'Verification Demo Class',
      status: { $in: ['pending', 'confirmed'] } 
    });
    if (existingDemo) {
      return res.status(400).json({ message: 'A verification demo is already pending or confirmed for this tutor.' });
    }

    const newBooking = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing,
      utcTiming: utcTiming ? new Date(utcTiming) : undefined,
      subject: 'Verification Demo Class',
      studentId: 'admin',
      studentName: 'Admin Verification',
      status: 'pending'
    });
    newBooking.meetingLink = await generateMeetingLinkForBooking({
      tutor,
      studentId: 'admin',
      subject: 'Verification Demo Class',
      timing,
      utcTiming,
      fallbackJitsiPrefix: `cuvasol-tutor-verification-${newBooking._id}`
    });
    await newBooking.save();

    // Send email notification to tutor
    try {
      const tutorUser = await User.findById(tutor.userId);
      if (tutorUser && tutorUser.email) {
        transporter.sendMail({
          from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <noreply@cuvasoltutor.com>',
          to: tutorUser.email,
          subject: 'Action Required: Verification Demo Class Requested',
          text: `Hello ${tutor.name},\n\nOur administrator has requested a verification demo class with you on ${timing}.\n\nPlease log in to your dashboard to Accept or Reject this request.\n\nBest regards,\nCuvasol Tutor Team`,
          html: `<h3>Verification Demo Class Requested</h3>
                 <p>Hello <b>${tutor.name}</b>,</p>
                 <p>Our administrator has requested a verification demo class with you on <b>${timing}</b>.</p>
                 <p>Please log in to your <a href="${getFrontendUrl(req)}/dashboard/tutor">dashboard</a> to Accept or Reject this request.</p>
                 <p>Best regards,<br/>Cuvasol Tutor Team</p>`,
        }).catch((mailError) => {
          console.error('[Verification Booking] Failed to send email:', mailError.message);
        });
      }
    } catch (mailError) {
      console.error('[Verification Booking] Failed to send email:', mailError.message);
    }

    res.status(200).json({ message: 'Verification demo requested successfully', booking: newBooking });
  } catch (error) {
    res.status(500).json({ message: 'Error booking verification demo', error: error.message });
  }
});

// Students can book a class directly (skip demo)
router.post('/:id/book-class', async (req, res) => {
  try {
    const tutorId = req.params.id;
    const { timing, subject, studentId, studentName, planType, otherStudentsEmails, packDetails, sessions, utcTiming, useWallet } = req.body;
    
    if (!timing) return res.status(400).json({ message: 'Timing is required' });
    if (!subject) return res.status(400).json({ message: 'Subject is required' });
    if (!planType) return res.status(400).json({ message: 'Plan details are required' });

    const tutor = await Tutor.findById(tutorId);
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });


    const isPack = planType.includes('Pack');

    if (isPack && packDetails && packDetails.schedule) {
      const schedule = packDetails.schedule;
      const hasDuplicates = schedule.some((slot, i) =>
        schedule.some((otherSlot, j) => i !== j && slot.day === otherSlot.day && slot.time === otherSlot.time)
      );
      if (hasDuplicates) {
        return res.status(400).json({ message: 'Duplicate slots (same day and time) are not allowed in the schedule.' });
      }
    }

    if (!isPack) {
      const availabilityCheck = validateTutorAvailability(tutor, timing, utcTiming);
      if (!availabilityCheck.valid) {
        return res.status(400).json({ message: availabilityCheck.message });
      }

      const bookingDate = parseTimingStringToDate(timing);
      if (bookingDate) {
        const minTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
        if (bookingDate < minTime) {
          return res.status(400).json({ message: 'You can only book sessions that are at least 3 hours in the future.' });
        }
      }
    } else if (isPack && packDetails && packDetails.startDate) {
      const startDate = new Date(packDetails.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate < today) {
        return res.status(400).json({ message: 'Course start date must be today or in the future.' });
      }
    }

    // Check for tutor schedule conflicts
    const conflict = await checkTutorScheduleConflict(tutor._id, timing, sessions, isPack, utcTiming);
    if (conflict) {
      let conflictMsg = `The tutor is already booked or has a pending session at that time.`;
      if (conflict.conflictTimestamp) {
        const conflictDate = new Date(conflict.conflictTimestamp);
        const formattedConflict = conflictDate.toLocaleString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }).replace(',', '');
        conflictMsg = `The tutor is already booked or has a pending session at ${formattedConflict}.`;
      }
      return res.status(400).json({ message: conflictMsg });
    }

    const isGroup = otherStudentsEmails && otherStudentsEmails.length > 0;
    
    // Securely calculate price on the backend
    const calculatedPrice = calculatePlanPrice(tutor, subject, planType);
    
    // Handle Student Wallet deduction
    let walletDiscount = 0;
    let fullyPaidByWallet = false;
    let studentUser = null;

    if (useWallet && studentId && studentId !== 'anonymous_student') {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(studentId)) {
        studentUser = await User.findById(studentId);
        if (studentUser && studentUser.walletBalance > 0) {
          walletDiscount = Math.min(studentUser.walletBalance, calculatedPrice);
          if (walletDiscount >= calculatedPrice && !isGroup) {
            fullyPaidByWallet = true;
          }
        }
      }
    }

    const netPayable = Math.max(0, calculatedPrice - walletDiscount);

    if (fullyPaidByWallet && studentUser) {
      // Deduct full amount from student wallet immediately
      studentUser.walletBalance = Math.max(0, studentUser.walletBalance - walletDiscount);
      if (!studentUser.walletHistory) studentUser.walletHistory = [];
      studentUser.walletHistory.push({
        type: 'debit',
        amount: walletDiscount,
        description: `Applied wallet credits to book ${planType} - ${subject} with ${tutor.name}`,
        date: new Date()
      });
      await studentUser.save();
    }

    // Direct booking means they're immediately enrolled if 100% wallet paid, or pending_payment if partial/no wallet
    const newBooking = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing,
      utcTiming: utcTiming ? new Date(utcTiming) : undefined,
      subject,
      studentId: studentId || "anonymous_student",
      studentName: studentName || "Anonymous",
      status: isGroup ? 'pending' : (fullyPaidByWallet ? 'enrolled' : 'pending_payment'),
      planType,
      amountPaid: fullyPaidByWallet ? calculatedPrice : netPayable,
      originalAmount: calculatedPrice,
      walletUsed: walletDiscount,
      groupDetails: isGroup ? {
        isGroup: true,
        invitedEmails: otherStudentsEmails.map(email => ({ email, status: 'pending', paidShare: false }))
      } : undefined,
      packDetails: isPack ? packDetails : undefined,
      sessions: isPack && sessions ? sessions : undefined
    });

    newBooking.meetingLink = await generateMeetingLinkForBooking({
      tutor,
      studentId,
      subject,
      timing,
      utcTiming,
      fallbackJitsiPrefix: `cuvasol-tutor-class-${newBooking._id}`
    });
    
    // Set individual session Google Meet/Jitsi meeting links
    if (isPack && newBooking.sessions && newBooking.sessions.length > 0) {
      const updatedSessions = [];
      for (let idx = 0; idx < newBooking.sessions.length; idx++) {
        const session = newBooking.sessions[idx];
        const sessMeetLink = await generateMeetingLinkForBooking({
          tutor,
          studentId,
          subject: `${subject} (Session ${idx + 1})`,
          timing: `${session.date} at ${session.time}`,
          utcTiming: session.utcDate,
          fallbackJitsiPrefix: `cuvasol-tutor-class-${newBooking._id}-session-${idx + 1}`
        });
        updatedSessions.push({
          date: session.date,
          time: session.time,
          status: session.status || 'scheduled',
          utcDate: session.utcDate ? new Date(session.utcDate) : undefined,
          meetingLink: sessMeetLink
        });
      }
      newBooking.sessions = updatedSessions;
    }

    await newBooking.save();

    if (isGroup) {
      // Send emails to invited students
      const frontendUrl = getFrontendUrl(req);
      for (const email of otherStudentsEmails) {
        const approvalLink = `${frontendUrl}/approve-booking/${newBooking._id}?email=${encodeURIComponent(email)}`;
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <noreply@cuvasoltutor.com>',
            to: email,
            subject: 'Invitation to Join a Group Class',
            text: `You have been invited by ${studentName} to join a group class with ${tutor.name}. Please approve and pay your share: ${approvalLink}`,
            html: `<p>You have been invited by <b>${studentName}</b> to join a group class with <b>${tutor.name}</b>.</p><p><a href="${approvalLink}">Click here to approve and pay your share</a></p>`,
          });
          console.log(`[Booking] Invitation email sent to: ${email}`);
        } catch (invError) {
          console.error(`[Booking] Failed to send invitation to ${email}:`, invError.message);
        }
      }
    }

    // Notify Tutor of the new group class booking if it is a group class
    if (isGroup) {
      try {
        const tutorUser = await User.findById(tutor.userId);
        if (tutorUser && tutorUser.email) {
          console.log(`[Booking] Attempting to notify tutor of group booking: ${tutorUser.email}`);
          await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <noreply@cuvasoltutor.com>',
            to: tutorUser.email,
            subject: 'New Group Class Booking',
            text: `Hello ${tutor.name},\n\nA new group class has been initiated by ${studentName} for ${subject} at ${timing}.\n\nPlan: ${planType}\n\nYou can join the private video room once all members enroll: ${newBooking.meetingLink}\n\nBest regards,\nCuvasol Tutor Team`,
            html: `<h3>New Group Class Booking</h3><p>Hello <b>${tutor.name}</b>,</p><p>A new group class booking has been initiated by <b>${studentName}</b> for <b>${subject}</b> at <b>${timing}</b>.</p><p><b>Plan:</b> ${planType}</p><p>You can join the private video room once all members enroll:</p><p><a href="${newBooking.meetingLink}" style="background-color: #059669; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">${newBooking.meetingLink && newBooking.meetingLink.includes('meet.google.com') ? 'Join Google Meet' : 'Join Jitsi Video Room'}</a></p><p>Or access your <a href="${getFrontendUrl(req)}/dashboard/tutor">dashboard</a> for details.</p>`,
          });
          console.log(`[Booking] Tutor notification email sent to: ${tutorUser.email}`);
        }
      } catch (mailError) {
        console.error('[Booking] Failed to send tutor notification:', mailError.message);
      }
    } else if (fullyPaidByWallet) {
      // Notify Tutor & Student of successful 100% wallet enrollment
      try {
        const tutorUser = await User.findById(tutor.userId);
        if (tutorUser && tutorUser.email) {
          const isGoogleMeet = newBooking.meetingLink && newBooking.meetingLink.includes('meet.google.com');
          const meetBtnText = isGoogleMeet ? 'Join Google Meet' : 'Join Jitsi Video Room';
          await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <noreply@cuvasoltutor.com>',
            to: tutorUser.email,
            subject: 'New Course Enrollment Confirmed (Paid via Student Wallet)',
            text: `Hello ${tutor.name},\n\nStudent ${studentName} has enrolled in your class for ${subject} at ${timing} (paid via student credits).\n\nYou can join the private video room directly here: ${newBooking.meetingLink}\n\nBest regards,\nCuvasol Tutor Team`,
            html: `<h3>New Course Enrollment Confirmed</h3>
                   <p>Hello <b>${tutor.name}</b>,</p>
                   <p>Student <b>${studentName}</b> is officially enrolled in your course for <b>${subject}</b> at <b>${timing}</b>.</p>
                   <p>You can join the private video room directly by clicking the link below:</p>
                   <p><a href="${newBooking.meetingLink}" style="background-color: #059669; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">${meetBtnText}</a></p>
                   <p>Or access your <a href="${getFrontendUrl(req)}/dashboard/tutor">dashboard</a> for details.</p>`,
          });
        }
      } catch (mailError) {
        console.error('[Booking] Failed to send tutor wallet enrollment notification:', mailError.message);
      }
    }

    res.status(200).json({ 
      message: fullyPaidByWallet ? 'Class booked and fully paid with wallet balance!' : 'Class booked successfully', 
      booking: newBooking,
      fullyPaidByWallet,
      netPayable
    });
  } catch (error) {
    res.status(500).json({ message: 'Error booking class', error: error.message });
  }
});

// Get student's bookings for a specific tutor
router.get('/:id/bookings/student/:studentId', async (req, res) => {
  try {
    const bookings = await Booking.find({ tutorId: req.params.id, studentId: req.params.studentId }).populate('tutorId', 'address googleMapsUrl mode city');
    const formatted = bookings.map(b => {
      const obj = b.toObject();
      if (b.tutorId) {
        obj.tutorAddress = b.tutorId.address;
        obj.tutorGoogleMapsUrl = b.tutorId.googleMapsUrl;
        obj.tutorMode = b.tutorId.mode;
        obj.tutorCity = b.tutorId.city;
        obj.tutorId = b.tutorId._id.toString();
      }
      return obj;
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update booking status
router.put('/booking/:bookingId/status', async (req, res) => {
  try {
    const { status, cancellationReason, cancelledBy } = req.body;
    if (!['pending', 'confirmed', 'cancelled', 'rejected', 'completed', 'enrolled'].includes(status)) {
       return res.status(400).json({ message: 'Invalid status' });
    }
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    const oldStatus = booking.status;
    booking.status = status;
    if (cancellationReason !== undefined) {
      booking.cancellationReason = cancellationReason;
    }
    if (status === 'cancelled' || status === 'rejected') {
      booking.cancelledAt = new Date();
      if (cancelledBy) {
        booking.cancelledBy = cancelledBy;
      } else if (status === 'rejected') {
        booking.cancelledBy = 'Tutor';
      } else if (booking.studentId === 'admin') {
        booking.cancelledBy = 'Admin';
      } else {
        booking.cancelledBy = 'Student';
      }
    }
    await booking.save();
    
    console.log(`[Booking] Updated status of Booking ID ${booking._id} from ${oldStatus} to ${status} (Cancelled By: ${booking.cancelledBy || 'N/A'})`);

    // Handle wallet refund if booking was cancelled or rejected
    if (status === 'cancelled' || status === 'rejected') {
      await refundWalletOnBookingCancel(booking);
    } else if (status === 'completed') {
      await rewardReferrerOnClassCompletion(booking);
    }

    const isDemo = !booking.planType || booking.planType === 'Free Demo Class';

    // Notify student on accept (confirmed) or reject (rejected)
    if (status === 'confirmed' || status === 'rejected') {
      try {
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(booking.studentId);
        const studentUser = isValidObjectId ? await User.findById(booking.studentId) : null;
        
        let recipientEmail = null;
        if (studentUser && studentUser.email) {
          recipientEmail = studentUser.email;
        } else if (booking.studentId === 'admin') {
          recipientEmail = process.env.ADMIN_EMAIL || 'admin@cuvasoltutor.com';
        }

        if (recipientEmail) {
          const isConfirmed = status === 'confirmed';
          const emailSubject = isConfirmed
            ? `Demo Booking Accepted: ${booking.subject} with ${booking.tutorName}`
            : `Demo Booking Declined: ${booking.subject} with ${booking.tutorName}`;
            
          const emailText = isConfirmed
            ? `Hello ${booking.studentName},\n\nGood news! Your demo booking request with tutor ${booking.tutorName} for ${booking.subject} on ${booking.timing} has been ACCEPTED.\n\nYou can join the private video room directly here: ${booking.meetingLink}\n\nBest regards,\nCuvasol Tutor Team`
            : `Hello ${booking.studentName},\n\nWe would like to inform you that your demo booking request with tutor ${booking.tutorName} for ${booking.subject} on ${booking.timing} was not accepted.\n\n${isDemo && booking.cancellationReason ? `Reason for decline: ${booking.cancellationReason}\n\n` : ''}Please log in to your dashboard to browse other tutors or available times.\n\nBest regards,\nCuvasol Tutor Team`;

          const emailHtml = isConfirmed
            ? `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
                <h2 style="color: #059669; text-align: center;">Demo Booking Accepted!</h2>
                <p>Hello <strong>${booking.studentName}</strong>,</p>
                <p>Good news! Your demo booking request with tutor <strong>${booking.tutorName}</strong> has been <strong>accepted</strong>.</p>
                
                <div style="background-color: #f0fdfa; padding: 15px; border-radius: 6px; border: 1px solid #ccfbf1; margin: 20px 0;">
                  <h4 style="margin-top: 0; color: #0f766e;">Session Details:</h4>
                  <ul style="line-height: 1.6; margin-bottom: 0; padding-left: 20px;">
                    <li><strong>Subject:</strong> ${booking.subject}</li>
                    <li><strong>Timing:</strong> ${booking.timing}</li>
                  </ul>
                </div>

                <div style="text-align: center; margin: 25px 0;">
                  <a href="${booking.meetingLink}" 
                     style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    ${booking.meetingLink && booking.meetingLink.includes('meet.google.com') ? 'Join Google Meet' : 'Join Video Room (Jitsi)'}
                  </a>
                </div>

                <p>If you have any questions or need support, please contact us at <a href="mailto:support@cuvasol.com">support@cuvasol.com</a>.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 11px; color: #999; text-align: center;">
                  Best regards,<br/><strong>Cuvasol Tutor Team</strong>
                </p>
              </div>
            `
            : `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
                <h2 style="color: #dc2626; text-align: center;">Demo Booking Update</h2>
                <p>Hello <strong>${booking.studentName}</strong>,</p>
                <p>We regret to inform you that your demo booking request with tutor <strong>${booking.tutorName}</strong> for <strong>${booking.subject}</strong> on <strong>${booking.timing}</strong> was not accepted at this time.</p>
                
                ${isDemo && booking.cancellationReason ? `
                <div style="padding: 12px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #b91c1c; margin: 20px 0;">
                  <strong>Reason for rejection:</strong> ${booking.cancellationReason}
                </div>
                ` : ''}
                
                <p>We encourage you to log in to your dashboard to view other qualified tutors or select alternative open slots.</p>
                
                <div style="text-align: center; margin: 25px 0;">
                  <a href="${getFrontendUrl(req)}/login" 
                     style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    Find Other Tutors
                  </a>
                </div>

                <p>If you have any questions or need support, please contact us at <a href="mailto:support@cuvasol.com">support@cuvasol.com</a>.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 11px; color: #999; text-align: center;">
                  Best regards,<br/><strong>Cuvasol Tutor Team</strong>
                </p>
              </div>
            `;

          console.log(`[Booking] Sending status update email to: ${recipientEmail}`);
          transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Cuvasol Classroom" <noreply@cuvasoltutor.com>',
            to: recipientEmail,
            subject: emailSubject,
            text: emailText,
            html: emailHtml
          }).then(() => {
            console.log(`[Booking] Status update email sent successfully.`);
          }).catch((mailError) => {
            console.error('[Booking] Failed to send student status update email:', mailError.message);
          });
        }
      } catch (mailError) {
        console.error('[Booking] Failed to send student status update email:', mailError.message);
      }
    }

    // Notify tutor on student cancellation (cancelled) for demo class
    if (status === 'cancelled' && isDemo) {
      try {
        const tutor = await Tutor.findById(booking.tutorId);
        if (tutor) {
          const tutorUser = await User.findById(tutor.userId);
          if (tutorUser && tutorUser.email) {
            console.log(`[Booking] Sending cancellation email to tutor: ${tutorUser.email}`);
            const emailSubject = `Demo Booking Cancelled by Student: ${booking.subject}`;
            const emailText = `Hello ${tutor.name},\n\nWe would like to inform you that the demo session booked by ${booking.studentName} for ${booking.subject} at ${booking.timing} has been CANCELLED.\n\nReason: ${booking.cancellationReason || 'No reason provided.'}\n\nBest regards,\nCuvasol Tutor Team`;
            const emailHtml = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
                <h2 style="color: #dc2626; text-align: center;">Booking Cancelled by Student</h2>
                <p>Hello <strong>${tutor.name}</strong>,</p>
                <p>We would like to inform you that the demo session booked by student <strong>${booking.studentName}</strong> for <strong>${booking.subject}</strong> at <strong>${booking.timing}</strong> has been <strong>cancelled</strong>.</p>
                
                <div style="padding: 12px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #b91c1c; margin: 20px 0;">
                  <strong>Reason for cancellation:</strong> ${booking.cancellationReason || 'No reason provided.'}
                </div>
                
                <p>The time slot has been freed up and is available for other students to book.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 11px; color: #999; text-align: center;">
                  Best regards,<br/><strong>Cuvasol Tutor Team</strong>
                </p>
              </div>
            `;
            transporter.sendMail({
              from: process.env.EMAIL_FROM || '"Cuvasol Classroom" <noreply@cuvasoltutor.com>',
              to: tutorUser.email,
              subject: emailSubject,
              text: emailText,
              html: emailHtml
            }).then(() => {
              console.log(`[Booking] Cancellation email sent to tutor successfully.`);
            }).catch((mailError) => {
              console.error('[Booking] Failed to send tutor cancellation email:', mailError.message);
            });
          }
        }
      } catch (mailError) {
        console.error('[Booking] Failed to send tutor cancellation email:', mailError.message);
      }
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Request to reschedule a booking (initiated by Student or Tutor)
router.post('/booking/:bookingId/reschedule-request', async (req, res) => {
  try {
    const { requestedTiming, requestedUtcTiming, reason, requestedBy } = req.body;
    if (!requestedTiming) {
      return res.status(400).json({ message: 'Requested new timing is required' });
    }

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (['cancelled', 'rejected', 'completed'].includes(booking.status)) {
      return res.status(400).json({ message: `Cannot reschedule a ${booking.status} booking` });
    }

    const initiatorRole = requestedBy === 'Tutor' ? 'Tutor' : 'Student';

    // Validate slot timing is at least 3 hours in the future
    const bookingDate = parseTimingStringToDate(requestedTiming);
    if (bookingDate) {
      const minTime = new Date(Date.now() + 3 * 60 * 60 * 1000);
      if (bookingDate < minTime) {
        return res.status(400).json({ message: 'You can only reschedule to slots at least 3 hours in the future.' });
      }
    }

    // Fetch tutor and validate dynamic availability
    const tutor = await Tutor.findById(booking.tutorId);
    if (!tutor) {
      return res.status(404).json({ message: 'Tutor not found for this booking' });
    }

    const availabilityCheck = validateTutorAvailability(tutor, requestedTiming, requestedUtcTiming);
    if (!availabilityCheck.valid) {
      return res.status(400).json({ message: availabilityCheck.message });
    }

    // Check for tutor schedule conflicts excluding current booking
    const conflict = await checkTutorScheduleConflict(booking.tutorId, requestedTiming, null, false, requestedUtcTiming, booking._id);
    if (conflict) {
      return res.status(400).json({ message: `The tutor already has another scheduled or pending session at ${requestedTiming}.` });
    }

    booking.rescheduleRequest = {
      requestedTiming,
      requestedUtcTiming: requestedUtcTiming ? new Date(requestedUtcTiming) : undefined,
      requestedBy: initiatorRole,
      reason: reason || '',
      requestedAt: new Date(),
      status: 'pending',
      declinedReason: ''
    };

    await booking.save();
    console.log(`[Reschedule] Request saved for Booking ID ${booking._id} by ${initiatorRole} to ${requestedTiming}`);

    // Send email notification to the opposite party
    try {
      const tutor = await Tutor.findById(booking.tutorId);
      const tutorUser = tutor?.userId ? await User.findById(tutor.userId) : null;
      const studentUser = /^[0-9a-fA-F]{24}$/.test(booking.studentId) ? await User.findById(booking.studentId) : null;
      const frontendUrl = getFrontendUrl(req);

      if (initiatorRole === 'Student') {
        // Notify Tutor
        if (tutorUser && tutorUser.email) {
          transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <noreply@cuvasoltutor.com>',
            to: tutorUser.email,
            subject: `Action Required: Reschedule Requested by ${booking.studentName}`,
            text: `Hello ${tutor.name},\n\nStudent ${booking.studentName} has requested to reschedule their ${booking.subject} class from "${booking.timing}" to "${requestedTiming}".\n\nReason: ${reason || 'No reason specified.'}\n\nPlease log in to your dashboard to Accept or Decline this request:\n${frontendUrl}/dashboard/tutor\n\nBest regards,\nCuvasol Tutor Team`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
                <h2 style="color: #2563eb; text-align: center;">Class Reschedule Requested</h2>
                <p>Hello <strong>${tutor.name}</strong>,</p>
                <p>Student <strong>${booking.studentName}</strong> has requested to reschedule their <strong>${booking.subject}</strong> session.</p>
                <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; border: 1px solid #bfdbfe; margin: 20px 0;">
                  <p style="margin: 0 0 8px 0;"><strong>Original Timing:</strong> <span style="text-decoration: line-through; color: #64748b;">${booking.timing}</span></p>
                  <p style="margin: 0 0 8px 0;"><strong>Requested New Timing:</strong> <span style="color: #2563eb; font-weight: bold;">${requestedTiming}</span></p>
                  <p style="margin: 0;"><strong>Reason:</strong> ${reason || 'No reason provided.'}</p>
                </div>
                <p>Please log in to your <a href="${frontendUrl}/dashboard/tutor" style="color: #2563eb; font-weight: bold;">Tutor Dashboard</a> to Accept or Decline this request.</p>
                <p>Best regards,<br/>Cuvasol Tutor Team</p>
              </div>
            `
          }).catch(err => console.error('[Reschedule Email] Error sending to tutor:', err.message));
        }
      } else {
        // Notify Student
        let studentEmail = studentUser?.email;
        if (!studentEmail && booking.studentId === 'admin') {
          studentEmail = process.env.ADMIN_EMAIL || 'admin@cuvasoltutor.com';
        }
        if (studentEmail) {
          transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <noreply@cuvasoltutor.com>',
            to: studentEmail,
            subject: `Action Required: Reschedule Requested by Tutor ${booking.tutorName}`,
            text: `Hello ${booking.studentName},\n\nTutor ${booking.tutorName} has requested to reschedule your ${booking.subject} class from "${booking.timing}" to "${requestedTiming}".\n\nReason: ${reason || 'No reason specified.'}\n\nPlease log in to your dashboard to Accept or Decline this request:\n${frontendUrl}/dashboard/student\n\nBest regards,\nCuvasol Tutor Team`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
                <h2 style="color: #2563eb; text-align: center;">Class Reschedule Requested by Tutor</h2>
                <p>Hello <strong>${booking.studentName}</strong>,</p>
                <p>Tutor <strong>${booking.tutorName}</strong> has requested to reschedule your <strong>${booking.subject}</strong> session.</p>
                <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; border: 1px solid #bfdbfe; margin: 20px 0;">
                  <p style="margin: 0 0 8px 0;"><strong>Original Timing:</strong> <span style="text-decoration: line-through; color: #64748b;">${booking.timing}</span></p>
                  <p style="margin: 0 0 8px 0;"><strong>Requested New Timing:</strong> <span style="color: #2563eb; font-weight: bold;">${requestedTiming}</span></p>
                  <p style="margin: 0;"><strong>Reason:</strong> ${reason || 'No reason provided.'}</p>
                </div>
                <p>Please log in to your <a href="${frontendUrl}/dashboard/student" style="color: #2563eb; font-weight: bold;">Student Dashboard</a> to Accept or Decline this request.</p>
                <p>Best regards,<br/>Cuvasol Tutor Team</p>
              </div>
            `
          }).catch(err => console.error('[Reschedule Email] Error sending to student:', err.message));
        }
      }
    } catch (mailErr) {
      console.error('[Reschedule Email] Error processing notification:', mailErr.message);
    }

    res.json({ message: 'Reschedule request submitted successfully', booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm or Decline a Reschedule Request
router.post('/booking/:bookingId/reschedule-confirm', async (req, res) => {
  try {
    const { action, declinedReason, confirmedBy } = req.body;
    if (!['approve', 'decline'].includes(action)) {
      return res.status(400).json({ message: 'Action must be either "approve" or "decline"' });
    }

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (!booking.rescheduleRequest || booking.rescheduleRequest.status !== 'pending') {
      return res.status(400).json({ message: 'No pending reschedule request found for this booking' });
    }

    const originalTiming = booking.timing;
    const requestedTiming = booking.rescheduleRequest.requestedTiming;
    const requestedUtcTiming = booking.rescheduleRequest.requestedUtcTiming;
    const requestedByRole = booking.rescheduleRequest.requestedBy;

    const frontendUrl = getFrontendUrl(req);
    const tutor = await Tutor.findById(booking.tutorId);
    const tutorUser = tutor?.userId ? await User.findById(tutor.userId) : null;
    const studentUser = /^[0-9a-fA-F]{24}$/.test(booking.studentId) ? await User.findById(booking.studentId) : null;
    let studentEmail = studentUser?.email;
    if (!studentEmail && booking.studentId === 'admin') {
      studentEmail = process.env.ADMIN_EMAIL || 'admin@cuvasoltutor.com';
    }

    if (action === 'approve') {
      // Re-verify schedule conflict
      const conflict = await checkTutorScheduleConflict(booking.tutorId, requestedTiming, null, false, requestedUtcTiming, booking._id);
      if (conflict) {
        return res.status(400).json({ message: `Schedule conflict detected at ${requestedTiming}. Cannot approve.` });
      }

      booking.timing = requestedTiming;
      if (requestedUtcTiming) {
        booking.utcTiming = requestedUtcTiming;
      }
      booking.rescheduledAt = new Date();
      booking.rescheduledBy = requestedByRole;
      booking.rescheduleRequest.status = 'approved';
      if (booking.status === 'pending') {
        booking.status = 'confirmed';
      }

      await booking.save();
      console.log(`[Reschedule] Booking ID ${booking._id} approved to ${requestedTiming}`);

      // Send confirmation emails
      try {
        if (requestedByRole === 'Student') {
          // Send approval confirmation to Student
          if (studentEmail) {
            transporter.sendMail({
              from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <noreply@cuvasoltutor.com>',
              to: studentEmail,
              subject: `Reschedule Confirmed: ${booking.subject} with ${booking.tutorName}`,
              text: `Hello ${booking.studentName},\n\nGreat news! Tutor ${booking.tutorName} has APPROVED your reschedule request for ${booking.subject}.\n\nNew Class Timing: ${booking.timing}\nOriginal Timing: ${originalTiming}\nMeeting Room Link: ${booking.meetingLink || 'Available on your dashboard'}\n\nBest regards,\nCuvasol Tutor Team`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
                  <h2 style="color: #059669; text-align: center;">Reschedule Request Approved!</h2>
                  <p>Hello <strong>${booking.studentName}</strong>,</p>
                  <p>Great news! Tutor <strong>${booking.tutorName}</strong> has approved your reschedule request for <strong>${booking.subject}</strong>.</p>
                  <div style="background-color: #f0fdf4; padding: 15px; border-radius: 6px; border: 1px solid #bbf7d0; margin: 20px 0;">
                    <p style="margin: 0 0 8px 0;"><strong>New Class Timing:</strong> <span style="color: #059669; font-weight: bold; font-size: 16px;">${booking.timing}</span></p>
                    <p style="margin: 0;"><strong>Previous Timing:</strong> <span style="text-decoration: line-through; color: #64748b;">${originalTiming}</span></p>
                  </div>
                  <p>You can join your class at the new time directly from your <a href="${frontendUrl}/dashboard/student" style="color: #059669; font-weight: bold;">Student Dashboard</a>.</p>
                  <p>Best regards,<br/>Cuvasol Tutor Team</p>
                </div>
              `
            }).catch(err => console.error('[Reschedule Email] Error notifying student:', err.message));
          }
        } else {
          // Send approval confirmation to Tutor
          if (tutorUser && tutorUser.email) {
            transporter.sendMail({
              from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <noreply@cuvasoltutor.com>',
              to: tutorUser.email,
              subject: `Reschedule Confirmed: ${booking.subject} with ${booking.studentName}`,
              text: `Hello ${tutor.name},\n\nStudent ${booking.studentName} has APPROVED your reschedule request for ${booking.subject}.\n\nNew Class Timing: ${booking.timing}\nOriginal Timing: ${originalTiming}\n\nBest regards,\nCuvasol Tutor Team`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
                  <h2 style="color: #059669; text-align: center;">Reschedule Request Approved!</h2>
                  <p>Hello <strong>${tutor.name}</strong>,</p>
                  <p>Student <strong>${booking.studentName}</strong> has accepted your reschedule request for <strong>${booking.subject}</strong>.</p>
                  <div style="background-color: #f0fdf4; padding: 15px; border-radius: 6px; border: 1px solid #bbf7d0; margin: 20px 0;">
                    <p style="margin: 0 0 8px 0;"><strong>New Class Timing:</strong> <span style="color: #059669; font-weight: bold; font-size: 16px;">${booking.timing}</span></p>
                    <p style="margin: 0;"><strong>Previous Timing:</strong> <span style="text-decoration: line-through; color: #64748b;">${originalTiming}</span></p>
                  </div>
                  <p>You can view your updated calendar on your <a href="${frontendUrl}/dashboard/tutor" style="color: #059669; font-weight: bold;">Tutor Dashboard</a>.</p>
                  <p>Best regards,<br/>Cuvasol Tutor Team</p>
                </div>
              `
            }).catch(err => console.error('[Reschedule Email] Error notifying tutor:', err.message));
          }
        }
      } catch (mailErr) {
        console.error('[Reschedule Email] Error:', mailErr.message);
      }

      return res.json({ message: 'Reschedule request approved successfully', booking });
    } else {
      // Decline action
      booking.rescheduleRequest.status = 'declined';
      booking.rescheduleRequest.declinedReason = declinedReason || 'No reason provided';
      await booking.save();
      console.log(`[Reschedule] Booking ID ${booking._id} reschedule declined`);

      // Send decline notification emails
      try {
        if (requestedByRole === 'Student') {
          if (studentEmail) {
            transporter.sendMail({
              from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <noreply@cuvasoltutor.com>',
              to: studentEmail,
              subject: `Reschedule Request Declined: ${booking.subject}`,
              text: `Hello ${booking.studentName},\n\nTutor ${booking.tutorName} was unable to accept your reschedule request for ${requestedTiming}.\n${declinedReason ? `Reason: ${declinedReason}\n` : ''}\nYour class remains scheduled for the original timing: ${booking.timing}.\n\nBest regards,\nCuvasol Tutor Team`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
                  <h2 style="color: #dc2626; text-align: center;">Reschedule Request Declined</h2>
                  <p>Hello <strong>${booking.studentName}</strong>,</p>
                  <p>Tutor <strong>${booking.tutorName}</strong> was unable to accept your reschedule request for <strong>${requestedTiming}</strong>.</p>
                  ${declinedReason ? `<p><strong>Reason:</strong> ${declinedReason}</p>` : ''}
                  <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; border: 1px solid #fecaca; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Active Class Timing:</strong> <span style="color: #dc2626; font-weight: bold;">${booking.timing}</span> (Unchanged)</p>
                  </div>
                  <p>Your session remains active at the original time. Please visit your <a href="${frontendUrl}/dashboard/student">Student Dashboard</a> to manage or join.</p>
                  <p>Best regards,<br/>Cuvasol Tutor Team</p>
                </div>
              `
            }).catch(err => console.error('[Reschedule Email] Error:', err.message));
          }
        } else {
          if (tutorUser && tutorUser.email) {
            transporter.sendMail({
              from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <noreply@cuvasoltutor.com>',
              to: tutorUser.email,
              subject: `Reschedule Request Declined by Student: ${booking.subject}`,
              text: `Hello ${tutor.name},\n\nStudent ${booking.studentName} was unable to accept your reschedule request for ${requestedTiming}.\n${declinedReason ? `Reason: ${declinedReason}\n` : ''}\nThe class remains scheduled for the original timing: ${booking.timing}.\n\nBest regards,\nCuvasol Tutor Team`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
                  <h2 style="color: #dc2626; text-align: center;">Reschedule Request Declined</h2>
                  <p>Hello <strong>${tutor.name}</strong>,</p>
                  <p>Student <strong>${booking.studentName}</strong> was unable to accept your reschedule request for <strong>${requestedTiming}</strong>.</p>
                  ${declinedReason ? `<p><strong>Reason:</strong> ${declinedReason}</p>` : ''}
                  <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; border: 1px solid #fecaca; margin: 20px 0;">
                    <p style="margin: 0;"><strong>Active Class Timing:</strong> <span style="color: #dc2626; font-weight: bold;">${booking.timing}</span> (Unchanged)</p>
                  </div>
                  <p>The session remains active at the original time. Please visit your <a href="${frontendUrl}/dashboard/tutor">Tutor Dashboard</a>.</p>
                  <p>Best regards,<br/>Cuvasol Tutor Team</p>
                </div>
              `
            }).catch(err => console.error('[Reschedule Email] Error:', err.message));
          }
        }
      } catch (mailErr) {
        console.error('[Reschedule Email] Error:', mailErr.message);
      }

      return res.json({ message: 'Reschedule request declined', booking });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin direct reschedule endpoint
router.post('/booking/:bookingId/admin-reschedule', async (req, res) => {
  try {
    const { requestedTiming, requestedUtcTiming, reason } = req.body;
    if (!requestedTiming) {
      return res.status(400).json({ message: 'Requested timing is required' });
    }

    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const tutor = await Tutor.findById(booking.tutorId);
    if (!tutor) return res.status(404).json({ message: 'Tutor not found for this booking' });

    // Validate tutor availability (unless explicit admin override requested)
    if (!req.body.overrideAvailability) {
      const availabilityCheck = validateTutorAvailability(tutor, requestedTiming, requestedUtcTiming);
      if (!availabilityCheck.valid) {
        return res.status(400).json({ message: availabilityCheck.message });
      }
    }

    // Check for tutor schedule conflicts (unless explicit conflict override requested)
    const conflict = await checkTutorScheduleConflict(booking.tutorId, requestedTiming, null, false, requestedUtcTiming, booking._id);
    if (conflict && !req.body.overrideConflict) {
      return res.status(400).json({ message: `The tutor already has another scheduled session at ${requestedTiming}.` });
    }

    const oldTiming = booking.timing;
    booking.timing = requestedTiming;
    if (requestedUtcTiming) {
      booking.utcTiming = new Date(requestedUtcTiming);
    }
    booking.rescheduledAt = new Date();
    booking.rescheduledBy = 'Admin';
    if (booking.rescheduleRequest) {
      booking.rescheduleRequest.status = 'approved';
      booking.rescheduleRequest.requestedTiming = requestedTiming;
      booking.rescheduleRequest.requestedUtcTiming = requestedUtcTiming ? new Date(requestedUtcTiming) : undefined;
    }

    await booking.save();
    console.log(`[Admin Reschedule] Booking ID ${booking._id} rescheduled by Admin to ${requestedTiming}`);

    // Notify tutor and student
    try {
      const frontendUrl = getFrontendUrl(req);
      const tutor = await Tutor.findById(booking.tutorId);
      const tutorUser = tutor?.userId ? await User.findById(tutor.userId) : null;
      const studentUser = /^[0-9a-fA-F]{24}$/.test(booking.studentId) ? await User.findById(booking.studentId) : null;
      let studentEmail = studentUser?.email;

      if (tutorUser && tutorUser.email) {
        transporter.sendMail({
          from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <noreply@cuvasoltutor.com>',
          to: tutorUser.email,
          subject: `Class Rescheduled by Administrator: ${booking.subject}`,
          text: `Hello ${tutor.name},\n\nOur administrator has rescheduled the ${booking.subject} class with ${booking.studentName} to ${requestedTiming} (Previous: ${oldTiming}).\n${reason ? `Reason: ${reason}\n` : ''}\nBest regards,\nCuvasol Tutor Team`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
              <h2 style="color: #7c3aed; text-align: center;">Class Rescheduled by Administrator</h2>
              <p>Hello <strong>${tutor.name}</strong>,</p>
              <p>Our platform administrator has rescheduled your <strong>${booking.subject}</strong> session with <strong>${booking.studentName}</strong>.</p>
              <div style="background-color: #f5f3ff; padding: 15px; border-radius: 6px; border: 1px solid #ddd6fe; margin: 20px 0;">
                <p style="margin: 0 0 8px 0;"><strong>New Class Timing:</strong> <span style="color: #7c3aed; font-weight: bold;">${requestedTiming}</span></p>
                <p style="margin: 0 0 8px 0;"><strong>Previous Timing:</strong> <span style="text-decoration: line-through; color: #64748b;">${oldTiming}</span></p>
                ${reason ? `<p style="margin: 0;"><strong>Notes:</strong> ${reason}</p>` : ''}
              </div>
              <p>Please visit your <a href="${frontendUrl}/dashboard/tutor" style="color: #7c3aed; font-weight: bold;">Tutor Dashboard</a> to view your updated schedule.</p>
              <p>Best regards,<br/>Cuvasol Tutor Team</p>
            </div>
          `
        }).catch(err => console.error('[Admin Reschedule Email] Tutor error:', err.message));
      }

      if (studentEmail) {
        transporter.sendMail({
          from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <noreply@cuvasoltutor.com>',
          to: studentEmail,
          subject: `Class Rescheduled by Administrator: ${booking.subject}`,
          text: `Hello ${booking.studentName},\n\nOur administrator has rescheduled your ${booking.subject} class with tutor ${booking.tutorName} to ${requestedTiming} (Previous: ${oldTiming}).\n${reason ? `Reason: ${reason}\n` : ''}\nBest regards,\nCuvasol Tutor Team`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
              <h2 style="color: #7c3aed; text-align: center;">Class Rescheduled by Administrator</h2>
              <p>Hello <strong>${booking.studentName}</strong>,</p>
              <p>Our platform administrator has rescheduled your <strong>${booking.subject}</strong> session with tutor <strong>${booking.tutorName}</strong>.</p>
              <div style="background-color: #f5f3ff; padding: 15px; border-radius: 6px; border: 1px solid #ddd6fe; margin: 20px 0;">
                <p style="margin: 0 0 8px 0;"><strong>New Class Timing:</strong> <span style="color: #7c3aed; font-weight: bold;">${requestedTiming}</span></p>
                <p style="margin: 0 0 8px 0;"><strong>Previous Timing:</strong> <span style="text-decoration: line-through; color: #64748b;">${oldTiming}</span></p>
                ${reason ? `<p style="margin: 0;"><strong>Notes:</strong> ${reason}</p>` : ''}
              </div>
              <p>Please visit your <a href="${frontendUrl}/dashboard/student" style="color: #7c3aed; font-weight: bold;">Student Dashboard</a> to join at the new time.</p>
              <p>Best regards,<br/>Cuvasol Tutor Team</p>
            </div>
          `
        }).catch(err => console.error('[Admin Reschedule Email] Student error:', err.message));
      }
    } catch (mailErr) {
      console.error('[Admin Reschedule Email] Error:', mailErr.message);
    }

    res.json({ message: 'Class rescheduled successfully by administrator', booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mock Payment for Enrollment
router.put('/booking/:bookingId/pay', async (req, res) => {
  try {
    const { planType, amountPaid } = req.body;
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    // We also allow status 'confirmed' in case they want to enroll directly before completion, or we just enforce 'completed'
    // Actually let's allow any non-cancelled/rejected status
    if (booking.status === 'cancelled' || booking.status === 'rejected') {
      return res.status(400).json({ message: 'Cannot enroll for cancelled/rejected booking' });
    }

    booking.status = 'enrolled';
    booking.planType = planType;
    booking.amountPaid = amountPaid;
    if (!booking.meetingLink) {
      const tutor = await Tutor.findById(booking.tutorId);
      booking.meetingLink = await generateMeetingLinkForBooking({
        tutor,
        studentId: booking.studentId,
        subject: booking.subject,
        timing: booking.timing,
        utcTiming: booking.utcTiming,
        fallbackJitsiPrefix: `cuvasol-tutor-class-${booking._id}`
      });
    }
    await booking.save();
    res.json({ message: 'Payment successful, enrolled in course!', booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update individual session status within a monthly pack booking
router.put('/booking/:bookingId/session/:sessionIdx/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['scheduled', 'completed', 'cancelled'].includes(status)) {
       return res.status(400).json({ message: 'Invalid session status' });
    }
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    const idx = parseInt(req.params.sessionIdx, 10);
    if (isNaN(idx) || !booking.sessions || idx < 0 || idx >= booking.sessions.length) {
      return res.status(400).json({ message: 'Invalid session index' });
    }
    
    booking.sessions[idx].status = status;
    await booking.save();

    if (status === 'completed') {
      await rewardReferrerOnClassCompletion(booking);
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Group member approval and payment
router.post('/booking/:bookingId/approve', async (req, res) => {
  try {
    const { email, action } = req.body;
    const booking = await Booking.findById(req.params.bookingId);
    
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (!booking.groupDetails || !booking.groupDetails.isGroup) {
      return res.status(400).json({ message: 'This is not a group booking' });
    }

    const invitedStudent = booking.groupDetails.invitedEmails.find(inv => inv.email === email);
    if (!invitedStudent) {
      return res.status(404).json({ message: 'Email not found in invitation list' });
    }

    if (action === 'approve') {
      invitedStudent.status = 'approved';
      invitedStudent.paidShare = true; // Simulating payment during approval
    } else if (action === 'decline') {
      invitedStudent.status = 'declined';
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    // Check overall status
    const allApproved = booking.groupDetails.invitedEmails.every(inv => inv.status === 'approved');
    const anyDeclined = booking.groupDetails.invitedEmails.some(inv => inv.status === 'declined');

    if (anyDeclined) {
      booking.status = 'cancelled';
      booking.cancelledBy = 'Student';
      booking.cancellationReason = `Declined by group participant: ${email}`;
      booking.cancelledAt = new Date();
    } else if (allApproved) {
      booking.status = 'enrolled';
    }
    if (booking.status === 'enrolled' && !booking.meetingLink) {
      const tutor = await Tutor.findById(booking.tutorId);
      booking.meetingLink = await generateMeetingLinkForBooking({
        tutor,
        studentId: booking.studentId,
        subject: booking.subject,
        timing: booking.timing,
        utcTiming: booking.utcTiming,
        fallbackJitsiPrefix: `cuvasol-tutor-class-${booking._id}`
      });
    }
    await booking.save();

    res.json({ message: `Successfully ${action}d the booking`, booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin can update approval status, featured flag, and verification badge status
router.put('/:id/admin', async (req, res) => {
  try {
    const { status, featured, rejectionReason, isVerified } = req.body;
    const updateData = {};
    if (status) {
      updateData.status = status;
      if (status === 'approved') {
        updateData.rejectionReason = '';
      }
    }
    if (featured !== undefined) updateData.featured = featured;
    if (rejectionReason !== undefined) updateData.rejectionReason = rejectionReason;
    if (isVerified !== undefined) updateData.isVerified = isVerified;

    const tutor = await Tutor.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('userId', 'email phone avatar');
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });
    
    // If tutor is approved, send email
    if (status === 'approved' && tutor.userId && tutor.userId.email) {
      try {
        console.log(`[Admin Approval] Attempting to notify tutor of approval: ${tutor.userId.email}`);
        transporter.sendMail({
          from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <noreply@cuvasoltutor.com>',
          to: tutor.userId.email,
          subject: 'Tutor Profile Approved!',
          text: `Hello ${tutor.name},\n\nCongratulations! Your tutor profile on Cuvasol Tutor has been approved by the administrator.\n\nYou can now log in to your dashboard to set your availability slots, manage bookings, and start teaching!\n\nAccess your onboarding guide: ${getFrontendUrl(req)}/tutor/welcome\n\nBest regards,\nCuvasol Tutor Team`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
              <h2 style="color: #059669; text-align: center;">Tutor Profile Approved!</h2>
              <p>Hello <strong>${tutor.name}</strong>,</p>
              <p>Congratulations! Your tutor profile on <strong>Cuvasol Tutor</strong> has been reviewed and <strong>approved</strong> by our administrator.</p>
              <p>You can now log in to your dashboard to:</p>
              <ul style="line-height: 1.6;">
                <li>Set up your teaching availability slots</li>
                <li>Customize your pricing, subjects, and bio</li>
                <li>Manage class bookings and interact with students</li>
              </ul>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${getFrontendUrl(req)}/tutor/welcome" 
                   style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Go to Tutor Dashboard
                </a>
              </div>
              <p style="color: #555;">If you have any questions or need assistance setting up your profile, feel free to reply to this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #999; text-align: center;">
                Best regards,<br/>
                <strong>Cuvasol Tutor Team</strong>
              </p>
            </div>
          `
        }).then(() => {
          console.log(`[Admin Approval] Tutor approval email sent to: ${tutor.userId.email}`);
        }).catch((mailError) => {
          console.error('[Admin Approval] Failed to send tutor approval email:', mailError.message);
        });
      } catch (mailError) {
        console.error('[Admin Approval] Failed to send tutor approval email:', mailError.message);
      }
    } else if (status === 'rejected' && tutor.userId && tutor.userId.email) {
      try {
        console.log(`[Admin Rejection] Attempting to notify tutor of rejection: ${tutor.userId.email}`);
        transporter.sendMail({
          from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <noreply@cuvasoltutor.com>',
          to: tutor.userId.email,
          subject: 'Tutor Profile Application Update',
          text: `Hello ${tutor.name},\n\nThank you for your interest in joining Cuvasol Tutor.\n\nUnfortunately, your tutor profile application has not been approved by the administrator at this time. Reason:\n${tutor.rejectionReason || 'Incomplete verification documents or profile guidelines'}\n\nYou can log in to your dashboard to update your profile details and re-submit them for review at any time.\n\nAccess your dashboard: ${getFrontendUrl(req)}/dashboard/tutor\n\nBest regards,\nCuvasol Tutor Team`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
              <h2 style="color: #dc2626; text-align: center;">Tutor Profile Update</h2>
              <p>Hello <strong>${tutor.name}</strong>,</p>
              <p>Thank you for your interest in joining <strong>Cuvasol Tutor</strong>.</p>
              <p>Unfortunately, your tutor profile application has not been approved by the administrator at this time.</p>
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 6px;">
                <p style="margin: 0; font-weight: bold; color: #991b1b; font-size: 14px;">Reason for rejection:</p>
                <p style="margin: 6px 0 0 0; color: #7f1d1d; font-size: 14px; white-space: pre-wrap; line-height: 1.5;">${tutor.rejectionReason || 'Verification documents or profile guidelines did not meet our requirements.'}</p>
              </div>
              <p><strong>The good news:</strong> You can easily update your details and re-submit your profile! Simply log in to your dashboard to make corrections and upload valid documents.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${getFrontendUrl(req)}/dashboard/tutor" 
                   style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Update & Re-submit Profile
                </a>
              </div>
              <p style="color: #555;">If you have any questions or would like to clarify your application status, please reply to this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #999; text-align: center;">
                Best regards,<br/>
                <strong>Cuvasol Tutor Team</strong>
              </p>
            </div>
          `
        }).then(() => {
          console.log(`[Admin Rejection] Tutor rejection email sent to: ${tutor.userId.email}`);
        }).catch((mailError) => {
          console.error('[Admin Rejection] Failed to send tutor rejection email:', mailError.message);
        });
      } catch (mailError) {
        console.error('[Admin Rejection] Failed to send tutor rejection email:', mailError.message);
      }
    }

    // Transform _id to id
    const obj = tutor.toObject();
    obj.id = obj._id.toString();
    if (obj.userId) {
      obj.email = obj.userId.email;
      obj.phone = obj.userId.phone;
      obj.avatar = obj.userId.avatar;
    }
    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: 'Error updating tutor', error: error.message });
  }
});

// Tutor can update their profile details
router.put('/:id/profile', async (req, res) => {
  try {
    const { bio, qualification, experience, hourlyRate, category, subjects, photo, verificationDocument, subjectRates, address, googleMapsUrl, timezone, classesTaught, boardsTaught, workExperience, mode } = req.body;
    const updateData = {};
    if (bio !== undefined) updateData.bio = bio;
    if (qualification !== undefined) updateData.qualification = qualification;
    if (experience !== undefined) updateData.experience = experience;
    if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate;
    if (category !== undefined) updateData.category = category;
    if (subjects !== undefined) updateData.subjects = subjects;
    if (photo !== undefined) updateData.photo = photo;
    if (verificationDocument !== undefined) updateData.verificationDocument = verificationDocument;

    // Fetch the current tutor profile to check status
    const currentTutor = await Tutor.findById(req.params.id);
    if (!currentTutor) return res.status(404).json({ message: 'Tutor not found' });

    // If the tutor was previously rejected, updating their profile automatically re-submits it for review
    if (currentTutor.status === 'rejected') {
      currentTutor.status = 'pending';
      currentTutor.rejectionReason = '';
    }

    if (bio !== undefined) currentTutor.bio = bio;
    if (qualification !== undefined) currentTutor.qualification = qualification;
    if (experience !== undefined) currentTutor.experience = experience;
    if (address !== undefined) currentTutor.address = address;
    if (mode !== undefined) currentTutor.mode = mode;
    if (classesTaught !== undefined) currentTutor.classesTaught = classesTaught;
    if (boardsTaught !== undefined) currentTutor.boardsTaught = boardsTaught;
    if (workExperience !== undefined) currentTutor.workExperience = workExperience;
    if (googleMapsUrl !== undefined) {
      const { expandGoogleMapsUrl } = require('../utils/urlHelper');
      currentTutor.googleMapsUrl = await expandGoogleMapsUrl(googleMapsUrl);
    }
    
    // Update subjectRates / subjects
    if (subjectRates !== undefined) {
      currentTutor.subjectRates = subjectRates;
      currentTutor.subjects = subjectRates.map(sr => sr.subject);
      if (subjectRates.length > 0) {
        currentTutor.hourlyRate = Number(subjectRates[0].rate);
      }
    } else {
      // Fallback for legacy requests
      if (hourlyRate !== undefined || subjects !== undefined) {
        const finalSubjects = subjects !== undefined 
          ? (Array.isArray(subjects) ? subjects : String(subjects).split(",").map(s => s.trim()).filter(Boolean))
          : currentTutor.subjects;
          
        const rate = hourlyRate !== undefined ? Number(hourlyRate) : currentTutor.hourlyRate;
        
        currentTutor.subjectRates = finalSubjects.map(sub => {
          const existing = currentTutor.subjectRates.find(sr => sr.subject === sub);
          return {
            subject: sub,
            rate: existing ? existing.rate : rate
          };
        });
        currentTutor.subjects = finalSubjects;
        if (hourlyRate !== undefined) currentTutor.hourlyRate = Number(hourlyRate);
      }
    }

    if (category !== undefined) currentTutor.category = category;
    if (photo !== undefined) currentTutor.photo = photo;
    if (verificationDocument !== undefined) currentTutor.verificationDocument = verificationDocument;
    if (timezone !== undefined) currentTutor.timezone = timezone;

    await currentTutor.save();
    const tutor = await currentTutor.populate('userId', 'email phone avatar');
    
    const obj = tutor.toObject();
    obj.id = obj._id.toString();
    if (obj.userId) {
      obj.email = obj.userId.email;
      obj.phone = obj.userId.phone;
      obj.avatar = obj.userId.avatar;
    }
    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: 'Error updating tutor profile', error: error.message });
  }
});

// Tutor can update their payment / bank account details
router.put('/:id/payment-details', async (req, res) => {
  try {
    const { accountHolderName, bankName, accountNumber, ifscCode, accountType, upiId, isConfirmed } = req.body;

    if (!accountHolderName || !accountHolderName.trim()) {
      return res.status(400).json({ message: 'Account Holder Name is required' });
    }
    if (!bankName || !bankName.trim()) {
      return res.status(400).json({ message: 'Bank Name is required' });
    }
    if (!accountNumber || !accountNumber.trim()) {
      return res.status(400).json({ message: 'Bank Account Number is required' });
    }
    if (!ifscCode || !ifscCode.trim()) {
      return res.status(400).json({ message: 'IFSC Code is required' });
    }
    if (!isConfirmed) {
      return res.status(400).json({ message: 'Please confirm that the bank details provided are accurate and belong to you' });
    }

    const tutor = await Tutor.findById(req.params.id);
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    tutor.paymentDetails = {
      accountHolderName: accountHolderName.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      accountType: accountType || 'Savings Account',
      upiId: (upiId || '').trim(),
      isConfirmed: Boolean(isConfirmed),
      updatedAt: new Date()
    };

    await tutor.save();
    await tutor.populate('userId', 'email phone avatar');

    const obj = tutor.toObject();
    obj.id = obj._id.toString();
    if (obj.userId) {
      obj.email = obj.userId.email;
      obj.phone = obj.userId.phone;
      obj.avatar = obj.userId.avatar;
    }

    res.json({ message: 'Payment account details saved successfully!', tutor: obj });
  } catch (error) {
    console.error('[Tutor Payment Details] Error saving payment details:', error);
    res.status(500).json({ message: 'Error saving payment details', error: error.message });
  }
});

// Student rates a tutor
router.post('/:id/rate', async (req, res) => {
  try {
    const tutorId = req.params.id;
    const { bookingId, rating, reviewText, studentName } = req.body;

    if (!bookingId || !rating) {
      return res.status(400).json({ message: 'Booking ID and Rating are required' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.isRated) {
      return res.status(400).json({ message: 'This booking has already been rated' });
    }
    
    if (booking.tutorId.toString() !== tutorId) {
      return res.status(400).json({ message: 'Booking does not belong to this tutor' });
    }

    if (!['completed', 'enrolled'].includes(booking.status)) {
      return res.status(400).json({ message: 'Only completed or enrolled classes can be rated' });
    }

    const tutor = await Tutor.findById(tutorId);
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    // Mark booking as rated
    booking.isRated = true;
    await booking.save();

    // Add review to tutor
    tutor.reviews.push({
      studentName: studentName || booking.studentName,
      rating: Number(rating),
      reviewText,
      date: new Date()
    });

    // Calculate new average rating
    const currentRating = tutor.rating || 0;
    const currentReviewCount = tutor.reviewCount || 0;
    
    const newRating = ((currentRating * currentReviewCount) + Number(rating)) / (currentReviewCount + 1);
    
    tutor.rating = Number(newRating.toFixed(1));
    tutor.reviewCount = currentReviewCount + 1;

    await tutor.save();

    res.json({ message: 'Rating submitted successfully', tutor });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin can delete tutor and associated user
router.delete('/:id/admin', async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id);
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    // Delete the associated user
    if (tutor.userId) {
      await User.findByIdAndDelete(tutor.userId);
    }

    // Delete the tutor profile
    await Tutor.findByIdAndDelete(req.params.id);

    res.json({ message: 'Tutor and associated user account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting tutor', error: error.message });
  }
});

router.checkTutorScheduleConflict = checkTutorScheduleConflict;
router.getBookingSessionTimestamps = getBookingSessionTimestamps;
router.parseSessionToDate = parseSessionToDate;
router.validateTutorAvailability = validateTutorAvailability;

module.exports = router;

