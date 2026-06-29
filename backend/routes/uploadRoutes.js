const express = require('express');
const multer = require('multer');
const Upload = require('../schemas/uploadSchema');

const router = express.Router();

// Use memory storage for uploads to avoid ephemeral disk wipes
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
    if (allowed) cb(null, true);
    else cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed.'));
  }
});

const uploadDoc = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const isImage = /^image\/(jpeg|jpg|png)$/i.test(file.mimetype);
    const isPdf = file.mimetype === 'application/pdf';
    if (isImage || isPdf) cb(null, true);
    else cb(new Error('Only PDF, JPEG, and PNG document files are allowed.'));
  }
});

// GET /api/upload/file/:id - serve uploaded files directly from MongoDB
router.get('/file/:id', async (req, res) => {
  try {
    const file = await Upload.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    // Set headers to serve inline (so PDFs display properly in browser)
    res.set({
      'Content-Type': file.contentType,
      'Content-Length': file.data.length,
      'Cache-Control': 'public, max-age=31536000' // cache for 1 year
    });
    res.send(file.data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve file', error: error.message });
  }
});

// POST /api/upload/photo - single file for tutor profile photo
router.post('/photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded.' });
    }
    
    // Save binary data to MongoDB
    const newUpload = new Upload({
      filename: `tutor-photo-${Date.now()}-${req.file.originalname}`,
      contentType: req.file.mimetype,
      data: req.file.buffer
    });
    const saved = await newUpload.save();

    const configuredBaseUrl = (process.env.BACKEND_URL || '').trim().replace(/\/$/, '');
    const forwardedProto = req.get('x-forwarded-proto');
    const protocol = (forwardedProto || req.protocol || 'http').split(',')[0].trim();
    const inferredBaseUrl = `${protocol}://${req.get('host')}`;
    const baseUrl = configuredBaseUrl || inferredBaseUrl;
    
    const photoUrl = `${baseUrl}/api/upload/file/${saved._id}`;
    res.json({ url: photoUrl, filename: saved.filename });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// POST /api/upload/document - single file for tutor verification credential (PDF or Image)
router.post('/document', uploadDoc.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No document file uploaded.' });
    }
    
    // Save binary data to MongoDB
    const newUpload = new Upload({
      filename: `tutor-doc-${Date.now()}-${req.file.originalname}`,
      contentType: req.file.mimetype,
      data: req.file.buffer
    });
    const saved = await newUpload.save();

    const configuredBaseUrl = (process.env.BACKEND_URL || '').trim().replace(/\/$/, '');
    const forwardedProto = req.get('x-forwarded-proto');
    const protocol = (forwardedProto || req.protocol || 'http').split(',')[0].trim();
    const inferredBaseUrl = `${protocol}://${req.get('host')}`;
    const baseUrl = configuredBaseUrl || inferredBaseUrl;

    const docUrl = `${baseUrl}/api/upload/file/${saved._id}`;
    res.json({ url: docUrl, filename: saved.filename });
  } catch (error) {
    res.status(500).json({ message: 'Document upload failed', error: error.message });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large. Photo limit is 5MB, Resume/CV limit is 10MB.' });
    }
  }
  if (err.message) {
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

module.exports = router;
