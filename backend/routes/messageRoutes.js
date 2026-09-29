const express = require('express');
const router = express.Router();
const Message = require('../schemas/messageSchema');
const User = require('../schemas/userSchema');
const Tutor = require('../schemas/tutorSchema');

// Helper to resolve any ID (User._id or Tutor._id) to a valid User._id
async function resolveUserId(id) {
  if (!id) return null;
  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  try {
    // 1. Check if it's already a User ID
    const user = await User.findById(id).select('_id');
    if (user) return user._id.toString();

    // 2. Check if it's a Tutor Profile ID
    const tutor = await Tutor.findById(id).select('userId');
    if (tutor && tutor.userId) return tutor.userId.toString();

    return id.toString();
  } catch (err) {
    return id.toString();
  }
}

// POST /api/messages - Send a message
router.post('/', async (req, res) => {
  try {
    let { senderId, receiverId, text } = req.body;
    if (!senderId || !receiverId || !text) {
      return res.status(400).json({ message: 'Sender, receiver, and text are required.' });
    }

    const resolvedSender = await resolveUserId(senderId) || senderId;
    const resolvedReceiver = await resolveUserId(receiverId) || receiverId;

    const message = new Message({
      sender: resolvedSender,
      receiver: resolvedReceiver,
      text: text.trim(),
      read: false
    });

    await message.save();
    
    // Return populated message
    const populated = await Message.findById(message._id)
      .populate('sender', 'full_name email role avatar')
      .populate('receiver', 'full_name email role avatar');

    // If sender is admin, send an email notification to the receiver in the background (non-blocking)
    if (populated?.sender?.role === 'admin' && populated?.receiver?.email) {
      try {
        const { sendEmail } = require('../utils/emailService');
        const receiverName = populated.receiver.full_name || 'Member';
        const senderName = populated.sender.full_name || 'Cuvasol Platform Admin';
        const dashboardUrl = populated.receiver.role === 'tutor' 
          ? 'https://tutor.cuvasol.com/dashboard/tutor' 
          : 'https://tutor.cuvasol.com/dashboard/student';

        sendEmail({
          to: populated.receiver.email,
          subject: `📩 New Message from Cuvasol Admin Support: "${text.slice(0, 45)}${text.length > 45 ? '...' : ''}"`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
              <div style="background: linear-gradient(135deg, #4338ca 0%, #6366f1 100%); padding: 24px; text-align: center; color: #ffffff;">
                <h2 style="margin: 0; font-size: 20px;">📩 New Message from Platform Support</h2>
                <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Cuvasol Admin Communication</p>
              </div>
              <div style="padding: 24px; color: #374151; font-size: 15px; line-height: 1.6;">
                <p>Hello <strong>${receiverName}</strong>,</p>
                <p>You have received a direct message from <strong>${senderName}</strong>:</p>
                <div style="background: #f3f4f6; border-left: 4px solid #6366f1; padding: 16px; border-radius: 6px; margin: 20px 0; font-size: 15px; color: #1f2937; white-space: pre-wrap;">${text}</div>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${dashboardUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 15px;">Open Messages in Dashboard</a>
                </div>
                <p style="font-size: 13px; color: #6b7280; margin-top: 20px;">You can reply to this message directly in your dashboard messages tab.</p>
              </div>
            </div>
          `
        }).catch(e => console.warn('[Message Email Notification Error]:', e.message));
      } catch (err) {
        console.warn('[Message Notification Error]:', err.message);
      }
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
});

// GET /api/messages/chat/:userId1/:userId2 - Fetch all messages between two users
router.get('/chat/:userId1/:userId2', async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    const resolved1 = await resolveUserId(userId1) || userId1;
    const resolved2 = await resolveUserId(userId2) || userId2;
    
    // Include both original IDs and resolved IDs to match any historical messages
    const u1Variants = Array.from(new Set([userId1, resolved1])).filter(Boolean);
    const u2Variants = Array.from(new Set([userId2, resolved2])).filter(Boolean);

    // Mark incoming messages as read
    await Message.updateMany(
      { 
        sender: { $in: u2Variants }, 
        receiver: { $in: u1Variants }, 
        read: false 
      },
      { $set: { read: true } }
    );

    const messages = await Message.find({
      $or: [
        { sender: { $in: u1Variants }, receiver: { $in: u2Variants } },
        { sender: { $in: u2Variants }, receiver: { $in: u1Variants } }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'full_name email role avatar')
    .populate('receiver', 'full_name email role avatar');

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chat history', error: error.message });
  }
});

// GET /api/messages/user/:userId - Get user profile preview for chat initial state
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const mongoose = require('mongoose');
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const resolvedUserId = await resolveUserId(userId) || userId;
    const user = await User.findById(resolvedUserId).select('full_name email role avatar');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let tutorProfileId = null;
    if (user.role === 'tutor') {
      const tutor = await Tutor.findOne({ userId: user._id }).select('_id');
      if (tutor) tutorProfileId = tutor._id.toString();
    }

    res.json({
      id: user._id.toString(),
      full_name: user.full_name || 'User',
      email: user.email || '',
      role: user.role || 'student',
      avatar: user.avatar || '',
      tutorProfileId
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user profile', error: error.message });
  }
});

// GET /api/messages/inbox/:userId - Get user inbox conversations list
router.get('/inbox/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const mongoose = require('mongoose');

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.json([]);
    }

    const resolvedUser = await resolveUserId(userId) || userId;
    const userVariants = Array.from(new Set([userId, resolvedUser])).filter(Boolean);

    // Find all messages involving the user
    const messages = await Message.find({
      $or: [
        { sender: { $in: userVariants } }, 
        { receiver: { $in: userVariants } }
      ]
    })
    .sort({ createdAt: -1 })
    .populate('sender', 'full_name email role avatar')
    .populate('receiver', 'full_name email role avatar');

    // 1. Gather all other participant IDs to do bulk lookup
    const otherUserIds = new Set();
    for (const msg of messages) {
      if (!msg?.sender?._id || !msg?.receiver?._id) continue;
      const sId = msg.sender._id.toString();
      const rId = msg.receiver._id.toString();
      const otherId = userVariants.includes(sId) ? rId : sId;
      otherUserIds.add(otherId);
    }

    // 2. Bulk fetch all matching tutors to map their tutor profile IDs in one query
    const tutorsList = await Tutor.find({ 
      $or: [
        { userId: { $in: Array.from(otherUserIds) } },
        { _id: { $in: Array.from(otherUserIds) } }
      ]
    });
    const tutorMap = new Map();
    tutorsList.forEach(t => {
      if (t && t.userId) {
        tutorMap.set(t.userId.toString(), t._id.toString());
      }
      if (t && t._id) {
        tutorMap.set(t._id.toString(), t._id.toString());
      }
    });

    // 3. Group conversations and calculate unread counts in-memory
    const conversationsMap = new Map();

    for (const msg of messages) {
      if (!msg?.sender?._id || !msg?.receiver?._id) continue;
      
      const sId = msg.sender._id.toString();
      const otherParticipant = userVariants.includes(sId) ? msg.receiver : msg.sender;
      if (!otherParticipant?._id) continue;
      const otherId = otherParticipant._id.toString();

      if (!conversationsMap.has(otherId)) {
        // Calculate unread count in-memory
        const unreadCount = messages.filter(m => 
          m?.receiver?._id && 
          userVariants.includes(m.receiver._id.toString()) && 
          !m.read && 
          m?.sender?._id && 
          m.sender._id.toString() === otherId
        ).length;

        const tutorProfileId = tutorMap.get(otherId) || null;

        conversationsMap.set(otherId, {
          otherUser: {
            id: otherParticipant._id,
            full_name: otherParticipant.full_name || 'User',
            email: otherParticipant.email || '',
            role: otherParticipant.role || 'student',
            avatar: otherParticipant.avatar || '',
            tutorProfileId
          },
          lastMessage: {
            text: msg.text || '',
            createdAt: msg.createdAt,
            senderId: msg?.sender?._id || null
          },
          unreadCount
        });
      }
    }

    const conversations = Array.from(conversationsMap.values());
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching inbox conversations:', error);
    res.status(500).json({ message: 'Error fetching inbox conversations', error: error.message });
  }
});

module.exports = router;
