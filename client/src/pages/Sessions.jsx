import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const formatDateTime = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString();
};

const initialForm = {
  title: '',
  room: '',
  startTime: '',
  endTime: '',
  agenda: '',
  notes: '',
  attendees: [],
  agendaFile: null,
  minutesFile: null,
  votingItems: [],
  newQuestion: '',
  newOptions: '',
  newVoteType: 'electronic',
};

export default function Sessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [voteSelection, setVoteSelection] = useState({ itemId: '', option: '' });
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, usersRes] = await Promise.all([
        api.get('/meetings?type=session&upcoming=true'),
        api.get('/users'),
      ]);
      setSessions(sessionsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Failed to load sessions data:', error);
      if (error.response?.status === 401) {
        navigate('/login');
        return;
      }
      setMessage('Unable to load session resources.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [navigate]);

  const resetForm = () => {
    setForm(initialForm);
    setMessage('');
  };

  const handleFormChange = (event) => {
    const { name, value, type, files, options } = event.target;
    if (type === 'file') {
      setForm((prev) => ({ ...prev, [name]: files[0] }));
      return;
    }
    if (type === 'select-multiple') {
      const selected = Array.from(options).filter((option) => option.selected).map((option) => option.value);
      setForm((prev) => ({ ...prev, [name]: selected }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddVotingItem = () => {
    const question = form.newQuestion.trim();
    const options = form.newOptions.split(',').map((option) => option.trim()).filter(Boolean);

    if (!question || options.length < 2) {
      setMessage('Provide a question and at least two comma-separated options.');
      return;
    }

    setForm((prev) => ({
      ...prev,
      votingItems: [...prev.votingItems, { question, options, voteType: prev.newVoteType }],
      newQuestion: '',
      newOptions: '',
      newVoteType: 'electronic',
    }));
    setMessage('');
  };

  const handleCreateSession = async (event) => {
    event.preventDefault();
    setMessage('');
    if (!form.title || !form.startTime || !form.endTime) {
      setMessage('Title, start time and end time are required.');
      return;
    }

    try {
      const payload = {
        title: form.title,
        room: form.room,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        agenda: form.agenda,
        notes: form.notes,
        attendees: form.attendees,
        meetingType: 'session',
        votingItems: form.votingItems,
      };

      const createRes = await api.post('/meetings', payload);
      const createdSession = createRes.data;

      if (form.agendaFile) {
        const agendaData = new FormData();
        agendaData.append('file', form.agendaFile);
        await api.post(`/meetings/${createdSession._id}/upload-agenda`, agendaData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (form.minutesFile) {
        const minutesData = new FormData();
        minutesData.append('file', form.minutesFile);
        await api.post(`/meetings/${createdSession._id}/upload-minutes`, minutesData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setMessage('Assembly session created successfully.');
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to create session:', error);
      setMessage(error.response?.data?.message || 'Unable to create session.');
    }
  };

  const handleSelectSession = (session) => {
    setSelectedSession(session);
    setVoteSelection({ itemId: '', option: '' });
  };

  const handleAttendanceChange = (userId, status) => {
    if (!selectedSession) return;
    const attendance = selectedSession.attendance.map((entry) => {
      const id = entry.user?._id || entry.user;
      if (id === userId) {
        return { ...entry, status, checkedInAt: entry.checkedInAt || new Date().toISOString() };
      }
      return entry;
    });
    setSelectedSession((prev) => ({ ...prev, attendance }));
  };

  const saveAttendance = async () => {
    if (!selectedSession) return;
    try {
      const attendance = selectedSession.attendance.map((entry) => ({
        user: entry.user?._id || entry.user,
        status: entry.status,
        checkedInAt: entry.checkedInAt,
      }));
      await api.post(`/meetings/${selectedSession._id}/attendance`, { attendance });
      setMessage('Session attendance updated.');
      fetchData();
    } catch (error) {
      console.error(error);
      setMessage('Unable to save session attendance.');
    }
  };

  const castVote = async () => {
    if (!selectedSession || !voteSelection.itemId || !voteSelection.option) {
      setMessage('Select a voting item and option first.');
      return;
    }
    try {
      await api.post(`/meetings/${selectedSession._id}/vote`, voteSelection);
      setMessage('Vote recorded.');
      const refreshed = await api.get(`/meetings/${selectedSession._id}`);
      setSelectedSession(refreshed.data);
      fetchData();
    } catch (error) {
      console.error(error);
      setMessage(error.response?.data?.message || 'Unable to record vote.');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Assembly Session Management</h1>
        <p>Schedule plenary sittings, upload agendas, track attendance, manage voting, and archive minutes.</p>
      </div>

      {message && <div className="notification">{message}</div>}

      <div className="meeting-grid">
        <div className="meeting-panel">
          <h2>Upcoming Sessions</h2>
          {loading ? (
            <p>Loading sessions...</p>
          ) : sessions.length === 0 ? (
            <p>No planned sessions found.</p>
          ) : (
            <div className="meeting-list">
              {sessions.map((session) => (
                <button
                  key={session._id}
                  type="button"
                  className={selectedSession?._id === session._id ? 'meeting-item selected' : 'meeting-item'}
                  onClick={() => handleSelectSession(session)}
                >
                  <div className="meeting-title">{session.title}</div>
                  <div className="meeting-meta">
                    <span>{session.room || 'Room not set'}</span>
                    <span>{formatDateTime(session.startTime)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="meeting-panel">
          <h2>Schedule Plenary Session</h2>
          <form onSubmit={handleCreateSession} className="meeting-form">
            <label>
              Session title
              <input name="title" value={form.title} onChange={handleFormChange} required />
            </label>
            <label>
              Room
              <input name="room" value={form.room} onChange={handleFormChange} placeholder="Assembly hall" />
            </label>
            <label>
              Start time
              <input name="startTime" type="datetime-local" value={form.startTime} onChange={handleFormChange} required />
            </label>
            <label>
              End time
              <input name="endTime" type="datetime-local" value={form.endTime} onChange={handleFormChange} required />
            </label>
            <label>
              Attendees
              <select name="attendees" value={form.attendees} onChange={handleFormChange} multiple>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name} {user.role?.name ? `(${user.role.name})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Agenda notes
              <textarea name="agenda" value={form.agenda} onChange={handleFormChange} rows="4" />
            </label>
            <label>
              Agenda file
              <input name="agendaFile" type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFormChange} />
            </label>
            <label>
              Minutes file
              <input name="minutesFile" type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFormChange} />
            </label>
            <label>
              Notes
              <textarea name="notes" value={form.notes} onChange={handleFormChange} rows="3" />
            </label>
            <div className="voting-builder">
              <h3>Voting items</h3>
              <label>
                Question
                <input name="newQuestion" value={form.newQuestion} onChange={handleFormChange} />
              </label>
              <label>
                Options (comma separated)
                <input name="newOptions" value={form.newOptions} onChange={handleFormChange} placeholder="Yes, No, Abstain" />
              </label>
              <label>
                Vote type
                <select name="newVoteType" value={form.newVoteType} onChange={handleFormChange}>
                  <option value="electronic">Electronic vote</option>
                  <option value="voice">Voice vote</option>
                  <option value="secret">Secret ballot</option>
                </select>
              </label>
              <button type="button" className="secondary-button" onClick={handleAddVotingItem}>
                Add voting item
              </button>
              {form.votingItems.length > 0 && (
                <div className="vote-preview">
                  <h4>Pending voting items</h4>
                  <ul>
                    {form.votingItems.map((item, index) => (
                      <li key={`${item.question}-${index}`}>
                        <strong>{item.question}</strong> — {item.options.join(', ')}
                        <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>Vote type: {item.voteType}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button type="submit" className="primary-button">Schedule Session</button>
          </form>
        </div>
      </div>

      {selectedSession && (
        <section className="meeting-details card">
          <h2>{selectedSession.title}</h2>
          <div className="details-row">
            <div>
              <strong>Room:</strong> {selectedSession.room || 'Not assigned'}
            </div>
            <div>
              <strong>Start:</strong> {formatDateTime(selectedSession.startTime)}
            </div>
          </div>
          <div className="details-row">
            <div>
              <strong>End:</strong> {formatDateTime(selectedSession.endTime)}
            </div>
            <div>
              <strong>Type:</strong> Assembly session
            </div>
          </div>
          <div className="details-row">
            <div>
              <strong>Agenda notes:</strong>
              <p>{selectedSession.agenda || 'None yet'}</p>
            </div>
            <div>
              <strong>Notes:</strong>
              <p>{selectedSession.notes || 'No notes yet'}</p>
            </div>
          </div>
          <div className="details-row">
            <div>
              <strong>Agenda file:</strong>{' '}
              {selectedSession.agendaFile ? (
                <a href={`/uploads/meetings/${selectedSession.agendaFile}`} target="_blank" rel="noreferrer">Download</a>
              ) : (
                <span>None uploaded</span>
              )}
            </div>
            <div>
              <strong>Minutes file:</strong>{' '}
              {selectedSession.minutesFile ? (
                <a href={`/uploads/meetings/${selectedSession.minutesFile}`} target="_blank" rel="noreferrer">Download</a>
              ) : (
                <span>None uploaded</span>
              )}
            </div>
          </div>

          <div className="attendance-section">
            <h3>Attendance</h3>
            {selectedSession.attendance?.length > 0 ? (
              <div className="attendance-table">
                {selectedSession.attendance.map((entry) => {
                  const userId = entry.user?._id || entry.user;
                  return (
                    <div className="attendance-row" key={userId}>
                      <span>{entry.user?.name || 'Unknown attendee'}</span>
                      <select
                        value={entry.status}
                        onChange={(e) => handleAttendanceChange(userId, e.target.value)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Present">Present</option>
                        <option value="Absent">Absent</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p>No attendees are assigned to this session yet.</p>
            )}
            <button type="button" className="secondary-button" onClick={saveAttendance}>
              Save Attendance
            </button>
          </div>

          <div className="voting-section">
            <h3>Voting management</h3>
            {selectedSession.votingItems?.length > 0 ? (
              <div className="vote-card">
                {selectedSession.votingItems.map((item) => (
                  <div key={item._id} className="vote-item">
                    <p><strong>{item.question}</strong> <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>({item.voteType || 'electronic'})</span></p>
                    <ul>
                      {item.options.map((option) => {
                        const result = item.results?.find((r) => r.option === option);
                        return (
                          <li key={option}>
                            {option}: {result?.votes ?? 0} votes
                          </li>
                        );
                      })}
                    </ul>
                    {item.finalDecision && <p><strong>Decision:</strong> {item.finalDecision}</p>}
                  </div>
                ))}
                <div className="cast-vote">
                  <label>
                    Select voting item
                    <select
                      value={voteSelection.itemId}
                      onChange={(e) => setVoteSelection((prev) => ({ ...prev, itemId: e.target.value }))}
                    >
                      <option value="">Select item</option>
                      {selectedSession.votingItems.map((item) => (
                        <option key={item._id} value={item._id}>{item.question}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Option
                    <select
                      value={voteSelection.option}
                      onChange={(e) => setVoteSelection((prev) => ({ ...prev, option: e.target.value }))}
                      disabled={!voteSelection.itemId}
                    >
                      <option value="">Select option</option>
                      {selectedSession.votingItems
                        .find((item) => item._id === voteSelection.itemId)
                        ?.options.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                  </label>
                  <button type="button" className="primary-button" onClick={castVote}>
                    Record Vote
                  </button>
                </div>
              </div>
            ) : (
              <p>No voting items defined for this session.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
