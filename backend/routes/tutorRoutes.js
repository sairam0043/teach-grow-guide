const express = require('express');
const Tutor = require('../schemas/tutorSchema');
const User = require('../schemas/userSchema');
const Booking = require('../schemas/bookingSchema');
const nodemailer = require('nodemailer');

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

// Get all tutors
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.featured) filter.featured = req.query.featured === 'true';

    const tutors = await Tutor.find(filter);
    // Transform _id to id for frontend compatibility
    const formattedTutors = tutors.map(t => {
      const obj = t.toObject();
      obj.id = obj._id.toString();
      if (obj.demoSlots) {
        obj.demoSlots = obj.demoSlots.map(s => ({...s, id: s._id.toString()}));
      }
      return obj;
    });
    res.json(formattedTutors);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tutors', error: error.message });
  }
});

// Get a single tutor by database ID
router.get('/:id', async (req, res) => {
  try {
    const tutor = await Tutor.findById(req.params.id);
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });
    
    const obj = tutor.toObject();
    obj.id = obj._id.toString();
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
    const tutor = await Tutor.findOne({ userId: req.params.userId });
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });
    
    const obj = tutor.toObject();
    obj.id = obj._id.toString();
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
    const { timing, subject, studentId, studentName } = req.body;
    
    if (!timing) return res.status(400).json({ message: 'Timing is required' });
    if (!subject) return res.status(400).json({ message: 'Subject is required' });

    const tutor = await Tutor.findById(tutorId);
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    // Validate the timing actually exists in tutor's timings
    // The frontend sends format "Date at Time", so we extract the time part
    const timePart = timing.includes(' at ') ? timing.split(' at ')[1] : timing;
    
    const hasDynamicAvailability = tutor.availability && tutor.availability.length > 0;
    if (!hasDynamicAvailability && (!tutor.availableTimings || !tutor.availableTimings.includes(timePart))) {
      return res.status(400).json({ message: 'This slot is not available or does not exist.' });
    }

    // Check if the student already has a non-cancelled demo with this tutor (only 1 demo allowed)
    const existingDemo = await Booking.findOne({ 
      tutorId: tutor._id, 
      studentId,
      status: { $in: ['confirmed', 'completed', 'enrolled'] } 
    });
    if (existingDemo) {
       return res.status(400).json({ message: 'You have already booked a demo with this tutor.' });
    }

    // Create a booking record
    const newBooking = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing,
      subject,
      studentId: studentId || "anonymous_student",
      studentName: studentName || "Anonymous"
    });
    
    await newBooking.save();
    console.log(`[Booking] Demo session saved for student: ${studentName}`);
    
    // Notify Tutor
    try {
      const tutorUser = await User.findById(tutor.userId);
      if (tutorUser && tutorUser.email) {
        console.log(`[Booking] Attempting to notify tutor: ${tutorUser.email}`);
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <noreply@cuvasoltutor.com>',
          to: tutorUser.email,
          subject: 'New Demo Session Requested',
          text: `Hello ${tutor.name},\n\nStudent ${studentName} has requested a demo session for ${subject} at ${timing}.\n\nPlease check your dashboard for details.\n\nBest regards,\nCuvasol Tutor Team`,
          html: `<h3>New Demo Session Requested</h3><p>Hello <b>${tutor.name}</b>,</p><p>Student <b>${studentName}</b> has requested a demo session for <b>${subject}</b> at <b>${timing}</b>.</p><p>Please check your <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/dashboard/tutor">dashboard</a> for details.</p>`,
        });
        console.log(`[Booking] Tutor notification email sent to: ${tutorUser.email}`);
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

