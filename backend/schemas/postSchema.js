const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  tutorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tutor', required: true },
  title: { type: String, default: "" },
  caption: { type: String, default: "" },
  images: [{ type: String }],
  likes: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
