import { useEffect, useState } from 'react';
import api from '../services/api';

const formatMeetingDate = (meeting) => {
  const value = meeting.startTime || meeting.date;
  return value ? new Date(value).toLocaleDateString('en-GB') : 'Date not set';
};

const emptyForm = { name: '', description: '' };

export default function Committees() {
  const [committees, setCommittees] = useState([]);
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [chairperson, setChairperson] = useState('');
  const [viceChairperson, setViceChairperson] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const [committeesRes, membersRes] = await Promise.all([
        api.get('/committees'),
        api.get('/mcas?includeInactive=false'),
      ]);
      setCommittees(committeesRes.data || []);
      setMembers(membersRes.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to load committees');
    }
  };

  useEffect(() => { load(); }, []);

  const openCommittee = async (committee) => {
    try {
      const response = await api.get(`/committees/${committee._id}`);
      setSelected(response.data);
      setChairperson(response.data.chairperson?._id || '');
      setViceChairperson(response.data.viceChairperson?._id || '');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to load committee details');
    }
  };

  const create = async (event) => {
    event.preventDefault();
    try {
      await api.post('/committees', form);
      setForm(emptyForm);
      setMessage('Committee created');
      load();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to create committee');
    }
  };

  const saveLeadership = async (event) => {
    event.preventDefault();
    if (!selected) return;
    try {
      const response = await api.put(`/committees/${selected._id}`, { chairperson, viceChairperson });
      setSelected((current) => ({ ...current, ...response.data }));
      setMessage('Committee leadership updated');
      load();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update committee leadership');
    }
  };

  const assignMembers = async (event) => {
    if (!selected) return;
    const selectedMembers = Array.from(event.target.selectedOptions).map((option) => option.value);
    try {
      const response = await api.put(`/committees/${selected._id}/members`, { members: selectedMembers });
      setSelected(response.data);
      setMessage('Committee members updated');
      load();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update committee members');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Committees</h1>
        <p>Manage committee leadership, membership, meetings, documents, and reports.</p>
      </div>
      {message && <div className="notification">{message}</div>}

      <div className="grid-two-column">
        <section className="card">
          <h2>Create Committee</h2>
          <form onSubmit={create} className="form-grid">
            <label>Committee Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
            <label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows="3" /></label>
            <button className="primary-button" type="submit">Create Committee</button>
          </form>
        </section>

        <section className="card">
          <h2>All Committees</h2>
          <div className="list-panel">
            {committees.map((committee) => (
              <button key={committee._id} type="button" className="list-item" onClick={() => openCommittee(committee)} style={{ width: '100%', textAlign: 'left', border: 0, cursor: 'pointer' }}>
                <strong>{committee.name}</strong>
                <div>{committee.description || 'No description provided.'}</div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {selected && (
        <section className="card" style={{ marginTop: '1rem' }}>
          <h2>{selected.name}</h2>
          <p>{selected.description || 'No description provided.'}</p>
          <div className="dashboard-grid two-column">
            <div>
              <h3>Leadership</h3>
              <form onSubmit={saveLeadership} className="form-grid">
                <label>Chairperson<select value={chairperson} onChange={(event) => setChairperson(event.target.value)}><option value="">Not assigned</option>{members.map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}</select></label>
                <label>Vice Chairperson<select value={viceChairperson} onChange={(event) => setViceChairperson(event.target.value)}><option value="">Not assigned</option>{members.map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}</select></label>
                <button type="submit" className="primary-button">Save Leadership</button>
              </form>

              <h3>Members</h3>
              <select multiple value={(selected.members || []).map((member) => member._id)} onChange={assignMembers} style={{ minHeight: '150px', width: '100%' }}>
                {members.map((member) => <option key={member._id} value={member._id}>{member.name}{member.ward ? ` - ${member.ward}` : ''}</option>)}
              </select>
            </div>

            <div>
              <h3>Meetings</h3>
              {selected.meetings?.length ? <ul className="list-panel">{selected.meetings.map((meeting) => <li key={meeting._id} className="list-item"><strong>{formatMeetingDate(meeting)}</strong><div>{meeting.title || meeting.agenda || 'Committee meeting'}</div></li>)}</ul> : <p>No meetings scheduled.</p>}
              <h3>Documents and Reports</h3>
              {selected.reports?.length ? <ul className="list-panel">{selected.reports.map((report) => <li key={report._id} className="list-item"><strong>{report.title}</strong><div>{report.status || 'Document'}</div></li>)}</ul> : <p>No committee documents or reports uploaded.</p>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
