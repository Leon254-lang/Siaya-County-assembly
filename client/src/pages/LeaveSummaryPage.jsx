import { useState, useEffect } from 'react';
import api from '../services/api';

export default function LeaveSummaryPage() {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: 1, limit: 200 });
      const res = await api.get(`/leave?${params}`);
      setLeaveRequests(res.data.requests || []);
    } catch (err) {
      console.error('Failed to load leave requests', err);
    } finally {
      setLoading(false);
    }
  };

  const returned = leaveRequests.filter(l => l.returned).length;
  const approvedOpen = leaveRequests.filter(l => l.status === 'approved' && !l.returned).length;
  const pending = leaveRequests.filter(l => l.status === 'pending').length;

  return (
    <div className="card">
      <h2>HR Leave Summary</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <strong>Approved (open)</strong>
              <div style={{ fontSize: '1.25rem' }}>{approvedOpen}</div>
            </div>
            <div style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <strong>Returned</strong>
              <div style={{ fontSize: '1.25rem', color: '#10b981' }}>{returned}</div>
            </div>
            <div style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <strong>Pending</strong>
              <div style={{ fontSize: '1.25rem', color: '#f59e0b' }}>{pending}</div>
            </div>
          </div>

          <h3>Recently Returned</h3>
          <div className="table-responsive">
            <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Type</th>
                <th>Start</th>
                <th>End</th>
                <th>Return Date</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.filter(l => l.returned).slice(0, 20).map(r => (
                <tr key={r._id}>
                  <td>{r.user?.name || 'Unknown'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{r.type}</td>
                  <td>{new Date(r.startDate).toLocaleDateString()}</td>
                  <td>{new Date(r.endDate).toLocaleDateString()}</td>
                  <td>{r.returnDate ? new Date(r.returnDate).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
