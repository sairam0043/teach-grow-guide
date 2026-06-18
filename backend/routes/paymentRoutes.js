const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Booking = require('../schemas/bookingSchema');
const Tutor = require('../schemas/tutorSchema');
const User = require('../schemas/userSchema');
const CoursePayment = require('../schemas/coursePaymentSchema');

const router = express.Router();

const getFrontendUrl = (req) => {
  let origin = req && (req.headers.origin || req.headers.referer);
  if (origin) {
    try {
      const urlObj = new URL(origin);
      origin = urlObj.origin;
    } catch (e) {
      origin = origin.replace(/\/$/, '');
    }
    if (typeof origin === 'string' && (origin.startsWith('http://') || origin.startsWith('https://'))) {
      return origin;
    }
  }

  if (process.env.FRONTEND_URL) {
    const urls = process.env.FRONTEND_URL.split(',')
      .map(u => u.replace(/["']/g, '').trim())
      .filter(Boolean);
    if (urls.length > 0) {
      const isProd = process.env.NODE_ENV === 'production';
      if (isProd) {
        const prodUrl = urls.find(url => !url.includes('localhost') && !url.includes('127.0.0.1'));
        if (prodUrl) return prodUrl;
      }
      return urls[0];
    }
  }
  return 'http://localhost:8080';
};

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
    const { bookingId } = req.body;
    console.log(`[Payments] Request to create order received. BookingID: ${bookingId}`);

    if (!bookingId) {
      console.warn('[Payments] Missing bookingId in request body.');
      return res.status(400).json({ message: 'Booking ID is required' });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      console.warn(`[Payments] Booking not found for ID: ${bookingId}`);
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Securely use the amount stored in the database instead of trusting the client
    const secureAmount = booking.amountPaid || 0;
    
    // Razorpay amount is in paise (₹1 = 100 paise)
    const amountInPaise = Math.round(secureAmount * 100);

    if (isRazorpayConfigured && razorpayInstance) {
      console.log(`[Payments] Razorpay credentials detected. Creating order via Razorpay API for ₹${secureAmount}...`);
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
      console.log(`[Payments] Razorpay not configured. Falling back to Sandbox Mock mode for ₹${secureAmount}.`);
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
      planType
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
    // Preserve database-calculated amountPaid, never trust the client parameter
    booking.amountPaid = booking.amountPaid || 0;

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
                   <p>Or access your <a href="${getFrontendUrl(req)}/dashboard/tutor">dashboard</a> for details.</p>`,
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

// POST /api/payments/create-course-order
router.post('/create-course-order', async (req, res) => {
  try {
    const { studentId, studentName, studentEmail, purchaseType } = req.body;
    console.log(`[Course Payments] Order creation requested by ${studentName} (${studentEmail}) for ${purchaseType}`);

    if (!studentId || !studentName || !studentEmail || !purchaseType) {
      return res.status(400).json({ message: 'Missing required student or purchase details' });
    }

    if (purchaseType !== 'assessment' && purchaseType !== 'full_course') {
      return res.status(400).json({ message: 'Invalid purchase type. Must be assessment or full_course' });
    }

    // Backend security validation: restrict full course orders to shortlisted students only
    if (purchaseType === 'full_course') {
      const assessmentPayment = await CoursePayment.findOne({
        studentId,
        purchaseType: 'assessment',
        status: 'completed',
        shortlisted: true
      });

      if (!assessmentPayment) {
        console.warn(`[Course Payments] Blocked attempt to purchase full course by non-shortlisted student: ${studentEmail} (${studentId})`);
        return res.status(403).json({ 
          message: 'Enrollment restricted: You must be shortlisted by an administrator based on your assessment results to register for the full course.' 
        });
      }
    }

    const secureAmount = purchaseType === 'assessment' ? 150 : 1500;
    const amountInPaise = Math.round(secureAmount * 100);

    // Create a pending payment record
    const coursePayment = new CoursePayment({
      studentId,
      studentName,
      studentEmail,
      purchaseType,
      amountPaid: secureAmount,
      status: 'pending_payment'
    });

    await coursePayment.save();

    if (isRazorpayConfigured && razorpayInstance) {
      console.log(`[Course Payments] Razorpay configured. Creating order for ₹${secureAmount}...`);
      const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_course_${coursePayment._id}`,
      };
      
      const order = await razorpayInstance.orders.create(options);
      coursePayment.razorpayOrderId = order.id;
      await coursePayment.save();

      console.log(`[Course Payments] Razorpay Order created: ${order.id}`);
      return res.json({
        isSandbox: false,
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        coursePayment
      });
    } else {
      console.log(`[Course Payments] Razorpay NOT configured. Falling back to Sandbox Mode for ₹${secureAmount}...`);
      const mockOrderId = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
      coursePayment.razorpayOrderId = mockOrderId;
      await coursePayment.save();

      console.log(`[Course Payments] Generated mock order ID: ${mockOrderId}`);
      return res.json({
        isSandbox: true,
        keyId: 'rzp_test_dummySandboxKey123',
        orderId: mockOrderId,
        amount: amountInPaise,
        currency: 'INR',
        coursePayment
      });
    }
  } catch (error) {
    console.error('[Course Payments] Critical error creating order:', error);
    res.status(500).json({ message: 'Error initiating course payment order', error: error.message });
  }
});

