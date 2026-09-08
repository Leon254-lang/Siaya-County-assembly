import { useEffect, useState } from 'react';
import api from '../services/api';

const tabs = ['information', 'members', 'committees', 'order papers', 'hansard', 'bills', 'participation'];
const dateLabel = (value) => value ? new Date(value).toLocaleDateString('en-GB', { dateStyle: 'long' }) : 'Date not set';

export default function PublicPortal() {
  const [activeTab, setActiveTab] = useState('information');
  const [data, setData] = useState({ members: [], committees: [], orderPapers: [], hansard: [], bills: [] });
  const [form, setForm] = useState({ name: '', email: '', title: '', description: '', category: 'public_comment' });
  const [trackingCode, setTrackingCode] = useState('');
  const [tracked, setTracked] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/public/members'), api.get('/public/committees'), api.get('/public/order-papers'), api.get('/public/hansard'), api.get('/public/bills'),
    ]).then(([members, committees, orderPapers, hansard, bills]) => setData({ members: members.data, committees: committees.data, orderPapers: orderPapers.data, hansard: hansard.data, bills: bills.data })).catch(() => setMessage('Public information is temporarily unavailable.'));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    try {
      const response = await api.post('/public/submissions', form);
      setTrackingCode(response.data.trackingCode);
      setMessage('Submission received. Keep your tracking code to check progress.');
      setForm({ name: '', email: '', title: '', description: '', category: 'public_comment' });
    } catch (error) { setMessage(error.response?.data?.message || 'Submission failed.'); }
  };

  const track = async (event) => {
    event.preventDefault();
    try { const response = await api.get(`/public/submissions/${trackingCode}`); setTracked(response.data); setMessage('Submission status loaded.'); } catch (error) { setMessage(error.response?.data?.message || 'Submission not found.'); }
  };

  return (
    <div className="page">
      <div className="page-header"><h1>Siaya County Assembly Public Portal</h1><p>Access Assembly information, legislative records, and public participation services.</p></div>
      {message && <div className="notification">{message}</div>}
      <div className="dashboard-tabs">{tabs.map((tab) => <button key={tab} type="button" className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab.replace(/^./, (letter) => letter.toUpperCase())}</button>)}</div>

      {activeTab === 'information' && <section className="card"><h2>Assembly Information</h2><p>The Siaya County Assembly provides legislative, oversight, representation, and public participation services for the people of Siaya County.</p><div className="dashboard-grid two-column"><div><h3>Public records</h3><p>Browse published Order Papers, Hansard, Bills, Members, and Committees.</p></div><div><h3>Participation</h3><p>Submit a comment or track an existing public submission using its tracking code.</p></div></div></section>}
      {activeTab === 'members' && <section className="card"><h2>Members</h2><div className="list-panel">{data.members.map((member) => <div className="list-item" key={member._id}><strong>{member.full_name || member.name}</strong><div>{member.position || 'Member of County Assembly'} · {member.ward || 'Ward not listed'} · {member.party || 'Party not listed'}</div><small>{member.constituency || 'Constituency not listed'}</small></div>)}</div></section>}
      {activeTab === 'committees' && <section className="card"><h2>Committees</h2><div className="list-panel">{data.committees.map((committee) => <div className="list-item" key={committee._id}><strong>{committee.name}</strong><div>Chairperson: {committee.chairperson?.name || 'Not assigned'} · Vice Chairperson: {committee.viceChairperson?.name || 'Not assigned'}</div><small>{committee.members?.length || 0} members</small></div>)}</div></section>}
      {activeTab === 'order papers' && <section className="card"><h2>Published Order Papers</h2>{data.orderPapers.map((paper) => <div className="list-item" key={paper._id}><strong>{paper.title}</strong><div>{dateLabel(paper.sessionDate)} · {paper.status}</div><ol>{paper.items?.map((item) => <li key={item._id}>{item.title}</li>)}</ol></div>)}</section>}
      {activeTab === 'hansard' && <section className="card"><h2>Published Hansard</h2>{data.hansard.map((record) => <div className="list-item" key={record._id}><strong>{record.title}</strong><div>{dateLabel(record.sessionDate)} · {record.entries?.length || 0} contributions</div>{record.entries?.slice(0, 5).map((entry) => <p key={entry._id}><strong>{entry.speaker?.name || entry.member?.name || entry.speakerName}:</strong> {entry.text}</p>)}</div>)}</section>}
      {activeTab === 'bills' && <section className="card"><h2>Assembly Bills</h2>{data.bills.map((bill) => <div className="list-item" key={bill._id}><strong>{bill.title}</strong><div>{bill.status} · {bill.committee?.name || 'No committee assigned'}</div><p>{bill.summary}</p></div>)}</section>}
      {activeTab === 'participation' && <section className="dashboard-grid two-column"><form className="card form-grid" onSubmit={submit}><h2>Submit Public Participation</h2><input placeholder="Your name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><input type="email" placeholder="Email (optional)" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /><input placeholder="Subject" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required /><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option value="public_comment">Public comment</option><option value="feedback_report">Feedback report</option><option value="bill_notice">Bill notice</option></select><textarea rows="6" placeholder="Your submission" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required /><button className="primary-button" type="submit">Submit</button>{trackingCode && <strong>Tracking code: {trackingCode}</strong>}</form><form className="card form-grid" onSubmit={track}><h2>Track Submission</h2><input placeholder="PUB-XXXXXXXXXX" value={trackingCode} onChange={(event) => setTrackingCode(event.target.value.toUpperCase())} required /><button className="secondary-button" type="submit">Track</button>{tracked && <div className="list-item"><strong>{tracked.title}</strong><div>Status: {tracked.status}</div><small>Received: {dateLabel(tracked.createdAt)}</small></div>}</form></section>}
    </div>
  );
}
