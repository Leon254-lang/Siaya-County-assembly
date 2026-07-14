import { useState, useEffect } from 'react';
import api from '../services/api';

export default function LeaveSummaryPage() {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

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
      setActionError('Unable to load leave requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveDecision = async (id, action, comments = '') => {
    try {
      setActionError('');
      setActionMessage('');
      if (action === 'approve') {
        await api.patch(`/hr/leave/${id}/approve`);
        setActionMessage('Leave approved successfully.');
      } else if (action === 'reject') {
        await api.patch(`/hr/leave/${id}/reject`, { comments });
        setActionMessage('Leave rejected successfully.');
      }
      fetchLeaveRequests();
    } catch (err) {
      console.error('Leave approval failed', err);
      setActionError(err.response?.data?.message || 'Leave approval action failed.');
    }
  };

  const returned = leaveRequests.filter(l => l.returned).length;
  const approvedOpen = leaveRequests.filter(l => l.status === 'approved' && !l.returned).length;
  const pending = leaveRequests.filter(l => l.status === 'pending').length;

  return (
    <div className="card">
      <h2>HR Leave Summary</h2>
      {actionError && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: 8, background: '#fee2e2', color: '#b91c1c' }}>
          {actionError}
        </div>
      )}
      {actionMessage && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: 8, background: '#dcfce7', color: '#166534' }}>
          {actionMessage}
        </div>
      )}
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

          <h3>Pending Leave Requests</h3>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Type</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Stage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map((r) => (
                  <tr key={r._id}>
                    <td>{r.user?.name || 'Unknown'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{r.type}</td>
                    <td>{new Date(r.startDate).toLocaleDateString()}</td>
                    <td>{new Date(r.endDate).toLocaleDateString()}</td>
                    <td>{r.daysRequested}</td>
                    <td>{r.status}</td>
                    <td>{r.workflowStage || 'Submitted to HR'}</td>
                    <td>
                      {r.status === 'pending' ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handleLeaveDecision(r._id, 'approve')}
                            style={{ padding: '0.4rem 0.75rem', borderRadius: 6, background: '#16a34a', color: 'white', border: 'none' }}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const comments = prompt('Enter rejection comments (optional)');
                              if (comments !== null) handleLeaveDecision(r._id, 'reject', comments);
                            }}
                            style={{ padding: '0.4rem 0.75rem', borderRadius: 6, background: '#dc2626', color: 'white', border: 'none' }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#6b7280' }}>{r.status}</span>
                      )}
                    </td>
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