// POST /api/payments/verify-course-payment
router.post('/verify-course-payment', async (req, res) => {
  try {
    const { 
      coursePaymentId, 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature 
    } = req.body;

    console.log(`[Course Payments] Verification request: ID ${coursePaymentId}, Order ${razorpay_order_id}, Payment ${razorpay_payment_id}`);

    if (!coursePaymentId || !razorpay_payment_id || !razorpay_order_id) {
      return res.status(400).json({ message: 'Missing required payment details' });
    }

    const coursePayment = await CoursePayment.findById(coursePaymentId);
    if (!coursePayment) {
      return res.status(404).json({ message: 'Course payment record not found' });
    }

    const isSandboxPayment = razorpay_order_id.startsWith('order_mock_');

    if (!isSandboxPayment && isRazorpayConfigured) {
      console.log('[Course Payments] Verifying Razorpay cryptographic signature...');
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        console.error(`[Course Payments] Cryptographic signature mismatch!`);
        return res.status(400).json({ message: 'Payment verification failed: Signature mismatch' });
      }
      console.log('[Course Payments] Signature verified successfully.');
    } else {
      console.log('[Course Payments] Verifying Sandbox Mock payment...');
    }

    // Update status to completed
    coursePayment.status = 'completed';
    coursePayment.razorpayPaymentId = razorpay_payment_id;
    await coursePayment.save();
    console.log(`[Course Payments] Course enrollment ${coursePayment._id} completed successfully!`);

    // Send confirmation email via SMTP
    try {
      const assessmentUrl = `${getFrontendUrl(req)}/ai-program/take-assessment/${coursePayment._id}`;

      const emailSubject = coursePayment.purchaseType === 'full_course' 
        ? 'Enrollment Confirmed: AI Future Skills Program'
        : 'Registration Confirmed: AI Future Skills Assessment';

      const emailText = coursePayment.purchaseType === 'full_course'
        ? `Hello ${coursePayment.studentName},\n\nCongratulations! Your payment of ₹1500 has been successfully processed, and you are officially enrolled in the "AI Future Skills Program"!\n\nCourse Details:\n- Starting Date: 1 July 2026\n- Schedule: 1 Hour Daily (Weekdays)\n- Mode: 100% Online Live Interactive Classes\n\nThe live class link and details will be shared with you shortly. If you have any questions, please contact our support team at support@cuvasol.com or +91 95385 17963.\n\nCorporate Address:\nCuvasol Technologies Private Limited, HD-169, We Work, 78 Old Madras Road, Salarpuria Magnificia, Tin Factory, Mahadevapura, Bangalore 560016, Karnataka, IN.`
        : `Hello ${coursePayment.studentName},\n\nThank you for registering for the "AI Future Skills Program" assessment. Your payment of ₹150 has been successfully processed.\n\nPlease complete your assessment at the following link:\n${assessmentUrl}\n\nImportant Notes:\n- This assessment link is active for only 24 hours from the time of this email registration.\n- You can attempt the assessment only once.\n- Please make sure you are logged in to your student account before clicking the link.\n\nIf you have any questions, please contact our support team at support@cuvasol.com or +91 95385 17963.\n\nCorporate Address:\nCuvasol Technologies Private Limited, HD-169, We Work, 78 Old Madras Road, Salarpuria Magnificia, Tin Factory, Mahadevapura, Bangalore 560016, Karnataka, IN.`;

      const emailHtml = coursePayment.purchaseType === 'full_course'
        ? `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
            <h2 style="color: #0d9488; text-align: center;">Enrollment Confirmed!</h2>
            <p>Hello <strong>${coursePayment.studentName}</strong>,</p>
            <p>Congratulations! Your payment of <strong>₹1500</strong> has been successfully processed, and you are officially enrolled in the <strong>AI Future Skills Program</strong>.</p>
            <div style="background-color: #f0fdfa; padding: 15px; border-radius: 6px; border: 1px solid #ccfbf1; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #0f766e;">Course Details:</h4>
              <ul style="line-height: 1.6; margin-bottom: 0; padding-left: 20px;">
                <li><strong>Course Starts:</strong> 1 July 2026</li>
                <li><strong>Schedule:</strong> 1 Hour Daily (Weekdays)</li>
                <li><strong>Mode:</strong> 100% Online Live Classes</li>
              </ul>
            </div>
            <p>The live class link and program details will be shared with you shortly before the class start date.</p>
            <p>If you have any questions or need support, feel free to contact us at <a href="mailto:support@cuvasol.com">support@cuvasol.com</a> or call us at <strong>+91 95385 17963</strong>.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 11px; color: #777;">
              <strong>Cuvasol Technologies Private Limited</strong><br/>
              HD-169, We Work, 78 Old Madras Road, Salarpuria Magnificia, Tin Factory, Mahadevapura, Bangalore 560016, Karnataka, IN
            </p>
          </div>
        `
        : `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
            <h2 style="color: #0d9488; text-align: center;">Assessment Registration Confirmed</h2>
            <p>Hello <strong>${coursePayment.studentName}</strong>,</p>
            <p>Thank you for registering for the <strong>AI Future Skills Program</strong> assessment. Your payment of <strong>₹150</strong> has been successfully processed.</p>
            <p>Please click the button below to start your assessment:</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${assessmentUrl}" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
                Start Assessment
              </a>
            </div>
            
            <div style="background-color: #fef2f2; padding: 15px; border-radius: 6px; border: 1px solid #fee2e2; margin: 20px 0; font-size: 13px; color: #991b1b;">
              <strong>Important Guidelines:</strong>
              <ul style="margin-top: 5px; margin-bottom: 0; padding-left: 20px;">
                <li>The link is active for <strong>only 24 hours</strong> from registration.</li>
                <li>You can only attempt the assessment <strong>one time</strong>.</li>
                <li>Ensure you are logged into your student account on the website before starting.</li>
              </ul>
            </div>
            
            <p>If you have any questions or need support, feel free to contact us at <a href="mailto:support@cuvasol.com">support@cuvasol.com</a> or call us at <strong>+91 95385 17963</strong>.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 11px; color: #777;">
              <strong>Cuvasol Technologies Private Limited</strong><br/>
              HD-169, We Work, 78 Old Madras Road, Salarpuria Magnificia, Tin Factory, Mahadevapura, Bangalore 560016, Karnataka, IN
            </p>
          </div>
        `;

      console.log(`[Course Payments] Attempting to send confirmation email to student: ${coursePayment.studentEmail}`);
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Cuvasol Course Support" <noreply@cuvasoltutor.com>',
        to: coursePayment.studentEmail,
        subject: emailSubject,
        text: emailText,
        html: emailHtml
      });
      console.log(`[Course Payments] Confirmation email sent successfully to ${coursePayment.studentEmail}`);
    } catch (mailError) {
      console.error('[Course Payments] Failed to send confirmation email:', mailError.message);
    }

    res.json({ 
      success: true, 
      message: 'Course payment verified and enrollment confirmed!', 
      coursePayment 
    });

  } catch (error) {
    console.error('[Course Payments] Error in course payment verification:', error);
    res.status(500).json({ message: 'Error verifying course transaction', error: error.message });
  }
});

