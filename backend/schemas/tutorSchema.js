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
  classesTaught: [{ type: String }],
  boardsTaught: [{ type: String }],
  hourlyRate: { type: Number, required: true, default: 300 },
  subjectRates: [{
    subject: { type: String, required: true },
    rate: { type: Number, required: true, default: 300 }
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
  }],
  workExperience: [{
    role: { type: String, required: true },
    company: { type: String, required: true },
    duration: { type: String, required: true },
    description: { type: String }
  }],
  referralCode: { type: String, unique: true, sparse: true },
  googleTokens: {
    accessToken: { type: String },
    refreshToken: { type: String },
    expiryDate: { type: Number }
  },
  paymentDetails: {
    accountHolderName: { type: String, default: "" },
    bankName: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    ifscCode: { type: String, default: "" },
    accountType: { type: String, enum: ['Savings Account', 'Current Account', ''], default: 'Savings Account' },
    upiId: { type: String, default: "" },
    isConfirmed: { type: Boolean, default: false },
    updatedAt: { type: Date }
  },
  payoutHistory: [{
    amount: { type: Number, required: true },
    periodMonth: { type: String },
    paymentMode: { type: String, default: 'Bank Transfer (NEFT/IMPS)' },
    transactionReference: { type: String },
    disbursedAt: { type: Date, default: Date.now },
    disbursedBy: { type: String },
    notes: { type: String },
    receiptSent: { type: Boolean, default: false }
  }]
}, { timestamps: true });
 
tutorSchema.pre('save', function() {
  if (!this.referralCode) {
    const cleanName = (this.name || 'TUTOR').replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    this.referralCode = `${cleanName}${randomNum}`;
  }
  if (this.isNew) {
    if (!this.pricingHistory || this.pricingHistory.length === 0) {
      this.pricingHistory = [];
      const ratesToInitialize = this.subjectRates && this.subjectRates.length > 0
        ? this.subjectRates
        : (this.subjects || []).map(sub => ({ subject: sub, rate: this.hourlyRate || 300 }));
        
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
