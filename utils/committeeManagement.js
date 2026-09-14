const summarizeCommitteePerformance = (meetings = [], committee = {}) => {
  const items = (meetings || []).flatMap((meeting) => meeting.actionItems || []);
  const overdue = items.filter((item) => {
    const status = (item.status || '').toLowerCase();
    const dueDate = item.dueDate || item.deadline;
    return status === 'overdue' || (dueDate && new Date(dueDate) < new Date() && !['completed', 'cancelled'].includes(status));
  }).length;
  const completed = items.filter((item) => (item.status || '').toLowerCase() === 'completed').length;
  const pending = items.filter((item) => ['pending', 'ongoing'].includes((item.status || '').toLowerCase())).length;

  const attendanceValues = (meetings || []).map((meeting) => {
    const confirmed = Array.isArray(meeting.attendance) ? meeting.attendance.length : 0;
    const total = Array.isArray(meeting.attendees) ? meeting.attendees.length : 0;
    if (!total) return 0;
    return Number(((confirmed / total) * 100).toFixed(1));
  });

  const avgAttendance = attendanceValues.length ? Number((attendanceValues.reduce((sum, value) => sum + value, 0) / attendanceValues.length).toFixed(1)) : 0;

  return {
    committeeName: committee.name || 'Committee',
    totalMeetings: meetings.length,
    totalActionItems: items.length,
    completedActionItems: completed,
    overdueActionItems: overdue,
    pendingActionItems: pending,
    averageAttendance: avgAttendance,
    lastUpdated: new Date(),
  };
};

module.exports = {
  summarizeCommitteePerformance,
};
