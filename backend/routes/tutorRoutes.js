const express = require('express');
const Tutor = require('../schemas/tutorSchema');
const Booking = require('../schemas/bookingSchema');

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
    const { timing, studentId, studentName } = req.body;
    
    if (!timing) return res.status(400).json({ message: 'Timing is required' });

    const tutor = await Tutor.findById(tutorId);
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    // Validate the timing actually exists in tutor's timings
    if (!tutor.availableTimings || !tutor.availableTimings.includes(timing)) {
      return res.status(400).json({ message: 'This slot is not available or does not exist.' });
    }

    // Check if the student already booked this exact slot to prevent duplicates (optional but good)
    const existing = await Booking.findOne({ tutorId: tutor._id, timing, studentId });
    if (existing) {
       return res.status(400).json({ message: 'You have already booked this slot.' });
    }

    // Create a booking record
    const newBooking = new Booking({
      tutorId: tutor._id,
      tutorName: tutor.name,
      timing,
      studentId: studentId || "anonymous_student",
      studentName: studentName || "Anonymous"
    });
    
    await newBooking.save();

    res.status(200).json({ message: 'Session booked successfully', booking: newBooking });
  } catch (error) {
    res.status(500).json({ message: 'Error booking session', error: error.message });
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
    if (!['confirmed', 'cancelled', 'rejected'].includes(status)) {
       return res.status(400).json({ message: 'Invalid status' });
    }
    const booking = await Booking.findByIdAndUpdate(req.params.bookingId, { status }, { new: true });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
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

module.exports = router;
