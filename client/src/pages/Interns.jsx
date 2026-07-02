import { useEffect, useState } from 'react';
import api from '../services/api';

export default function InternDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [internData, setInternData] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [logbook, setLogbook] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [profileForm, setProfileForm] = useState({ firstName: '', lastName: '', email: '', phone: '', institution: '', course: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [profilePic, setProfilePic] = useState('');
  const [avatarMessage, setAvatarMessage] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Form states
  const [newLogEntry, setNewLogEntry] = useState({ date: '', activities: '', hours: '' });
  const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', reason: '' });

  const getCurrentUserId = () => {
    const stored = JSON.parse(localStorage.getItem('user')) || {};
    return stored._id || stored.id || '';
  };

  const getAttendanceLocation = async () => {
    const fallback = {
      latitude: 0.051274198250157124,
      longitude: 34.29512813904587,
      address: 'Siaya County Assembly',
    };

    if (!navigator.geolocation) return fallback;

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        address: 'Current location',
      };
    } catch {
      return fallback;
    }
  };

  const loadInternData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('icamsToken');
      const userId = getCurrentUserId();

      if (!token) {
        setMessage('Not authenticated — please log in');
        setLoading(false);
        return;
      }

      if (!userId) {
        setMessage('User data missing — please log in again');
        setLoading(false);
        return;
      }

      // Load intern profile
      const internRes = await api.get(`/interns/${userId}`);
      setInternData(internRes.data);
      setProfileForm({
        firstName: internRes.data.firstName || internRes.data.name?.split(' ')[0] || '',
        lastName: internRes.data.lastName || internRes.data.name?.split(' ').slice(1).join(' ') || '',
        email: internRes.data.email || '',
        phone: internRes.data.phone || '',
        institution: internRes.data.institution || '',
        course: internRes.data.course || '',
      });
      setProfilePic(internRes.data.user?.profilePic || '');

      // Load attendance
      const attendanceRes = await api.get('/attendance', { params: { user: userId, limit: 50 } });
      setAttendance(attendanceRes.data?.records || []);

      // Load tasks and logbook locally for now since the intern-specific backend endpoints are not available
      setTasks([]);
      setLogbook([]);
      setDocuments([]);
      setFeedback(null);

      // Load leaves
      const leavesRes = await api.get('/leave', { params: { user: userId, limit: 50 } });
      setLeaves(leavesRes.data?.requests || []);

      // Load notifications
      const notifRes = await api.get('/communications/announcements', { params: { limit: 5 } });
      setNotifications(notifRes.data || []);

      // Check if checked in today
      const today = new Date().toDateString();
      const todayAttendance = (attendanceRes.data?.records || []).find((a) => new Date(a.date).toDateString() === today);
      setCheckedInToday(!!todayAttendance?.checkIn);
      setCheckOutTime(todayAttendance?.checkOut || null);

      setLoading(false);
    } catch (err) {
      console.error('Failed to load intern data:', err, err.response?.data);
      const serverMessage = err.response?.data?.message || err.message || 'Unknown error';
      setMessage(`Failed to load dashboard data: ${serverMessage}`);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInternData();
  }, []);

  const handleCheckIn = async () => {
    try {
      const location = await getAttendanceLocation();
      await api.post('/attendance/checkin', {
        method: 'manual',
        ...location,
      });
      setMessage('Checked in successfully');
      setCheckedInToday(true);
      loadInternData();
    } catch (err) {
      const serverMessage = err.response?.data?.message || 'Failed to check in';
      setMessage(serverMessage);
    }
  };

  const handleCheckOut = async () => {
    try {
      const location = await getAttendanceLocation();
      await api.post('/attendance/checkout', {
        method: 'manual',
        ...location,
      });
      setMessage('Checked out successfully');
      setCheckOutTime(new Date().toLocaleTimeString());
      loadInternData();
    } catch (err) {
      const serverMessage = err.response?.data?.message || 'Failed to check out';
      setMessage(serverMessage);
    }
  };

  const completeTask = async (taskId) => {
    setTasks((prev) => prev.map((task) => (task._id === taskId ? { ...task, status: 'Completed' } : task)));
    setMessage('Task marked as completed');
  };

  const submitLogEntry = async () => {
    if (!newLogEntry.date || !newLogEntry.activities) {
      setMessage('Please add a date and activity description');
      return;
    }

    const entry = {
      _id: Date.now().toString(),
      date: newLogEntry.date,
      activities: newLogEntry.activities,
      hours: newLogEntry.hours || 0,
      submitted: true,
    };

    setLogbook((prev) => [entry, ...prev]);
    setMessage('Logbook entry submitted');
    setNewLogEntry({ date: '', activities: '', hours: '' });
  };

  const submitLeaveRequest = async () => {
    try {
      await api.post('/leave', {
        type: 'annual',
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason,
      });
      setMessage('Leave request submitted');
      setLeaveForm({ startDate: '', endDate: '', reason: '' });
      loadInternData();
    } catch (err) {
      const serverMessage = err.response?.data?.message || 'Failed to submit leave request';
      setMessage(serverMessage);
    }
  };

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarSelect = (event) => {
    setAvatarFile(event.target.files?.[0] || null);
    setAvatarMessage('');
  };

  const uploadAvatar = async () => {
    if (!avatarFile) {
      setAvatarMessage('Select a file first');
      return;
    }

    try {
      setUploadingAvatar(true);
      const userId = getCurrentUserId();
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      const res = await api.post(`/users/${userId}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfilePic(res.data.profilePic || res.data?.profilePic);
      setAvatarMessage('Profile photo uploaded successfully.');
      setAvatarFile(null);
      await loadInternData();
    } catch (err) {
      const serverMessage = err.response?.data?.message || 'Upload failed';
      setAvatarMessage(serverMessage);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfile = async () => {
    try {
      const userId = getCurrentUserId();
      const name = `${profileForm.firstName || ''} ${profileForm.lastName || ''}`.trim();
      const internPayload = {
        name,
        email: profileForm.email,
        phone: profileForm.phone,
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        institution: profileForm.institution,
        course: profileForm.course,
      };

      await api.put(`/interns/${userId}`, internPayload);
      await api.put(`/users/${userId}`, {
        name,
        email: profileForm.email,
        phone: profileForm.phone,
      });
      setMessage('Profile saved successfully');
      loadInternData();
    } catch (err) {
      const serverMessage = err.response?.data?.message || 'Failed to save profile';
      setMessage(serverMessage);
    }
  };

  const downloadCertificate = async () => {
    setMessage('Certificate will be available after supervisor approval');
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>🎓 Intern Dashboard</h1>
        </div>
        <div className="loading">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="page intern-dashboard">
      <div className="page-header">
        <h1>🎓 Intern Dashboard</h1>
        <p>Monitor your internship progress and complete assigned tasks</p>
      </div>

      {message && (
        <div className="notification">
          {message}
          <button onClick={() => setMessage('')} style={{ marginLeft: '1rem' }}>×</button>
        </div>
      )}

      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📋 Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 Profile
        </button>
        <button
          className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          📅 Attendance
        </button>
        <button
          className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          ✅ Tasks
        </button>
        <button
          className={`tab-btn ${activeTab === 'logbook' ? 'active' : ''}`}
          onClick={() => setActiveTab('logbook')}
        >
          📔 Logbook
        </button>
        <button
          className={`tab-btn ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          📄 Documents
        </button>
        <button
          className={`tab-btn ${activeTab === 'leave' ? 'active' : ''}`}
          onClick={() => setActiveTab('leave')}
        >
          🏖️ Leave
        </button>
        <button
          className={`tab-btn ${activeTab === 'feedback' ? 'active' : ''}`}
          onClick={() => setActiveTab('feedback')}
        >
          💬 Feedback
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="tab-content">
          {/* Welcome Section */}
          <section className="dashboard-section">
            <h2>Welcome, {internData?.firstName || 'Intern'}! 👋</h2>
            <div className="welcome-grid">
              <div className="info-card">
                <div className="info-label">📅 Internship Duration</div>
                <div className="info-value">
                  {internData?.startDate ? new Date(internData.startDate).toLocaleDateString() : 'N/A'} to {internData?.endDate ? new Date(internData.endDate).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              <div className="info-card">
                <div className="info-label">🏢 Department</div>
                <div className="info-value">{internData?.department || 'Not assigned'}</div>
              </div>
              <div className="info-card">
                <div className="info-label">👨‍💼 Supervisor</div>
                <div className="info-value">{internData?.supervisor?.name || 'Not assigned'}</div>
              </div>
              <div className="info-card">
                <div className="info-label">📞 Supervisor Contact</div>
                <div className="info-value">{internData?.supervisor?.phone || 'N/A'}</div>
              </div>
            </div>
          </section>

          {/* Attendance Summary */}
          <section className="dashboard-section">
            <h2>📊 Attendance Summary</h2>
            <div className="summary-grid">
              <div className="summary-card">
                <div className="summary-number">{attendance.length}</div>
                <div className="summary-label">Days Present</div>
              </div>
              <div className="summary-card">
                <div className="summary-number">{attendance.filter(a => !a.checkOut).length}</div>
                <div className="summary-label">Days Absent</div>
              </div>
              <div className="summary-card">
                <div className="summary-number">{attendance.reduce((sum, a) => sum + (a.hoursWorked || 0), 0).toFixed(1)}</div>
                <div className="summary-label">Total Hours</div>
              </div>
              <div className="summary-card">
                <div className="summary-number">{tasks.filter(t => t.status === 'Completed').length}/{tasks.length}</div>
                <div className="summary-label">Tasks Completed</div>
              </div>
            </div>
          </section>

          {/* Pending & Completed Tasks */}
          <div className="grid-2">
            <section className="dashboard-section">
              <h2>⏳ Pending Tasks</h2>
              {tasks.filter(t => t.status !== 'Completed').slice(0, 3).map(task => (
                <div key={task._id} className="list-item">
                  <div>
                    <h4>{task.title}</h4>
                    <p>{task.description}</p>
                    <small>Due: {new Date(task.dueDate).toLocaleDateString()}</small>
                  </div>
                  <button onClick={() => completeTask(task._id)} className="btn-small btn-success">Mark Done</button>
                </div>
              ))}
            </section>

            <section className="dashboard-section">
              <h2>✅ Completed Tasks</h2>
              {tasks.filter(t => t.status === 'Completed').slice(0, 3).map(task => (
                <div key={task._id} className="list-item completed">
                  <div>
                    <h4>✓ {task.title}</h4>
                    <small>Completed: {new Date(task.completedDate).toLocaleDateString()}</small>
                  </div>
                </div>
              ))}
            </section>
          </div>

          {/* Notifications */}
          <section className="dashboard-section">
            <h2>🔔 Recent Announcements</h2>
            {notifications.map(notif => (
              <div key={notif._id} className="notification-item">
                <h4>{notif.title}</h4>
                <p>{notif.content}</p>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="tab-content">
          <section className="dashboard-section profile-section">
            <h2>👤 Personal Information</h2>
            <div className="profile-card">
              <div className="profile-avatar">
                <div className="avatar-preview">
                  {profilePic ? (
                    <img src={profilePic} alt="Profile" />
                  ) : (
                    <div className="avatar-placeholder">No photo</div>
                  )}
                </div>
                <div className="avatar-actions">
                  <input type="file" accept="image/*" onChange={handleAvatarSelect} />
                  <button type="button" onClick={uploadAvatar} className="btn-secondary" disabled={uploadingAvatar}>
                    {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                  </button>
                  {avatarMessage && <div className="small-text">{avatarMessage}</div>}
                </div>
              </div>

              <div className="profile-grid">
                <div className="profile-field">
                  <label>First Name</label>
                  <input name="firstName" value={profileForm.firstName} onChange={handleProfileChange} />
                </div>
                <div className="profile-field">
                  <label>Last Name</label>
                  <input name="lastName" value={profileForm.lastName} onChange={handleProfileChange} />
                </div>
                <div className="profile-field">
                  <label>Email</label>
                  <input type="email" name="email" value={profileForm.email} onChange={handleProfileChange} />
                </div>
                <div className="profile-field">
                  <label>Phone Number</label>
                  <input type="tel" name="phone" value={profileForm.phone} onChange={handleProfileChange} />
                </div>
                <div className="profile-field">
                  <label>Institution</label>
                  <input name="institution" value={profileForm.institution} onChange={handleProfileChange} />
                </div>
                <div className="profile-field">
                  <label>Course</label>
                  <input name="course" value={profileForm.course} onChange={handleProfileChange} />
                </div>
              </div>

              <div className="profile-actions">
                <button type="button" className="btn-primary" onClick={saveProfile}>
                  Save Profile
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <div className="tab-content">
          <section className="dashboard-section">
            <h2>📅 Attendance</h2>
            <div className="attendance-actions">
              <button
                onClick={handleCheckIn}
                disabled={checkedInToday}
                className={`btn-large ${checkedInToday ? 'btn-disabled' : 'btn-success'}`}
              >
                {checkedInToday ? '✓ Checked In Today' : '🔓 Check In'}
              </button>
              <button
                onClick={handleCheckOut}
                disabled={!checkedInToday || checkOutTime}
                className={`btn-large ${!checkedInToday || checkOutTime ? 'btn-disabled' : 'btn-warning'}`}
              >
                {checkOutTime ? `✓ Checked Out at ${checkOutTime}` : '🔐 Check Out'}
              </button>
            </div>

            <h3 style={{ marginTop: '2rem' }}>📋 Attendance History</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Hours Worked</th>
                </tr>
              </thead>
              <tbody>
                {attendance.slice(0, 10).map(record => (
                  <tr key={record._id}>
                    <td>{new Date(record.date).toLocaleDateString()}</td>
                    <td>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : 'N/A'}</td>
                    <td>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : 'Ongoing'}</td>
                    <td>{record.hoursWorked || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* TASKS TAB */}
      {activeTab === 'tasks' && (
        <div className="tab-content">
          <section className="dashboard-section">
            <h2>✅ Task Management</h2>
            
            <h3>Pending Tasks</h3>
            {tasks.filter(t => t.status !== 'Completed').map(task => (
              <div key={task._id} className="task-card">
                <div className="task-header">
                  <h4>{task.title}</h4>
                  <span className="task-status">{task.priority || 'Normal'}</span>
                </div>
                <p>{task.description}</p>
                <div className="task-meta">
                  <small>📅 Due: {new Date(task.dueDate).toLocaleDateString()}</small>
                </div>
                <div className="task-actions">
                  <button onClick={() => completeTask(task._id)} className="btn-small btn-success">
                    Mark as Completed
                  </button>
                  <button className="btn-small btn-secondary">Upload Work</button>
                </div>
              </div>
            ))}

            <h3 style={{ marginTop: '2rem' }}>Completed Tasks</h3>
            {tasks.filter(t => t.status === 'Completed').map(task => (
              <div key={task._id} className="task-card completed">
                <h4>✓ {task.title}</h4>
                <small>Completed: {new Date(task.completedDate).toLocaleDateString()}</small>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* LOGBOOK TAB */}
      {activeTab === 'logbook' && (
        <div className="tab-content">
          <section className="dashboard-section">
            <h2>📔 Daily/Weekly Logbook</h2>

            <div className="form-section">
              <h3>Fill Daily Activities</h3>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={newLogEntry.date}
                  onChange={(e) => setNewLogEntry({ ...newLogEntry, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Activities Completed</label>
                <textarea
                  rows="4"
                  placeholder="Describe the activities you completed today..."
                  value={newLogEntry.activities}
                  onChange={(e) => setNewLogEntry({ ...newLogEntry, activities: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Hours Worked</label>
                <input
                  type="number"
                  placeholder="e.g., 8"
                  value={newLogEntry.hours}
                  onChange={(e) => setNewLogEntry({ ...newLogEntry, hours: e.target.value })}
                />
              </div>
              <button onClick={submitLogEntry} className="btn-primary">Submit Logbook Entry</button>
            </div>

            <h3 style={{ marginTop: '2rem' }}>📝 Previous Entries</h3>
            {logbook.slice(0, 10).map(entry => (
              <div key={entry._id} className="logbook-entry">
                <h4>{new Date(entry.date).toLocaleDateString()}</h4>
                <p>{entry.activities}</p>
                <small>Hours: {entry.hours} | Status: {entry.submitted ? 'Submitted' : 'Draft'}</small>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* DOCUMENTS TAB */}
      {activeTab === 'documents' && (
        <div className="tab-content">
          <section className="dashboard-section">
            <h2>📄 Documents</h2>

            <div className="documents-grid">
              <div className="document-card">
                <h4>📋 Appointment Letter</h4>
                <p>Your internship appointment letter</p>
                <button className="btn-small btn-primary">Download</button>
              </div>
              <div className="document-card">
                <h4>📝 Internship Forms</h4>
                <p>Required forms for internship</p>
                <button className="btn-small btn-primary">Download</button>
              </div>
              <div className="document-card">
                <h4>📊 Evaluation Forms</h4>
                <p>Supervisor evaluation forms</p>
                <button className="btn-small btn-primary">Download</button>
              </div>
            </div>

            <h3 style={{ marginTop: '2rem' }}>📤 Upload Documents</h3>
            <div className="upload-section">
              <input type="file" id="doc-upload" style={{ marginRight: '1rem' }} />
              <button className="btn-primary">Upload Document</button>
            </div>

            <h3 style={{ marginTop: '2rem' }}>✅ Uploaded Documents</h3>
            {documents.map(doc => (
              <div key={doc._id} className="document-item">
                <h4>{doc.name}</h4>
                <small>Uploaded: {new Date(doc.uploadedDate).toLocaleDateString()}</small>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* LEAVE TAB */}
      {activeTab === 'leave' && (
        <div className="tab-content">
          <section className="dashboard-section">
            <h2>🏖️ Leave Requests</h2>

            <div className="form-section">
              <h3>Apply for Leave</h3>
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={leaveForm.startDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={leaveForm.endDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Reason</label>
                <textarea
                  rows="3"
                  placeholder="Enter reason for leave..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                />
              </div>
              <button onClick={submitLeaveRequest} className="btn-primary">Submit Leave Request</button>
            </div>

            <h3 style={{ marginTop: '2rem' }}>📋 Leave History</h3>
            {leaves.map(leave => (
              <div key={leave._id} className="leave-item">
                <h4>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</h4>
                <p>{leave.reason}</p>
                <small>Status: <strong>{leave.status || 'Pending'}</strong></small>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* FEEDBACK TAB */}
      {activeTab === 'feedback' && (
        <div className="tab-content">
          <section className="dashboard-section">
            <h2>💬 Supervisor Feedback & Evaluation</h2>

            {feedback ? (
              <div className="feedback-card">
                <h3>{feedback.title}</h3>
                <p>{feedback.comments}</p>
                <div className="feedback-details">
                  <div><strong>Performance Rating:</strong> {feedback.rating}/5</div>
                  <div><strong>Date:</strong> {new Date(feedback.date).toLocaleDateString()}</div>
                </div>
              </div>
            ) : (
              <p className="empty-state">No feedback available yet</p>
            )}

            <h3 style={{ marginTop: '2rem' }}>📜 Certificate</h3>
            {feedback?.approved ? (
              <button onClick={downloadCertificate} className="btn-primary">
                📥 Download Completion Certificate
              </button>
            ) : (
              <p className="empty-state">Certificate will be available after supervisor approval</p>
            )}
          </section>
        </div>
      )}

      <style>{`
        .intern-dashboard {
          max-width: 1200px;
          margin: 0 auto;
        }

        .dashboard-tabs {
          display: flex;
          gap: 0.5rem;
          margin: 2rem 0;
          flex-wrap: wrap;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 1rem;
        }

        .tab-btn {
          padding: 0.75rem 1.5rem;
          border: none;
          background: transparent;
          cursor: pointer;
          font-weight: 500;
          color: #6b7280;
          transition: all 0.3s;
          border-bottom: 3px solid transparent;
        }

        .tab-btn.active {
          color: #4f46e5;
          border-bottom-color: #4f46e5;
        }

        .tab-btn:hover {
          color: #4f46e5;
        }

        .tab-content {
          animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .dashboard-section {
          background: #f9fafb;
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          margin-bottom: 2rem;
        }

        .dashboard-section h2 {
          margin-top: 0;
          color: #1f2937;
          margin-bottom: 1.5rem;
        }

        .dashboard-section h3 {
          color: #374151;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
        }

        .welcome-grid, .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .info-card, .summary-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          text-align: center;
        }

        .info-label, .summary-label {
          font-size: 0.9rem;
          color: #6b7280;
          margin-bottom: 0.5rem;
        }

        .info-value, .summary-number {
          font-size: 1.3rem;
          font-weight: 600;
          color: #1f2937;
        }

        .grid-2 {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .list-item {
          background: white;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 0.75rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .list-item.completed {
          opacity: 0.7;
        }

        .list-item h4 {
          margin: 0 0 0.25rem 0;
        }

        .list-item p {
          margin: 0.25rem 0;
          color: #6b7280;
          font-size: 0.9rem;
        }

        .notification-item {
          background: white;
          padding: 1rem;
          border-left: 4px solid #4f46e5;
          border-radius: 6px;
          margin-bottom: 0.75rem;
        }

        .notification-item h4 {
          margin: 0 0 0.5rem 0;
        }

        .notification-item p {
          margin: 0;
          color: #6b7280;
          font-size: 0.9rem;
        }

        .profile-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .profile-field {
          display: flex;
          flex-direction: column;
        }

        .profile-field label {
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: #374151;
        }

        .profile-field input {
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 1rem;
        }

        .attendance-actions {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .btn-large {
          padding: 1rem 2rem;
          font-size: 1.1rem;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-success {
          background: #10b981;
          color: white;
        }

        .btn-success:hover {
          background: #059669;
        }

        .btn-warning {
          background: #f59e0b;
          color: white;
        }

        .btn-warning:hover {
          background: #d97706;
        }

        .btn-disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }

        .data-table th {
          background: #e5e7eb;
          padding: 0.75rem;
          text-align: left;
          font-weight: 600;
        }

        .data-table td {
          padding: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .task-card {
          background: white;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          border: 1px solid #e5e7eb;
        }

        .task-card.completed {
          opacity: 0.6;
        }

        .task-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .task-header h4 {
          margin: 0;
        }

        .task-status {
          background: #fef3c7;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .task-meta {
          color: #6b7280;
          font-size: 0.9rem;
          margin: 0.75rem 0;
        }

        .task-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .btn-small {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #4f46e5;
          color: white;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }

        .btn-primary:hover {
          background: #4338ca;
        }

        .btn-secondary {
          background: #9ca3af;
          color: white;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }

        .btn-secondary:hover {
          background: #6b7280;
        }

        .form-section {
          background: white;
          padding: 1.5rem;
          border-radius: 6px;
          margin-bottom: 1.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: #374151;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-family: inherit;
          font-size: 1rem;
        }

        .form-group textarea {
          resize: vertical;
        }

        .logbook-entry, .leave-item {
          background: white;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 0.75rem;
          border-left: 4px solid #4f46e5;
        }

        .logbook-entry h4, .leave-item h4 {
          margin: 0 0 0.5rem 0;
        }

        .logbook-entry p, .leave-item p {
          margin: 0.25rem 0;
          color: #6b7280;
        }

        .documents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .document-card {
          background: white;
          padding: 1.5rem;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          text-align: center;
        }

        .document-card h4 {
          margin: 0 0 0.5rem 0;
        }

        .document-card p {
          margin: 0.5rem 0;
          color: #6b7280;
          font-size: 0.9rem;
        }

        .upload-section {
          background: white;
          padding: 1.5rem;
          border-radius: 6px;
          border: 2px dashed #d1d5db;
          text-align: center;
        }

        .document-item {
          background: white;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 0.75rem;
        }

        .document-item h4 {
          margin: 0 0 0.5rem 0;
        }

        .feedback-card {
          background: white;
          padding: 1.5rem;
          border-radius: 6px;
          border-left: 4px solid #10b981;
        }

        .feedback-details {
          background: #f0fdf4;
          padding: 1rem;
          border-radius: 6px;
          margin-top: 1rem;
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: #9ca3af;
          font-style: italic;
        }

        .page-header {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .page-header h1 {
          margin: 0 0 0.5rem 0;
        }

        .page-header p {
          margin: 0;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}
