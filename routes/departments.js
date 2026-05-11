const express = require('express');
const Department = require('../models/Department');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  const departments = await Department.find();
  res.json(departments);
});

router.post('/', verifyToken, async (req, res) => {
  const department = new Department(req.body);
  await department.save();
  res.status(201).json(department);
});

module.exports = router;
