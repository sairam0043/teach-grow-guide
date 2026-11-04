const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Attendance = require('../schemas/attendanceSchema');
const Booking = require('../schemas/bookingSchema');
const User = require('../schemas/userSchema');
const Tutor = require('../schemas/tutorSchema');

// 1. Get all attendance records for a tutor's students
router.get('/tutor/:tutorId', async (req, res) => {
  try {
    const { tutorId } = req.params;
    const { studentId, bookingId } = req.query;

    const query = { tutorId };
    if (studentId) query.studentId = studentId;
    if (bookingId) query.bookingId = bookingId;

    const records = await Attendance.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json(records);
  } catch (err) {
    console.error('[Attendance] Tutor records fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Get registered students for a tutor with their attendance stats & booked classes
router.get('/tutor/:tutorId/registered-students', async (req, res) => {
  try {
    const { tutorId } = req.params;

    // Find all bookings for this tutor
    const bookings = await Booking.find({ tutorId })
      .select('_id studentId studentName timing utcTiming subject status planType sessions createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const studentMap = new Map();

    for (const b of bookings) {
      const sId = b.studentId ? b.studentId.toString().trim() : '';
      if (!sId || sId === 'anonymous_student') continue;

      if (!studentMap.has(sId)) {
        studentMap.set(sId, {
          studentId: sId,
          studentName: b.studentName || 'Student',
          studentEmail: '',
          studentPhone: '',
          studentClass: '',
          avatar: '',
          subjects: new Set(),
          bookings: [],
          totalClassesConducted: 0,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          excusedCount: 0,
          attendanceRate: 100
        });
      }

      const entry = studentMap.get(sId);
      if (b.subject) entry.subjects.add(b.subject);
      entry.bookings.push({
        _id: b._id,
        subject: b.subject,
        timing: b.timing,
        utcTiming: b.utcTiming,
        status: b.status,
        planType: b.planType,
        sessions: b.sessions || []
      });
    }

    // Enrich with User details if available
    const studentIds = Array.from(studentMap.keys());
    const validObjectIds = studentIds.filter(id => /^[0-9a-fA-F]{24}$/.test(id));
    if (validObjectIds.length > 0) {
      const users = await User.find({ _id: { $in: validObjectIds } })
        .select('full_name email phone student_name student_class avatar')
        .lean();

      for (const u of users) {
        const uId = u._id.toString();
        if (studentMap.has(uId)) {
          const entry = studentMap.get(uId);
          entry.studentName = u.student_name || u.full_name || entry.studentName;
          entry.studentEmail = u.email || '';
          entry.studentPhone = u.phone || '';
          entry.studentClass = u.student_class || '';
          entry.avatar = u.avatar || '';
        }
      }
    }

    // Calculate attendance metrics from Attendance collection
    const attendanceRecords = await Attendance.find({ tutorId }).lean();
    for (const att of attendanceRecords) {
      const sId = att.studentId ? att.studentId.toString().trim() : '';
      if (studentMap.has(sId)) {
        const entry = studentMap.get(sId);
        entry.totalClassesConducted++;
        if (att.status === 'Present') entry.presentCount++;
        else if (att.status === 'Absent') entry.absentCount++;
        else if (att.status === 'Late') entry.lateCount++;
        else if (att.status === 'Excused') entry.excusedCount++;
      }
    }

    const students = Array.from(studentMap.values()).map(s => {
      const total = s.totalClassesConducted;
      const attended = s.presentCount + s.lateCount;
      const rate = total > 0 ? Math.round((attended / total) * 100) : 100;
      return {
        ...s,
        subjects: Array.from(s.subjects),
        attendanceRate: rate
      };
    });

    res.json(students);
  } catch (err) {
    console.error('[Attendance] Registered students fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Get all attendance records and summary stats for a student
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const records = await Attendance.find({ studentId })
      .sort({ createdAt: -1 })
      .lean();

    const totalClasses = records.length;
    const presentCount = records.filter(r => r.status === 'Present').length;
    const lateCount = records.filter(r => r.status === 'Late').length;
    const absentCount = records.filter(r => r.status === 'Absent').length;
    const excusedCount = records.filter(r => r.status === 'Excused').length;
    const attendedCount = presentCount + lateCount;
    const attendancePercentage = totalClasses > 0 ? Math.round((attendedCount / totalClasses) * 100) : 100;

    res.json({
      records,
      stats: {
        totalClasses,
        presentCount,
        lateCount,
        absentCount,
        excusedCount,
        attendedCount,
        attendancePercentage
      }
    });
  } catch (err) {
    console.error('[Attendance] Student records fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Create or update attendance record
router.post('/', async (req, res) => {
  try {
    const {
      tutorId,
      tutorName,
      studentId,
      studentName,
      studentEmail,
      subject,
      bookingId,
      sessionIndex,
      classDate,
      classTime,
      status,
      topicCovered,
      remarks,
      durationMinutes
    } = req.body;

    if (!tutorId || !studentId || !classDate || !status) {
      return res.status(400).json({
        message: 'Missing required attendance fields: tutorId, studentId, classDate, status'
      });
    }

    // Check if an attendance record already exists
    let existing = null;
    if (bookingId && sessionIndex !== undefined && sessionIndex !== -1) {
      existing = await Attendance.findOne({ bookingId, sessionIndex });
    }

    if (!existing && bookingId) {
      existing = await Attendance.findOne({ bookingId, classDate });
    }

    if (!existing) {
      existing = await Attendance.findOne({
        tutorId,
        studentId,
        classDate,
        ...(classTime ? { classTime } : {}),
        ...(subject ? { subject } : {})
      });
    }

    if (existing) {
      // Update existing record
      existing.status = status;
      if (topicCovered !== undefined) existing.topicCovered = topicCovered;
      if (remarks !== undefined) existing.remarks = remarks;
      if (classTime) existing.classTime = classTime;
      if (durationMinutes) existing.durationMinutes = durationMinutes;
      if (studentName) existing.studentName = studentName;
      if (studentEmail) existing.studentEmail = studentEmail;
      if (subject) existing.subject = subject;
      existing.lastEditedAt = new Date();
      await existing.save();

      // Sync booking session status if applicable
      if (bookingId && sessionIndex !== undefined && sessionIndex >= 0) {
        try {
          const booking = await Booking.findById(bookingId);
          if (booking && booking.sessions && booking.sessions[sessionIndex]) {
            if (['Present', 'Late'].includes(status) && booking.sessions[sessionIndex].status === 'scheduled') {
              booking.sessions[sessionIndex].status = 'completed';
              await booking.save();
            }
          }
        } catch (bErr) {
          console.warn('[Attendance] Booking session sync warning:', bErr.message);
        }
      }

      return res.json({
        message: 'Attendance record updated successfully',
        attendance: existing,
        isUpdate: true
      });
    }

    // Create new attendance record
    const attendance = new Attendance({
      tutorId,
      tutorName: tutorName || 'Tutor',
      studentId,
      studentName: studentName || 'Student',
      studentEmail: studentEmail || '',
      subject: subject || 'General Class',
      bookingId: bookingId || undefined,
      sessionIndex: sessionIndex !== undefined ? sessionIndex : -1,
      classDate,
      classTime: classTime || '',
      status: status || 'Present',
      topicCovered: topicCovered || '',
      remarks: remarks || '',
      durationMinutes: durationMinutes || 60,
      markedAt: new Date()
    });

    await attendance.save();

    // Sync booking session status if applicable
    if (bookingId && sessionIndex !== undefined && sessionIndex >= 0) {
      try {
        const booking = await Booking.findById(bookingId);
        if (booking && booking.sessions && booking.sessions[sessionIndex]) {
          if (['Present', 'Late'].includes(status) && booking.sessions[sessionIndex].status === 'scheduled') {
            booking.sessions[sessionIndex].status = 'completed';
            await booking.save();
          }
        }
      } catch (bErr) {
        console.warn('[Attendance] Booking session sync warning:', bErr.message);
      }
    }

    res.status(201).json({
      message: 'Attendance recorded successfully',
      attendance,
      isUpdate: false
    });
  } catch (err) {
    console.error('[Attendance] Create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Edit existing attendance record (when mistakes happen)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      classDate,
      classTime,
      topicCovered,
      remarks,
      durationMinutes,
      subject,
      studentName
    } = req.body;

    const record = await Attendance.findById(id);
    if (!record) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    if (status) record.status = status;
    if (classDate) record.classDate = classDate;
    if (classTime !== undefined) record.classTime = classTime;
    if (topicCovered !== undefined) record.topicCovered = topicCovered;
    if (remarks !== undefined) record.remarks = remarks;
    if (durationMinutes !== undefined) record.durationMinutes = durationMinutes;
    if (subject) record.subject = subject;
    if (studentName) record.studentName = studentName;
    record.lastEditedAt = new Date();

    await record.save();

    res.json({
      message: 'Attendance updated successfully',
      attendance: record
    });
  } catch (err) {
    console.error('[Attendance] Edit error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Delete attendance record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Attendance.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }
    res.json({ message: 'Attendance record deleted successfully' });
  } catch (err) {
    console.error('[Attendance] Delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

