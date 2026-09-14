const test = require('node:test');
const assert = require('node:assert/strict');

const { generateReferenceNumber, LEGISLATIVE_STATUS_FLOW, buildHistoryEntry } = require('../utils/legislativeTracking');

test('reference numbers are unique and category-aware', () => {
  const first = generateReferenceNumber('Motion');
  const second = generateReferenceNumber('Bill');
  assert.match(first, /^MOTION-/);
  assert.match(second, /^BILL-/);
  assert.notEqual(first, second);
});

test('status workflow includes the required legislative stages', () => {
  assert.deepEqual(LEGISLATIVE_STATUS_FLOW, ['Draft', 'Submitted', 'Reviewed', 'Approved', 'Rejected', 'Debated', 'Resolved']);
});

test('history entries record the step and actor', () => {
  const entry = buildHistoryEntry('Reviewed', 'Clerk', 'The item was reviewed by the clerk.');
  assert.equal(entry.status, 'Reviewed');
  assert.equal(entry.actor, 'Clerk');
  assert.match(entry.note, /reviewed/i);
  assert.ok(entry.timestamp);
});
