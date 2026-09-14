import { useEffect, useState } from 'react';
import api from '../services/api';

const workflowOptions = ['Draft', 'Submitted', 'Reviewed', 'Approved', 'Rejected', 'Debated', 'Resolved'];
const itemTypes = ['Bill', 'Motion', 'Question', 'Resolution'];

const emptyForm = {
  type: 'Bill',
  title: '',
  summary: '',
  sponsor: '',
  category: '',
  department: '',
  status: 'Draft',
  workflow: 'Draft',
  committee: '',
  documents: '',
  attachments: '',
  resolution: '',
};

const toList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function Bills() {
  const [bills, setBills] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/bills');
      setBills(res.data || []);
      if (selected) {
        const refreshed = (res.data || []).find((item) => item._id === selected._id);
        setSelected(refreshed || selected);
      }
    } catch (err) {
      console.error(err);
      setMessage('Could not load legislative items.');
    }
  };

  useEffect(() => { load(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const createItem = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        documents: toList(form.documents),
        attachments: toList(form.attachments).map((item) => ({ name: item, url: item })),
        status: form.status || 'Draft',
        workflow: form.workflow || 'Draft',
      };

      await api.post('/bills', payload);
      setMessage(`${form.type || 'Bill'} created successfully.`);
      setForm(emptyForm);
      await load();
    } catch (err) {
      console.error(err);
      setMessage('Could not create legislative item.');
    }
  };

  const updateStatus = async (nextStatus) => {
    if (!selected) return;
    try {
      const res = await api.put(`/bills/${selected._id}`, { status: nextStatus, workflow: nextStatus });
      setSelected(res.data);
      setMessage(`Status updated to ${nextStatus}.`);
      await load();
    } catch (err) {
      console.error(err);
      setMessage('Could not update status.');
    }
  };

  const submitMotion = async (billId, text) => {
    if (!text?.trim()) return;
    try {
      await api.post(`/bills/${billId}/motions`, { text });
      setMessage('Motion submitted.');
      await load();
    } catch (err) {
      console.error(err);
      setMessage('Could not submit motion.');
    }
  };

  const addAmendment = async (event) => {
    event.preventDefault();
    if (!selected) return;
    const title = event.target.amendmentTitle.value;
    const summary = event.target.amendmentSummary.value;
    if (!title.trim()) return;

    try {
      const updated = {
        ...selected,
        amendments: [...(selected.amendments || []), { title, summary, status: 'Draft' }],
      };
      const res = await api.put(`/bills/${selected._id}`, updated);
      setSelected(res.data);
      setMessage('Amendment tracked.');
      event.target.reset();
      await load();
    } catch (err) {
      console.error(err);
      setMessage('Could not add amendment.');
    }
  };

  const addQuestion = async (event) => {
    event.preventDefault();
    if (!selected) return;
    const question = event.target.questionText.value;
    const department = event.target.questionDept.value;
    if (!question.trim()) return;

    try {
      const nextQuestions = [...(selected.questions || []), { question, department, status: 'Pending' }];
      const res = await api.put(`/bills/${selected._id}`, { questions: nextQuestions });
      setSelected(res.data);
      setMessage('Question recorded for the executive response workflow.');
      event.target.reset();
      await load();
    } catch (err) {
      console.error(err);
      setMessage('Could not record the question.');
    }
  };

  const addVoteItem = async (billId, question, options, voteType) => {
    try {
      await api.post(`/bills/${billId}/vote-item`, { question, options, voteType });
      setMessage('Voting item added.');
      await load();
    } catch (err) {
      console.error(err);
      setMessage('Could not add voting item.');
    }
  };

  const castVote = async (billId, itemId, option) => {
    try {
      await api.post(`/bills/${billId}/vote`, { itemId, option });
      setMessage('Vote recorded.');
      await load();
    } catch (err) {
      console.error(err);
      setMessage('Could not record vote.');
    }
  };

  const dashboard = {
    total: bills.length,
    pending: bills.filter((item) => ['Draft', 'Submitted', 'Reviewed'].includes(item.status || item.workflow)).length,
    completed: bills.filter((item) => ['Approved', 'Rejected', 'Resolved'].includes(item.status || item.workflow)).length,
    debated: bills.filter((item) => (item.status || item.workflow) === 'Debated').length,
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Motions, Bills, Questions & Resolutions</h1>
        <p>Track draft-to-resolution workflow with unique reference numbers, sponsorship, departments, attachments, voting, and full legislative history.</p>
      </div>

      {message && <div className="notification">{message}</div>}

      <div className="dashboard-grid three-column">
        <div className="card stat-card">
          <span>Total items</span>
          <h3>{dashboard.total}</h3>
          <small>All legislative records</small>
        </div>
        <div className="card stat-card">
          <span>Pending</span>
          <h3>{dashboard.pending}</h3>
          <small>Drafts and active reviews</small>
        </div>
        <div className="card stat-card">
          <span>Completed</span>
          <h3>{dashboard.completed}</h3>
          <small>Approved, rejected or resolved</small>
        </div>
      </div>

      <div className="grid-two-column">
        <section className="card">
          <h2>Create legislative item</h2>
          <form onSubmit={createItem} className="form-grid">
            <label>
              Type
              <select name="type" value={form.type} onChange={handleChange}>
                {itemTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label>
              Title
              <input name="title" value={form.title} onChange={handleChange} required />
            </label>
            <label>
              Sponsor / Member responsible
              <input name="sponsor" value={form.sponsor} onChange={handleChange} placeholder="Member or sponsor" />
            </label>
            <label>
              Category
              <input name="category" value={form.category} onChange={handleChange} placeholder="Budget, policy, oversight..." />
            </label>
            <label>
              Affected department
              <input name="department" value={form.department} onChange={handleChange} placeholder="Finance, Health, Roads..." />
            </label>
            <label>
              Workflow status
              <select name="workflow" value={form.workflow} onChange={handleChange}>
                {workflowOptions.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <label>
              Committee (optional)
              <input name="committee" value={form.committee} onChange={handleChange} />
            </label>
            <label className="full-width">
              Summary
              <textarea name="summary" value={form.summary} onChange={handleChange} rows="4" />
            </label>
            <label className="full-width">
              Supporting documents / attachments (comma separated URLs or names)
              <input name="attachments" value={form.attachments} onChange={handleChange} placeholder="https://..., supporting-note.pdf" />
            </label>
            <label className="full-width">
              Linked documents
              <input name="documents" value={form.documents} onChange={handleChange} placeholder="doc-1.pdf, doc-2.pdf" />
            </label>
            <label className="full-width">
              Final resolution / decision
              <textarea name="resolution" value={form.resolution} onChange={handleChange} rows="3" placeholder="Summary of the final resolution or outcome" />
            </label>
            <button type="submit" className="primary-button">Create item</button>
          </form>
        </section>

        <section className="card">
          <h2>Legislative register</h2>
          {bills.length === 0 ? <p>No legislative items found.</p> : (
            <div className="list-panel">
              {bills.map((item) => (
                <button key={item._id} className="list-item" type="button" onClick={() => setSelected(item)}>
                  <div>
                    <strong>{item.title}</strong>
                    <div>{item.type} · {item.referenceNumber || 'No reference'}</div>
                    <small>{item.status || item.workflow || 'Draft'} · {item.department || 'No department'}</small>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {selected && (
        <section className="card">
          <div className="page-header compact-header">
            <div>
              <h2>{selected.title}</h2>
              <p>{selected.type} · Reference {selected.referenceNumber || 'Pending generation'}</p>
            </div>
            <div className="inline-actions">
              <select value={selected.status || selected.workflow || 'Draft'} onChange={(e) => updateStatus(e.target.value)}>
                {workflowOptions.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          </div>

          <div className="dashboard-grid two-column">
            <div>
              <p><strong>Category:</strong> {selected.category || 'Not specified'}</p>
              <p><strong>Department:</strong> {selected.department || 'Not assigned'}</p>
              <p><strong>Sponsor / responsible member:</strong> {selected.sponsor?.full_name || selected.proposer?.full_name || 'Not assigned'}</p>
              <p><strong>Status:</strong> {selected.status || selected.workflow || 'Draft'}</p>
              <p><strong>Committee:</strong> {selected.committee?.name || 'Not assigned'}</p>
            </div>
            <div>
              <p><strong>Summary:</strong> {selected.summary || 'No summary provided.'}</p>
              <p><strong>Resolution:</strong> {selected.resolution || 'No final resolution recorded yet.'}</p>
            </div>
          </div>

          <div className="dashboard-grid three-column">
            <div className="card nested-card">
              <h3>Attachments</h3>
              {(selected.attachments?.length || selected.documents?.length) ? (
                <ul>
                  {(selected.attachments || []).map((item) => (
                    <li key={item._id || item.url || item.name}><a href={item.url || '#'} target="_blank" rel="noreferrer">{item.name || item.url}</a></li>
                  ))}
                  {(selected.documents || []).map((doc, index) => <li key={`${doc}-${index}`}>{doc}</li>)}
                </ul>
              ) : <p>No attachments uploaded.</p>}
            </div>

            <div className="card nested-card">
              <h3>Amendments</h3>
              {selected.amendments?.length ? (
                <ul>
                  {selected.amendments.map((amendment, index) => (
                    <li key={amendment._id || `${amendment.title}-${index}`}>
                      <strong>{amendment.title}</strong>
                      <div>{amendment.summary || 'No summary'}</div>
                      <small>{amendment.status}</small>
                    </li>
                  ))}
                </ul>
              ) : <p>No amendments recorded.</p>}
              <form onSubmit={addAmendment} className="form-grid compact-form">
                <input name="amendmentTitle" placeholder="Amendment title" />
                <textarea name="amendmentSummary" rows="2" placeholder="Amendment details" />
                <button type="submit" className="secondary-button">Add amendment</button>
              </form>
            </div>

            <div className="card nested-card">
              <h3>Questions to departments</h3>
              {selected.questions?.length ? (
                <ul>
                  {selected.questions.map((entry, index) => (
                    <li key={entry._id || `${entry.question}-${index}`}>
                      <strong>{entry.question}</strong>
                      <div>{entry.department || 'Department not specified'}</div>
                      <small>{entry.status || 'Pending'}</small>
                    </li>
                  ))}
                </ul>
              ) : <p>No questions recorded.</p>}
              <form onSubmit={addQuestion} className="form-grid compact-form">
                <input name="questionText" placeholder="Question to executive department" />
                <input name="questionDept" placeholder="Department" />
                <button type="submit" className="secondary-button">Add question</button>
              </form>
            </div>
          </div>

          <div className="dashboard-grid two-column">
            <div className="card nested-card">
              <h3>Motions</h3>
              {selected.motions?.length ? (
                <ul>
                  {selected.motions.map((motion) => (
                    <li key={motion._id}><strong>{motion.text}</strong> — {motion.status}</li>
                  ))}
                </ul>
              ) : <p>No motions recorded.</p>}
              <form onSubmit={(event) => { event.preventDefault(); submitMotion(selected._id, event.target.motionText.value); event.target.reset(); }} className="form-grid compact-form">
                <input name="motionText" placeholder="Draft a motion" />
                <button type="submit" className="secondary-button">Submit motion</button>
              </form>
            </div>

            <div className="card nested-card">
              <h3>Voting records</h3>
              {selected.voting?.items?.length ? (
                <div>
                  {selected.voting.items.map((item) => (
                    <div key={item._id} className="vote-item">
                      <p><strong>{item.question}</strong></p>
                      <p>Vote type: {item.voteType || 'electronic'}</p>
                      <ul>
                        {item.options?.map((opt) => (
                          <li key={opt}>
                            {opt} — {item.results?.find((result) => result.option === opt)?.votes || 0}
                            <button type="button" className="small-button" onClick={() => castVote(selected._id, item._id, opt)}>Vote</button>
                          </li>
                        ))}
                      </ul>
                      {item.finalDecision && <p><strong>Final decision:</strong> {item.finalDecision}</p>}
                    </div>
                  ))}
                </div>
              ) : <p>No voting items recorded.</p>}

              <form onSubmit={(event) => {
                event.preventDefault();
                const question = event.target.voteQuestion.value;
                const options = event.target.voteOptions.value.split(',').map((value) => value.trim()).filter(Boolean);
                const voteType = event.target.voteType.value;
                addVoteItem(selected._id, question, options, voteType);
                event.target.reset();
              }} className="form-grid compact-form">
                <input name="voteQuestion" placeholder="Vote question" />
                <input name="voteOptions" placeholder="Yes, No, Abstain" />
                <select name="voteType">
                  <option value="electronic">Electronic vote</option>
                  <option value="voice">Voice vote</option>
                  <option value="secret">Secret ballot</option>
                </select>
                <button type="submit" className="secondary-button">Add vote item</button>
              </form>
            </div>
          </div>

          <div className="card nested-card">
            <h3>Full legislative history</h3>
            {selected.history?.length ? (
              <ul>
                {selected.history.map((entry, index) => (
                  <li key={entry._id || `${entry.status}-${index}`}>
                    <strong>{entry.status}</strong> · {entry.actor || 'System'} · {formatDate(entry.timestamp)}
                    <div>{entry.note || 'No note recorded.'}</div>
                  </li>
                ))}
              </ul>
            ) : <p>No history recorded.</p>}
          </div>
        </section>
      )}
    </div>
  );
}
