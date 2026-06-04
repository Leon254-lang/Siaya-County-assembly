const express = require('express');
const Bill = require('../models/Bill');
const User = require('../models/User');
const Committee = require('../models/Committee');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

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

    const bills = await Bill.find(query).populate('proposer committee motions.proposer committeeRecommendations.committee committeeRecommendations.recommendedBy');
    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: 'Error loading bills', error: error.message });
  }
});

// Create a bill (Draft or Submitted)
router.post('/', verifyToken, authorizeRoles('Super Admin', 'Clerk', 'MCA', 'Committee Officer'), async (req, res) => {
  try {
    const { title, summary, committee: committeeId, status = 'Draft', documents = [] } = req.body;
    const bill = new Bill({ title, summary, proposer: req.user._id, committee: committeeId, status, documents });
    await bill.save();
    await bill.populate('proposer committee');
    res.status(201).json(bill);
  } catch (error) {
    res.status(500).json({ message: 'Error creating bill', error: error.message });
  }
});

// Get bill by id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('proposer committee motions.proposer committeeRecommendations.committee committeeRecommendations.recommendedBy');
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: 'Error loading bill', error: error.message });
  }
});

// Update bill (title, summary, status, documents)
router.put('/:id', verifyToken, authorizeRoles('Super Admin', 'Clerk', 'MCA', 'Committee Officer'), async (req, res) => {
  try {
    const update = req.body;
    const bill = await Bill.findByIdAndUpdate(req.params.id, update, { new: true }).populate('proposer committee');
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
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
    await bill.save();
    await bill.populate('motions.proposer');
    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: 'Error submitting motion', error: error.message });
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
