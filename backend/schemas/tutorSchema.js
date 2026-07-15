const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  date: { type: String, required: true },
  time: { type: String, required: true },
  available: { type: Boolean, default: true }
});

const tutorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  photo: { type: String },
  verificationDocument: { type: String },
  category: { type: String, required: true },
  mode: { type: String, required: true },
  qualification: { type: String },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  experience: { type: Number, default: 0 },
  city: { type: String },
  pincode: { type: String, default: "" },
  address: { type: String, default: "" },
  googleMapsUrl: { type: String, default: "" },
  bio: { type: String },
  subjects: [{ type: String }],
  hourlyRate: { type: Number, required: true, default: 500 },
  subjectRates: [{
    subject: { type: String, required: true },
    rate: { type: Number, required: true, default: 500 }
  }],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  isVerified: { type: Boolean, default: false },
  rejectionReason: { type: String, default: "" },
  hearAboutUs: { type: String, default: "" },
  featured: { type: Boolean, default: false },
  timezone: { type: String, default: 'Asia/Kolkata' },
  availableTimings: [{ type: String }],
  availability: [{
    day: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true }
  }],
  demoSlots: [slotSchema],
  reviews: [{
    studentName: { type: String },
    rating: { type: Number },
    reviewText: { type: String },
    date: { type: Date, default: Date.now }
  }],
  pricingHistory: [{
    subject: { type: String, required: true },
    rate: { type: Number, required: true },
    effectiveFrom: { type: Date, required: true, default: Date.now },
    effectiveTo: { type: Date }
  }]
}, { timestamps: true });
 
tutorSchema.pre('save', function() {
  if (this.isNew) {
    if (!this.pricingHistory || this.pricingHistory.length === 0) {
      this.pricingHistory = [];
      const ratesToInitialize = this.subjectRates && this.subjectRates.length > 0
        ? this.subjectRates
        : (this.subjects || []).map(sub => ({ subject: sub, rate: this.hourlyRate || 500 }));
        
      ratesToInitialize.forEach(sr => {
        this.pricingHistory.push({
          subject: sr.subject,
          rate: sr.rate,
          effectiveFrom: new Date()
        });
      });
    }
  } else if (this.isModified('subjectRates')) {
    if (!this.pricingHistory) this.pricingHistory = [];
    
    this.subjectRates.forEach(sr => {
      const activePeriods = this.pricingHistory.filter(h => h.subject === sr.subject && !h.effectiveTo);
      if (activePeriods.length === 0) {
        this.pricingHistory.push({
          subject: sr.subject,
          rate: sr.rate,
          effectiveFrom: new Date()
        });
      } else {
        const lastActive = activePeriods[activePeriods.length - 1];
        if (lastActive.rate !== sr.rate) {
          lastActive.effectiveTo = new Date();
          this.pricingHistory.push({
            subject: sr.subject,
            rate: sr.rate,
            effectiveFrom: new Date()
          });
        }
      }
    });
    
    const currentSubjects = this.subjectRates.map(sr => sr.subject);
    this.pricingHistory.forEach(h => {
      if (!h.effectiveTo && !currentSubjects.includes(h.subject)) {
        h.effectiveTo = new Date();
      }
    });
  }
});

const Tutor = mongoose.model('Tutor', tutorSchema);

module.exports = Tutor;
