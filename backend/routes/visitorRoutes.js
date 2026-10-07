const express = require('express');
const router = express.Router();
const Visitor = require('../schemas/visitorSchema');

// GET /api/visitors - Fetch current total visitor count
router.get('/', async (req, res) => {
  try {
    let visitorDoc = await Visitor.findOne({ key: 'site_visitors' });
    if (!visitorDoc) {
      visitorDoc = await Visitor.create({ key: 'site_visitors', count: 1250 });
    }
    res.json({ count: visitorDoc.count, success: true });
  } catch (error) {
    console.error('Error fetching visitor count:', error);
    res.status(500).json({ error: 'Failed to fetch visitor count', count: 1250 });
  }
});

// POST /api/visitors/increment - Increment visitor count for a new session/visit
router.post('/increment', async (req, res) => {
  try {
    const visitorDoc = await Visitor.findOneAndUpdate(
      { key: 'site_visitors' },
      { $inc: { count: 1 }, $set: { lastVisited: new Date() } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ count: visitorDoc.count, success: true });
  } catch (error) {
    console.error('Error incrementing visitor count:', error);
    res.status(500).json({ error: 'Failed to increment visitor count', count: 1250 });
  }
});

module.exports = router;
