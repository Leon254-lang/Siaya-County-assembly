import { useEffect, useState } from 'react';
import api from '../services/api';

export default function ManageInterns() {
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', department: '', supervisor: '', createAccount: false, password: '', roleName: 'Intern' });
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get('/interns');
      setInterns(res.data || []);
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
      if (form.createAccount && !editing) {
        if (!form.password) {
          throw new Error('Please provide a password to create the intern user account.');
        }
        // create user account via auth.register
        const regPayload = {
          name,
          email: form.email,
          password: form.password,
          roleName: form.roleName,
          phone: form.phone,
        };
        const regRes = await api.post('/auth/register', regPayload);
        createdUserId = regRes.data.user?._id || regRes.data.user?.id;
      }

      const payload = {
        name,
        email: form.email,
        phone: form.phone,
        department: form.department,
        supervisor: form.supervisor,
      };
      if (createdUserId) payload.user = createdUserId;

      if (editing) {
        await api.put(`/interns/${editing}`, payload);
        setMessage('Intern updated');
      } else {
        await api.post('/interns', payload);
        setMessage('Intern created');
      }
      setForm({ firstName: '', lastName: '', email: '', phone: '', department: '', supervisor: '', createAccount: false, password: '', roleName: 'Intern' });
      setEditing(null);
      load();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Save failed';
      setMessage(msg);
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
      createAccount: false,
      password: '',
      roleName: 'Intern',
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Manage Interns</h1>
        <p>Create and update intern profiles (HR only)</p>
      </div>

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

              {!editing && (
                <div className="form-group">
                  <label><input type="checkbox" checked={form.createAccount} onChange={(e) => setForm({...form, createAccount: e.target.checked})} /> Create user account for intern</label>
                </div>
              )}

              {!editing && form.createAccount && (
                <>
                  <div className="form-group">
                    <label>Password</label>
                    <input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <input value={form.roleName} onChange={(e) => setForm({...form, roleName: e.target.value})} />
                  </div>
                </>
              )}

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
                      <div style={{color: '#6b7280'}}>{i.email} · {i.phone}</div>
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
