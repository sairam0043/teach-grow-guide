const mongoose = require('mongoose');

const tutorStudentNoteSchema = new mongoose.Schema({
  tutorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tutor',
    required: true
  },
  studentId: {
    type: String,
    required: true,
    trim: true
  },
  note: {
    type: String,
    required: true,
    trim: true,
    maxlength: 3000
  }
}, { timestamps: true });

tutorStudentNoteSchema.index({ tutorId: 1, studentId: 1, createdAt: -1 });

module.exports = mongoose.model('TutorStudentNote', tutorStudentNoteSchema);
