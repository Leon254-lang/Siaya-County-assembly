const csvEscape = (value) => {
  const safeValue = value == null ? '' : String(value);
  return `"${safeValue.replace(/"/g, '""')}"`;
};

export function calculatePerformanceSummary(appraisals) {
  const total = appraisals.length;
  const reviewed = appraisals.filter((item) => item.status === 'Reviewed').length;
  const pending = total - reviewed;
  const averageScore = total
    ? (appraisals.reduce((sum, item) => sum + Number(item.score || 0), 0) / total).toFixed(1)
    : '0.0';

  const sorted = [...appraisals].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
  const topPerformers = sorted.slice(0, 3);
  const needsAttention = [...appraisals]
    .filter((item) => Number(item.score || 0) < 3.5)
    .sort((a, b) => Number(a.score || 0) - Number(b.score || 0))
    .slice(0, 3);

  const departmentTotals = appraisals.reduce((acc, item) => {
    const department = item.department || 'General';
    if (!acc[department]) acc[department] = { total: 0, score: 0 };
    acc[department].total += 1;
    acc[department].score += Number(item.score || 0);
    return acc;
  }, {});

  const departmentAverages = Object.entries(departmentTotals).reduce((acc, [department, values]) => {
    acc[department] = (values.score / values.total).toFixed(1);
    return acc;
  }, {});

  return {
    total,
    reviewed,
    pending,
    averageScore,
    topPerformers,
    needsAttention,
    departmentAverages,
  };
}

export function generateAppraisalCsv(appraisals) {
  const headers = ['Employee', 'Department', 'Period', 'Score', 'Rating', 'Status', 'Due Date', 'Achievements', 'Manager Comments'];
  const rows = appraisals.map((item) => [
    item.employeeName,
    item.department,
    item.period,
    item.score,
    item.rating,
    item.status,
    item.dueDate || '',
    item.achievements || '',
    item.managerComments || '',
  ]);

  const lines = [headers.join(','), ...rows.map((row) => row.map(csvEscape).join(','))];
  return lines.join('\n');
}
