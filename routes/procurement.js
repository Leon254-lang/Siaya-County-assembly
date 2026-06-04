const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const Procurement = require('../models/Procurement');

const router = express.Router();
const uploadDir = path.join(__dirname, '../uploads/procurement');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Get all procurement documents (public access)
router.get('/files', async (req, res) => {
  try {
    const documents = await Procurement.find()
      .populate('uploadedBy', 'name email')
      .populate('department', 'name')
      .sort({ uploadedAt: -1 });

    res.json({ files: documents });
  } catch (error) {
    res.status(500).json({ message: 'Error listing procurement files', error: error.message });
  }
});

// Get procurement documents by department
router.get('/department/:departmentId', async (req, res) => {
  try {
    const documents = await Procurement.find({ department: req.params.departmentId })
      .populate('uploadedBy', 'name email')
      .populate('department', 'name')
      .sort({ uploadedAt: -1 });

    res.json({ files: documents });
  } catch (error) {
    res.status(500).json({ message: 'Error listing department procurement files', error: error.message });
  }
});

const canUploadRole = (role) => {
  return role === 'HOD' || role === 'Super Admin' || role === 'Procurement Officer' || role?.includes('Admin');
};

// Upload procurement documents (HOD/Admin/Super Admin)
router.post('/upload', verifyToken, upload.array('files', 30), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'File upload required' });
    }

    if (!canUploadRole(req.user.role?.name)) {
      return res.status(403).json({ message: 'Access denied: only HOD or Admin users can upload procurement documents.' });
    }

    const description = req.body.description || '';

    const createdDocs = await Promise.all(req.files.map(async (file) => {
      const doc = new Procurement({
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        uploadedBy: req.user._id,
        department: req.user.department,
        url: `/uploads/procurement/${encodeURIComponent(file.filename)}`,
        description,
        uploadedAt: new Date(),
      });
      await doc.save();
      await doc.populate('uploadedBy', 'name email');
      await doc.populate('department', 'name');
      return doc;
    }));

    res.status(201).json({
      message: 'Documents uploaded successfully',
      files: createdDocs,
    });
  } catch (error) {
    // Clean up uploaded files if DB save failed
    if (req.files) {
      req.files.forEach((file) => {
        fs.unlink(path.join(uploadDir, file.filename), (err) => {
          if (err) console.error('Failed to delete uploaded file:', err);
        });
      });
    }
    res.status(500).json({ message: 'Error uploading procurement document', error: error.message });
  }
});

// Delete procurement document (HOD and uploader only)
router.delete('/:documentId', verifyToken, async (req, res) => {
  try {
    const document = await Procurement.findById(req.params.documentId);

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Check if user is the uploader or is Super Admin
    const userRole = req.user.role?.name;
    const isUploader = document.uploadedBy.toString() === req.user._id.toString();
    const isSuperAdmin = userRole === 'Super Admin';

    if (!isUploader && !isSuperAdmin) {
      return res.status(403).json({ message: 'You can only delete your own documents' });
    }

    // Delete file from disk
    const filePath = path.join(uploadDir, document.filename);
    fs.unlink(filePath, (err) => {
      if (err) console.error('Failed to delete file:', err);
    });

    // Delete from database
    await Procurement.findByIdAndDelete(req.params.documentId);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting procurement document', error: error.message });
  }
});

module.exports = router;
