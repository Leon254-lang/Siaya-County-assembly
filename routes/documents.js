const express = require('express');
const multer = require('multer');
const Document = require('../models/Document');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

router.get('/', verifyToken, async (req, res) => {
  try {
    const {
      search,
      type,
      status,
      category,
      priority,
      department,
      assignedTo,
      page = 1,
      limit = 10
    } = req.query;

    let query = {};

    // Text search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { docNumber: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Filters
    if (type) query.type = type;
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (department) query.department = department;
    if (assignedTo) query.assignedTo = assignedTo;
    if (req.query.currentDepartment) query.currentDepartment = req.query.currentDepartment;

    const skip = (page - 1) * limit;

    const documents = await Document.find(query)
      .populate('owner', 'name email')
      .populate('assignedTo', 'name email')
      .populate('department', 'name')
      .populate('approvalHistory.by', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Document.countDocuments(query);

    res.json({
      documents,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalDocuments: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching documents', error: error.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      category,
      priority,
      origin,
      destination,
      currentDepartment,
      sender,
      recipient,
      department,
      tags,
      dueDate
    } = req.body;

    // Generate tracking number
    const year = new Date().getFullYear();
    const count = await Document.countDocuments({ createdAt: { $gte: new Date(year, 0, 1) } });
    const docNumber = `DOC-${year}-${String(count + 1).padStart(4, '0')}`;

    const docData = {
      docNumber,
      title,
      description,
      type: type || 'incoming',
      category: category || 'administrative',
      priority: priority || 'medium',
      status: 'draft',
      origin,
      destination,
      currentDepartment,
      sender,
      recipient,
      owner: req.user._id,
      department,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      dueDate,
      responseStatus: req.body.responseStatus || 'not_requested',
      responseNotes: req.body.responseNotes || '',
      responseReceivedAt: req.body.responseReceivedAt || undefined,
      approvalHistory: [
        {
          action: 'created',
          by: req.user._id,
          comment: 'Document created'
        },
      ],
    };

    const document = new Document(docData);
    await document.save();

    await recordAudit({
      req,
      action: 'Created document',
      entity: 'Document',
      entityId: document._id,
      details: { docNumber, title },
    });

    const populatedDoc = await Document.findById(document._id)
      .populate('owner', 'name email')
      .populate('assignedTo', 'name email')
      .populate('department', 'name');

    res.status(201).json(populatedDoc);
  } catch (error) {
    res.status(500).json({ message: 'Error creating document', error: error.message });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('owner', 'name email')
      .populate('assignedTo', 'name email')
      .populate('department', 'name')
      .populate('approvalHistory.by', 'name')
      .populate('movementHistory.movedBy', 'name');

    if (!document) return res.status(404).json({ message: 'Document not found' });
    res.json(document);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching document', error: error.message });
  }
});

router.post('/:id/submit', verifyToken, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found' });

    document.status = 'pending';
    document.approvalHistory.push({
      action: 'submitted',
      by: req.user._id,
      comment: req.body.comment || 'Document submitted for review',
    });
    document.updatedAt = Date.now();
    await document.save();

    await recordAudit({
      req,
      action: 'Submitted document',
      entity: 'Document',
      entityId: document._id,
      details: { comment: req.body.comment },
    });

    const populatedDoc = await Document.findById(document._id)
      .populate('owner', 'name email')
      .populate('assignedTo', 'name email')
      .populate('department', 'name')
      .populate('approvalHistory.by', 'name')
      .populate('movementHistory.movedBy', 'name');

    res.json(populatedDoc);
  } catch (error) {
    res.status(500).json({ message: 'Error submitting document', error: error.message });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  const document = await Document.findByIdAndUpdate(
    req.params.id,
    { ...req.body, updatedAt: Date.now() },
    { new: true }
  ).populate('owner assignedTo approvalHistory.by');

  if (!document) return res.status(404).json({ message: 'Document not found' });

  await recordAudit({
    req,
    action: 'Updated document',
    entity: 'Document',
    entityId: document._id,
    details: { updates: req.body },
  });

  res.json(document);
});

router.post('/:id/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found' });
    if (!req.file) return res.status(400).json({ message: 'File upload required' });

    document.files.push({
      path: req.file.path,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
    document.updatedAt = Date.now();
    await document.save();

    await recordAudit({
      req,
      action: 'Uploaded document file',
      entity: 'Document',
      entityId: document._id,
      details: { filename: req.file.originalname, path: req.file.path },
    });

    const populatedDoc = await Document.findById(document._id)
      .populate('owner', 'name email')
      .populate('assignedTo', 'name email')
      .populate('department', 'name');

    res.json(populatedDoc);
  } catch (error) {
    res.status(500).json({ message: 'Error uploading file', error: error.message });
  }
});

const workflowRoles = ['Super Admin', 'ICT Admin', 'HR Officer', 'Finance Officer', 'Committee Officer'];

router.post('/:id/approve', verifyToken, authorizeRoles(...workflowRoles), async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: 'Document not found' });

  document.status = 'approved';
  document.approvalHistory.push({ action: 'approved', by: req.user._id, comment: req.body.comment });
  document.updatedAt = Date.now();
  await document.save();

  await recordAudit({
    req,
    action: 'Approved document',
    entity: 'Document',
    entityId: document._id,
    details: { comment: req.body.comment },
  });

  res.json(document);
});

