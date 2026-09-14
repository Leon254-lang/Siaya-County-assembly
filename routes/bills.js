const express = require('express');
const Bill = require('../models/Bill');
const User = require('../models/User');
const Committee = require('../models/Committee');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { LEGISLATIVE_STATUS_FLOW, buildHistoryEntry, generateReferenceNumber } = require('../utils/legislativeTracking');
const { buildWorkflowEvent } = require('../utils/workflow');
const { safeNotify } = require('../utils/notifications');
const { recordAudit } = require('../middleware/audit');

const computeDecision = (results) => {
  const yes = results.find((item) => item.option.toLowerCase() === 'yes')?.votes || 0;
  const no = results.find((item) => item.option.toLowerCase() === 'no')?.votes || 0;
  const abstain = results.find((item) => item.option.toLowerCase() === 'abstain')?.votes || 0;
  if (yes === no) return yes > 0 ? 'Tie' : 'No clear decision';
  return yes > no ? 'Approved' : 'Rejected';
};

const router = express.Router();

// List bills with optional status/committee filters
router.get('/', verifyToken, async (req, res) => {
  try {
    const { status, committee } = req.query;
    const query = {};
    if (status) query.status = status;
    if (committee) query.committee = committee;

    const bills = await Bill.find(query).populate('proposer committee motions.proposer motions.approvedBy motions.nextResponsibleOfficer motions.workflowHistory.actor motions.workflowHistory.nextResponsibleOfficer committeeRecommendations.committee committeeRecommendations.recommendedBy');
    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: 'Error loading bills', error: error.message });
  }
});

// Create a bill, motion, question or resolution with legislative workflow metadata
router.post('/', verifyToken, authorizeRoles('Super Admin', 'Clerk', 'MCA', 'Committee Officer'), async (req, res) => {
  try {
    const { title, summary, committee: committeeId, type = 'Bill', status = 'Draft', workflow = 'Draft', documents = [], category, department, sponsor, attachments = [], amendments = [], questions = [], resolution } = req.body;
    const itemType = ['Bill', 'Motion', 'Question', 'Resolution'].includes(type) ? type : 'Bill';
    const itemStatus = LEGISLATIVE_STATUS_FLOW.includes(status) ? status : (LEGISLATIVE_STATUS_FLOW.includes(workflow) ? workflow : 'Draft');
    const itemWorkflow = LEGISLATIVE_STATUS_FLOW.includes(workflow) ? workflow : itemStatus;
    const itemReference = generateReferenceNumber(itemType);
    const history = [buildHistoryEntry(itemWorkflow, req.user?.full_name || req.user?.name || 'System', `${itemType} created and assigned reference ${itemReference}.`)];

    const bill = new Bill({
      type: itemType,
      title,
      summary,
      proposer: req.user._id,
      sponsor: sponsor || req.user._id,
      committee: committeeId,
      category,
      department,
      status: itemStatus,
      workflow: itemWorkflow,
      documents,
      attachments,
      amendments,
      questions,
      resolution,
      referenceNumber: itemReference,
      history,
    });

    await bill.save();
    await bill.populate('proposer sponsor committee');
    res.status(201).json(bill);
  } catch (error) {
    res.status(500).json({ message: 'Error creating bill', error: error.message });
  }
});

// Get bill by id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('proposer committee motions.proposer motions.approvedBy motions.nextResponsibleOfficer motions.workflowHistory.actor motions.workflowHistory.nextResponsibleOfficer committeeRecommendations.committee committeeRecommendations.recommendedBy');
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: 'Error loading bill', error: error.message });
  }
});

// Update bill (title, summary, status, workflow, documents, attachments, amendments and history)
router.put('/:id', verifyToken, authorizeRoles('Super Admin', 'Clerk', 'MCA', 'Committee Officer'), async (req, res) => {
  try {
    const update = { ...req.body };
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    if (update.status && LEGISLATIVE_STATUS_FLOW.includes(update.status) && update.status !== bill.status) {
      const actor = req.user?.full_name || req.user?.name || 'System';
      bill.history = bill.history || [];
      bill.history.push(buildHistoryEntry(update.status, actor, `${bill.type || 'Bill'} moved to ${update.status}.`));
      bill.workflow = update.status;
    }

    Object.assign(bill, update);
    bill.status = bill.status || bill.workflow || 'Draft';
    bill.workflow = bill.workflow || bill.status || 'Draft';

    await bill.save();
    await bill.populate('proposer sponsor committee');
    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: 'Error updating bill', error: error.message });
  }
});

// Submit a motion on a bill
router.post('/:id/motions', verifyToken, authorizeRoles('MCA', 'Clerk', 'Super Admin'), async (req, res) => {
  try {
    const { text } = req.body;
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    bill.motions.push({ proposer: req.user._id, text });
    bill.motions[bill.motions.length - 1].workflowHistory.push(buildWorkflowEvent({
      actor: req.user._id,
      action: 'submitted',
      status: 'Pending',
      comment: 'Motion submitted for approval',
      nextResponsibleOfficer: req.body.nextResponsibleOfficer || null,
    }));
    await bill.save();
    await safeNotify({ userIds: [req.user._id], type: 'status_update', title: 'Motion submitted', body: `Your motion on ${bill.title} was submitted for approval.`, link: `/bills/${bill._id}` });
    await bill.populate('motions.proposer');
    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: 'Error submitting motion', error: error.message });
  }
});

