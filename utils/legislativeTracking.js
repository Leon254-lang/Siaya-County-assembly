const LEGISLATIVE_STATUS_FLOW = ['Draft', 'Submitted', 'Reviewed', 'Approved', 'Rejected', 'Debated', 'Resolved'];

const generateReferenceNumber = (type = 'Bill') => {
  const prefixMap = {
    Bill: 'BILL',
    Motion: 'MOTION',
    Question: 'QUESTION',
    Resolution: 'RESOLUTION',
  };

  const prefix = prefixMap[type] || 'ITEM';
  const stamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${random}`;
};

const buildHistoryEntry = (status, actor = 'System', note = '') => ({
  status,
  actor,
  note,
  timestamp: new Date(),
});

module.exports = {
  LEGISLATIVE_STATUS_FLOW,
  generateReferenceNumber,
  buildHistoryEntry,
};
