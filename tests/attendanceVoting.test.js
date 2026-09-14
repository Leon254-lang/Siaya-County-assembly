const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateQuorum } = require('../utils/attendanceVoting');
const { buildWorkflowEvent } = require('../utils/workflow');

test('calculateQuorum counts present, confirmed and late invited members', () => {
  const result = calculateQuorum(
    [{ _id: 'm1' }, { _id: 'm2' }, { _id: 'm3' }],
    [
      { user: 'm1', status: 'Present' },
      { user: 'm2', status: 'Late' },
      { user: 'm3', status: 'Absent' },
    ]
  );

  assert.deepEqual(result, { eligible: 3, present: 2, required: 2, met: true });
});

test('workflow events capture actor, decision, reason, next officer and timestamp', () => {
  const event = buildWorkflowEvent({
    actor: 'actor-1',
    action: 'approved',
    status: 'Approved',
    comment: 'Ready for publication',
    nextResponsibleOfficer: 'officer-2',
  });

  assert.deepEqual(event, {
    actor: 'actor-1',
    action: 'approved',
    status: 'Approved',
    comment: 'Ready for publication',
    nextResponsibleOfficer: 'officer-2',
    at: event.at,
  });
  assert.ok(event.at instanceof Date);
});