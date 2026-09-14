import { useEffect, useState } from 'react';
import api from '../services/api';

const labels = {
  calendar: 'Sitting calendar',
  pendingMotions: 'Pending motions',
  attendancePresent: 'Attendance records',
  decisionsAwaitingAction: 'Decisions awaiting action',
  pendingApprovals: 'Pending approvals',
  documentsAwaitingPublication: 'Documents awaiting publication',
  committeeDeadlines: 'Committee deadlines',
  personalAttendance: 'Personal attendance',
  assignedCommitteeWork: 'Assigned committee work',
  submittedMotions: 'Submitted motions',
  activeUsers: 'Active users',
  systemActivity: 'System activity',
  securityEvents: 'Security events',
  publishedBills: 'Published bills',
  notices: 'Published notices',
  publishedReports: 'Published reports',
};

const download = async (format) => {
  const response = await api.get(`/reports/export?format=${format}`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dashboard-report.${format === 'pdf' ? 'pdf' : 'xls'}`;
  link.click();
  URL.revokeObjectURL(url);
};

export default function ReportsDashboard({ publicView = false }) {
  const [report, setReport] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get(publicView ? '/public/reports' : '/reports/dashboard')
      .then((response) => setReport(response.data))
      .catch(() => setMessage('Unable to load dashboard report.'));
  }, [publicView]);

  if (!report) return <div className="page"><div className="card">{message || 'Loading dashboard report...'}</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>{report.audience} Reports Dashboard</h1>
        <p>Role-specific operational summaries and exportable reports.</p>
      </div>
      {message && <div className="notification">{message}</div>}
      {!publicView && <div className="action-group"><button type="button" onClick={() => download('pdf')}>Export PDF</button><button type="button" onClick={() => download('excel')}>Export Excel</button></div>}
      <div className="dashboard-grid">
        {Object.entries(report).filter(([key]) => key !== 'audience').map(([key, value]) => (
          <section className="card" key={key}>
            <h2>{labels[key] || key}</h2>
            {Array.isArray(value) ? (
              value.length === 0 ? <p>No records.</p> : <div className="list-panel">{value.slice(0, 12).map((item, index) => <div className="list-item" key={item._id || `${key}-${index}`}><strong>{item.title || item.name || item.question || item.status || item.date || 'Record'}</strong><div>{item.status || item.startTime || item.createdAt || item.description || ''}</div></div>)}</div>
            ) : <p className="stat-number">{value}</p>}
          </section>
        ))}
      </div>
    </div>
  );
}