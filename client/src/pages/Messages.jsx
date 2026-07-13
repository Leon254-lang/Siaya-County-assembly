import { useEffect, useState } from 'react';
import api from '../services/api';

const allowedToCreate = ['Super Admin', 'Committee Officer', 'HR Officer', 'Finance Officer', 'ICT Admin', 'Clerk', 'Procurement Officer', 'MCA', 'Intern', 'Security Officer'];

export default function Messages() {
  const [inbox, setInbox] = useState([]);
  const [sent, setSent] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('inbox');
  const [message, setMessage] = useState('');
  const [compose, setCompose] = useState({ subject: '', body: '', to: [], toDepartment: '' });
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    setUserRole(localStorage.getItem('userRole') || '');
    fetchInbox();
    fetchSent();
    fetchUsers();
    fetchDepartments();
  }, []);

  const fetchInbox = async () => {
    try {
      const response = await api.get('/communications/messages?folder=inbox');
      setInbox(response.data);
    } catch (error) {
      console.error('Failed to load inbox:', error);
    }
  };

  const fetchSent = async () => {
    try {
      const response = await api.get('/communications/messages?folder=sent');
      setSent(response.data);
    } catch (error) {
      console.error('Failed to load sent messages:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users:', error);
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

  const handleSend = async (event) => {
    event.preventDefault();
    setMessage('');

    const subject = compose.subject.trim();
    const body = compose.body.trim();

    if (!subject || !body) {
      setMessage('Subject and message are required.');
      return;
    }

    try {
      const payload = {
        subject,
        body,
        to: compose.to.filter(Boolean),
        toDepartment: compose.toDepartment || undefined,
      };

      await api.post('/communications/messages', payload);
      setCompose({ subject: '', body: '', to: [], toDepartment: '' });
      setActiveTab('sent');
      setSelected(null);
      await fetchSent();
      await fetchInbox();
      setMessage('Message sent.');
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessage(error.response?.data?.message || 'Could not send message.');
    }
  };

  const handleMarkRead = async (messageId) => {
    try {
      const response = await api.post(`/communications/messages/${messageId}/read`);
      setSelected(response.data);
      fetchInbox();
    } catch (error) {
      console.error('Failed to mark message read:', error);
    }
  };

  const handleSelect = (messageItem) => {
    setSelected(messageItem);
    if (!messageItem.readBy?.includes(localStorage.getItem('userId'))) {
      handleMarkRead(messageItem._id);
    }
  };

  const canCreate = allowedToCreate.includes(userRole);

  const renderRecipients = (msg) => {
    if (msg.toDepartment) {
      return `Department: ${msg.toDepartment.name}`;
    }
    if (!msg.to || msg.to.length === 0) {
      return 'All internal recipients';
    }
    return msg.to.map((user) => user.name).join(', ');
  };

  return (
    <div className="card">
      <h1>Internal Messaging</h1>
      <p>Send messages to staff or departments.</p>

      {message && <div className="notification">{message}</div>}

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <button onClick={() => setActiveTab('inbox')} style={{ background: activeTab === 'inbox' ? '#eff6ff' : 'white' }}>Inbox</button>
        <button onClick={() => setActiveTab('sent')} style={{ background: activeTab === 'sent' ? '#eff6ff' : 'white' }}>Sent</button>
        {canCreate && <button onClick={() => setActiveTab('compose')}>Compose Message</button>}
      </div>

      {activeTab === 'compose' && canCreate && (
        <form onSubmit={handleSend} className="form-card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <input
              placeholder="Subject"
              value={compose.subject}
              onChange={(e) => setCompose((prev) => ({ ...prev, subject: e.target.value }))}
              required
            />
            <textarea
              placeholder="Message body"
              value={compose.body}
              onChange={(e) => setCompose((prev) => ({ ...prev, body: e.target.value }))}
              rows={4}
              required
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <select
                multiple
                value={compose.to}
                onChange={(e) => setCompose((prev) => ({
                  ...prev,
                  to: Array.from(e.target.selectedOptions).map((option) => option.value),
                }))}
              >
                {users.map((user) => (
                  <option key={user._id} value={user._id}>{user.name} ({user.email})</option>
                ))}
              </select>
              <select
                value={compose.toDepartment}
                onChange={(e) => setCompose((prev) => ({ ...prev, toDepartment: e.target.value }))}
              >
                <option value="">Select department (optional)</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <button type="submit">Send</button>
          </div>
        </form>
      )}

      {activeTab !== 'compose' && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {(activeTab === 'inbox' ? inbox : sent).length === 0 ? (
            <p>{activeTab === 'inbox' ? 'No messages yet.' : 'No sent messages yet.'}</p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {((activeTab === 'inbox' ? inbox : sent)).map((msg) => (
                <button
                  key={msg._id}
                  type="button"
                  onClick={() => handleSelect(msg)}
                  style={{
                    textAlign: 'left',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    padding: '1rem',
                    background: selected?._id === msg._id ? '#eff6ff' : 'white',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong>{msg.subject}</strong>
                    <span style={{ color: '#6b7280' }}>{new Date(msg.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <span>{activeTab === 'inbox' ? `From: ${msg.from?.name || 'Unknown'}` : `To: ${renderRecipients(msg)}`}</span>
                    {activeTab === 'inbox' && !msg.readBy?.some((id) => id === localStorage.getItem('userId')) && (
                      <span style={{ color: '#ef4444' }}>New</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {selected && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <h2>{selected.subject}</h2>
          <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
            <div><strong>From:</strong> {selected.from?.name || 'Unknown'} ({selected.from?.email})</div>
            <div><strong>To:</strong> {renderRecipients(selected)}</div>
            <div><strong>Sent:</strong> {new Date(selected.createdAt).toLocaleString()}</div>
          </div>
          <p>{selected.body}</p>
        </div>
      )}
    </div>
  );
}
