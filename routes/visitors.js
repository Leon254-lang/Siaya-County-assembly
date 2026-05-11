const express = require('express');
const Visitor = require('../models/Visitor');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  const visitors = await Visitor.find().populate('host');
  res.json(visitors);
});

router.get('/current', verifyToken, async (req, res) => {
  const active = await Visitor.find({ status: 'inside' }).populate('host');
  res.json(active);
});

router.get('/hosts', verifyToken, async (req, res) => {
  const hosts = await User.find().select('name email phone').sort('name');
  res.json(hosts);
});

router.post('/', verifyToken, async (req, res) => {
  const visitor = new Visitor(req.body);
  await visitor.save();
  const populated = await Visitor.findById(visitor._id).populate('host');
  res.status(201).json(populated);
});

router.patch('/:id/exit', verifyToken, async (req, res) => {
  const visitor = await Visitor.findById(req.params.id);
  if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
  if (visitor.status !== 'inside') return res.status(400).json({ message: 'Visitor already checked out' });
  visitor.exitTime = new Date();
  visitor.status = 'left';
  await visitor.save();
  const populated = await Visitor.findById(visitor._id).populate('host');
  res.json(populated);
});

module.exports = router;
