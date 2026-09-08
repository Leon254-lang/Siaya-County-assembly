const express = require('express');
const router = express.Router();
const OrderPaper = require('../models/OrderPaper');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');

router.get('/', verifyToken, async (req, res) => {
  try {
    const papers = await OrderPaper.find().populate('createdBy approvedBy');
    res.json(papers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load order papers', error: error.message });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const paper = await OrderPaper.findById(req.params.id).populate('createdBy approvedBy');
    if (!paper) return res.status(404).json({ message: 'Order paper not found' });
    res.json(paper);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load order paper', error: error.message });
  }
});

router.post('/', verifyToken, authorizeRoles('Clerk', 'Committee Officer', 'Super Admin'), async (req, res) => {
  try {
    const paper = new OrderPaper({
      ...req.body,
      createdBy: req.user._id,
    });
    await paper.save();

    await recordAudit({
      req,
      action: 'Created order paper',
      entity: 'OrderPaper',
      entityId: paper._id,
      details: { title: paper.title },
    });

    res.status(201).json(paper);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create order paper', error: error.message });
  }
});

router.put('/:id', verifyToken, authorizeRoles('Clerk', 'Committee Officer', 'Super Admin'), async (req, res) => {
  try {
    const paper = await OrderPaper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: 'Order paper not found' });
    if (paper.status === 'Archived') return res.status(400).json({ message: 'Archived order papers cannot be edited' });

    const { title, sessionDate, sessionType, items, notes } = req.body;
    paper.title = title ?? paper.title;
    paper.sessionDate = sessionDate ?? paper.sessionDate;
    paper.sessionType = sessionType ?? paper.sessionType;
    paper.items = Array.isArray(items) ? items.map((item, index) => ({ ...item, orderNo: index + 1 })) : paper.items;
    paper.notes = notes ?? paper.notes;
    await paper.save();
    res.json(await paper.populate('createdBy approvedBy items.mover'));
  } catch (error) {
    res.status(500).json({ message: 'Failed to edit order paper', error: error.message });
  }
});

router.patch('/:id/reorder', verifyToken, authorizeRoles('Clerk', 'Committee Officer', 'Super Admin'), async (req, res) => {
  try {
    const paper = await OrderPaper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: 'Order paper not found' });
    if (paper.status === 'Archived' || paper.status === 'Published' || paper.status === 'Approved') {
      return res.status(400).json({ message: 'Only draft order papers can be reordered' });
    }
    if (!Array.isArray(req.body.itemIds)) return res.status(400).json({ message: 'itemIds array required' });

    const itemsById = new Map(paper.items.map((item) => [String(item._id), item]));
    const reordered = req.body.itemIds.map((id) => itemsById.get(String(id))).filter(Boolean);
    paper.items.forEach((item) => {
      if (!req.body.itemIds.includes(String(item._id))) reordered.push(item);
    });
    paper.items = reordered.map((item, index) => ({ ...item.toObject(), orderNo: index + 1 }));
    await paper.save();
    res.json(await paper.populate('createdBy approvedBy items.mover'));
  } catch (error) {
    res.status(500).json({ message: 'Failed to reorder order paper', error: error.message });
  }
});

router.patch('/:id/publish', verifyToken, authorizeRoles('Clerk', 'Super Admin'), async (req, res) => {
  try {
    const paper = await OrderPaper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: 'Order paper not found' });

    paper.status = 'Published';
    paper.approvedBy = req.user._id;
    paper.publishedAt = new Date();
    await paper.save();

    await recordAudit({
      req,
      action: 'Approved order paper',
      entity: 'OrderPaper',
      entityId: paper._id,
      details: { title: paper.title },
    });

    res.json(paper);
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve order paper', error: error.message });
  }
});

router.patch('/:id/approve', verifyToken, authorizeRoles('Clerk', 'Super Admin'), async (req, res) => {
  req.url = req.url.replace('/approve', '/publish');
  return router.handle(req, res);
});

router.patch('/:id/archive', verifyToken, authorizeRoles('Clerk', 'Super Admin'), async (req, res) => {
  try {
    const paper = await OrderPaper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: 'Order paper not found' });
    paper.status = 'Archived';
    await paper.save();
    await recordAudit({ req, action: 'Archived order paper', entity: 'OrderPaper', entityId: paper._id, details: { title: paper.title } });
    res.json(paper);
  } catch (error) {
    res.status(500).json({ message: 'Failed to archive order paper', error: error.message });
  }
});

module.exports = router;
