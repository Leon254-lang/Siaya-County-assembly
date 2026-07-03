const express = require('express');
const ProcurementRecord = require('../models/ProcurementRecord');
const Announcement = require('../models/Announcement');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', verifyToken, authorizeRoles('Super Admin', 'Procurement Officer', 'Clerk'), async (req, res) => {
  try {
    const records = await ProcurementRecord.find().sort({ createdAt: -1 });
    res.json({ records });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching procurement records', error: error.message });
  }
});

// Return procurement records belonging to the logged in user (their department or requestedBy)
router.get('/mine', verifyToken, async (req, res) => {
  try {
    const user = req.user || {};
    const deptName = (user?.department?.name || user?.department || '').toString();
    const userName = (user?.name || '').toString();

    const query = {
      $or: [
        { department: deptName },
        { requestedBy: userName }
      ]
    };

    const records = await ProcurementRecord.find(query).sort({ createdAt: -1 });
    res.json({ records });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching your procurement records', error: error.message });
  }
});

// Get a single procurement record by id. Procurement roles may access any, others only their own.
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const record = await ProcurementRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    const userRole = req.user?.role?.name || req.user?.role || '';
    const procurementRoles = ['Super Admin', 'Procurement Officer', 'Clerk'];
    const isProcurementAdmin = procurementRoles.includes(userRole);

    if (!isProcurementAdmin) {
      const reqDept = (record.department || '').toString().toLowerCase();
      const userDept = (req.user?.department?.name || req.user?.department || '').toString().toLowerCase();
      const userName = (req.user?.name || '').toString();
      if (reqDept !== userDept && record.requestedBy !== userName) {
        return res.status(403).json({ message: 'Access denied: you may only view your own procurement records.' });
      }
    }

    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching procurement record', error: error.message });
  }
});

router.post('/', verifyToken, async (req, res) => {
  try {
    const payload = { ...req.body };
    const userRole = req.user?.role?.name || req.user?.role || '';
    const isProcurementAdmin = ['Super Admin', 'Procurement Officer', 'Clerk'].includes(userRole);

    // Only procurement administrators can create procurement records other than requisition requests.
    if (payload.type !== 'requisition' && !isProcurementAdmin) {
      return res.status(403).json({ message: 'Access denied: only procurement or clerk users can create procurement records.' });
    }

    if (payload.type === 'requisition') {
      payload.status = payload.status || 'Pending Procurement Approval';
      payload.workflowStage = payload.workflowStage || 'Requested';
      payload.requestedBy = payload.requestedBy || req.user?.name || 'Department';
      payload.department = payload.department || req.user?.department?.name || req.user?.department || 'Unknown';
    }

    const record = await ProcurementRecord.create(payload);

    if (payload.type === 'requisition') {
      const announcement = new Announcement({
        title: `New procurement requisition request from ${payload.department || 'a department'}`,
        body: `${payload.requestedBy || 'A user'} has requested a procurement requisition titled "${payload.title}" for ${payload.department || 'their department'}. Review this request in Procurement.`,
        type: 'notice',
        targetRoles: ['Procurement Officer'],
        createdBy: req.user._id,
      });
      await announcement.save();
    }

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error creating procurement record', error: error.message });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const record = await ProcurementRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    const userRole = req.user?.role?.name || req.user?.role || '';
    const procurementRoles = ['Super Admin', 'Procurement Officer', 'Clerk'];
    const isProcurementAdmin = procurementRoles.includes(userRole);

    const payload = { ...req.body };

    // If status change requested, enforce role privileges
    if (payload.status && payload.status !== record.status) {
      const newStatus = String(payload.status || '').trim();

      // Department submission to registry allowed by department users when procurement has activated the requisition
      if (newStatus === 'Submitted to Registry') {
        const reqDept = (record.department || '').toString().toLowerCase();
        const userDept = (req.user?.department?.name || req.user?.department || '').toString().toLowerCase();
        if (!isProcurementAdmin && reqDept !== userDept) {
          return res.status(403).json({ message: 'Only the requesting department may submit the completed requisition.' });
        }
      } else {
        // All other status transitions require procurement/clerk/super admin
        if (!isProcurementAdmin) {
          return res.status(403).json({ message: 'Access denied: only procurement, clerk or super admin can change this status.' });
        }
      }
    }

    // Allow department users to update items/description when requisition has been activated by procurement
    if (payload.items || payload.description || payload.amount || payload.priority) {
      const reqDept = (record.department || '').toString().toLowerCase();
      const userDept = (req.user?.department?.name || req.user?.department || '').toString().toLowerCase();
      const canEditItems = isProcurementAdmin || reqDept === userDept;
      if (!canEditItems) {
        return res.status(403).json({ message: 'Access denied: only procurement or the requesting department can edit requisition details.' });
      }
    }

    // Apply allowed updates
    const allowedFields = ['title','department','amount','priority','requestedBy','description','items','registryNotes','clerkNotes','storeNotes','status','workflowStage','registryComments','clerkComments','storeComments'];
    allowedFields.forEach((f) => {
      if (Object.prototype.hasOwnProperty.call(payload, f)) {
        record[f] = payload[f];
      }
    });

    await record.save();

    // Create announcements on key transitions
    try {
      if (payload.status && payload.status !== record.status) {
        const s = String(payload.status).toLowerCase();
        let ann = null;
        if (s.includes('procurement approved') || s.includes('procurement approved'.toLowerCase())) {
          ann = { title: `Requisition activated: ${record.title}`, body: `Procurement approved the requisition titled "${record.title}". The requesting department may now complete the requisition form.`, targetRoles: ['Procurement Officer'], type: 'notice' };
        } else if (s === 'submitted to registry' || s.includes('submitted to registry')) {
          ann = { title: `Requisition submitted to Registry: ${record.title}`, body: `The department ${record.department || 'N/A'} has submitted the completed requisition titled "${record.title}" for registry verification.`, targetRoles: ['Procurement Officer'], type: 'notice' };
        } else if (s === 'submitted to clerk' || s.includes('submitted to clerk')) {
          ann = { title: `Requisition forwarded to Clerk: ${record.title}`, body: `Registry forwarded requisition titled "${record.title}" to the Clerk for approval.`, targetRoles: ['Clerk'], type: 'notice' };
        } else if (s === 'stores approved' || s.includes('stores approved')) {
          ann = { title: `Requisition approved by Stores: ${record.title}`, body: `Stores approved the requisition titled "${record.title}". Proceed with issuance or procurement as required.`, targetRoles: ['Procurement Officer'], type: 'notice' };
        } else if (s === 'completed' || s.includes('completed')) {
          ann = { title: `Requisition completed: ${record.title}`, body: `The requisition titled "${record.title}" has been completed and items delivered to the requesting department.`, targetRoles: [], type: 'announcement' };
        }

        if (ann) {
          const a = new Announcement({
            title: ann.title,
            body: ann.body,
            type: ann.type || 'notice',
            targetRoles: ann.targetRoles || [],
            createdBy: req.user._id,
          });
          await a.save();
        }
      }
    } catch (errAnn) {
      console.error('Failed to create procurement announcement:', errAnn);
    }

    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error updating procurement record', error: error.message });
  }
});

router.delete('/:id', verifyToken, authorizeRoles('Super Admin', 'Procurement Officer', 'Clerk'), async (req, res) => {
  try {
    const record = await ProcurementRecord.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting procurement record', error: error.message });
  }
});

module.exports = router;
