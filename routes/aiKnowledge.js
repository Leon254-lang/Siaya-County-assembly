const express = require('express');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

const defaultFeedback = [
  {
    id: 'fb-001',
    question: 'What bills are currently under committee review?',
    answer: 'I found two bills under review with committee recommendations.',
    outcome: 'correct',
    correctedAnswer: '',
    createdAt: '2026-09-09T09:15:00.000Z',
    admin: 'System Admin'
  },
  {
    id: 'fb-002',
    question: 'When is the next education committee meeting?',
    answer: 'The next education committee meeting is next Friday at 10 AM.',
    outcome: 'incorrect',
    correctedAnswer: 'I could not find that meeting in the available Assembly records. Please confirm the committee schedule from the current meeting calendar.',
    createdAt: '2026-09-09T16:40:00.000Z',
    admin: 'System Admin'
  }
];

const buildKnowledgeSummary = (input = {}) => {
  const stats = {
    documents: Number(input.totalDocuments ?? 1247),
    processed: Number(input.processedDocuments ?? 1239),
    pending: Number(input.pendingDocuments ?? 8),
    knowledgeChunks: Number(input.knowledgeChunks ?? 48392),
    lastUpdated: input.lastUpdated || '2026-09-10T00:00:00.000Z',
    accuracy: Number(input.averageAccuracy ?? 87),
    questionsToday: Number(input.questionsToday ?? 342),
    unansweredQuestions: Number(input.unansweredQuestions ?? 12)
  };

  return {
    documents: stats.documents,
    processed: stats.processed,
    pending: stats.pending,
    knowledgeChunks: stats.knowledgeChunks,
    lastUpdated: stats.lastUpdated,
    accuracy: stats.accuracy,
    questionsToday: stats.questionsToday,
    unansweredQuestions: stats.unansweredQuestions,
    processedRatio: Math.round((stats.processed / Math.max(stats.documents, 1)) * 100),
    accuracyBar: Math.max(0, Math.min(100, stats.accuracy)),
    lastUpdatedLabel: new Date(stats.lastUpdated).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  };
};

router.get('/summary', verifyToken, authorizeRoles('Super Admin', 'ICT Admin'), async (req, res) => {
  const summary = buildKnowledgeSummary();
  res.json(summary);
});

router.get('/feedback', verifyToken, authorizeRoles('Super Admin', 'ICT Admin'), async (req, res) => {
  res.json({
    feedback: defaultFeedback,
    total: defaultFeedback.length,
    correct: defaultFeedback.filter((item) => item.outcome === 'correct').length,
    incorrect: defaultFeedback.filter((item) => item.outcome === 'incorrect').length
  });
});

router.post('/feedback', verifyToken, authorizeRoles('Super Admin', 'ICT Admin'), async (req, res) => {
  const { question = '', answer = '', outcome = 'correct', correctedAnswer = '', notes = '' } = req.body || {};

  if (!question || !answer) {
    return res.status(400).json({ message: 'Question and answer are required.' });
  }

  const feedbackEntry = {
    id: `fb-${Date.now()}`,
    question: String(question).trim(),
    answer: String(answer).trim(),
    outcome: outcome === 'incorrect' ? 'incorrect' : 'correct',
    correctedAnswer: String(correctedAnswer || '').trim(),
    notes: String(notes || '').trim(),
    createdAt: new Date().toISOString(),
    admin: req.user?.name || 'Administrator'
  };

  defaultFeedback.unshift(feedbackEntry);

  res.status(201).json({
    message: 'AI answer feedback recorded successfully.',
    feedback: feedbackEntry
  });
});

module.exports = router;
module.exports.buildKnowledgeSummary = buildKnowledgeSummary;
