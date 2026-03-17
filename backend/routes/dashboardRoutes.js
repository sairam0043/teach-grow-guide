const express = require('express');
const router = express.Router();
const User = require('../schemas/userSchema');
const Tutor = require('../schemas/tutorSchema');
const Booking = require('../schemas/bookingSchema');

// /api/dashboard/admin
router.get('/admin', async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const pendingTutors = await Tutor.countDocuments({ status: 'pending' });
    const activeTutors = await Tutor.countDocuments({ status: 'approved' });
    const totalBookings = await Booking.countDocuments();
    // Simulate revenue just for metrics demo (in thousands)
    const totalRevenue = totalBookings * 500; 

    res.json({
      pendingApprovals: pendingTutors,
      activeTutors,
      totalStudents,
      totalBookings,
      totalRevenue
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

    res.json({
      demoRequests,
      activeStudents: totalStudents.length,
      upcomingClasses,
      totalEarnings: demoRequests * tutor.hourlyRate,
      availableTimings
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update specific tutor's timings
router.put('/tutor/:tutorId/timings', async (req, res) => {
  try {
    const { availableTimings } = req.body;
    const tutor = await Tutor.findByIdAndUpdate(
      req.params.tutorId,
      { availableTimings },
      { new: true }
    );
    res.json({ availableTimings: tutor.availableTimings });
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

module.exports = router;
