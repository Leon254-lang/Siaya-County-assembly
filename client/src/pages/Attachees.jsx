import { useEffect, useState } from 'react';
import api from '../services/api';

export default function AttacheeDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [attacheeData, setAttacheeData] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [duties, setDuties] = useState([]);
  const [logbook, setLogbook] = useState([]);
  const [reports, setReports] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checkOutTime, setCheckOutTime] = useState(null);

  // Form states
  const [newLogEntry, setNewLogEntry] = useState({ date: '', activities: '', hours: '' });
  const [newReport, setNewReport] = useState({ type: '', content: '', weekEnding: '' });
  const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', reason: '', type: 'Leave' });

  const loadAttacheeData = async () => {
    try {
      setLoading(true);
      const userId = JSON.parse(localStorage.getItem('user'))?._id;

      // Load attachee profile
      const attacheeRes = await api.get(`/interns/${userId}`);
      setAttacheeData(attacheeRes.data);

      // Load attendance
      const attendanceRes = await api.get(`/attendance?userId=${userId}`);
      const attendanceRecords = attendanceRes.data.records || attendanceRes.data || [];
      setAttendance(attendanceRecords);

      // Load duties
      const dutiesRes = await api.get(`/interns/${userId}/duties`);
      setDuties(dutiesRes.data || []);

      // Load logbook
      const logbookRes = await api.get(`/interns/${userId}/logbook`);
      setLogbook(logbookRes.data || []);

      // Load reports
      const reportsRes = await api.get(`/interns/${userId}/reports`);
      setReports(reportsRes.data || []);

      // Load leaves/permissions
      const leavesRes = await api.get(`/interns/${userId}/leaves`);
      setLeaves(leavesRes.data || []);

      // Load notifications
      const notifRes = await api.get('/communications/announcements', { params: { limit: 5 } });
      setNotifications(notifRes.data.slice(0, 5) || []);

      // Load evaluation
      const evaluationRes = await api.get(`/interns/${userId}/evaluation`);
      setEvaluation(evaluationRes.data || null);

      // Check if checked in today
      const today = new Date().toDateString();
      const todayAttendance = attendanceRecords.find(a => new Date(a.date).toDateString() === today);
      setCheckedInToday(!!todayAttendance?.checkIn);
      setCheckOutTime(todayAttendance?.checkOut || null);

      setLoading(false);
    } catch (err) {
      console.error('Failed to load attachee data:', err);
      setMessage('Failed to load dashboard data.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttacheeData();
  }, []);

  const handleCheckIn = async () => {
    try {
      const userId = JSON.parse(localStorage.getItem('user'))?._id;
      if (!navigator.geolocation) {
        setMessage('Geolocation is required to check in. Please use the Attendance page.');
        return;
      }
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });
      const { latitude, longitude } = position.coords;
      await api.post('/attendance/check-in', {
        userId,
        method: 'manual',
        location: 'Attachee dashboard',
        deviceId: 'browser',
        latitude,
        longitude,
        address: 'Browser geolocation'
      });
      setMessage('Checked in successfully');
      setCheckedInToday(true);
      loadAttacheeData();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to check in');
    }
  };

  const handleCheckOut = async () => {
    try {
      const userId = JSON.parse(localStorage.getItem('user'))?._id;
      if (!navigator.geolocation) {
        setMessage('Geolocation is required to check out. Please use the Attendance page.');
        return;
      }
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });
      const { latitude, longitude } = position.coords;
      await api.post('/attendance/check-out', {
        userId,
        method: 'manual',
        location: 'Attachee dashboard',
        deviceId: 'browser',
        latitude,
        longitude,
        address: 'Browser geolocation'
      });
      setMessage('Checked out successfully');
      setCheckOutTime(new Date().toLocaleTimeString());
      loadAttacheeData();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to check out');
    }
  };

  const submitDutyCompletion = async (dutyId) => {
    try {
      await api.put(`/interns/duties/${dutyId}`, { status: 'Completed' });
      setMessage('Duty marked as completed');
      loadAttacheeData();
    } catch (err) {
      setMessage('Failed to update duty');
    }
  };

  const submitLogEntry = async () => {
    try {
      const userId = JSON.parse(localStorage.getItem('user'))?._id;
      await api.post(`/interns/${userId}/logbook`, newLogEntry);
      setMessage('Daily logbook entry submitted');
      setNewLogEntry({ date: '', activities: '', hours: '' });
      loadAttacheeData();
    } catch (err) {
      setMessage('Failed to submit logbook entry');
    }
  };

  const submitReport = async () => {
    try {
      const userId = JSON.parse(localStorage.getItem('user'))?._id;
      await api.post(`/interns/${userId}/reports`, { ...newReport, userId });
      setMessage('Report submitted successfully');
      setNewReport({ type: '', content: '', weekEnding: '' });
      loadAttacheeData();
    } catch (err) {
      setMessage('Failed to submit report');
    }
  };

  const requestPermission = async () => {
    try {
      const userId = JSON.parse(localStorage.getItem('user'))?._id;
      await api.post(`/interns/${userId}/leaves`, { ...leaveForm, userId });
      setMessage('Permission/Leave request submitted');
      setLeaveForm({ startDate: '', endDate: '', reason: '', type: 'Leave' });
      loadAttacheeData();
    } catch (err) {
      setMessage('Failed to submit request');
    }
  };

  const downloadDocument = (docType) => {
    try {
      setMessage(`Downloading ${docType}...`);
      // Implementation would depend on your backend
    } catch (err) {
      setMessage(`Failed to download ${docType}`);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>🏢 Attachee Dashboard</h1>
        </div>
        <div className="loading">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="page attachee-dashboard">
      <div className="page-header">
        <h1>🏢 Attachee Dashboard</h1>
        <p>Monitor your industrial attachment progress and complete assigned duties</p>
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
          className={`tab-btn ${activeTab === 'duties' ? 'active' : ''}`}
          onClick={() => setActiveTab('duties')}
        >
          ⚙️ Duties
        </button>
        <button
          className={`tab-btn ${activeTab === 'logbook' ? 'active' : ''}`}
          onClick={() => setActiveTab('logbook')}
        >
          📔 Logbook
        </button>
        <button
          className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📊 Reports
        </button>
        <button
          className={`tab-btn ${activeTab === 'permission' ? 'active' : ''}`}
          onClick={() => setActiveTab('permission')}
        >
          🏖️ Permission/Leave
        </button>
        <button
          className={`tab-btn ${activeTab === 'evaluation' ? 'active' : ''}`}
          onClick={() => setActiveTab('evaluation')}
        >
          ⭐ Evaluation
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="tab-content">
          {/* Welcome Section */}
          <section className="dashboard-section">
            <h2>Welcome, {attacheeData?.firstName || 'Attachee'}! 👋</h2>
            <div className="welcome-grid">
              <div className="info-card">
                <div className="info-label">📅 Attachment Period</div>
                <div className="info-value">
                  {attacheeData?.startDate ? new Date(attacheeData.startDate).toLocaleDateString() : 'N/A'} to {attacheeData?.endDate ? new Date(attacheeData.endDate).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              <div className="info-card">
                <div className="info-label">🏢 Department</div>
                <div className="info-value">{attacheeData?.department || 'Not assigned'}</div>
              </div>
              <div className="info-card">
                <div className="info-label">👨‍💼 Supervisor</div>
                <div className="info-value">{attacheeData?.supervisor?.name || 'Not assigned'}</div>
              </div>
              <div className="info-card">
                <div className="info-label">📞 Supervisor Contact</div>
                <div className="info-value">{attacheeData?.supervisor?.phone || 'N/A'}</div>
              </div>
            </div>
          </section>

          {/* Status Summary */}
          <section className="dashboard-section">
            <h2>📊 Attachment Status</h2>
            <div className="summary-grid">
              <div className="summary-card">
                <div className="summary-number">{attendance.length}</div>
                <div className="summary-label">Days Present</div>
              </div>
              <div className="summary-card">
                <div className="summary-number">{duties.length}</div>
                <div className="summary-label">Total Duties</div>
              </div>
              <div className="summary-card">
                <div className="summary-number">{duties.filter(d => d.status === 'Completed').length}</div>
                <div className="summary-label">Completed Duties</div>
              </div>
              <div className="summary-card">
                <div className="summary-number">{reports.length}</div>
                <div className="summary-label">Reports Submitted</div>
              </div>
            </div>
          </section>

          {/* Pending Duties & Announcements */}
          <div className="grid-2">
            <section className="dashboard-section">
              <h2>⚙️ Pending Duties</h2>
              {duties.filter(d => d.status !== 'Completed').slice(0, 3).map(duty => (
                <div key={duty._id} className="list-item">
                  <div>
                    <h4>{duty.title}</h4>
                    <p>{duty.description}</p>
                  </div>
                  <button onClick={() => submitDutyCompletion(duty._id)} className="btn-small btn-success">Done</button>
                </div>
              ))}
            </section>

            <section className="dashboard-section">
              <h2>🔔 Announcements</h2>
              {notifications.map(notif => (
                <div key={notif._id} className="notification-item">
                  <h4>{notif.title}</h4>
                  <p>{notif.content}</p>
                </div>
              ))}
            </section>
          </div>
        </div>
      )}

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="tab-content">
          <section className="dashboard-section">
            <h2>👤 Personal Details</h2>
            <div className="profile-grid">
              <div className="profile-field">
                <label>First Name</label>
                <input type="text" value={attacheeData?.firstName || ''} readOnly />
              </div>
              <div className="profile-field">
                <label>Last Name</label>
                <input type="text" value={attacheeData?.lastName || ''} readOnly />
              </div>
              <div className="profile-field">
                <label>Email</label>
                <input type="email" value={attacheeData?.email || ''} readOnly />
              </div>
              <div className="profile-field">
                <label>Phone Number</label>
                <input type="tel" value={attacheeData?.phone || ''} />
              </div>
              <div className="profile-field">
                <label>Institution</label>
                <input type="text" value={attacheeData?.institution || ''} readOnly />
              </div>
              <div className="profile-field">
                <label>Course/Field of Study</label>
                <input type="text" value={attacheeData?.course || ''} readOnly />
              </div>
            </div>
            <button className="btn-primary">Save Changes</button>
          </section>
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {activeTab === 'attendance' && (
        <div className="tab-content">
          <section className="dashboard-section">
            <h2>📅 Attendance Management</h2>
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

            <h3 style={{ marginTop: '2rem' }}>📋 Attendance Report</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.slice(0, 10).map(record => (
                  <tr key={record._id}>
                    <td>{new Date(record.date).toLocaleDateString()}</td>
                    <td>{record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : '-'}</td>
                    <td>{record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : 'Ongoing'}</td>
                    <td>{record.checkOut ? 'Present' : 'Absent'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}

      {/* DUTIES TAB */}
      {activeTab === 'duties' && (
        <div className="tab-content">
          <section className="dashboard-section">
            <h2>⚙️ Assigned Duties</h2>

            <h3>Pending Duties</h3>
            {duties.filter(d => d.status !== 'Completed').map(duty => (
              <div key={duty._id} className="duty-card">
                <div className="duty-header">
                  <h4>{duty.title}</h4>
                  <span className="duty-status">{duty.priority || 'Normal'}</span>
                </div>
                <p>{duty.description}</p>
                <div className="duty-actions">
                  <button onClick={() => submitDutyCompletion(duty._id)} className="btn-small btn-success">
                    Mark as Completed
                  </button>
                  <button className="btn-small btn-secondary">Upload Work</button>
                </div>
              </div>
            ))}

            <h3 style={{ marginTop: '2rem' }}>Completed Duties</h3>
            {duties.filter(d => d.status === 'Completed').map(duty => (
              <div key={duty._id} className="duty-card completed">
                <h4>✓ {duty.title}</h4>
                <small>Completed: {new Date(duty.completedDate).toLocaleDateString()}</small>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* LOGBOOK TAB */}
      {activeTab === 'logbook' && (
        <div className="tab-content">
          <section className="dashboard-section">
            <h2>📔 Daily Logbook</h2>

            <div className="form-section">
              <h3>Add Daily Entry</h3>
              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={newLogEntry.date}
                  onChange={(e) => setNewLogEntry({ ...newLogEntry, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Daily Activities</label>
                <textarea
                  rows="4"
                  placeholder="Describe your daily activities..."
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
              <button onClick={submitLogEntry} className="btn-primary">Submit Daily Entry</button>
            </div>

            <h3 style={{ marginTop: '2rem' }}>📝 Weekly Summaries</h3>
            {logbook.slice(0, 10).map(entry => (
              <div key={entry._id} className="logbook-entry">
                <h4>{new Date(entry.date).toLocaleDateString()}</h4>
                <p>{entry.activities}</p>
                <small>Hours: {entry.hours} | Status: {entry.submitted ? 'Approved' : 'Pending'}</small>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* REPORTS TAB */}
      {activeTab === 'reports' && (
        <div className="tab-content">
          <section className="dashboard-section">
            <h2>📊 Reports</h2>

            <div className="form-section">
              <h3>Submit Report</h3>
              <div className="form-group">
                <label>Report Type</label>
                <select value={newReport.type} onChange={(e) => setNewReport({ ...newReport, type: e.target.value })}>
                  <option value="">Select report type</option>
                  <option value="weekly">Weekly Report</option>
                  <option value="monthly">Monthly Report</option>
                  <option value="final">Final Attachment Report</option>
                </select>
              </div>
              <div className="form-group">
                <label>Week/Month Ending</label>
                <input
                  type="date"
                  value={newReport.weekEnding}
                  onChange={(e) => setNewReport({ ...newReport, weekEnding: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Report Content</label>
                <textarea
                  rows="5"
                  placeholder="Write your report here..."
                  value={newReport.content}
                  onChange={(e) => setNewReport({ ...newReport, content: e.target.value })}
                />
              </div>
              <button onClick={submitReport} className="btn-primary">Submit Report</button>
            </div>

            <h3 style={{ marginTop: '2rem' }}>📋 Submitted Reports</h3>
            {reports.map(report => (
              <div key={report._id} className="report-item">
                <h4>{report.type?.toUpperCase()} - {new Date(report.weekEnding).toLocaleDateString()}</h4>
                <p>{report.content}</p>
                <small>Status: {report.status || 'Submitted'}</small>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* PERMISSION/LEAVE TAB */}
      {activeTab === 'permission' && (
        <div className="tab-content">
          <section className="dashboard-section">
            <h2>🏖️ Permission/Leave Requests</h2>

            <div className="form-section">
              <h3>Request Permission or Leave</h3>
              <div className="form-group">
                <label>Type</label>
                <select value={leaveForm.type} onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value })}>
                  <option value="Leave">Leave</option>
                  <option value="Permission">Permission</option>
                </select>
              </div>
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
                  placeholder="Enter reason..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                />
              </div>
              <button onClick={requestPermission} className="btn-primary">Submit Request</button>
            </div>

            <h3 style={{ marginTop: '2rem' }}>📋 Request History</h3>
            {leaves.map(leave => (
              <div key={leave._id} className="leave-item">
                <h4>{new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}</h4>
                <p>{leave.reason}</p>
                <small>Type: {leave.type} | Status: <strong>{leave.status || 'Pending'}</strong></small>
              </div>
            ))}
          </section>
        </div>
      )}

      {/* EVALUATION TAB */}
      {activeTab === 'evaluation' && (
        <div className="tab-content">
          <section className="dashboard-section">
            <h2>⭐ Supervisor Evaluation & Assessment</h2>

            {evaluation ? (
              <div className="evaluation-card">
                <h3>{evaluation.title || 'Performance Evaluation'}</h3>
                <p>{evaluation.comments}</p>
                <div className="evaluation-details">
                  <div><strong>Performance Rating:</strong> {evaluation.rating}/5 ⭐</div>
                  <div><strong>Evaluation Date:</strong> {new Date(evaluation.date).toLocaleDateString()}</div>
                </div>
              </div>
            ) : (
              <p className="empty-state">No evaluation available yet</p>
            )}

            <h3 style={{ marginTop: '2rem' }}>📜 Completion Documents</h3>
            <div className="documents-grid">
              <div className="document-card">
                <h4>📋 Attachment Letter</h4>
                <p>Official attachment letter</p>
                <button onClick={() => downloadDocument('attachment-letter')} className="btn-small btn-primary">Download</button>
              </div>
              <div className="document-card">
                <h4>📝 Evaluation Form</h4>
                <p>Supervisor evaluation form</p>
                <button onClick={() => downloadDocument('evaluation-form')} className="btn-small btn-primary">Download</button>
              </div>
              <div className="document-card">
                <h4>✅ Completion Letter</h4>
                <p>Attachment completion letter</p>
                <button onClick={() => downloadDocument('completion-letter')} className="btn-small btn-primary">Download</button>
              </div>
            </div>
          </section>
        </div>
      )}

      <style>{`
        .attachee-dashboard {
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

        .duty-card {
          background: white;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          border: 1px solid #e5e7eb;
        }

        .duty-card.completed {
          opacity: 0.6;
        }

        .duty-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .duty-header h4 {
          margin: 0;
        }

        .duty-status {
          background: #fef3c7;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .duty-actions {
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
        .form-group textarea,
        .form-group select {
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

        .logbook-entry, .leave-item, .report-item {
          background: white;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 0.75rem;
          border-left: 4px solid #4f46e5;
        }

        .logbook-entry h4, .leave-item h4, .report-item h4 {
          margin: 0 0 0.5rem 0;
        }

        .logbook-entry p, .leave-item p, .report-item p {
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

        .evaluation-card {
          background: white;
          padding: 1.5rem;
          border-radius: 6px;
          border-left: 4px solid #10b981;
        }

        .evaluation-details {
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
