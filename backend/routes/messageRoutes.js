const express = require('express');
const router = express.Router();
const Message = require('../schemas/messageSchema');
const User = require('../schemas/userSchema');
const Tutor = require('../schemas/tutorSchema');

// POST /api/messages - Send a message
router.post('/', async (req, res) => {
  try {
    const { senderId, receiverId, text } = req.body;
    if (!senderId || !receiverId || !text) {
      return res.status(400).json({ message: 'Sender, receiver, and text are required.' });
    }

    const message = new Message({
      sender: senderId,
      receiver: receiverId,
      text: text,
      read: false
    });

    await message.save();
    
    // Return populated message
    const populated = await Message.findById(message._id)
      .populate('sender', 'full_name email role avatar')
      .populate('receiver', 'full_name email role avatar');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Error sending message', error: error.message });
  }
});

// GET /api/messages/chat/:userId1/:userId2 - Fetch all messages between two users
router.get('/chat/:userId1/:userId2', async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    
    // Mark incoming messages as read
    await Message.updateMany(
      { sender: userId2, receiver: userId1, read: false },
      { $set: { read: true } }
    );

    const messages = await Message.find({
      $or: [
        { sender: userId1, receiver: userId2 },
        { sender: userId2, receiver: userId1 }
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

// GET /api/messages/inbox/:userId - Get user inbox conversations list
router.get('/inbox/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Find all messages involving the user
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    })
    .sort({ createdAt: -1 })
    .populate('sender', 'full_name email role avatar')
    .populate('receiver', 'full_name email role avatar');

    // 1. Gather all other participant IDs to do bulk lookup
    const otherUserIds = new Set();
    for (const msg of messages) {
      if (!msg.sender || !msg.receiver) continue;
      const otherId = msg.sender._id.toString() === userId ? msg.receiver._id.toString() : msg.sender._id.toString();
      otherUserIds.add(otherId);
    }

    // 2. Bulk fetch all matching tutors to map their tutor profile IDs in one query
    const tutorsList = await Tutor.find({ userId: { $in: Array.from(otherUserIds) } });
    const tutorMap = new Map();
    tutorsList.forEach(t => tutorMap.set(t.userId.toString(), t._id.toString()));

    // 3. Group conversations and calculate unread counts in-memory
    const conversationsMap = new Map();

    for (const msg of messages) {
      if (!msg.sender || !msg.receiver) continue;
      
      const otherParticipant = msg.sender._id.toString() === userId ? msg.receiver : msg.sender;
      const otherId = otherParticipant._id.toString();

      if (!conversationsMap.has(otherId)) {
        // Calculate unread count in-memory (no database hits!)
        const unreadCount = messages.filter(m => 
          m.receiver && 
          m.receiver._id.toString() === userId && 
          !m.read && 
          m.sender && 
          m.sender._id.toString() === otherId
        ).length;

        const tutorProfileId = tutorMap.get(otherId) || null;

        conversationsMap.set(otherId, {
          otherUser: {
            id: otherParticipant._id,
            full_name: otherParticipant.full_name,
            email: otherParticipant.email,
            role: otherParticipant.role,
            avatar: otherParticipant.avatar,
            tutorProfileId
          },
          lastMessage: {
            text: msg.text,
            createdAt: msg.createdAt,
            senderId: msg.sender._id
          },
          unreadCount
        });
      }
    }

    const conversations = Array.from(conversationsMap.values());
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching inbox conversations', error: error.message });
  }
});

module.exports = router;
