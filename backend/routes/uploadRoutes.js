const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Ensure uploads directory exists (create at runtime if needed)
const uploadsDir = path.join(__dirname, '..', 'uploads');
const fs = require('fs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext) ? ext : '.jpg';
    cb(null, `tutor-${uuidv4()}${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
    if (allowed) cb(null, true);
    else cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed.'));
  }
});

// POST /api/upload/photo - single file for tutor profile photo
router.post('/photo', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded.' });
    }
    const configuredBaseUrl = (process.env.BACKEND_URL || '').trim().replace(/\/$/, '');
    const forwardedProto = req.get('x-forwarded-proto');
    const protocol = (forwardedProto || req.protocol || 'http').split(',')[0].trim();
    const inferredBaseUrl = `${protocol}://${req.get('host')}`;
    const baseUrl = configuredBaseUrl || inferredBaseUrl;
    const photoUrl = `${baseUrl}/uploads/${req.file.filename}`;
    res.json({ url: photoUrl, filename: req.file.filename });
  } catch (error) {
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Image must be less than 5MB.' });
    }
  }
  if (err.message) {
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

module.exports = router;
