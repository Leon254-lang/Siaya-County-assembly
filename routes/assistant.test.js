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

test('AI security center calculates risk scores and flags serious threats', () => {
  const security = require('./security');
  const risk = security.scoreRisk({
    failedLogins: 7,
    novelDevice: true,
    suspiciousDownload: true,
    ipMismatch: true,
    unusualAccess: true,
    geolocationMismatch: true,
  });

  assert.equal(risk.score >= 85, true);
  assert.equal(risk.severity, 'critical');
  assert.equal(risk.lockdown, true);
  assert.ok(Array.isArray(risk.reasons));
});

test('login security events classify suspicious behavior with a risk score and threat level', () => {
  const security = require('./security');
  const event = security.buildLoginSecurityEvent({
    user: {
      name: 'mca_023',
      lastLoginLocation: 'Nairobi',
      lastLoginDevice: 'Chrome / Windows',
      lastLoginIp: '10.0.0.12',
      failedLoginAttempts: 4,
    },
    currentIp: '192.168.1.45',
    device: 'Chrome / Ubuntu',
    location: 'Kisumu',
    previousLogin: 'Nairobi',
    currentLogin: 'Kisumu',
    failedAttempts: 4,
  });

  assert.equal(event.user, 'mca_023');
  assert.equal(event.riskScore >= 85, true);
  assert.equal(event.threatLevel, 'HIGH');
  assert.match(event.message, /Suspicious login behavior detected/i);
  assert.equal(event.failedAttempts, 4);
});

test('failed login detection creates a security incident for brute-force activity over 10 minutes', () => {
  const security = require('./security');
  const now = Date.now();
  const incident = security.buildFailedLoginSecurityEvent({
    user: 'mca_023',
    recentFailureTimestamps: [
      new Date(now - 9 * 60 * 1000),
      new Date(now - 8 * 60 * 1000),
      new Date(now - 7 * 60 * 1000),
      new Date(now - 6 * 60 * 1000),
      new Date(now - 5 * 60 * 1000),
      new Date(now - 4 * 60 * 1000),
    ],
  });

  assert.equal(incident.incidentCreated, true);
  assert.equal(incident.threatLevel, 'HIGH');
  assert.equal(incident.count, 6);
  assert.ok(incident.message.includes('High-risk') || incident.message.includes('Suspicious'));
});

test('document access anomaly detection flags unusual finance downloads by a staff member', () => {
  const security = require('./security');
  const event = security.buildDocumentAccessAnomalyEvent({
    user: 'mca_023',
    role: 'Clerk',
    normalAccess: ['HR', 'Meetings', 'General Documents'],
    accessedDocuments: [
      { title: 'Finance/Budget_2026.pdf', category: 'Finance', sensitivity: 'high' },
      { title: 'Procurement/Tender_Information.pdf', category: 'Procurement', sensitivity: 'high' },
      { title: 'Budget Summary.xlsx', category: 'Finance', sensitivity: 'high' },
    ],
    totalCount: 50,
    timeWindowMinutes: 2,
    ip: '192.168.1.45',
    device: 'Chrome / Ubuntu',
    previousBehavior: 'HR, Meetings, General Documents',
    downloadFrequency: '50 files in 2 minutes',
  });

  assert.equal(event.flagged, true);
  assert.equal(event.threatLevel, 'HIGH');
  assert.equal(event.anomalyScore >= 75, true);
  assert.match(event.message, /Abnormal document access detected/i);
});

test('dynamic user risk score aggregates recent events and decays with age', () => {
  const security = require('./security');
  const now = new Date('2026-09-10T10:42:00.000Z');
  const profile = security.buildUserRiskProfile({
    user: 'mca_023',
    loginRisk: 30,
    accessRisk: 25,
    deviceRisk: 17,
    events: [
      { type: 'device', score: 10, timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString() },
      { type: 'login', score: 5, timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString() },
      { type: 'location', score: 20, timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString() },
      { type: 'access', score: 20, timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString() },
      { type: 'download', score: 15, timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString() },
      { type: 'login', score: 30, timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString() },
    ],
    now,
  });

  assert.equal(profile.user, 'mca_023');
  assert.equal(profile.components.loginRisk, 30);
  assert.equal(profile.components.accessRisk, 25);
  assert.equal(profile.components.deviceRisk, 17);
  assert.ok(profile.score >= 60);
  assert.ok(profile.score <= 100);
  assert.ok(profile.decayed); 
  assert.ok(Array.isArray(profile.recentEvents));
});

test('critical risk triggers an automatic incident and requires authorization before high-impact lockdown', () => {
  const security = require('./security');
  const action = security.buildCriticalSecurityResponse({
    user: 'Staff-023',
    riskScore: 94,
    reasons: ['Multiple failed logins', 'unusual device', 'mass document downloads'],
    autoLockdownEnabled: true,
    riskThreshold: 90,
    authorized: true,
    device: 'Chrome / Ubuntu',
    ip: '192.168.1.45',
  });

  assert.equal(action.incidentCreated, true);
  assert.equal(action.riskScore, 94);
  assert.equal(action.lockdownApplied, true);
  assert.equal(action.authorizationRequired, true);
  assert.match(action.message, /CRITICAL SECURITY INCIDENT/i);
  assert.match(action.action, /Session terminated and account temporarily locked/i);
});

test('incident action payload records the audit intent and captures the user action', () => {
  const security = require('./security');
  const incident = security.buildSecurityIncident({
    id: 'SEC-2026-0042',
    user: 'Staff-023',
    severity: 'CRITICAL',
    status: 'INVESTIGATING',
    detectedAt: '2026-09-10T10:42:00.000Z',
    indicators: ['Failed authentication', 'New device', 'Abnormal document access', 'Mass download'],
    score: 94,
  });

  const action = security.buildIncidentAction({
    incidentId: incident.id,
    action: 'Terminate Sessions',
    user: 'ICT Admin',
    actorRole: 'ICT Admin',
  });

  assert.equal(incident.id, 'SEC-2026-0042');
  assert.equal(incident.score, 94);
  assert.equal(action.action, 'Terminate Sessions');
  assert.equal(action.auditEvent, 'Security incident action performed');
  assert.match(action.summary, /Terminate Sessions/i);
});
