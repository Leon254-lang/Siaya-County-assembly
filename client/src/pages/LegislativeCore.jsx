import { useEffect, useState } from 'react';
import api from '../services/api';

const emptyForm = { title: '', sessionDate: '', sessionType: 'Plenary', notes: '' };
const emptyItem = { title: '', category: 'Business', description: '' };

const dateLabel = (value) => value ? new Date(value).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : 'Date not set';

export default function LegislativeCore() {
  const [orderPapers, setOrderPapers] = useState([]);
  const [hansard, setHansard] = useState([]);
  const [allowances, setAllowances] = useState([]);
  const [members, setMembers] = useState([]);
  const [sittings, setSittings] = useState([]);
  const [selectedHansard, setSelectedHansard] = useState(null);
  const [hansardSearch, setHansardSearch] = useState('');
  const [speakerFilter, setSpeakerFilter] = useState('');
  const [hansardForm, setHansardForm] = useState({ title: '', sessionDate: '', sessionType: 'Plenary', sitting: '', notes: '' });
  const [contributionForm, setContributionForm] = useState({ speaker: '', speakerName: '', role: '', text: '' });
  const [allowanceSitting, setAllowanceSitting] = useState('');
  const [allowanceRate, setAllowanceRate] = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    try {
      const [orderRes, hansardRes, allowanceRes, membersRes, sittingsRes] = await Promise.all([
        api.get('/order-papers'),
        api.get(`/hansard?search=${encodeURIComponent(hansardSearch)}&speaker=${encodeURIComponent(speakerFilter)}`),
        api.get('/sitting-allowances'),
        api.get('/users'),
        api.get('/meetings?type=session'),
      ]);
      setOrderPapers(orderRes.data || []);
      setHansard(hansardRes.data || []);
      setAllowances(allowanceRes.data || []);
      setMembers(membersRes.data || []);
      setSittings(sittingsRes.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to load legislative core data.');
    }
  };

  useEffect(() => { loadData(); }, [hansardSearch, speakerFilter]);

  const selectHansard = async (record) => {
    try {
      const response = await api.get(`/hansard/${record._id}`);
      setSelectedHansard(response.data);
      setHansardForm({ title: response.data.title, sessionDate: response.data.sessionDate?.slice(0, 10) || '', sessionType: response.data.sessionType, sitting: response.data.sitting?._id || '', notes: response.data.notes || '' });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to load Hansard record.');
    }
  };

  const createHansard = async (event) => {
    event.preventDefault();
    try {
      const response = await api.post('/hansard', { ...hansardForm, sitting: hansardForm.sitting || undefined, entries: [] });
      setMessage('Hansard record created.');
      await loadData();
      selectHansard(response.data);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to create Hansard record.');
    }
  };

  const addContribution = async (event) => {
    event.preventDefault();
    if (!selectedHansard) return;
    try {
      const response = await api.post(`/hansard/${selectedHansard._id}/entries`, contributionForm);
      setSelectedHansard(response.data);
      setContributionForm({ speaker: '', speakerName: '', role: '', text: '' });
      setMessage('Contribution added.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to add contribution.');
    }
  };

  const approveHansard = async () => {
    const response = await api.patch(`/hansard/${selectedHansard._id}/approve`);
    setSelectedHansard(response.data);
    setMessage('Hansard approved.');
    loadData();
  };

  const publishHansard = async () => {
    const response = await api.patch(`/hansard/${selectedHansard._id}/publish`);
    setSelectedHansard(response.data);
    setMessage('Hansard published.');
    loadData();
  };

  const archiveHansard = async () => {
    const response = await api.patch(`/hansard/${selectedHansard._id}/archive`);
    setSelectedHansard(response.data);
    setMessage('Hansard archived.');
    loadData();
  };

  const generateAllowances = async (event) => {
    event.preventDefault();
    if (!allowanceSitting) return;
    try {
      await api.post(`/sitting-allowances/generate-from-sitting/${allowanceSitting}`, { rate: Number(allowanceRate || 0) });
      setMessage('Sitting allowance drafts generated from attendance.');
      loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to generate sitting allowances.');
    }
  };

  const updateAllowanceClaim = async (allowanceId, action) => {
    try {
      await api.post(`/sitting-allowances/${allowanceId}/${action}`);
      setMessage(`Allowance claim ${action}ed.`);
      loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || `Failed to ${action} allowance claim.`);
    }
  };

  const downloadHansardPdf = async () => {
    if (!selectedHansard) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/hansard/${selectedHansard._id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error('PDF download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedHansard.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMessage('Failed to download Hansard PDF.');
    }
  };

  const selectPaper = async (paper) => {
    try {
      const response = await api.get(`/order-papers/${paper._id}`);
      setSelected(response.data);
      setForm({ title: response.data.title, sessionDate: response.data.sessionDate?.slice(0, 10) || '', sessionType: response.data.sessionType, notes: response.data.notes || '' });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to load order paper.');
    }
  };

  const createPaper = async (event) => {
    event.preventDefault();
    try {
      const response = await api.post('/order-papers', { ...form, items: [] });
      setMessage('Order Paper created.');
      await loadData();
      selectPaper(response.data);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to create Order Paper.');
    }
  };

  const savePaper = async () => {
    if (!selected) return;
    try {
      const response = await api.put(`/order-papers/${selected._id}`, { ...form, items: selected.items || [] });
      setSelected(response.data);
      setMessage('Order Paper saved.');
      loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to save Order Paper.');
    }
  };

  const addItem = async (event) => {
    event.preventDefault();
    if (!selected || !itemForm.title.trim()) return;
    try {
      const items = [...(selected.items || []), { ...itemForm, orderNo: (selected.items?.length || 0) + 1 }];
      const response = await api.put(`/order-papers/${selected._id}`, { ...form, items });
      setSelected(response.data);
      setItemForm(emptyItem);
      setMessage('Order Paper item added.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to add Order Paper item.');
    }
  };

  const moveItem = async (index, direction) => {
    if (!selected || selected.status !== 'Draft') return;
    const items = [...(selected.items || [])];
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
    try {
      const response = await api.patch(`/order-papers/${selected._id}/reorder`, { itemIds: items.map((item) => item._id) });
      setSelected(response.data);
      setMessage('Order Paper reordered.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to reorder items.');
    }
  };

  const publish = async () => {
    if (!selected) return;
    try {
      const response = await api.patch(`/order-papers/${selected._id}/publish`);
      setSelected(response.data);
      setMessage('Order Paper published.');
      loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to publish Order Paper.');
    }
  };

  const archive = async () => {
    if (!selected) return;
    try {
      const response = await api.patch(`/order-papers/${selected._id}/archive`);
      setSelected(response.data);
      setMessage('Order Paper archived.');
      loadData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to archive Order Paper.');
    }
  };

  const downloadPdf = () => {
    if (!selected) return;
    const items = (selected.items || []).map((item, index) => `<li><strong>${index + 1}. ${item.title}</strong>${item.description ? `<br><span>${item.description}</span>` : ''}</li>`).join('');
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    printWindow.document.write(`<html><head><title>${selected.title}</title><style>body{font-family:Georgia,serif;padding:48px;color:#111}header{text-align:center;border-bottom:2px solid #111;padding-bottom:18px;margin-bottom:28px}h1{font-size:24px;margin:0 0 8px}h2{font-size:20px;margin:0}ol{padding-left:28px}li{margin:14px 0;font-size:16px}span{font-size:14px;color:#444}</style></head><body><header><h1>SIAYA COUNTY ASSEMBLY</h1><h2>ORDER PAPER</h2><p>${dateLabel(selected.sessionDate)}</p></header><ol>${items || '<li>No business has been added.</li>'}</ol></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Order Paper</h1>
        <p>Create, edit, reorder, publish, download, and archive Assembly business.</p>
      </div>
      {message && <div className="notification">{message}</div>}

      <div className="dashboard-grid two-column">
        <section className="card">
          <h2>Create Order Paper</h2>
          <form className="form-grid" onSubmit={createPaper}>
            <label>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Order Paper for Plenary Sitting" required /></label>
            <label>Date<input type="date" value={form.sessionDate} onChange={(event) => setForm({ ...form, sessionDate: event.target.value })} required /></label>
            <label>Type<select value={form.sessionType} onChange={(event) => setForm({ ...form, sessionType: event.target.value })}><option>Plenary</option><option>Committee</option><option>Special Session</option></select></label>
            <label>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows="3" /></label>
            <button type="submit" className="primary-button">Create</button>
          </form>
        </section>

        <section className="card">
          <h2>Order Papers</h2>
          {orderPapers.length === 0 ? <p>No Order Papers yet.</p> : <div className="list-panel">{orderPapers.map((paper) => <button type="button" key={paper._id} className="list-item" onClick={() => selectPaper(paper)} style={{ width: '100%', textAlign: 'left', border: 0, cursor: 'pointer' }}><strong>{paper.title}</strong><div>{dateLabel(paper.sessionDate)} · {paper.status}</div></button>)}</div>}
        </section>
      </div>

      {selected && <section className="card" style={{ marginTop: '1rem' }}>
        <div className="details-row"><div><h2>{selected.title}</h2><p>{dateLabel(selected.sessionDate)} · {selected.sessionType} · {selected.status}</p></div><div className="button-group"><button type="button" className="secondary-button" onClick={downloadPdf}>Download PDF</button>{selected.status === 'Draft' && <><button type="button" className="secondary-button" onClick={savePaper}>Save Edit</button><button type="button" className="primary-button" onClick={publish}>Publish</button></>}{selected.status !== 'Archived' && <button type="button" className="secondary-button" onClick={archive}>Archive</button>}</div></div>
        <div className="form-grid"><label>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} disabled={selected.status !== 'Draft'} /></label><label>Date<input type="date" value={form.sessionDate} onChange={(event) => setForm({ ...form, sessionDate: event.target.value })} disabled={selected.status !== 'Draft'} /></label><label>Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} disabled={selected.status !== 'Draft'} /></label></div>
        <h3>Business Items</h3>
        <ol className="list-panel">{(selected.items || []).map((item, index) => <li key={item._id || `${item.title}-${index}`} className="list-item"><strong>{index + 1}. {item.title}</strong><div>{item.description || item.category}</div>{selected.status === 'Draft' && <span><button type="button" className="secondary-button" onClick={() => moveItem(index, -1)} disabled={index === 0}>Move up</button> <button type="button" className="secondary-button" onClick={() => moveItem(index, 1)} disabled={index === selected.items.length - 1}>Move down</button></span>}</li>)}</ol>
        {selected.status === 'Draft' && <form onSubmit={addItem} className="form-grid"><label>Item title<input value={itemForm.title} onChange={(event) => setItemForm({ ...itemForm, title: event.target.value })} placeholder="Prayer" required /></label><label>Category<select value={itemForm.category} onChange={(event) => setItemForm({ ...itemForm, category: event.target.value })}><option>Business</option><option>Bill</option><option>Motion</option><option>Report</option><option>Petition</option><option>Question</option><option>Other</option></select></label><label>Description<textarea value={itemForm.description} onChange={(event) => setItemForm({ ...itemForm, description: event.target.value })} rows="2" /></label><button type="submit" className="primary-button">Add Item</button></form>}
      </section>}

      <section className="card" style={{ marginTop: '1rem' }}>
        <h2>Hansard</h2>
        <div className="form-grid">
          <label>Search Hansard<input value={hansardSearch} onChange={(event) => setHansardSearch(event.target.value)} placeholder="Title, speaker, or role" /></label>
          <label>Filter by Speaker<select value={speakerFilter} onChange={(event) => setSpeakerFilter(event.target.value)}><option value="">All speakers</option>{members.map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}</select></label>
        </div>
        <div className="dashboard-grid two-column" style={{ marginTop: '1rem' }}>
          <form className="card" onSubmit={createHansard}>
            <h3>Create Hansard</h3>
            <label>Title<input value={hansardForm.title} onChange={(event) => setHansardForm({ ...hansardForm, title: event.target.value })} placeholder="Hansard Report" required /></label>
            <label>Date<input type="date" value={hansardForm.sessionDate} onChange={(event) => setHansardForm({ ...hansardForm, sessionDate: event.target.value })} required /></label>
            <label>Type<select value={hansardForm.sessionType} onChange={(event) => setHansardForm({ ...hansardForm, sessionType: event.target.value })}><option>Plenary</option><option>Committee</option><option>Special Session</option></select></label>
            <label>Sitting<select value={hansardForm.sitting} onChange={(event) => setHansardForm({ ...hansardForm, sitting: event.target.value })}><option value="">Not linked</option>{sittings.map((sitting) => <option key={sitting._id} value={sitting._id}>{sitting.title} ({dateLabel(sitting.startTime)})</option>)}</select></label>
            <button className="primary-button" type="submit">Create Hansard</button>
          </form>
          <div className="card"><h3>Records</h3><div className="list-panel">{hansard.map((item) => <button type="button" key={item._id} className="list-item" onClick={() => selectHansard(item)} style={{ width: '100%', textAlign: 'left', border: 0, cursor: 'pointer' }}><strong>{item.title}</strong><div>{dateLabel(item.sessionDate)} · {item.status} · {item.entries?.length || 0} contributions</div></button>)}</div></div>
        </div>
      </section>

      {selectedHansard && <section className="card" style={{ marginTop: '1rem' }}>
        <div className="details-row"><div><h2>{selectedHansard.title}</h2><p>{dateLabel(selectedHansard.sessionDate)} · {selectedHansard.status} · Version {selectedHansard.currentVersion || 1}</p></div><div className="button-group"><button type="button" className="secondary-button" onClick={downloadHansardPdf}>Download PDF</button>{selectedHansard.status === 'Draft' && <button type="button" className="primary-button" onClick={approveHansard}>Approve</button>}{selectedHansard.status === 'Approved' && <button type="button" className="primary-button" onClick={publishHansard}>Publish</button>}{selectedHansard.status !== 'Archived' && <button type="button" className="secondary-button" onClick={archiveHansard}>Archive</button>}</div></div>
        <h3>Contributions</h3>
        <div className="list-panel">{(selectedHansard.entries || []).map((entry, index) => <div key={entry._id || index} className="list-item"><strong>{entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} {entry.speaker?.name || entry.member?.name || entry.speakerName || 'Unknown speaker'}</strong><div>{entry.role || 'Member'}</div><p>{entry.text}</p></div>)}</div>
        {selectedHansard.status === 'Draft' && <form onSubmit={addContribution} className="form-grid" style={{ marginTop: '1rem' }}><label>Speaker<select value={contributionForm.speaker} onChange={(event) => setContributionForm({ ...contributionForm, speaker: event.target.value, speakerName: '' })}><option value="">Named speaker</option>{members.map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}</select></label><label>Speaker name<input value={contributionForm.speakerName} onChange={(event) => setContributionForm({ ...contributionForm, speakerName: event.target.value })} placeholder="Hon. John Otieno" /></label><label>Role<input value={contributionForm.role} onChange={(event) => setContributionForm({ ...contributionForm, role: event.target.value })} placeholder="MCA / Speaker / Clerk" /></label><label>Contribution<textarea value={contributionForm.text} onChange={(event) => setContributionForm({ ...contributionForm, text: event.target.value })} rows="4" required /></label><button className="primary-button" type="submit">Add Contribution</button></form>}
      </section>}

      <div className="grid-two-column" style={{ marginTop: '1rem' }}><section className="card"><h2>Allowance Claims</h2><p>Attendance-based sitting claims only. This module does not process payroll.</p><form className="form-grid" onSubmit={generateAllowances}><label>Sitting<select value={allowanceSitting} onChange={(event) => setAllowanceSitting(event.target.value)} required><option value="">Select sitting</option>{sittings.map((sitting) => <option key={sitting._id} value={sitting._id}>{sitting.title} ({dateLabel(sitting.startTime)})</option>)}</select></label><label>Rate<input type="number" min="0" value={allowanceRate} onChange={(event) => setAllowanceRate(event.target.value)} required /></label><button className="primary-button" type="submit">Generate Claims from Attendance</button></form>{allowances.map((item) => <div key={item._id} className="list-item"><strong>{item.claimNumber || 'Allowance claim'} · {item.member?.name || 'Member'}</strong><div>{item.allowanceType} · {item.attendanceStatus} · {item.eligible ? 'Eligible' : 'Not eligible'} · KES {Number(item.amount || 0).toLocaleString()} · {item.status}</div>{item.eligibilityReason && <small>{item.eligibilityReason}</small>}<div>{item.status === 'Draft' && <button type="button" className="secondary-button" onClick={() => updateAllowanceClaim(item._id, 'submit')}>Submit Claim</button>} {item.status === 'Submitted' && <button type="button" className="primary-button" onClick={() => updateAllowanceClaim(item._id, 'approve')}>Approve Claim</button>}</div></div>)}</section></div>
    </div>
  );
}
