import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Stores() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const role = localStorage.getItem('userRole') || JSON.parse(localStorage.getItem('user') || 'null')?.role || '';
    if (!['Super Admin', 'Procurement Officer', 'Clerk'].includes(role)) {
      navigate('/dashboard');
      return;
    }
    loadStoresRecords();
  }, [navigate]);

  const loadStoresRecords = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/procurement-records');
      const storeRecords = (response.data.records || []).filter(
        (item) => item.type === 'requisition' && item.status === 'Submitted to Stores'
      );
      setRecords(storeRecords);
    } catch (err) {
      console.error(err);
      setError('Unable to load store requisitions.');
    } finally {
      setLoading(false);
    }
  };

  const updateRecord = async (id, payload, successMessage) => {
    setError('');
    setMessage('');
    try {
      await api.put(`/procurement-records/${id}`, payload);
      setMessage(successMessage);
      await loadStoresRecords();
    } catch (err) {
      console.error(err);
      setError('Unable to update requisition.');
    }
  };

  const handleApprove = async (item) => {
    await updateRecord(item._id || item.id, {
      status: 'Stores Approved',
      workflowStage: 'Stores Approved',
    }, 'Requisition approved by stores.');
  };

  const handleReject = async (item) => {
    await updateRecord(item._id || item.id, {
      status: 'Rejected',
      workflowStage: 'Rejected',
    }, 'Requisition rejected by stores.');
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>🏬 Stores Workflow</h1>
        <p>Review requisitions forwarded from clerk and complete final approval before procurement execution.</p>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <Link to="/procurement"><button type="button">Back to Procurement</button></Link>
        <Link to="/procurement/registry"><button type="button">Open Registry Workflow</button></Link>
      </div>

      {message && (
        <div className="notification success">
          {message}
          <button onClick={() => setMessage('')} style={{ marginLeft: '1rem' }}>×</button>
        </div>
      )}
      {error && (
        <div className="notification error">
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: '1rem' }}>×</button>
        </div>
      )}

      {loading ? (
        <div className="loading">Loading stores requisitions…</div>
      ) : records.length === 0 ? (
        <div className="empty-state">No requisitions are currently waiting in stores.</div>
      ) : (
        <div className="table-card" style={{ overflowX: 'auto' }}>
          <table className="file-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Department</th>
                <th>Amount</th>
                <th>Requested By</th>
                <th>Clerk Notes</th>
                <th>Items</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((item) => (
                <tr key={item._id || item.id}>
                  <td>{item.title}</td>
                  <td>{item.department || 'N/A'}</td>
                  <td>{new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(item.amount || 0)}</td>
                  <td>{item.requestedBy || 'Department'}</td>
                  <td>{item.clerkNotes || 'None'}</td>
                  <td>
                    {item.items?.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                        {item.items.map((line, index) => (
                          <li key={index}>{line.itemName} — {line.quantity} {line.unit} {line.justification ? `(${line.justification})` : ''}</li>
                        ))}
                      </ul>
                    ) : 'Not filled'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <button type="button" onClick={() => handleApprove(item)}>Approve</button>
                      <button type="button" className="danger" onClick={() => handleReject(item)}>Reject</button>
                    </div>
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
