const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  contentType: { type: String, required: true },
  data: { type: Buffer, required: true }
}, { timestamps: true });

const Upload = mongoose.model('Upload', uploadSchema);

module.exports = Upload;
