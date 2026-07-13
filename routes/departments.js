const express = require('express');
const Department = require('../models/Department');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const boardrooms = ['Boardroom 1', 'Boardroom 2', 'Boardroom 3', 'Boardroom 4', 'Boardroom 5'];

router.get('/', verifyToken, async (req, res) => {
  const departments = await Department.find();
  res.json(departments);
});

router.post('/', verifyToken, async (req, res) => {
  const { name, description, modules, boardroom } = req.body;

  if (boardroom && !boardrooms.includes(boardroom)) {
    return res.status(400).json({ message: 'Select a valid boardroom.' });
  }

  if (boardroom) {
    const existing = await Department.findOne({ boardroom });
    if (existing) {
      return res.status(409).json({ message: 'Boardroom already in use.' });
    }
  }

  const department = new Department({
    name,
    description,
    modules: Array.isArray(modules) ? modules : [],
    boardroom: boardroom || undefined,
  });
  await department.save();
  res.status(201).json(department);
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, description, modules, boardroom } = req.body;
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    if (boardroom && !boardrooms.includes(boardroom)) {
      return res.status(400).json({ message: 'Select a valid boardroom.' });
    }

    if (boardroom) {
      const existing = await Department.findOne({ boardroom, _id: { $ne: department._id } });
      if (existing) {
        return res.status(409).json({ message: 'Boardroom already in use.' });
      }
    }

    if (typeof name === 'string' && name.trim()) department.name = name.trim();
    if (typeof description === 'string') department.description = description.trim();
    if (Array.isArray(modules)) department.modules = modules;
    if (boardroom !== undefined) department.boardroom = boardroom || undefined;

    await department.save();
    res.json(department);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update department', error: error.message });
  }
});

module.exports = router;
