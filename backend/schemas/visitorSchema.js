const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, default: 'site_visitors' },
  count: { type: Number, default: 1250 },
  lastVisited: { type: Date, default: Date.now }
}, { timestamps: true });

const Visitor = mongoose.model('Visitor', visitorSchema);

module.exports = Visitor;
