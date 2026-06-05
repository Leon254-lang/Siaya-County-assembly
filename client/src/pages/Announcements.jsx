import { useEffect, useState } from 'react';
import api from '../services/api';

const announcementTypes = [
  { value: 'announcement', label: 'Announcement' },
  { value: 'notice', label: 'Notice' },
];

const allowedCreators = ['Super Admin', 'Committee Officer', 'HR Officer', 'Finance Officer', 'ICT Admin', 'Clerk', 'Procurement Officer'];

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ title: '', body: '', type: 'announcement', targetDepartment: '' });
  const [isCreating, setIsCreating] = useState(false);
  const userRole = localStorage.getItem('userRole');
  const canCreate = allowedCreators.includes(userRole);

  useEffect(() => {
    fetchAnnouncements();
    fetchDepartments();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      const response = await api.get(`/communications/announcements?${params.toString()}`);
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Failed to load announcements:', error);
      setMessage('Unable to load announcements at this time.');
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      const payload = {
        title: form.title,
        body: form.body,
        type: form.type,
        targetDepartments: form.targetDepartment ? [form.targetDepartment] : [],
      };
      await api.post('/communications/announcements', payload);
      setForm({ title: '', body: '', type: 'announcement', targetDepartment: '' });
      setIsCreating(false);
      setMessage('Announcement created successfully.');
      fetchAnnouncements();
    } catch (error) {
      console.error('Failed to create announcement:', error);
      setMessage(error.response?.data?.message || 'Failed to create announcement.');
    }
  };

  const renderTarget = (item) => {
    if (!item.targetDepartments || item.targetDepartments.length === 0) {
      return 'All departments';
    }

    return item.targetDepartments.map((dept) => dept.name).join(', ');
  };

  return (
    <div className="card">
      <h1>Internal Communications</h1>
      <p>Publish announcements and notices to departments, committees, and staff.</p>

      {message && <div className="notification">{message}</div>}

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">All types</option>
          {announcementTypes.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button onClick={fetchAnnouncements}>Refresh</button>
        {canCreate && (
          <button onClick={() => setIsCreating((prev) => !prev)}>
            {isCreating ? 'Cancel' : 'Create Announcement'}
          </button>
        )}
      </div>

      {isCreating && canCreate && (
        <form onSubmit={handleSubmit} className="form-card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <input
              name="title"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Title"
              required
            />
            <textarea
              name="body"
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              placeholder="Message body"
              rows={4}
              required
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <select
                name="type"
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              >
                {announcementTypes.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <select
                name="targetDepartment"
                value={form.targetDepartment}
                onChange={(e) => setForm((prev) => ({ ...prev, targetDepartment: e.target.value }))}
              >
                <option value="">All departments</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <button type="submit">Publish</button>
          </div>
        </form>
      )}

      {announcements.length === 0 ? (
        <p>No announcements or notices found.</p>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {announcements.map((item) => (
            <div key={item._id} className="card announcement-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
                <div>
                  <h3>{item.title}</h3>
                  <span style={{ color: '#6b7280', textTransform: 'capitalize' }}>{item.type}</span>
                </div>
                <span>{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              <p>{item.body}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
                <span><strong>Target:</strong> {renderTarget(item)}</span>
                <span><strong>Author:</strong> {item.createdBy?.name || 'Unknown'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
