import { useEffect, useState } from 'react';
import api from '../services/api';
import Toast from '../components/UI/Toast';

export default function ManageInterns() {
  const [interns, setInterns] = useState([]);
  const [availableInternUsers, setAvailableInternUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', department: '', supervisor: '', institution: '', course: '', placement: '', startDate: '', endDate: '', status: 'active', password: '' });
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/interns');
      setInterns(res.data || []);
      const availableRes = await api.get('/interns/available-users');
      setAvailableInternUsers(availableRes.data || []);
    } catch (err) {
      console.error('Failed loading interns', err);
      setMessage('Failed to load interns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    try {
      const name = `${form.firstName || ''} ${form.lastName || ''}`.trim();
      let createdUserId = null;
      if (!editing && !selectedUserId) {
        if (!form.password) {
          throw new Error('Please provide a password to create the intern user account.');
        }
        const regPayload = {
          name,
          email: String(form.email || '').trim().toLowerCase(),
          password: form.password,
          roleName: 'Intern',
          phone: form.phone,
        };
        const regRes = await api.post('/auth/register', regPayload);
        createdUserId = regRes.data.user?._id || regRes.data.user?.id;
      }

      const payload = {
        name,
        email: String(form.email || '').trim().toLowerCase(),
        phone: form.phone,
        department: form.department,
        supervisor: form.supervisor,
        institution: form.institution,
        course: form.course,
        placement: form.placement,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        status: form.status,
      };
      if (selectedUserId) payload.user = selectedUserId;
      else if (createdUserId) payload.user = createdUserId;

      if (editing) {
        await api.put(`/interns/${editing}`, payload);
        setToast({ message: 'Intern updated', type: 'success' });
      } else {
        await api.post('/interns', payload);
        setToast({ message: 'Intern created', type: 'success' });
      }
      setForm({ firstName: '', lastName: '', email: '', phone: '', department: '', supervisor: '', institution: '', course: '', placement: '', startDate: '', endDate: '', status: 'active', password: '' });
      setSelectedUserId(null);
      setEditing(null);
      load();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Save failed';
      setToast({ message: msg, type: 'error' });
    }
  };

  const startEdit = (intern) => {
    setEditing(intern._id);
    const [first = '', last = ''] = (intern.name || '').split(/\s+/, 2);
    setForm({
      firstName: first,
      lastName: last,
      email: intern.email || '',
      phone: intern.phone || '',
      department: intern.department || '',
      supervisor: intern.supervisor?._id || intern.supervisor || '',
      institution: intern.institution || '',
      course: intern.course || '',
      placement: intern.placement || '',
      startDate: intern.startDate ? new Date(intern.startDate).toISOString().slice(0, 10) : '',
      endDate: intern.endDate ? new Date(intern.endDate).toISOString().slice(0, 10) : '',
      status: intern.status || 'active',
      password: '',
    });
    setSelectedUserId(intern.user?._id || null);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Manage Interns</h1>
        <p>Create and update intern profiles (HR only)</p>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => {
            setToast(null);
            load();
          }}
        />
      )}

      {message && <div className="notification">{message}</div>}

      <div className="grid-2">
        <div>
          <div className="card">
            <h3>{editing ? 'Edit Intern' : 'Create Intern'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>First name</label>
                <input value={form.firstName} onChange={(e) => setForm({...form, firstName: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Last name</label>
                <input value={form.lastName} onChange={(e) => setForm({...form, lastName: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Department (id)</label>
                <input value={form.department} onChange={(e) => setForm({...form, department: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Supervisor (id)</label>
                <input value={form.supervisor} onChange={(e) => setForm({...form, supervisor: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Select existing intern user (optional)</label>
                <select
                  value={selectedUserId || ''}
                  onChange={(e) => {
                    const uid = e.target.value || null;
                    setSelectedUserId(uid);
                    if (uid) {
                      const user = availableInternUsers.find((u) => u._id === uid);
                      if (user) {
                        const [first = '', last = ''] = (user.name || '').split(/\s+/, 2);
                        setForm((prev) => ({ ...prev, email: user.email || '', firstName: first, lastName: last, phone: user.phone || '' }));
                      }
                    } else {
                      setForm((prev) => ({ ...prev, email: '', firstName: '', lastName: '', phone: '' }));
                    }
                  }}
                >
                  <option value="">-- Create new user or choose existing --</option>
                  {availableInternUsers.map((u) => (
                    <option key={u._id} value={u._id}>{u.name} — {u.email}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Institution</label>
                <input value={form.institution} onChange={(e) => setForm({...form, institution: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Course</label>
                <input value={form.course} onChange={(e) => setForm({...form, course: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Placement</label>
                <input value={form.placement} onChange={(e) => setForm({...form, placement: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Start date</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm({...form, startDate: e.target.value})} />
              </div>
              <div className="form-group">
                <label>End date</label>
                <input type="date" value={form.endDate} onChange={(e) => setForm({...form, endDate: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({...form, status: e.target.value})}>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              {!editing && !selectedUserId && (
                <>
                  <div className="form-group">
                    <label>Password</label>
                    <input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} />
                  </div>
                </>
              )}
              {!editing && selectedUserId && (
                <div className="form-group info-box">
                  <label>Selected existing user</label>
                  <div className="info-value">{form.email} — profile will be linked to this user</div>
                </div>
              )}
              <div className="form-group">
                <label>Role</label>
                <input value="Intern" readOnly />
              </div>

              <button className="btn-primary" type="submit">{editing ? 'Save' : 'Create'}</button>
              {editing && <button type="button" className="btn-secondary" style={{marginLeft: '0.5rem'}} onClick={() => { setEditing(null); setForm({ firstName: '', lastName: '', email: '', phone: '', department: '', supervisor: '' }); }}>Cancel</button>}
            </form>
          </div>
        </div>

        <div>
          <div className="card">
            <h3>Existing Interns</h3>
            {loading ? <p>Loading...</p> : (
              <div>
                {interns.map(i => (
                  <div key={i._id} className="list-item">
                    <div>
                      <strong>{i.name}</strong>
                      <div style={{color: '#6b7280'}}>
                        {i.email} · {i.phone}
                        {i.user ? (
                          <div className="intern-link-badge intern-linked">
                            Linked user: {i.user.name || i.user.email} ({i.user.email || i.user._id})
                          </div>
                        ) : (
                          <div className="intern-link-badge intern-unlinked">
                            No linked user account yet
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                      <button className="btn-small" onClick={() => startEdit(i)}>Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
