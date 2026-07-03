import { useEffect, useState } from 'react';
import api from '../services/api';

export default function ProcurementRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/procurement-records');
      const data = (res.data.records || []).filter(r => r.type === 'requisition');
      setRequests(data);
    } catch (err) {
      console.error(err);
      setError('Unable to load procurement requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleApprove = async (id) => {
    try {
      await api.put(`/procurement-records/${id}`, { status: 'Procurement Approved', workflowStage: 'Procurement Approved' });
      setMessage('Request approved');
      await loadRequests();
    } catch (err) {
      console.error(err);
      setError('Failed to approve request');
    }
  };

  const handleReject = async (id) => {
    try {
      await api.put(`/procurement-records/${id}`, { status: 'Rejected', workflowStage: 'Rejected' });
      setMessage('Request rejected');
      await loadRequests();
    } catch (err) {
      console.error(err);
      setError('Failed to reject request');
    }
  };

  if (loading) return <div className="card">Loading procurement requests…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Procurement Requests</h1>
        <p>Incoming requisition requests submitted by departments.</p>
      </div>

      {message && <div className="notification success">{message} <button onClick={() => setMessage('')}>×</button></div>}
      {error && <div className="notification error">{error} <button onClick={() => setError('')}>×</button></div>}

      {requests.length === 0 ? (
        <div className="empty-state">No procurement requests found.</div>
      ) : (
        <div className="table-card" style={{ overflowX: 'auto' }}>
          <table className="file-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Department</th>
                <th>Amount</th>
                <th>Requested By</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r._id || r.id}>
                  <td>{r.title}</td>
                  <td>{r.department || 'N/A'}</td>
                  <td>{new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(r.amount || 0)}</td>
                  <td>{r.requestedBy || 'Department'}</td>
                  <td>{r.status || r.workflowStage || 'Requested'}</td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleApprove(r._id || r.id)}>Approve</button>
                    <button className="danger" onClick={() => handleReject(r._id || r.id)}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
