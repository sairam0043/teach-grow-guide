const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Booking = require('../schemas/bookingSchema');
const Tutor = require('../schemas/tutorSchema');
const User = require('../schemas/userSchema');

const router = express.Router();

// Brevo Mail Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: (process.env.SMTP_USER || 'dummy').trim(),
    pass: (process.env.SMTP_PASS || 'dummy').replace(/[\s\n\r]+/g, '').trim(),
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

// Configure Razorpay (Will only attempt initialization if keys exist)
const isRazorpayConfigured = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
let razorpayInstance = null;

if (isRazorpayConfigured) {
  try {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log('[Razorpay] Initialized successfully in live/test credentials mode.');
  } catch (err) {
    console.error('[Razorpay] Initialization failed:', err.message);
  }
} else {
  console.log('[Razorpay] Run in Sandbox Mock Fallback Mode (No credentials in .env)');
}

// POST /api/payments/create-order
// Create Razorpay or Sandbox Mock Order
router.post('/create-order', async (req, res) => {
  try {
    const { bookingId, amount } = req.body;
    console.log(`[Payments] Request to create order received. BookingID: ${bookingId}, Amount: ₹${amount}`);

    if (!bookingId || !amount) {
      console.warn('[Payments] Missing bookingId or amount in request body.');
      return res.status(400).json({ message: 'Booking ID and amount are required' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      console.warn(`[Payments] Booking not found for ID: ${bookingId}`);
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Razorpay amount is in paise (₹1 = 100 paise)
    const amountInPaise = Math.round(Number(amount) * 100);

    if (isRazorpayConfigured && razorpayInstance) {
      console.log('[Payments] Razorpay credentials detected. Creating order via Razorpay API...');
      const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_${bookingId}`,
      };
      
      const order = await razorpayInstance.orders.create(options);
      console.log(`[Payments] Razorpay Order created successfully. Order ID: ${order.id}`);
      return res.json({
        isSandbox: false,
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        booking
      });
    } else {
      console.log('[Payments] Razorpay not configured. Falling back to Sandbox Mock mode.');
      const mockOrderId = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
      console.log(`[Payments] Generated mock order ID: ${mockOrderId}`);
      return res.json({
        isSandbox: true,
        keyId: 'rzp_test_dummySandboxKey123',
        orderId: mockOrderId,
        amount: amountInPaise,
        currency: 'INR',
        booking
      });
    }
  } catch (error) {
    console.error('[Payments] Critical error during order creation:', error);
    res.status(500).json({ message: 'Error initiating payment order', error: error.message });
  }
});

// POST /api/payments/verify-payment
// Cryptographically verify signatures (or mock-verify in sandbox) and enroll booking
router.post('/verify-payment', async (req, res) => {
  try {
    const { 
      bookingId, 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature,
      planType,
      amountPaid
    } = req.body;

    console.log(`[Payments] Verification request received. BookingID: ${bookingId}, OrderID: ${razorpay_order_id}, PaymentID: ${razorpay_payment_id}`);

    if (!bookingId || !razorpay_payment_id || !razorpay_order_id) {
      console.warn('[Payments] Missing required fields for payment verification.');
      return res.status(400).json({ message: 'Missing payment details for verification' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      console.warn(`[Payments] Booking not found for verification ID: ${bookingId}`);
      return res.status(404).json({ message: 'Booking not found' });
    }

    const isSandboxPayment = razorpay_order_id.startsWith('order_mock_');

    if (!isSandboxPayment && isRazorpayConfigured) {
      console.log('[Payments] Initiating real cryptographic signature verification...');
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        console.error(`[Payments] Signature verification failed! Expected: ${generatedSignature}, Received: ${razorpay_signature}`);
        return res.status(400).json({ message: 'Payment verification failed: Signature mismatch' });
      }
      console.log('[Payments] Cryptographic signature matches successfully.');
    } else {
      console.log('[Payments] Verifying Sandbox Payment for order:', razorpay_order_id);
    }

    // 1. Update Booking Status to Enrolled
    booking.status = 'enrolled';
    booking.planType = planType || booking.planType || 'Standard Course';
    booking.amountPaid = Number(amountPaid) || booking.amountPaid || (booking.amountPaid || 0);
    
    // 2. Generate Classroom Link if not already created
    if (!booking.meetingLink) {
      booking.meetingLink = `https://meet.jit.si/cuvasol-tutor-class-${booking._id}`;
    }
    
    await booking.save();
    console.log(`[Payments] Booking ${booking._id} enrolled successfully. Paid amount: ₹${booking.amountPaid}`);

    // 3. Notify Tutor & Student via Brevo SMTP
    try {
      const tutor = await Tutor.findById(booking.tutorId);
      if (tutor) {
        const tutorUser = await User.findById(tutor.userId);
        if (tutorUser && tutorUser.email) {
          console.log(`[Payments] Attempting to send confirmation email to tutor: ${tutorUser.email}`);
          await transporter.sendMail({
            from: process.env.EMAIL_FROM || '"Cuvasol Tutor" <noreply@cuvasoltutor.com>',
            to: tutorUser.email,
            subject: 'New Course Enrollment Payment Successful',
            text: `Hello ${tutor.name},\n\nPayment of ₹${booking.amountPaid} has been received. Student ${booking.studentName} is successfully enrolled in your class for ${booking.subject} at ${booking.timing}.\n\nYou can join the private video room directly here: ${booking.meetingLink}\n\nBest regards,\nCuvasol Tutor Team`,
            html: `<h3>New Course Enrollment Confirmed</h3>
                   <p>Hello <b>${tutor.name}</b>,</p>
                   <p>Payment of <b>₹${booking.amountPaid}</b> has been successfully processed.</p>
                   <p>Student <b>${booking.studentName}</b> is officially enrolled in your course for <b>${booking.subject}</b> at <b>${booking.timing}</b>.</p>
                   <p>You can join the private video room directly by clicking the link below:</p>
                   <p><a href="${booking.meetingLink}" style="background-color: #059669; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Join Jitsi Video Room</a></p>
                   <p>Or access your <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/dashboard/tutor">dashboard</a> for details.</p>`,
          });
          console.log(`[Payments] Tutor enrollment alert sent to: ${tutorUser.email}`);
        }
      }
    } catch (mailError) {
      console.error('[Payments] Failed to send enrollment notification:', mailError.message);
    }

    res.json({ 
      success: true, 
      message: 'Payment verified and enrollment confirmed!', 
      booking 
    });

  } catch (error) {
    console.error('[Payments] Error in payment verification:', error);
    res.status(500).json({ message: 'Error verifying transaction', error: error.message });
  }
});

module.exports = router;
