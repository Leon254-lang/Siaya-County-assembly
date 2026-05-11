const express = require('express');
const Ticket = require('../models/Ticket');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  const query = req.user.role?.name === 'admin' ? {} : { requester: req.user._id };
  const tickets = await Ticket.find(query).populate('requester department assignedTo comments.author');
  res.json(tickets);
});

router.get('/:id', verifyToken, async (req, res) => {
  const ticket = await Ticket.findById(req.params.id).populate('requester department assignedTo comments.author');
  if (!ticket) {
    return res.status(404).json({ message: 'Ticket not found' });
  }

  if (req.user.role?.name !== 'admin' && !ticket.requester._id.equals(req.user._id)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json(ticket);
});

router.post('/', verifyToken, async (req, res) => {
  const ticket = new Ticket({
    title: req.body.title,
    description: req.body.description,
    department: req.body.department,
    priority: req.body.priority,
    requester: req.user._id,
    status: 'open',
  });

  await ticket.save();
  const populated = await Ticket.findById(ticket._id).populate('requester department assignedTo comments.author');
  res.status(201).json(populated);
});

router.put('/:id', verifyToken, async (req, res) => {
  const updates = {
    status: req.body.status,
    assignedTo: req.body.assignedTo,
    resolutionNotes: req.body.resolutionNotes,
  };

  const ticket = await Ticket.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).populate('requester department assignedTo comments.author');

  if (!ticket) {
    return res.status(404).json({ message: 'Ticket not found' });
  }

  res.json(ticket);
});

router.post('/:id/comment', verifyToken, async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) {
    return res.status(404).json({ message: 'Ticket not found' });
  }

  ticket.comments.push({
    author: req.user._id,
    message: req.body.message,
  });
  await ticket.save();

  const populated = await Ticket.findById(ticket._id).populate('requester department assignedTo comments.author');
  res.json(populated);
});

module.exports = router;
