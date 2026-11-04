const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  tutorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Tutor', 
    required: true 
  },
  tutorName: { 
    type: String, 
    required: true,
    trim: true 
  },
  studentId: { 
    type: String, 
    required: true,
    trim: true 
  },
  studentName: { 
    type: String, 
    required: true,
    trim: true 
  },
  studentEmail: { 
    type: String, 
    trim: true,
    default: '' 
  },
  subject: { 
    type: String, 
    required: true,
    trim: true 
  },
  bookingId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Booking',
    required: false 
  },
  sessionIndex: { 
    type: Number, 
    default: -1 
  },
  classDate: { 
    type: String, 
    required: true,
    trim: true 
  },
  classTime: { 
    type: String, 
    default: '',
    trim: true 
  },
  status: { 
    type: String, 
    enum: ['Present', 'Absent', 'Late', 'Excused'], 
    default: 'Present',
    required: true 
  },
  topicCovered: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  remarks: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  durationMinutes: { 
    type: Number, 
    default: 60 
  },
  markedAt: { 
    type: Date, 
    default: Date.now 
  },
  lastEditedAt: { 
    type: Date 
  }
}, { timestamps: true });

attendanceSchema.index({ tutorId: 1, classDate: -1 });
attendanceSchema.index({ studentId: 1, classDate: -1 });
attendanceSchema.index({ bookingId: 1, sessionIndex: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;