router.post('/:id/reject', verifyToken, authorizeRoles(...workflowRoles), async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: 'Document not found' });

  document.status = 'rejected';
  document.approvalHistory.push({ action: 'rejected', by: req.user._id, comment: req.body.comment });
  document.updatedAt = Date.now();
  await document.save();

  await recordAudit({
    req,
    action: 'Rejected document',
    entity: 'Document',
    entityId: document._id,
    details: { comment: req.body.comment },
  });

  res.json(document);
});

router.post('/:id/archive', verifyToken, authorizeRoles(...workflowRoles), async (req, res) => {
  const document = await Document.findById(req.params.id);
  if (!document) return res.status(404).json({ message: 'Document not found' });

  document.status = 'archived';
  document.approvalHistory.push({ action: 'archived', by: req.user._id, comment: req.body.comment });
  document.updatedAt = Date.now();
  await document.save();

  await recordAudit({
    req,
    action: 'Archived document',
    entity: 'Document',
    entityId: document._id,
    details: { comment: req.body.comment },
  });

  res.json(document);
});

router.post('/:id/response', verifyToken, authorizeRoles(...workflowRoles), async (req, res) => {
  try {
    const { status, responseNotes, responseReceivedAt } = req.body;
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found' });

    document.responseStatus = status || 'received';
    document.responseNotes = responseNotes || document.responseNotes;
    if (responseReceivedAt) {
      document.responseReceivedAt = new Date(responseReceivedAt);
    } else if (status === 'received') {
      document.responseReceivedAt = new Date();
    }
    document.updatedAt = Date.now();
    document.approvalHistory.push({
      action: 'responded',
      by: req.user._id,
      comment: responseNotes || `Response ${status}`,
    });

    await document.save();

    await recordAudit({
      req,
      action: 'Updated document response status',
      entity: 'Document',
      entityId: document._id,
      details: { status, responseNotes },
    });

    const populatedDoc = await Document.findById(document._id)
      .populate('owner', 'name email')
      .populate('assignedTo', 'name email')
      .populate('department', 'name')
      .populate('approvalHistory.by', 'name')
      .populate('movementHistory.movedBy', 'name');

    res.json(populatedDoc);
  } catch (error) {
    res.status(500).json({ message: 'Error updating response status', error: error.message });
  }
});

router.post('/:id/move', verifyToken, authorizeRoles(...workflowRoles), async (req, res) => {
  try {
    const { toDepartment, reason } = req.body;
    const document = await Document.findById(req.params.id);

    if (!document) return res.status(404).json({ message: 'Document not found' });

    const fromDepartment = document.currentDepartment;

    // Update movement history
    document.movementHistory.push({
      fromDepartment,
      toDepartment,
      movedBy: req.user._id,
      reason,
    });

    // Update current department
    document.currentDepartment = toDepartment;
    document.updatedAt = Date.now();

    // Add to approval history
    document.approvalHistory.push({
      action: 'moved',
      by: req.user._id,
      fromDepartment,
      toDepartment,
      comment: reason,
    });

    await document.save();

    await recordAudit({
      req,
      action: 'Moved document',
      entity: 'Document',
      entityId: document._id,
      details: { fromDepartment, toDepartment, reason },
    });

    const populatedDoc = await Document.findById(document._id)
      .populate('owner', 'name email')
      .populate('assignedTo', 'name email')
      .populate('department', 'name')
      .populate('approvalHistory.by', 'name')
      .populate('movementHistory.movedBy', 'name');

    res.json(populatedDoc);
  } catch (error) {
    res.status(500).json({ message: 'Error moving document', error: error.message });
  }
});

router.post('/:id/assign', verifyToken, authorizeRoles(...workflowRoles), async (req, res) => {
  try {
    const { assignedTo, comment } = req.body;
    const document = await Document.findById(req.params.id);

    if (!document) return res.status(404).json({ message: 'Document not found' });

    document.assignedTo = assignedTo;
    document.status = 'pending';
    document.updatedAt = Date.now();

    document.approvalHistory.push({
      action: 'assigned',
      by: req.user._id,
      comment,
    });

    await document.save();

    await recordAudit({
      req,
      action: 'Assigned document',
      entity: 'Document',
      entityId: document._id,
      details: { assignedTo, comment },
    });

    const populatedDoc = await Document.findById(document._id)
      .populate('owner', 'name email')
      .populate('assignedTo', 'name email')
      .populate('department', 'name')
      .populate('approvalHistory.by', 'name');

    res.json(populatedDoc);
  } catch (error) {
    res.status(500).json({ message: 'Error assigning document', error: error.message });
  }
});

router.get('/:id/download/:fileId', verifyToken, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found' });

    const file = document.files.id(req.params.fileId);
    if (!file) return res.status(404).json({ message: 'File not found' });

    res.download(file.path, file.originalName);
  } catch (error) {
    res.status(500).json({ message: 'Error downloading file', error: error.message });
  }
});

router.delete('/:id/file/:fileId', verifyToken, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found' });

    const fileIndex = document.files.findIndex(file => file._id.toString() === req.params.fileId);
    if (fileIndex === -1) return res.status(404).json({ message: 'File not found' });

    // Remove file from filesystem
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', document.files[fileIndex].path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    document.files.splice(fileIndex, 1);
    document.updatedAt = Date.now();
    await document.save();

    await recordAudit({
      req,
      action: 'Deleted document file',
      entity: 'Document',
      entityId: document._id,
      details: { fileId: req.params.fileId, originalName: file.originalName },
    });

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting file', error: error.message });
  }
});

module.exports = router;
