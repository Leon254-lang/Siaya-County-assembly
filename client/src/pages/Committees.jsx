import { useEffect, useState } from 'react';
import api from '../services/api';

const formatMeetingDate = (meeting) => {
  const value = meeting.startTime || meeting.date;
  return value ? new Date(value).toLocaleDateString('en-GB') : 'Date not set';
};

const emptyForm = { name: '', mandate: '', description: '' };

export default function Committees() {
  const [committees, setCommittees] = useState([]);
  const [members, setMembers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [chairperson, setChairperson] = useState('');
  const [viceChairperson, setViceChairperson] = useState('');
  const [clerk, setClerk] = useState('');
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
      setClerk(response.data.clerk?._id || '');
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
      const response = await api.put(`/committees/${selected._id}`, { chairperson, viceChairperson, clerk });
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
        <h1>Committee Management</h1>
        <p>Manage committee mandate, leadership, meetings, agenda, attendance, minutes, reports, action items, and performance.</p>
      </div>
      {message && <div className="notification">{message}</div>}

      <div className="grid-two-column">
        <section className="card">
          <h2>Create Committee</h2>
          <form onSubmit={create} className="form-grid">
            <label>Committee Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
            <label>Mandate<textarea value={form.mandate} onChange={(event) => setForm({ ...form, mandate: event.target.value })} rows="3" /></label>
            <label>Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows="3" /></label>
            <button className="primary-button" type="submit">Create Committee</button>
          </form>
        </section>

        <section className="card">
          <h2>Committee list</h2>
          <div className="list-panel">
            {committees.map((committee) => (
              <button key={committee._id} type="button" className="list-item" onClick={() => openCommittee(committee)} style={{ width: '100%', textAlign: 'left', border: 0, cursor: 'pointer' }}>
                <strong>{committee.name}</strong>
                <div>{committee.mandate || committee.description || 'No mandate provided.'}</div>
              </button>
            ))}
          </div>
        </section>
      </div>

      {selected && (
        <section className="card" style={{ marginTop: '1rem' }}>
          <h2>{selected.name}</h2>
          <p><strong>Mandate:</strong> {selected.mandate || 'Not specified.'}</p>
          <p>{selected.description || 'No description provided.'}</p>

          <div className="dashboard-grid three-column">
            <div className="card nested-card">
              <h3>Committee metrics</h3>
              <p><strong>Meetings:</strong> {selected.performance?.totalMeetings ?? selected.meetings?.length ?? 0}</p>
              <p><strong>Overdue actions:</strong> {selected.performance?.overdueActions ?? selected.performance?.overdueActionItems ?? 0}</p>
              <p><strong>Completed actions:</strong> {selected.performance?.completedActions ?? selected.performance?.completedActionItems ?? 0}</p>
              <p><strong>Average attendance:</strong> {selected.performance?.averageAttendance ?? 0}%</p>
            </div>
            <div className="card nested-card">
              <h3>Leadership</h3>
              <p><strong>Chairperson:</strong> {selected.chairperson?.name || 'Not assigned'}</p>
              <p><strong>Vice Chair:</strong> {selected.viceChairperson?.name || 'Not assigned'}</p>
              <p><strong>Clerk:</strong> {selected.clerk?.name || 'Not assigned'}</p>
              <form onSubmit={saveLeadership} className="form-grid">
                <label>Chairperson<select value={chairperson} onChange={(event) => setChairperson(event.target.value)}><option value="">Not assigned</option>{members.map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}</select></label>
                <label>Vice Chairperson<select value={viceChairperson} onChange={(event) => setViceChairperson(event.target.value)}><option value="">Not assigned</option>{members.map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}</select></label>
                <label>Clerk<select value={clerk} onChange={(event) => setClerk(event.target.value)}><option value="">Not assigned</option>{members.map((member) => <option key={member._id} value={member._id}>{member.name}</option>)}</select></label>
                <button type="submit" className="primary-button">Save leadership</button>
              </form>
            </div>
            <div className="card nested-card">
              <h3>Members</h3>
              <select multiple value={(selected.members || []).map((member) => member._id || member)} onChange={assignMembers} style={{ minHeight: '150px', width: '100%' }}>
                {members.map((member) => <option key={member._id} value={member._id}>{member.name}{member.ward ? ` - ${member.ward}` : ''}</option>)}
              </select>
            </div>
          </div>

          <div className="dashboard-grid two-column">
            <div className="card nested-card">
              <h3>Committee calendar and meetings</h3>
              {selected.meetings?.length ? (
                <ul className="list-panel">
                  {selected.meetings.map((meeting) => (
                    <li key={meeting._id || `${meeting.title}-${meeting.date}`} className="list-item">
                      <strong>{meeting.title || 'Committee meeting'}</strong>
                      <div>{formatMeetingDate(meeting)}</div>
                      <small>{meeting.agenda || 'No agenda set.'}</small>
                    </li>
                  ))}
                </ul>
              ) : <p>No meetings scheduled.</p>}
            </div>

            <div className="card nested-card">
              <h3>Agenda, invitations and attendance</h3>
              {selected.meetings?.length ? (
                <div>
                  {selected.meetings.map((meeting, index) => (
                    <div key={`${meeting._id || index}-agenda`} style={{ marginBottom: '1rem' }}>
                      <strong>{meeting.title || 'Committee meeting'}</strong>
                      <div><em>Agenda:</em> {meeting.agenda || 'No agenda recorded'}</div>
                      <div><em>Invitations:</em> {(meeting.invitations || []).join(', ') || 'No invitations'}</div>
                      <div><em>Attendance:</em> {(meeting.attendance || []).length || 0} confirmed</div>
                      <div><em>Minutes:</em> {meeting.minutes || 'Not yet recorded'}</div>
                    </div>
                  ))}
                </div>
              ) : <p>No agenda or attendance details available.</p>}
            </div>
          </div>

          <div className="dashboard-grid three-column">
            <div className="card nested-card">
              <h3>Reports and recommendations</h3>
              {selected.reports?.length ? (
                <ul className="list-panel">
                  {selected.reports.map((report) => <li key={report._id} className="list-item"><strong>{report.title}</strong><div>{report.status || 'Document'}</div></li>)}
                </ul>
              ) : <p>No reports submitted.</p>}
              {selected.recommendations?.length ? (
                <ul className="list-panel">
                  {selected.recommendations.map((item, index) => <li key={`${item._id || index}`} className="list-item"><strong>{item.text}</strong><small>By {item.by?.name || 'Committee member'}</small></li>)}
                </ul>
              ) : <p>No recommendations recorded.</p>}
            </div>

            <div className="card nested-card">
              <h3>Action items</h3>
              {selected.meetings?.flatMap((meeting) => meeting.actionItems || []).length ? (
                <ul className="list-panel">
                  {selected.meetings.flatMap((meeting) => (meeting.actionItems || []).map((item, index) => (
                    <li key={`${meeting._id || 'meeting'}-${index}`} className="list-item">
                      <strong>{item.title}</strong>
                      <div>{item.description || 'No description'}</div>
                      <small>{item.status || 'Pending'} · {item.responsiblePerson?.name || item.assignedTo?.name || 'Unassigned'} · Due {item.dueDate || item.deadline ? new Date(item.dueDate || item.deadline).toLocaleDateString('en-GB') : 'Not set'}</small>
                    </li>
                  )))}
                </ul>
              ) : <p>No action items tracked.</p>}
            </div>

            <div className="card nested-card">
              <h3>Document submissions</h3>
              {selected.documents?.length ? (
                <ul className="list-panel">
                  {selected.documents.map((doc) => <li key={doc._id} className="list-item"><strong>{doc.title || 'Document'}</strong><div>{doc.status || 'Submitted'}</div></li>)}
                </ul>
              ) : <p>No departmental or public submissions recorded.</p>}
            </div>
          </div>

          <div className="card nested-card">
            <h3>Committee performance and overdue actions</h3>
            <p><strong>Overdue actions:</strong> {selected.performance?.overdueActions ?? selected.performance?.overdueActionItems ?? 0}</p>
            <p><strong>Completed actions:</strong> {selected.performance?.completedActions ?? selected.performance?.completedActionItems ?? 0}</p>
            <p><strong>Average attendance:</strong> {selected.performance?.averageAttendance ?? 0}%</p>
            <p><strong>Last updated:</strong> {(selected.performance?.updatedAt || selected.performance?.lastUpdated) ? new Date(selected.performance.updatedAt || selected.performance.lastUpdated).toLocaleString('en-GB') : 'Not yet updated'}</p>
          </div>
        </section>
      )}
    </div>
  );
}
