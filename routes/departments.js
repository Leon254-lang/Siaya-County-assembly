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

module.exports = router;
