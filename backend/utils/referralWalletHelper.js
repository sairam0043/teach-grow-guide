const mongoose = require('mongoose');
const User = require('../schemas/userSchema');
const Booking = require('../schemas/bookingSchema');

/**
 * Synchronize student referral metrics and award ₹500 wallet credits for qualifying referrals.
 * @param {string|mongoose.Types.ObjectId} studentUserId 
 * @returns {Promise<{ referralCode: string, walletBalance: number, walletHistory: Array, referralStats: { invitedCount: number, completedCount: number, earnings: number } }>}
 */
const syncStudentWalletAndReferrals = async (studentUserId) => {
  if (!studentUserId || !mongoose.Types.ObjectId.isValid(studentUserId)) {
    return {
      referralCode: '',
      walletBalance: 0,
      walletHistory: [],
      referralStats: { invitedCount: 0, completedCount: 0, earnings: 0 }
    };
  }

  const user = await User.findById(studentUserId);
  if (!user) {
    return {
      referralCode: '',
      walletBalance: 0,
      walletHistory: [],
      referralStats: { invitedCount: 0, completedCount: 0, earnings: 0 }
    };
  }

  let modified = false;

  // Lazy generate student referralCode if missing
  if (!user.referralCode) {
    const rawName = (user.student_name || user.full_name || 'STUDENT').replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase() || 'STU';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    user.referralCode = `${rawName}${randomNum}`;
    modified = true;
  }

  if (!user.walletHistory) {
    user.walletHistory = [];
    modified = true;
  }

  // Find all students who signed up with this user's referral code
  const referredStudents = await User.find({ referredBy: user._id, role: 'student' });
  const invitedCount = referredStudents.length;
  let completedCount = 0;

  if (invitedCount > 0) {
    const studentIds = referredStudents.map(s => s._id.toString());
    const bookings = await Booking.find({ studentId: { $in: studentIds } });

    for (const refStudent of referredStudents) {
      const refStudentIdStr = refStudent._id.toString();
      const studentBookings = bookings.filter(b => b.studentId === refStudentIdStr);

      const hasCompletedRegularClass = studentBookings.some(b => {
        if (!b.planType || b.planType === 'Free Demo Class' || b.planType.toLowerCase().includes('demo')) {
          return false;
        }
        if (b.status === 'completed') return true;
        if (b.sessions && b.sessions.length > 0) {
          return b.sessions.some(s => s.status === 'completed');
        }
        return false;
      });

      if (hasCompletedRegularClass) {
        completedCount++;

        // Check if referral credit is already recorded
        const alreadyRewarded = user.walletHistory.some(t => 
          t.type === 'credit' && 
          t.referredStudentId && 
          t.referredStudentId.toString() === refStudentIdStr
        );

        if (!alreadyRewarded) {
          const friendName = refStudent.student_name || refStudent.full_name || 'Friend';
          user.walletHistory.push({
            type: 'credit',
            amount: 500,
            description: `Referral Reward: ${friendName} completed their first regular class!`,
            referredStudentId: refStudent._id,
            date: new Date()
          });
          modified = true;
          console.log(`[Student Wallet] Credited ₹500 to student ${user.full_name} (${user._id}) for referring ${friendName} (completed regular class)`);
        }
      }
    }
  }

  // Calculate actual wallet balance from transaction history
  const totalCredits = user.walletHistory.filter(t => t.type === 'credit').reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalDebits = user.walletHistory.filter(t => t.type === 'debit').reduce((acc, t) => acc + (t.amount || 0), 0);
  const calculatedBalance = Math.max(0, totalCredits - totalDebits);

  if (user.walletBalance !== calculatedBalance) {
    user.walletBalance = calculatedBalance;
    modified = true;
  }

  if (modified) {
    await user.save();
  }

  return {
    referralCode: user.referralCode,
    walletBalance: user.walletBalance,
    walletHistory: user.walletHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    referralStats: {
      invitedCount,
      completedCount,
      earnings: completedCount * 500
    }
  };
};

/**
 * Triggers referral reward check when a booking/session is completed.
 * @param {Object} booking 
 */
const rewardReferrerOnClassCompletion = async (booking) => {
  try {
    if (!booking || !booking.studentId) return;
    if (booking.planType === 'Free Demo Class' || (booking.planType && booking.planType.toLowerCase().includes('demo'))) {
      return;
    }

    const isPack = booking.sessions && booking.sessions.length > 0;
    const isCompleted = isPack 
      ? booking.sessions.some(s => s.status === 'completed') || booking.status === 'completed'
      : booking.status === 'completed';

    if (!isCompleted) return;

    if (!mongoose.Types.ObjectId.isValid(booking.studentId)) return;

    const student = await User.findById(booking.studentId);
    if (student && student.referredBy) {
      await syncStudentWalletAndReferrals(student.referredBy);
    }
  } catch (err) {
    console.error('[Referral Reward] Error triggering referral reward:', err.message);
  }
};

/**
 * Refunds wallet credits if a booking with walletUsed > 0 is cancelled.
 * @param {Object} booking 
 */
const refundWalletOnBookingCancel = async (booking) => {
  try {
    if (!booking || !booking.walletUsed || booking.walletUsed <= 0) return;
    if (!booking.studentId || !mongoose.Types.ObjectId.isValid(booking.studentId)) return;

    const user = await User.findById(booking.studentId);
    if (!user) return;

    if (!user.walletHistory) user.walletHistory = [];

    // Ensure we don't refund multiple times for the same cancelled booking
    const alreadyRefunded = user.walletHistory.some(t => 
      t.type === 'credit' && 
      t.bookingId && 
      t.bookingId.toString() === booking._id.toString() &&
      t.description.includes('Refund')
    );

    if (!alreadyRefunded) {
      user.walletHistory.push({
        type: 'credit',
        amount: booking.walletUsed,
        description: `Refund: Cancelled booking for ${booking.subject || 'Class'} (${booking.planType || 'Regular Class'})`,
        bookingId: booking._id,
        date: new Date()
      });

      const totalCredits = user.walletHistory.filter(t => t.type === 'credit').reduce((acc, t) => acc + (t.amount || 0), 0);
      const totalDebits = user.walletHistory.filter(t => t.type === 'debit').reduce((acc, t) => acc + (t.amount || 0), 0);
      user.walletBalance = Math.max(0, totalCredits - totalDebits);

      await user.save();
      console.log(`[Student Wallet] Refunded ₹${booking.walletUsed} to student ${user.full_name} for cancelled booking ${booking._id}`);
    }
  } catch (err) {
    console.error('[Student Wallet Refund] Error refunding wallet:', err.message);
  }
};

module.exports = {
  syncStudentWalletAndReferrals,
  rewardReferrerOnClassCompletion,
  refundWalletOnBookingCancel
};
