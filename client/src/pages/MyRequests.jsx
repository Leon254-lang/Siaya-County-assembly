import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function MyRequests() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyRequests();
  }, []);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/procurement-records/mine');
      const all = res.data.records || [];
      setRecords(all.filter(r => r.type === 'requisition'));
    } catch (err) {
      console.error('Failed to load your requests', err);
    } finally {
      setLoading(false);
    }
  };

  const openEditor = async (record) => {
    try {
      // Fetch fresh copy
      const res = await api.get(`/procurement-records/${record._id}`);
      setSelected(res.data);
    } catch (err) {
      console.error('Failed to open record', err);
      if (err.response?.status === 403) {
        alert('You are not allowed to view this requisition.');
      }
    }
  };

  const handleAddItem = () => {
    setSelected(prev => ({ ...prev, items: [...(prev.items || []), { description: '', quantity: 1, unitPrice: 0 }] }));
  };

  const handleItemChange = (index, field, value) => {
    setSelected(prev => {
      const items = [...(prev.items || [])];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const handleRemoveItem = (index) => {
    setSelected(prev => {
      const items = [...(prev.items || [])];
      items.splice(index, 1);
      return { ...prev, items };
    });
  };

  const handleSave = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      const payload = {
        items: selected.items || [],
        description: selected.description || '',
        amount: Number(selected.amount) || 0,
        priority: selected.priority || 'Medium'
      };
      await api.put(`/procurement-records/${selected._id}`, payload);
      await fetchMyRequests();
      alert('Saved successfully');
    } catch (err) {
      console.error('Failed to save', err);
      alert(err.response?.data?.message || 'Failed to save requisition');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitToRegistry = async () => {
    if (!selected) return;
    if (!confirm('Submit this completed requisition to Registry?')) return;
    try {
      setSaving(true);
      await api.put(`/procurement-records/${selected._id}`, { status: 'Submitted to Registry', workflowStage: 'Submitted to Registry' });
      await fetchMyRequests();
      setSelected(null);
      alert('Submitted to Registry');
    } catch (err) {
      console.error('Failed to submit', err);
      alert(err.response?.data?.message || 'Failed to submit to registry');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card"><p>Loading your procurement requests...</p></div>;

  return (
    <div className="card">
      <h1>My Procurement Requests</h1>
      <p>View and complete department requisitions.</p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button onClick={fetchMyRequests}>Refresh</button>
        <button onClick={() => navigate('/documents')}>New Request</button>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          {records.length === 0 ? (
            <p>No requisitions found for your department.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r._id}>
                    <td style={{ fontWeight: 600 }}>{r.title}</td>
                    <td>{r.amount || 'N/A'}</td>
                    <td>{r.status}</td>
                    <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => openEditor(r)}>Edit / Complete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ width: '480px' }}>
          {selected ? (
            <div style={{ border: '1px solid #e5e7eb', padding: '1rem', borderRadius: '8px' }}>
              <h3>{selected.title}</h3>
              <label>
                Description
                <textarea value={selected.description || ''} onChange={(e) => setSelected({ ...selected, description: e.target.value })} rows={3} />
              </label>

              <label>
                Amount
                <input type="number" value={selected.amount || 0} onChange={(e) => setSelected({ ...selected, amount: e.target.value })} />
              </label>

              <div style={{ marginTop: '1rem' }}>
                <h4>Items</h4>
                {(selected.items || []).map((it, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px auto', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <input value={it.description || ''} onChange={(e) => handleItemChange(idx, 'description', e.target.value)} placeholder="Item description" />
                    <input type="number" value={it.quantity || 1} min={1} onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))} />
                    <input type="number" value={it.unitPrice || 0} min={0} onChange={(e) => handleItemChange(idx, 'unitPrice', Number(e.target.value))} />
                    <button onClick={() => handleRemoveItem(idx)}>Remove</button>
                  </div>
                ))}
                <button onClick={handleAddItem}>Add item</button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button onClick={handleSave} disabled={saving}>Save</button>
                <button onClick={handleSubmitToRegistry} disabled={saving}>Submit to Registry</button>
                <button onClick={() => setSelected(null)} className="secondary">Close</button>
              </div>
            </div>
          ) : (
            <div style={{ color: '#6b7280' }}><p>Select a requisition to continue.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
