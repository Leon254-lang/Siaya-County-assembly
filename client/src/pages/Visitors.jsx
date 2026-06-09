import { useState, useEffect } from 'react';
import api from '../services/api';

const initialForm = {
  name: '',
  idNumber: '',
  organization: '',
  phone: '',
  email: '',
  address: '',
  host: '',
  purpose: '',
};

export default function Visitors() {
  const [visitors, setVisitors] = useState([]);
  const [currentVisitors, setCurrentVisitors] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [formValues, setFormValues] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchVisitors = async () => {
    try {
      const [allResponse, currentResponse, hostsResponse] = await Promise.all([
        api.get('/visitors'),
        api.get('/visitors/current'),
        api.get('/visitors/hosts'),
      ]);
      setVisitors(allResponse.data);
      setCurrentVisitors(currentResponse.data);
      setHosts(hostsResponse.data);
    } catch (err) {
      console.error('Failed to fetch visitors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, []);

  const resetForm = () => {
    setFormValues(initialForm);
    setError('');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setError('');

    if (!formValues.name || !formValues.idNumber || !formValues.phone || !formValues.host || !formValues.purpose) {
      setError('Name, ID number, phone number, host and purpose are required.');
      return;
    }

    try {
      setSaving(true);
      await api.post('/visitors', formValues);
      await fetchVisitors();
      resetForm();
    } catch (err) {
      console.error('Failed to register visitor:', err);
      setError(err.response?.data?.message || 'Unable to register visitor.');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckOut = async (id) => {
    try {
      await api.patch(`/visitors/${id}/exit`);
      await fetchVisitors();
    } catch (err) {
      console.error('Failed to check out visitor:', err);
      setError(err.response?.data?.message || 'Unable to check out visitor.');
    }
  };

  const handlePrintBadge = (visitor) => {
    const badgeHtml = `
      <html>
      <head>
        <title>Visitor Badge</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          .badge { width: 340px; padding: 24px; border: 2px solid #4f46e5; border-radius: 18px; background: #f8fbff; color: #111827; }
          .badge h1 { margin: 0 0 8px; font-size: 1.5rem; }
          .badge h2 { margin: 0 0 1rem; font-size: 1rem; color: #374151; }
          .badge p { margin: 0.4rem 0; font-size: 0.95rem; }
          .badge .footer { margin-top: 1.15rem; padding-top: 1rem; border-top: 1px solid #dbeafe; font-size: 0.85rem; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="badge">
          <h1>Visitor Badge</h1>
          <h2>${visitor.name}</h2>
          <p><strong>ID Number:</strong> ${visitor.idNumber}</p>
          <p><strong>Host:</strong> ${visitor.host?.name || '-'}</p>
          <p><strong>Purpose:</strong> ${visitor.purpose}</p>
          <p><strong>Phone:</strong> ${visitor.phone || 'N/A'}</p>
          <p><strong>Email:</strong> ${visitor.email || 'N/A'}</p>
          <p><strong>Address:</strong> ${visitor.address || 'N/A'}</p>
          <p><strong>Organization:</strong> ${visitor.organization || 'N/A'}</p>
          <p><strong>Badge #:</strong> ${visitor.badgeNumber || 'N/A'}</p>
          <p><strong>Entry:</strong> ${new Date(visitor.entryTime).toLocaleString()}</p>
          <p><strong>Status:</strong> ${visitor.status}</p>
          <div class="footer">Siaya County Assembly Security Pass</div>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(badgeHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  if (loading) return <div className="card"><p>Loading visitor data...</p></div>;

  return (
    <div className="card">
      <h1>Visitor Management</h1>
      <p>Register visitors, track entry and exit times, and print visitor badges.</p>

      <div className="visitor-toolbar">
        <button type="button" onClick={resetForm}>New Registration</button>
        <button type="button" disabled>Daily Report</button>
      </div>

      <form className="visitor-form" onSubmit={handleRegister}>
        <h3>Register New Visitor</h3>
        {error && <p className="form-error">{error}</p>}
        <div className="form-grid">
          <label>
            Visitor Name
            <input name="name" value={formValues.name} onChange={handleChange} placeholder="Full name" />
          </label>
          <label>
            ID Number
            <input name="idNumber" value={formValues.idNumber} onChange={handleChange} placeholder="National ID / passport" />
          </label>
          <label>
            Host / Staff
            <select name="host" value={formValues.host} onChange={handleChange}>
              <option value="">Select host</option>
              {hosts.map((host) => (
                <option key={host._id} value={host._id}>{host.name}{host.email ? ` (${host.email})` : ''}</option>
              ))}
            </select>
          </label>
          <label>
            Purpose of Visit
            <input name="purpose" value={formValues.purpose} onChange={handleChange} placeholder="Meeting, delivery, consultation..." />
          </label>
          <label>
            Phone Number
            <input name="phone" value={formValues.phone} onChange={handleChange} placeholder="Phone number" />
          </label>
          <label>
            Email Address
            <input name="email" type="email" value={formValues.email} onChange={handleChange} placeholder="visitor@example.com" />
          </label>
          <label>
            Residential / Office Address
            <input name="address" value={formValues.address} onChange={handleChange} placeholder="Physical address" />
          </label>
          <label>
            Organization
            <input name="organization" value={formValues.organization} onChange={handleChange} placeholder="Company or group" />
          </label>
        </div>
        <div className="form-actions">
          <button type="submit" disabled={saving}>{saving ? 'Registering...' : 'Register Visitor'}</button>
        </div>
      </form>

      <div className="visitor-sections">
        <div className="current-visitors">
          <h3>Currently Inside ({currentVisitors.length})</h3>
          {currentVisitors.length === 0 ? (
            <p>No visitors currently inside.</p>
          ) : (
            <ul>
              {currentVisitors.map((visitor) => (
                <li key={visitor._id}>
                  <div>
                    <strong>{visitor.name}</strong> ({visitor.idNumber})
                    <br />Host: {visitor.host?.name || '-'} | Purpose: {visitor.purpose}
                  </div>
                  <div className="visitor-row-actions">
                    <button type="button" onClick={() => handlePrintBadge(visitor)}>Print Badge</button>
                    <button type="button" onClick={() => handleCheckOut(visitor._id)}>Check Out</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="all-visitors">
          <h3>All Visitors</h3>
          {visitors.length === 0 ? (
            <p>No visitor records found.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>ID</th>
                  <th>Organization</th>
                  <th>Purpose</th>
                  <th>Host</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((visitor) => (
                  <tr key={visitor._id}>
                    <td>{visitor.name}</td>
                    <td>{visitor.idNumber}</td>
                    <td>{visitor.organization || '-'}</td>
                    <td>{visitor.purpose}</td>
                    <td>{visitor.host?.name || '-'}</td>
                    <td>{new Date(visitor.entryTime).toLocaleString()}</td>
                    <td>{visitor.exitTime ? new Date(visitor.exitTime).toLocaleString() : '-'}</td>
                    <td>{visitor.status}</td>
                    <td>
                      <button type="button" onClick={() => handlePrintBadge(visitor)}>Badge</button>
                      {visitor.status === 'inside' && (
                        <button type="button" onClick={() => handleCheckOut(visitor._id)}>Check Out</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