router.post('/:id/motions/:motionId/decision', verifyToken, authorizeRoles('Clerk', 'Super Admin', 'Committee Officer'), async (req, res) => {
  try {
    const { decision, comment = '', nextResponsibleOfficer = null } = req.body;
    if (!['Accepted', 'Rejected'].includes(decision)) {
      return res.status(400).json({ message: 'Decision must be Accepted or Rejected' });
    }
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    const motion = bill.motions.id(req.params.motionId);
    if (!motion) return res.status(404).json({ message: 'Motion not found' });
    if (motion.status !== 'Pending') return res.status(400).json({ message: 'Only pending motions can be decided' });

    motion.status = decision;
    motion.approvedBy = req.user._id;
    motion.approvedAt = new Date();
    motion.comments = comment;
    motion.nextResponsibleOfficer = nextResponsibleOfficer || null;
    motion.workflowHistory.push(buildWorkflowEvent({
      actor: req.user._id,
      action: decision === 'Accepted' ? 'approved' : 'rejected',
      status: decision,
      comment,
      nextResponsibleOfficer,
    }));
    await bill.save();
    await safeNotify({ userIds: [motion.proposer], type: 'status_update', title: `Motion ${decision.toLowerCase()}`, body: comment || `Your motion on ${bill.title} was ${decision.toLowerCase()}.`, link: `/bills/${bill._id}` });
    await bill.populate('motions.proposer motions.approvedBy motions.nextResponsibleOfficer motions.workflowHistory.actor motions.workflowHistory.nextResponsibleOfficer');
    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: 'Error deciding motion', error: error.message });
  }
});

// Committee recommendation
router.post('/:id/recommendation', verifyToken, authorizeRoles('Committee Officer', 'Super Admin', 'Clerk'), async (req, res) => {
  try {
    const { recommendation } = req.body;
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    bill.committeeRecommendations.push({ committee: req.user.committeeMemberships?.[0], recommendation, recommendedBy: req.user._id });
    bill.status = 'Committee Review';
    await bill.save();
    await bill.populate('committeeRecommendations.committee committeeRecommendations.recommendedBy');
    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: 'Error adding recommendation', error: error.message });
  }
});

// Add voting item to bill
router.post('/:id/vote-item', verifyToken, authorizeRoles('Clerk', 'Super Admin', 'Committee Officer'), async (req, res) => {
  try {
    const { question, options, voteType } = req.body;
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    const item = {
      question,
      voteType: voteType || 'electronic',
      options: Array.isArray(options) ? options : [],
      results: (options || []).map((o) => ({ option: o, votes: 0 })),
      voteRecords: [],
      finalDecision: '',
    };
    bill.voting.items.push(item);
    bill.status = 'Voting';
    await bill.save();
    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: 'Error adding voting item', error: error.message });
  }
});

// Cast vote on bill voting item
router.post('/:id/vote', verifyToken, authorizeRoles('MCA', 'Clerk', 'Super Admin'), async (req, res) => {
  try {
    const { itemId, option } = req.body;
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    const item = bill.voting.items.id(itemId);
    if (!item) return res.status(404).json({ message: 'Voting item not found' });
    if (!item.options.includes(option)) return res.status(400).json({ message: 'Vote option is not available for this item' });
    if (item.voteRecords.some((record) => String(record.voter) === String(req.user._id))) {
      return res.status(409).json({ message: 'You have already voted on this item.' });
    }

    const result = item.results.find((r) => r.option === option);
    if (result) result.votes += 1;
    else item.results.push({ option, votes: 1 });

    item.voteRecords.push({
      voter: req.user._id,
      option,
    });
    item.finalDecision = computeDecision(item.results);
    item.talliedAt = new Date();

    await bill.save();
    await recordAudit({ req, action: 'Cast bill vote', entity: 'Bill', entityId: bill._id, details: { itemId, option }, after: item.toObject() });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error casting vote', error: error.message });
  }
});

router.get('/:id/voting-summary', verifyToken, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('proposer committee');
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    const summary = bill.voting.items.map((item) => ({
      _id: item._id,
      question: item.question,
      voteType: item.voteType,
      options: item.options,
      results: item.results,
      finalDecision: item.finalDecision || computeDecision(item.results),
      totalVotes: item.results.reduce((sum, result) => sum + (result.votes || 0), 0),
      talliedAt: item.talliedAt,
      castCount: item.voteRecords.length,
    }));

    res.json({ billId: bill._id, title: bill.title, status: bill.status, summary });
  } catch (error) {
    res.status(500).json({ message: 'Error loading voting summary', error: error.message });
  }
});

module.exports = router;
