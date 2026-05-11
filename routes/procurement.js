const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const uploadDir = path.join(__dirname, '../uploads/procurement');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

const formatFile = (filename) => {
  const filePath = path.join(uploadDir, filename);
  const stats = fs.statSync(filePath);
  return {
    filename,
    originalName: filename.replace(/^\d+-/, ''),
    size: stats.size,
    mimeType: '',
    uploadedAt: stats.mtime,
    url: `/uploads/procurement/${encodeURIComponent(filename)}`,
  };
};

router.get('/files', async (req, res) => {
  try {
    const files = fs.readdirSync(uploadDir)
      .filter((file) => file !== '.gitkeep' && !file.startsWith('.'))
      .filter((file) => fs.statSync(path.join(uploadDir, file)).isFile())
      .map(formatFile)
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({ files });
  } catch (error) {
    res.status(500).json({ message: 'Error listing procurement files', error: error.message });
  }
});

router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File upload required' });
    }

    const fileMetadata = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: req.file.mtime || new Date(),
      url: `/uploads/procurement/${encodeURIComponent(req.file.filename)}`,
    };

    res.status(201).json({ file: fileMetadata });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading procurement document', error: error.message });
  }
});

module.exports = router;
