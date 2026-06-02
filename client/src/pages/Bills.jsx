import { useEffect, useState } from 'react';
import api from '../services/api';

export default function Bills() {
  const [bills, setBills] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ title: '', summary: '', committee: '', documents: [] });
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/bills');
      setBills(res.data);
    } catch (err) {
      console.error(err);
      setMessage('Failed to load bills.');
    }
  };

  useEffect(() => { load(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const createBill = async (e) => {
    e.preventDefault();
    try {
      await api.post('/bills', form);
      setMessage('Bill created');
      setForm({ title: '', summary: '', committee: '', documents: [] });
      load();
    } catch (err) {
      console.error(err);
      setMessage('Failed to create bill.');
    }
  };

  const submitMotion = async (billId, text) => {
    try {
      await api.post(`/bills/${billId}/motions`, { text });
      setMessage('Motion submitted.');
      load();
    } catch (err) {
      console.error(err);
      setMessage('Failed to submit motion.');
    }
  };

  const addVoteItem = async (billId, question, options, voteType) => {
    try {
      await api.post(`/bills/${billId}/vote-item`, { question, options, voteType });
      setMessage('Voting item added.');
      load();
    } catch (err) {
      console.error(err);
      setMessage('Failed to add voting item.');
    }
  };

  const castVote = async (billId, itemId, option) => {
    try {
      await api.post(`/bills/${billId}/vote`, { itemId, option });
      setMessage('Vote recorded.');
      load();
    } catch (err) {
      console.error(err);
      setMessage('Failed to record vote.');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Bills & Motions</h1>
        <p>Create bills, submit motions, review status, and manage voting.</p>
      </div>

      {message && <div className="notification">{message}</div>}

      <div className="grid-two-column">
        <section className="card">
          <h2>Create Bill</h2>
          <form onSubmit={createBill} className="form-grid">
            <label>
              Title
              <input name="title" value={form.title} onChange={handleChange} required />
            </label>
            <label>
              Summary
              <textarea name="summary" value={form.summary} onChange={handleChange} rows="4" />
            </label>
            <label>
              Committee (optional)
              <input name="committee" value={form.committee} onChange={handleChange} />
            </label>
            <button className="primary-button">Create</button>
          </form>
        </section>

        <section className="card">
          <h2>Existing Bills</h2>
          {bills.length === 0 ? <p>No bills found.</p> : (
            <div className="list-panel">
              {bills.map((b) => (
                <button key={b._id} className="list-item" type="button" onClick={() => setSelected(b)}>
                  <div>
                    <strong>{b.title}</strong>
                    <div>{b.status} — {b.committee?.name || 'No committee'}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {selected && (
        <section className="card">
          <h2>{selected.title}</h2>
          <p>{selected.summary}</p>
          <p><strong>Status:</strong> {selected.status}</p>

          <div>
            <h3>Motions</h3>
            <ul>
              {selected.motions?.map((m) => (
                <li key={m._id}>{m.text} — {m.status}</li>
              ))}
            </ul>
            <form onSubmit={(e) => { e.preventDefault(); const text = e.target.motion.value; submitMotion(selected._id, text); e.target.motion.value = ''; }}>
              <input name="motion" placeholder="Propose a motion" />
              <button type="submit" className="secondary-button">Submit Motion</button>
            </form>
          </div>

          <div>
            <h3>Voting</h3>
            {selected.voting?.items?.map((item) => (
              <div key={item._id} className="vote-item">
                <p><strong>{item.question}</strong></p>
                <p>Vote Type: {item.voteType || 'electronic'}</p>
                <ul>
                  {item.options.map((opt) => (
                    <li key={opt}>
                      {opt} — {item.results?.find((r) => r.option === opt)?.votes || 0}
                      <button onClick={() => castVote(selected._id, item._id, opt)} className="small-button">Vote</button>
                    </li>
                  ))}
                </ul>
                {item.finalDecision && <p><strong>Decision:</strong> {item.finalDecision}</p>}
              </div>
            ))}

            <form onSubmit={(e) => {
              e.preventDefault();
              const q = e.target.question.value;
              const opts = e.target.options.value.split(',').map(s => s.trim()).filter(Boolean);
              const voteType = e.target.voteType.value;
              addVoteItem(selected._id, q, opts, voteType);
              e.target.question.value = '';
              e.target.options.value = '';
            }}>
              <input name="question" placeholder="Voting question" />
              <input name="options" placeholder="Comma separated options" />
              <select name="voteType">
                <option value="electronic">Electronic vote</option>
                <option value="voice">Voice vote</option>
                <option value="secret">Secret ballot</option>
              </select>
              <button className="secondary-button">Add Voting Item</button>
            </form>
          </div>

          <div>
            <h3>Committee recommendations</h3>
            <ul>
              {selected.committeeRecommendations?.map((rec) => (
                <li key={rec._id}>{rec.recommendation} — {rec.recommendedBy?.name || 'Committee'}</li>
              ))}
            </ul>
            <form onSubmit={async (e) => { e.preventDefault(); const recommendation = e.target.recommendation.value; try { await api.post(`/bills/${selected._id}/recommendation`, { recommendation }); setMessage('Recommendation submitted'); load(); } catch (err) { setMessage('Failed to submit recommendation'); } e.target.recommendation.value=''; }}>
              <input name="recommendation" placeholder="Recommendation text (for committee use)" />
              <button className="secondary-button">Submit Recommendation</button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