// Students can book a class directly (skip demo)
router.post('/:id/book-class', async (req, res) => {
  try {
    const tutorId = req.params.id;
    const { timing, subject, studentId, studentName, planType, amountPaid, otherStudentsEmails } = req.body;
    
    if (!timing) return res.status(400).json({ message: 'Timing is required' });
    if (!subject) return res.status(400).json({ message: 'Subject is required' });
    if (!planType || !amountPaid) return res.status(400).json({ message: 'Plan details are required' });

    const tutor = await Tutor.findById(tutorId);
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    const timePart = timing.includes(' at ') ? timing.split(' at ')[1] : timing;
    
    const hasDynamicAvailability = tutor.availability && tutor.availability.length > 0;
    if (!hasDynamicAvailability && (!tutor.availableTimings || !tutor.availableTimings.includes(timePart))) {
      return res.status(400).json({ message: 'This slot is not available or does not exist.' });
    }

    const isGroup = otherStudentsEmails && otherStudentsEmails.length > 0;
    
    // Direct booking means they're immediately enrolled, unless it's a group requiring approval
    const newBooking = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing,
      subject,
      studentId: studentId || "anonymous_student",
      studentName: studentName || "Anonymous",
      status: isGroup ? 'pending' : 'enrolled',
      planType,
      amountPaid,
      groupDetails: isGroup ? {
        isGroup: true,
        invitedEmails: otherStudentsEmails.map(email => ({ email, status: 'pending', paidShare: false }))
      } : undefined
    });
    
    await newBooking.save();

    if (isGroup) {
      // Send emails to invited students
      let frontendUrl = req.headers.origin;
      if (!frontendUrl || frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1')) {
        if (process.env.FRONTEND_URL) {
          frontendUrl = process.env.FRONTEND_URL.split(',').pop().replace(/["']/g, '');
        } else {
          frontendUrl = 'http://localhost:8080';
        }
      }
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

    // Notify Tutor of the new class booking
    try {
      const tutorUser = await User.findById(tutor.userId);
      if (tutorUser && tutorUser.email) {
        console.log(`[Booking] Attempting to notify tutor: ${tutorUser.email}`);
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <noreply@cuvasoltutor.com>',
          to: tutorUser.email,
          subject: isGroup ? 'New Group Class Booking' : 'New Class Booking',
          text: `Hello ${tutor.name},\n\nA new class has been booked by ${studentName} for ${subject} at ${timing}.\n\nType: ${isGroup ? 'Group Class' : 'Individual Class'}\nPlan: ${planType}\n\nPlease check your dashboard for details.\n\nBest regards,\nCuvasol Tutor Team`,
          html: `<h3>New Class Booking</h3><p>Hello <b>${tutor.name}</b>,</p><p>A new class has been booked by <b>${studentName}</b> for <b>${subject}</b> at <b>${timing}</b>.</p><p><b>Type:</b> ${isGroup ? 'Group Class' : 'Individual Class'}<br><b>Plan:</b> ${planType}</p><p>Please check your <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/dashboard/tutor">dashboard</a> for details.</p>`,
        });
        console.log(`[Booking] Tutor notification email sent to: ${tutorUser.email}`);
      }
    } catch (mailError) {
      console.error('[Booking] Failed to send tutor notification:', mailError.message);
    }

    res.status(200).json({ message: 'Class booked successfully', booking: newBooking });
  } catch (error) {
    res.status(500).json({ message: 'Error booking class', error: error.message });
  }
});

// Get student's bookings for a specific tutor
router.get('/:id/bookings/student/:studentId', async (req, res) => {
  try {
    const bookings = await Booking.find({ tutorId: req.params.id, studentId: req.params.studentId });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update booking status
router.put('/booking/:bookingId/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['confirmed', 'cancelled', 'rejected', 'completed', 'enrolled'].includes(status)) {
       return res.status(400).json({ message: 'Invalid status' });
    }
    const booking = await Booking.findByIdAndUpdate(req.params.bookingId, { status }, { new: true });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
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
    
    await booking.save();
    res.json({ message: 'Payment successful, enrolled in course!', booking });
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
    } else if (allApproved) {
      booking.status = 'enrolled';
    }

    await booking.save();

    res.json({ message: `Successfully ${action}d the booking`, booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin can update approval status and featured flag
router.put('/:id/admin', async (req, res) => {
  try {
    const { status, featured } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (featured !== undefined) updateData.featured = featured;

    const tutor = await Tutor.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });
    
    // Transform _id to id
    const obj = tutor.toObject();
    obj.id = obj._id.toString();
    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: 'Error updating tutor', error: error.message });
  }
});

// Tutor can update their profile details
router.put('/:id/profile', async (req, res) => {
  try {
    const { bio, qualification, experience, hourlyRate, category, subjects } = req.body;
    const updateData = {};
    if (bio !== undefined) updateData.bio = bio;
    if (qualification !== undefined) updateData.qualification = qualification;
    if (experience !== undefined) updateData.experience = experience;
    if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate;
    if (category !== undefined) updateData.category = category;
    if (subjects !== undefined) updateData.subjects = subjects;

    const tutor = await Tutor.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });
    
    const obj = tutor.toObject();
    obj.id = obj._id.toString();
    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: 'Error updating tutor profile', error: error.message });
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

module.exports = router;
