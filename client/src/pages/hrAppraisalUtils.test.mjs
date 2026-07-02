import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePerformanceSummary, generateAppraisalCsv } from './hrAppraisalUtils.mjs';

test('calculates summary metrics and top performers', () => {
  const appraisals = [
    { employeeName: 'Alice', score: 4.8, status: 'Reviewed', department: 'ICT' },
    { employeeName: 'Bob', score: 2.9, status: 'Pending Review', department: 'Finance' },
    { employeeName: 'Carol', score: 4.2, status: 'Reviewed', department: 'ICT' },
  ];

  const summary = calculatePerformanceSummary(appraisals);

  assert.equal(summary.total, 3);
  assert.equal(summary.reviewed, 2);
  assert.equal(summary.pending, 1);
  assert.equal(summary.averageScore, '4.0');
  assert.equal(summary.topPerformers[0].employeeName, 'Alice');
  assert.equal(summary.needsAttention[0].employeeName, 'Bob');
  assert.equal(summary.departmentAverages.ICT, '4.5');
});

test('generates CSV rows for appraisal exports', () => {
  const csv = generateAppraisalCsv([
    { employeeName: 'Alice', department: 'ICT', period: 'Annual', score: 4.8, rating: 'Excellent', status: 'Reviewed', dueDate: '2026-08-31', achievements: 'Led rollout', managerComments: 'Great work' },
  ]);

  assert.match(csv, /Employee,Department,Period,Score/);
  assert.match(csv, /Alice/);
  assert.match(csv, /Great work/);
});
