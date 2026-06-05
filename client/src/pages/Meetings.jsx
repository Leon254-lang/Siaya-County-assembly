import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString();
};

const buildAttendanceState = (meeting) => {
  const result = {};
  meeting.attendance?.forEach((entry) => {
    const userId = entry.user?._id || entry.user;
    result[userId] = entry.status || 'Pending';
  });
  return result;
};

const boardrooms = ['Boardroom 1', 'Boardroom 2', 'Boardroom 3', 'Boardroom 4', 'Boardroom 5'];

export default function Meetings() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    committee: '',
    room: '',
    startTime: '',
    endTime: '',
    agenda: '',
    notes: '',
    attendees: [],
    agendaFile: null,
    minutesFile: null,
  });
  const [attendeeQuery, setAttendeeQuery] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [meetingsRes, committeesRes, usersRes] = await Promise.all([
        api.get('/meetings?upcoming=true'),
        api.get('/committees'),
        api.get('/users'),
      ]);

      setMeetings(meetingsRes.data);
      setCommittees(committeesRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error('Failed loading meetings data:', err);
      if (err.response?.status === 401) {
        setMessage('Authentication required. Please log in again.');
        localStorage.removeItem('icamsToken');
        navigate('/login');
        return;
      }
      setMessage('Unable to load meeting resources.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('icamsToken')) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [navigate]);

  const resetForm = () => {
    setForm({
      title: '',
      committee: '',
      room: '',
      startTime: '',
      endTime: '',
      agenda: '',
      notes: '',
      attendees: [],
      agendaFile: null,
      minutesFile: null,
    });
    setAttendeeQuery('');
  };

  const handleFormChange = (e) => {
    const { name, value, type, files, options } = e.target;
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

  const handleAddAttendee = () => {
    const query = attendeeQuery.trim();
    if (!query) return;

    const normalized = query.toLowerCase();
    const matchingUsers = users.filter((userItem) => {
      const label = `${userItem.name} (${userItem.email})`.toLowerCase();
      return label.includes(normalized) || userItem.email.toLowerCase().includes(normalized) || userItem.name.toLowerCase().includes(normalized);
    });

    let user = null;
    if (matchingUsers.length === 1) {
      user = matchingUsers[0];
    } else if (matchingUsers.length > 1) {
      user = matchingUsers.find((userItem) => {
        const label = `${userItem.name} (${userItem.email})`.toLowerCase();
        return label === normalized || userItem.email.toLowerCase() === normalized || userItem.name.toLowerCase() === normalized;
      });
      if (!user) {
        setMessage('Multiple attendee matches found. Type the full name or email to select one.');
        return;
      }
    }

    if (!user) {
      setMessage('Choose a valid attendee from the suggestions.');
      return;
    }

    if (form.attendees.includes(user._id)) {
      setMessage('Attendee already added.');
      return;
    }

    setForm((prev) => ({ ...prev, attendees: [...prev.attendees, user._id] }));
    setAttendeeQuery('');
    setMessage('');
  };

  const handleRemoveAttendee = (userId) => {
    setForm((prev) => ({ ...prev, attendees: prev.attendees.filter((id) => id !== userId) }));
  };

  const handleSelectMeeting = (meeting) => {
    setSelectedMeeting(meeting);
    setAttendanceStatus(buildAttendanceState(meeting));
  };

  const handleCreateMeeting = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const payload = {
        title: form.title,
        committee: form.committee || undefined,
        room: form.room,
        startTime: form.startTime ? new Date(form.startTime).toISOString() : undefined,
        endTime: form.endTime ? new Date(form.endTime).toISOString() : undefined,
        agenda: form.agenda,
        notes: form.notes,
        attendees: form.attendees,
      };

      const createRes = await api.post('/meetings', payload);
      const newMeeting = createRes.data;

      if (form.agendaFile) {
        const agendaData = new FormData();
        agendaData.append('file', form.agendaFile);
        await api.post(`/meetings/${newMeeting._id}/upload-agenda`, agendaData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (form.minutesFile) {
        const minutesData = new FormData();
        minutesData.append('file', form.minutesFile);
        await api.post(`/meetings/${newMeeting._id}/upload-minutes`, minutesData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setMessage('Meeting scheduled successfully.');
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating meeting:', error);
      setMessage('Failed to create meeting.');
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedMeeting) return;
    try {
      const attendance = selectedMeeting.attendance?.map((entry) => ({
        user: entry.user?._id || entry.user,
        status: attendanceStatus[entry.user?._id || entry.user] || entry.status,
        checkedInAt: entry.checkedInAt,
      })) || [];

      await api.post(`/meetings/${selectedMeeting._id}/attendance`, { attendance });
      setMessage('Attendance updated.');
      fetchData();
    } catch (error) {
      console.error('Error saving attendance:', error);
      setMessage('Unable to save attendance.');
    }
  };

  const handleSendReminder = async () => {
    if (!selectedMeeting) return;
    setMessage('');
    try {
      await api.post(`/meetings/${selectedMeeting._id}/send-reminder`);
      setMessage('Reminder sent to meeting attendees.');
      const updatedMeeting = await api.get(`/meetings/${selectedMeeting._id}`);
      setSelectedMeeting(updatedMeeting.data);
      fetchData();
    } catch (error) {
      console.error('Failed to send reminder:', error);
      setMessage(error.response?.data?.message || 'Unable to send reminder.');
    }
  };

  const handleAttendanceChange = (userId, newStatus) => {
    setAttendanceStatus((prev) => ({ ...prev, [userId]: newStatus }));
  };

  return (
    <div className="meetings-page">
      <div className="page-header">
        <h1>Committee Meeting Scheduler</h1>
        <p>Manage committee meeting times, room allocation, agenda upload, attendance, and minutes storage.</p>
      </div>

      {message && <div className="notification">{message}</div>}

      <section className="meeting-grid">
        <div className="meeting-panel">
          <h2>Upcoming Meetings</h2>
          {loading ? (
            <p>Loading meetings...</p>
          ) : meetings.length === 0 ? (
            <p>No upcoming meetings scheduled.</p>
          ) : (
            <div className="meeting-list">
              {meetings.map((meeting) => (
                <button
                  type="button"
                  key={meeting._id}
                  className={selectedMeeting?._id === meeting._id ? 'meeting-item selected' : 'meeting-item'}
                  onClick={() => handleSelectMeeting(meeting)}
                >
                  <div className="meeting-title">{meeting.title}</div>
                  <div className="meeting-meta">
                    <span>{meeting.committee?.name || 'General'}</span>
                    <span>{meeting.room || 'Room not set'}</span>
                  </div>
                  <div className="meeting-time">{formatDateTime(meeting.startTime)}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="meeting-panel">
          <h2>Schedule a Meeting</h2>
          <form onSubmit={handleCreateMeeting} className="meeting-form">
            <label>
              Title
              <input name="title" value={form.title} onChange={handleFormChange} required />
            </label>
            <label>
              Committee
              <select name="committee" value={form.committee} onChange={handleFormChange} required>
                <option value="">Select a committee...</option>
                {committees.map((committee) => (
                  <option key={committee._id} value={committee._id}>
                    {committee.name}
                  </option>
                ))}
              </select>
            </label>
            {committees.length === 0 && (
              <p className="form-note">No committees found. Please add committees in the administration panel.</p>
            )}
            <label>
              Boardroom
              <select name="room" value={form.room} onChange={handleFormChange} required>
                <option value="">Select a boardroom...</option>
                {boardrooms.map((room) => (
                  <option key={room} value={room}>{room}</option>
                ))}
              </select>
            </label>
            <label>
              Start time
              <input name="startTime" type="datetime-local" value={form.startTime} onChange={handleFormChange} required />
            </label>
            <label>
              End time
              <input name="endTime" type="datetime-local" value={form.endTime} onChange={handleFormChange} />
            </label>
            <label>
              Attendees
              <div className="attendee-input-row">
                <input
                  name="attendeeQuery"
                  value={attendeeQuery}
                  list="attendee-options"
                  onChange={(e) => setAttendeeQuery(e.target.value)}
                  placeholder="Search attendee by name or email"
                />
                <button type="button" className="secondary-button" onClick={handleAddAttendee}>
                  Add
                </button>
              </div>
              <datalist id="attendee-options">
                {users.map((user) => (
                  <option key={user._id} value={`${user.name} (${user.email})`} />
                ))}
              </datalist>
            </label>
            {form.attendees.length > 0 && (
              <div className="attendee-chips">
                {form.attendees.map((userId) => {
                  const user = users.find((item) => item._id === userId);
                  return (
                    <span key={userId} className="attendee-chip">
                      {user ? `${user.name} (${user.email})` : userId}
                      <button type="button" className="chip-remove" onClick={() => handleRemoveAttendee(userId)}>
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
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
            <button type="submit" className="primary-button">Schedule Meeting</button>
          </form>
        </div>
      </section>

      {selectedMeeting && (
        <section className="meeting-details card">
          <h2>{selectedMeeting.title}</h2>
          <div className="details-row">
            <div>
              <strong>Committee:</strong> {selectedMeeting.committee?.name || 'General'}
            </div>
            <div>
              <strong>Room:</strong> {selectedMeeting.room || 'Not assigned'}
            </div>
          </div>
          <div className="details-row">
            <div>
              <strong>Start:</strong> {formatDateTime(selectedMeeting.startTime)}
            </div>
            <div>
              <strong>End:</strong> {formatDateTime(selectedMeeting.endTime)}
            </div>
          </div>
          <div className="details-row">
            <div>
              <strong>Agenda notes:</strong>
              <p>{selectedMeeting.agenda || 'None yet'}</p>
            </div>
            <div>
              <strong>Notes:</strong>
              <p>{selectedMeeting.notes || 'None yet'}</p>
            </div>
          </div>
          <div className="details-row">
            <div>
              <strong>Reminder status:</strong>{' '}
              {selectedMeeting.reminderSent ? 'Sent' : 'Pending'}
            </div>
            <div>
              <button type="button" className="secondary-button" onClick={handleSendReminder}>
                Send Reminder Now
              </button>
            </div>
          </div>
          <div className="details-row">
            <div>
              <strong>Agenda file:</strong>{' '}
              {selectedMeeting.agendaFile ? (
                <a href={`/uploads/meetings/${selectedMeeting.agendaFile}`} target="_blank" rel="noreferrer">Download</a>
              ) : (
                <span>Not uploaded</span>
              )}
            </div>
            <div>
              <strong>Minutes file:</strong>{' '}
              {selectedMeeting.minutesFile ? (
                <a href={`/uploads/meetings/${selectedMeeting.minutesFile}`} target="_blank" rel="noreferrer">Download</a>
              ) : (
                <span>Not uploaded</span>
              )}
            </div>
          </div>

          <div className="attendance-section">
            <h3>Attendance list</h3>
            {selectedMeeting.attendance?.length > 0 ? (
              <div className="attendance-table">
                {selectedMeeting.attendance.map((entry) => {
                  const user = entry.user;
                  const userId = user?._id || entry.user;
                  return (
                    <div className="attendance-row" key={userId}>
                      <span>{user?.name || 'Unknown attendee'}</span>
                      <select
                        value={attendanceStatus[userId] || entry.status}
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
              <p>No attendees assigned to this meeting yet.</p>
            )}
            <button type="button" className="secondary-button" onClick={handleSaveAttendance}>
              Save Attendance
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
