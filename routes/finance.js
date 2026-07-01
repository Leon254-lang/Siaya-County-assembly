const express = require('express');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { recordAudit } = require('../middleware/audit');
const FinanceRecord = require('../models/FinanceRecord');
const Department = require('../models/Department');

const router = express.Router();

router.get('/records', verifyToken, authorizeRoles('Finance Officer', 'Super Admin'), async (req, res) => {
  try {
    const {
      category,
      department,
      status,
      approvalStatus,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};
    if (category) query.category = category;
    if (department) query.department = department;
    if (status) query.status = status;
    if (approvalStatus) query.approvalStatus = approvalStatus;
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { vendor: new RegExp(search, 'i') },
        { referenceNumber: new RegExp(search, 'i') },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [records, total] = await Promise.all([
      FinanceRecord.find(query)
        .populate('department', 'name')
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      FinanceRecord.countDocuments(query),
    ]);

    res.json({
      records,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalRecords: total,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching finance records', error: error.message });
  }
});

router.get('/records/export', verifyToken, authorizeRoles('Finance Officer', 'Super Admin'), async (req, res) => {
  try {
    const { category, department, status, approvalStatus, search, format = 'csv' } = req.query;
    const query = {};
    if (category) query.category = category;
    if (department) query.department = department;
    if (status) query.status = status;
    if (approvalStatus) query.approvalStatus = approvalStatus;
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { vendor: new RegExp(search, 'i') },
        { referenceNumber: new RegExp(search, 'i') },
      ];
    }

    const records = await FinanceRecord.find(query)
      .populate('department', 'name')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    const rows = [
      ['Title', 'Category', 'Department', 'Amount Requested', 'Amount Approved', 'Amount Spent', 'Status', 'Approval', 'Vendor', 'Reference', 'Created By', 'Approved By', 'Created At'],
    ];

    for (const record of records) {
      rows.push([
        record.title || '',
        record.category || '',
        record.department?.name || '',
        record.amountRequested || 0,
        record.amountApproved || 0,
        record.amountSpent || 0,
        record.status || '',
        record.approvalStatus || '',
        record.vendor || '',
        record.referenceNumber || '',
        record.createdBy?.name || '',
        record.approvedBy?.name || '',
        record.createdAt ? record.createdAt.toISOString() : '',
      ]);
    }

    if (format === 'excel') {
      const htmlTable = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><table border="1">${rows
        .map(
          (row) => `<tr>${row.map((cell) => `<td>${String(cell).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`).join('')}</tr>`,
        )
        .join('')}</table></body></html>`;
      res.header('Content-Type', 'application/vnd.ms-excel');
      res.attachment('finance-records.xls');
      return res.send(htmlTable);
    }

    const csvContent = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.header('Content-Type', 'text/csv');
    res.attachment('finance-records.csv');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ message: 'Error exporting finance records', error: error.message });
  }
});

router.get('/audit', verifyToken, authorizeRoles('Finance Officer', 'Super Admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const AuditLog = require('../models/AuditLog');

    const query = { entity: 'FinanceRecord' };
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      logs,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalLogs: total,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching finance audit trail', error: error.message });
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

    await recordAudit({
      req,
      user: req.user,
      action: 'Created finance record',
      entity: 'FinanceRecord',
      entityId: record._id,
      details: { title: record.title, category: record.category, department: record.department?.name },
    });

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

    await recordAudit({
      req,
      user: req.user,
      action: 'Updated finance record',
      entity: 'FinanceRecord',
      entityId: record._id,
      details: { title: record.title, category: record.category, department: record.department?.name },
    });

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

    await recordAudit({
      req,
      user: req.user,
      action: 'Deleted finance record',
      entity: 'FinanceRecord',
      entityId: record._id,
      details: { title: record.title, category: record.category, department: record.department?.toString() },
    });

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
            revenueCollected: {
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
