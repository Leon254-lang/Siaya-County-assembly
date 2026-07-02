const express = require('express');
const Department = require('../models/Department');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  const departments = await Department.find();
  res.json(departments);
});

router.post('/', verifyToken, async (req, res) => {
  const { name, description, modules } = req.body;
  const department = new Department({
    name,
    description,
    modules: Array.isArray(modules) ? modules : [],
  });
  await department.save();
  res.status(201).json(department);
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name, description, modules } = req.body;
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    if (typeof name === 'string' && name.trim()) department.name = name.trim();
    if (typeof description === 'string') department.description = description.trim();
    if (Array.isArray(modules)) department.modules = modules;

    await department.save();
    res.json(department);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update department', error: error.message });
  }
});

module.exports = router;
