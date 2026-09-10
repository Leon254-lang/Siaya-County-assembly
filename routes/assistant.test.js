const test = require('node:test');
const assert = require('node:assert/strict');
const assistant = require('./assistant');

test('assistant exports the text-aware document index builder', () => {
  assert.equal(typeof assistant.buildKnowledgeIndex, 'function');
  assert.equal(typeof assistant.extractTextFromDocument, 'function');
});

test('document text extraction includes transcript and metadata text for search indexing', () => {
  const text = assistant.extractTextFromDocument({
    title: 'Budget briefing',
    description: 'Committee discussed procurement and budget planning.',
    tags: ['budget', 'procurement'],
    files: [{ originalName: 'brief.pdf', path: 'uploads/mock.pdf', mimeType: 'application/pdf' }],
    approvalHistory: [{ comment: 'Budget approved after review.' }],
  }, 'uploads/mock.pdf');

  assert.match(text, /budget/i);
  assert.match(text, /procurement/i);
  assert.match(text, /approved/i);
});

test('natural language parsing resolves committee meeting questions', () => {
  const parsed = assistant.parseNaturalLanguageRequest('When is the next education committee meeting?');
  assert.equal(parsed.entity, 'meeting');
  assert.equal(parsed.action, 'next');
  assert.match(parsed.committeeName || '', /education/i);
  assert.equal(parsed.meetingType, 'committee');
});

test('natural language parsing resolves bill status questions', () => {
  const parsed = assistant.parseNaturalLanguageRequest('Show me the bills currently under consideration.');
  assert.equal(parsed.entity, 'bill');
  assert.equal(parsed.action, 'list');
  assert.ok(parsed.statusFilters.includes('Committee Review'));
});

test('query planner explains the interpreted conditions and evidence snippets are surfaced', () => {
  const planned = assistant.parseNaturalLanguageRequest('When is the next education committee meeting and who is attending?');
  assert.equal(planned.action, 'next');
  assert.equal(planned.entity, 'meeting');
  assert.ok(planned.conditions.some((condition) => condition.type === 'committee'));
  assert.ok(planned.conditions.some((condition) => condition.type === 'attendance'));

  const snippet = assistant.extractEvidenceSnippet('Education committee met to discuss school infrastructure and attendance from members was recorded.', ['education', 'attendance']);
  assert.match(snippet, /education|attendance/i);
});

test('role-based access restricts citizens to public-only knowledge', () => {
  const filtered = assistant.filterEvidenceByRole([
    { title: 'Budget briefing', category: 'Financial and Procurement' },
    { title: 'Public hearing notice', category: 'Public Participation' },
    { title: 'Education committee meeting', category: 'Meetings and Proceedings' },
    { title: 'Committee report', category: 'Assembly Governance' }
  ], 'Citizen');

  assert.equal(filtered.length, 3);
  assert.ok(filtered.every((entry) => ['Public Participation', 'Meetings and Proceedings', 'Assembly Governance'].includes(entry.category)));
  assert.ok(!filtered.some((entry) => entry.category === 'Financial and Procurement'));
});

test('knowledge base exposes the expected ICAMS domain tree', () => {
  const tree = assistant.getKnowledgeBaseTree();
  assert.ok(tree['ICAMS AI KNOWLEDGE BASE']);
  assert.ok(tree['ICAMS AI KNOWLEDGE BASE'].Assembly);
  assert.ok(tree['ICAMS AI KNOWLEDGE BASE'].Legislation);
  assert.ok(tree['ICAMS AI KNOWLEDGE BASE'].Committees);
  assert.ok(tree['ICAMS AI KNOWLEDGE BASE'].Meetings);
  assert.ok(tree['ICAMS AI KNOWLEDGE BASE'].Finance);
  assert.ok(tree['ICAMS AI KNOWLEDGE BASE'].Public_Participation);
  assert.ok(tree.categories.some((category) => category.knowledgeArea === 'Assembly'));
});

test('assistant attaches a source citation and view source URL to each result', () => {
  const citation = assistant.buildSourceCitation({
    type: 'Meeting',
    title: 'Finance Committee Minutes',
    relatedDate: '2026-09-04T00:00:00.000Z',
    sourceType: 'Committee meeting record'
  });

  assert.ok(citation.label.includes('Finance Committee Minutes'));
  assert.ok(citation.label.includes('2026'));
  assert.equal(citation.url, '/meetings');
});

test('assistant detects and validates action requests before executing them', () => {
  const action = assistant.detectAssistantAction('Schedule a committee meeting for Friday at 10:00 AM in Boardroom 2.');
  assert.equal(action.type, 'schedule_meeting');

  const confirmationRequired = assistant.executeAssistantAction('Show me all overdue committee action items.', { role: { name: 'Clerk' } });
  assert.ok(confirmationRequired && confirmationRequired.type === 'list_overdue_action_items');
  assert.equal(confirmationRequired.status, 'confirmation_required');

  const outcome = assistant.executeAssistantAction('Show me all overdue committee action items.', { role: { name: 'Clerk' } }, { confirmAction: true });
  assert.ok(outcome && outcome.type === 'list_overdue_action_items');
  assert.ok(['completed', 'denied'].includes(outcome.status));
});

test('AI training center helpers provide the expected knowledge management summary fields', () => {
  const knowledge = require('./aiKnowledge');
  const summary = knowledge.buildKnowledgeSummary({
    totalDocuments: 1247,
    processedDocuments: 1239,
    pendingDocuments: 8,
    knowledgeChunks: 48392,
    lastUpdated: '2026-09-10T00:00:00.000Z',
    averageAccuracy: 87,
    questionsToday: 342,
    unansweredQuestions: 12,
  });

  assert.equal(summary.documents, 1247);
  assert.equal(summary.processed, 1239);
  assert.equal(summary.pending, 8);
  assert.equal(summary.knowledgeChunks, 48392);
  assert.equal(summary.accuracy, 87);
  assert.equal(summary.questionsToday, 342);
  assert.equal(summary.unansweredQuestions, 12);
});
