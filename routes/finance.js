const express = require('express');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const FinanceRecord = require('../models/FinanceRecord');
const Department = require('../models/Department');

const router = express.Router();

router.get('/records', verifyToken, async (req, res) => {
  try {
    const records = await FinanceRecord.find()
      .populate('department', 'name')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ records });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching finance records', error: error.message });
  }
});

router.get('/records/:id', verifyToken, async (req, res) => {
  try {
    const record = await FinanceRecord.findById(req.params.id)
      .populate('department', 'name')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');

    if (!record) {
      return res.status(404).json({ message: 'Finance record not found' });
    }

    res.json({ record });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching finance record', error: error.message });
  }
});

router.post('/records', verifyToken, authorizeRoles('Finance Officer', 'Super Admin'), async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      department,
      amountRequested,
      amountApproved,
      amountSpent,
      status,
      approvalStatus,
      referenceNumber,
      vendor,
    } = req.body;

    const record = new FinanceRecord({
      title,
      category,
      description,
      department,
      amountRequested: Number(amountRequested) || 0,
      amountApproved: Number(amountApproved) || 0,
      amountSpent: Number(amountSpent) || 0,
      status,
      approvalStatus,
      referenceNumber,
      vendor,
      createdBy: req.user._id,
    });

    await record.save();
    await record.populate('department', 'name');
    await record.populate('createdBy', 'name email');

    res.status(201).json({ message: 'Finance record created successfully', record });
  } catch (error) {
    res.status(500).json({ message: 'Error creating finance record', error: error.message });
  }
});

router.put('/records/:id', verifyToken, authorizeRoles('Finance Officer', 'Super Admin'), async (req, res) => {
  try {
    const record = await FinanceRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Finance record not found' });
    }

    const {
      title,
      category,
      description,
      department,
      amountRequested,
      amountApproved,
      amountSpent,
      status,
      approvalStatus,
      referenceNumber,
      vendor,
    } = req.body;

    record.title = title || record.title;
    record.category = category || record.category;
    record.description = description || record.description;
    record.department = department || record.department;
    record.amountRequested = Number(amountRequested) || record.amountRequested;
    record.amountApproved = Number(amountApproved) || record.amountApproved;
    record.amountSpent = Number(amountSpent) || record.amountSpent;
    record.status = status || record.status;
    record.approvalStatus = approvalStatus || record.approvalStatus;
    record.referenceNumber = referenceNumber || record.referenceNumber;
    record.vendor = vendor || record.vendor;
    record.updatedAt = Date.now();

    await record.save();
    await record.populate('department', 'name');
    await record.populate('createdBy', 'name email');
    await record.populate('approvedBy', 'name email');

    res.json({ message: 'Finance record updated successfully', record });
  } catch (error) {
    res.status(500).json({ message: 'Error updating finance record', error: error.message });
  }
});

router.delete('/records/:id', verifyToken, authorizeRoles('Finance Officer', 'Super Admin'), async (req, res) => {
  try {
    const record = await FinanceRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Finance record not found' });
    }

    await FinanceRecord.findByIdAndDelete(req.params.id);
    res.json({ message: 'Finance record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting finance record', error: error.message });
  }
});

router.get('/reports/summary', verifyToken, authorizeRoles('Finance Officer', 'Super Admin'), async (req, res) => {
  try {
    const [summaryData, departmentTotals] = await Promise.all([
      FinanceRecord.aggregate([
        {
          $group: {
            _id: null,
            totalBudgetRequested: {
              $sum: {
                $cond: [{ $eq: ['$category', 'Budget'] }, '$amountRequested', 0],
              },
            },
            totalBudgetApproved: {
              $sum: {
                $cond: [{ $eq: ['$category', 'Budget'] }, '$amountApproved', 0],
              },
            },
            totalExpenditure: {
              $sum: {
                $cond: [{ $eq: ['$category', 'Expenditure'] }, '$amountSpent', 0],
              },
            },
            totalPayments: {
              $sum: {
                $cond: [{ $eq: ['$category', 'Payment'] }, '$amountSpent', 0],
              },
            },
            recordCount: { $sum: 1 },
          },
        },
      ]),
      FinanceRecord.aggregate([
        {
          $group: {
            _id: '$department',
            totalSpent: { $sum: '$amountSpent' },
            totalApproved: { $sum: '$amountApproved' },
            totalRequested: { $sum: '$amountRequested' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const departments = await Department.find({ _id: { $in: departmentTotals.map((item) => item._id).filter(Boolean) } }).select('name');

    const departmentSpending = departmentTotals.map((item) => ({
      departmentId: item._id,
      departmentName: departments.find((dep) => dep._id.equals(item._id))?.name || 'Unknown',
      totalSpent: item.totalSpent,
      totalApproved: item.totalApproved,
      totalRequested: item.totalRequested,
      count: item.count,
    }));

    res.json({
      summary: summaryData[0] || {
        totalBudgetRequested: 0,
        totalBudgetApproved: 0,
        totalExpenditure: 0,
        totalPayments: 0,
        recordCount: 0,
      },
      departmentSpending,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating finance summaries', error: error.message });
  }
});

module.exports = router;
