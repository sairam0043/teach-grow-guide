const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  url: { type: String, required: true },
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload' },
  filename: { type: String, required: true },
  fileType: { 
    type: String, 
    enum: ['image', 'pdf', 'doc', 'spreadsheet', 'presentation', 'archive', 'file'], 
    default: 'file' 
  },
  mimeType: { type: String },
  size: { type: Number, default: 0 }
}, { _id: true });

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '', trim: true },
  attachments: [attachmentSchema],
  read: { type: Boolean, default: false }
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
