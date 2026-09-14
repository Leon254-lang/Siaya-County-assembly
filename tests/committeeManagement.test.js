const test = require('node:test');
const assert = require('node:assert/strict');

const { summarizeCommitteePerformance } = require('../utils/committeeManagement');

test('committee performance summary counts meetings, action items and overdue work', () => {
  const summary = summarizeCommitteePerformance([
    {
      title: 'Budget Review',
      attendees: [{ _id: 'm1' }, { _id: 'm2' }, { _id: 'm3' }],
      attendance: [
        { status: 'Present' },
        { status: 'Present' },
      ],
      actionItems: [
        { title: 'Submit budget memo', status: 'Completed' },
        { title: 'Follow up on variance report', status: 'Overdue' },
        { title: 'Review procurement note', status: 'Pending' },
      ],
    },
    {
      title: 'Roads Site Visit',
      attendees: [{ _id: 'm1' }, { _id: 'm2' }],
      attendance: [{ status: 'Present' }],
      actionItems: [
        { title: 'Finalize inspection report', status: 'Ongoing' },
      ],
    },
  ], { name: 'Budget Committee' });

  assert.equal(summary.totalMeetings, 2);
  assert.equal(summary.totalActionItems, 4);
  assert.equal(summary.completedActionItems, 1);
  assert.equal(summary.overdueActionItems, 1);
  assert.equal(summary.pendingActionItems, 2);
  assert.ok(summary.averageAttendance >= 0);
});

test('committee performance treats past unfinished deadlines as overdue', () => {
  const summary = summarizeCommitteePerformance([
    {
      attendees: [],
      attendance: [],
      actionItems: [
        { title: 'Past deadline', status: 'Pending', deadline: '2020-01-01T00:00:00.000Z' },
        { title: 'Completed deadline', status: 'Completed', deadline: '2020-01-01T00:00:00.000Z' },
      ],
    },
  ]);

  assert.equal(summary.overdueActionItems, 1);
});