// POST /api/payments/shortlist-student
router.post('/shortlist-student', async (req, res) => {
  try {
    const { coursePaymentId } = req.body;
    console.log(`[Course Payments] Shortlisting student request received for Payment ID: ${coursePaymentId}`);

    if (!coursePaymentId) {
      return res.status(400).json({ message: 'Missing course payment ID' });
    }

    const coursePayment = await CoursePayment.findById(coursePaymentId);
    if (!coursePayment) {
      return res.status(404).json({ message: 'Course payment record not found' });
    }

    if (coursePayment.purchaseType !== 'assessment') {
      return res.status(400).json({ message: 'Only assessment registrants can be shortlisted' });
    }

    coursePayment.shortlisted = true;
    await coursePayment.save();
    console.log(`[Course Payments] Student ${coursePayment.studentName} shortlisted!`);

    // Send shortlisting and enrollment email with nodemailer
    try {
      const frontendUrl = getFrontendUrl(req);
      const enrollUrl = `${frontendUrl}/ai-program/enroll`;
      
      const emailSubject = 'Congratulations! You are Shortlisted for the AI Future Skills Program';
      const emailText = `Hello ${coursePayment.studentName},\n\nCongratulations! You have been successfully shortlisted for the "AI Future Skills Program" based on your assessment application.\n\nYou can now enroll in the full course and pay the tuition fee of ₹1500.\n\nTo enroll and complete the payment, please visit the link below:\n${enrollUrl}\n\nNote: You will need to log in with your registered account (${coursePayment.studentEmail}) to access the secure payment page.\n\nBest regards,\nCuvasol Course Support Team`;
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
          <h2 style="color: #0d9488; text-align: center;">You are Shortlisted!</h2>
          <p>Hello <strong>${coursePayment.studentName}</strong>,</p>
          <p>Congratulations! You have been successfully shortlisted for the <strong>AI Future Skills Program</strong> based on your assessment application.</p>
          <p>You can now complete your enrollment in the full course by paying the program fee of <strong>₹1500</strong>.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${enrollUrl}" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px rgba(13, 148, 136, 0.2);">
              Proceed to Enroll & Pay
            </a>
          </div>

          <p style="font-size: 13px; color: #555; background-color: #f9fafb; padding: 12px; border-radius: 6px; border: 1px solid #f3f4f6;">
            <strong>Important Note:</strong> Please log in to your account with your registered email (<strong>${coursePayment.studentEmail}</strong>) before attempting payment on the enrollment page.
          </p>

          <p>If you have any questions, feel free to contact us at <a href="mailto:support@cuvasol.com">support@cuvasol.com</a> or call us at <strong>+91 95385 17963</strong>.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 11px; color: #777;">
            <strong>Cuvasol Technologies Private Limited</strong><br/>
            HD-169, We Work, 78 Old Madras Road, Salarpuria Magnificia, Tin Factory, Mahadevapura, Bangalore 560016, Karnataka, IN
          </p>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Cuvasol Course Support" <noreply@cuvasoltutor.com>',
        to: coursePayment.studentEmail,
        subject: emailSubject,
        text: emailText,
        html: emailHtml
      });
      console.log(`[Course Payments] Shortlisting email sent to ${coursePayment.studentEmail}`);
    } catch (mailError) {
      console.error('[Course Payments] Failed to send shortlisting email:', mailError.message);
    }

    res.json({ success: true, message: 'Student shortlisted and email invitation sent!', coursePayment });
  } catch (err) {
    console.error('[Course Payments] Error in shortlisting student:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/check-enrollment-status/:studentId
router.get('/check-enrollment-status/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    console.log(`[Course Payments] Checking enrollment status for student: ${studentId}`);
    
    const payments = await CoursePayment.find({ studentId, status: 'completed' });
    
    const hasAssessment = payments.some(p => p.purchaseType === 'assessment');
    const isShortlisted = payments.some(p => p.purchaseType === 'assessment' && p.shortlisted === true);
    const isEnrolled = payments.some(p => p.purchaseType === 'full_course');

    res.json({
      hasAssessment,
      isShortlisted,
      isEnrolled
    });
  } catch (err) {
    console.error('[Course Payments] Error in checking enrollment status:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/assessment/:paymentId
router.get('/assessment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await CoursePayment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: "Assessment record not found" });
    }

    if (payment.purchaseType !== 'assessment' || payment.status !== 'completed') {
      return res.status(400).json({ message: "Invalid or inactive assessment reference" });
    }

    if (payment.assessmentAttempted) {
      return res.json({
        status: 'attempted',
        studentName: payment.studentName,
        attemptedAt: payment.assessmentAttemptedAt,
        score: payment.assessmentScore
      });
    }

    const completedTime = new Date(payment.updatedAt).getTime();
    const expiryWindow = 24 * 60 * 60 * 1000; // 24 hours
    const elapsed = Date.now() - completedTime;

    if (elapsed > expiryWindow) {
      return res.json({
        status: 'expired',
        studentName: payment.studentName,
        registeredAt: payment.updatedAt
      });
    }

    res.json({
      status: 'valid',
      studentName: payment.studentName,
      studentEmail: payment.studentEmail,
      remainingMs: expiryWindow - elapsed
    });
  } catch (err) {
    console.error('[Course Payments] Error checking assessment status:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payments/assessment/:paymentId/submit
router.post('/assessment/:paymentId/submit', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { answers } = req.body;

    const payment = await CoursePayment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ message: "Assessment record not found" });
    }

    if (payment.purchaseType !== 'assessment' || payment.status !== 'completed') {
      return res.status(400).json({ message: "Invalid or inactive assessment reference" });
    }

    if (payment.assessmentAttempted) {
      return res.status(400).json({ message: "Assessment has already been attempted. Only one attempt is allowed." });
    }

    const completedTime = new Date(payment.updatedAt).getTime();
    const expiryWindow = 24 * 60 * 60 * 1000;
    const elapsed = Date.now() - completedTime;

    if (elapsed > expiryWindow) {
      return res.status(400).json({ message: "Assessment link has expired (24-hour limit exceeded)." });
    }

    // Auto-grade the multiple-choice questions
    // Q1 Correct: "Artificial Intelligence"
    // Q2 Correct: "Writing instructions to guide an AI's response"
    // Q3 Correct: "An AI generating false or fabricated information that appears convincing"
    // Q4 Correct: "Reviewing AI output for bias, truthfulness, and safety"
    let score = 0;
    if (answers) {
      if (answers.q1 === "Artificial Intelligence") score += 25;
      if (answers.q2 === "Writing instructions to guide an AI's response") score += 25;
      if (answers.q3 === "Hallucination") score += 25;
      if (answers.q4 === "Reviewing AI output for bias, truthfulness, and safety") score += 25;
    }

    payment.assessmentAttempted = true;
    payment.assessmentAttemptedAt = new Date();
    payment.assessmentAnswers = answers || {};
    payment.assessmentScore = score;

    await payment.save();

    res.json({
      success: true,
      score,
      message: "Assessment submitted and graded successfully!"
    });
  } catch (err) {
    console.error('[Course Payments] Error submitting assessment:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
