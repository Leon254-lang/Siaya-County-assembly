const test = require('node:test');
const assert = require('node:assert/strict');
const { buildMemberQuery } = require('./memberFilters');

test('buildMemberQuery applies search and filters', () => {
  const query = buildMemberQuery({
    search: 'Jane',
    ward: 'West A',
    party: 'ODM',
    committee: '507f1f77bcf86cd799439011',
    includeInactive: false,
  });

  assert.equal(query.isActive, true);
  assert.equal(query.ward, 'West A');
  assert.equal(query.party, 'ODM');
  assert.deepEqual(query.committeeMemberships, '507f1f77bcf86cd799439011');
  assert.deepEqual(query.$or[0], { name: /Jane/i });
});
