import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Committees() {
  const [committees, setCommittees] = useState([]);
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/committees');
      setCommittees(res.data);
    } catch (err) {
      console.error(err);
      setMessage('Failed to load committees');
    }
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post('/committees', { name });
      setName('');
      setMessage('Committee created');
      load();
    } catch (err) {
      setMessage('Failed to create committee');
    }
  };

  const assignMembers = async (id, members) => {
    try {
      await api.put(`/committees/${id}/members`, { members });
      setMessage('Members assigned');
      load();
    } catch (err) {
      setMessage('Failed to assign members');
    }
  };

  return (
    <div className="page">
      <h1>Committees</h1>
      {message && <div className="notification">{message}</div>}

      <div className="grid-two-column">
        <section className="card">
          <h2>Create Committee</h2>
          <form onSubmit={create}>
            <input placeholder="Committee name" value={name} onChange={(e) => setName(e.target.value)} required />
            <button className="primary-button">Create</button>
          </form>
        </section>

        <section className="card">
          <h2>All Committees</h2>
          <ul className="list-panel">
            {committees.map((c) => (
              <li key={c._id} className="list-item" onClick={() => setSelected(c)}>
                <strong>{c.name}</strong>
                <div>{c.description}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {selected && (
        <section className="card">
          <h2>{selected.name}</h2>
          <p>{selected.description}</p>
          <div>
            <h3>Members</h3>
            <ul>
              {selected.members?.map(m => <li key={m._id}>{m.name || m.email}</li>)}
            </ul>
          </div>

          <div>
            <h3>Reports</h3>
            <ul>
              {selected.reports?.map(r => <li key={r._id}>{r.title}</li>)}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
