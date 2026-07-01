import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleDateString();
};

const formatTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const buildStatusLabel = (status) => {
  if (!status) return 'Unknown';
  return status.replace(/([A-Z])/g, ' $1').trim();
};

const computeAttendanceSummary = (records) => {
  const totalDays = records.length;
  const presentDays = records.filter((record) => record.status === 'present').length;
  const absentDays = records.filter((record) => record.status === 'absent').length;
  const attendancePercentage = totalDays > 0
    ? Math.round((presentDays / totalDays) * 100)
    : 0;

  return {
    totalDays,
    presentDays,
    absentDays,
    attendancePercentage,
  };
};

export default function Mcas() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = currentUser._id || '';

  const [activeTab, setActiveTab] = useState('overview');
  const [userProfile, setUserProfile] = useState(currentUser);
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billForm, setBillForm] = useState({ title: '', summary: '', committee: '' });
  const [selectedAmendmentBillId, setSelectedAmendmentBillId] = useState('');
  const [amendmentText, setAmendmentText] = useState('');
  const [selectedMotionBillId, setSelectedMotionBillId] = useState('');
  const [motionText, setMotionText] = useState('');
  const [questions, setQuestions] = useState([]);
  const [petitionItems, setPetitionItems] = useState([]);
  const [participationItems, setParticipationItems] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({ totalDays: 0, presentDays: 0, absentDays: 0, attendancePercentage: 0 });
  const [documents, setDocuments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageForm, setMessageForm] = useState({ subject: '', body: '', to: '' });
  const [questionsForm, setQuestionsForm] = useState({ title: '', description: '' });
  const [selectedPetitionId, setSelectedPetitionId] = useState('');
  const [petitionComment, setPetitionComment] = useState('');
  const [settings, setSettings] = useState({ notifications: true, twoFactor: false });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [votingSummary, setVotingSummary] = useState(null);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [billsRes, committeesRes, meetingsRes, attendanceRes, announcementsRes, messagesRes, feedbackRes, documentsRes] = await Promise.all([
        api.get('/bills'),
        api.get('/committees'),
        api.get('/meetings?upcoming=true'),
        api.get(`/attendance?user=${userId}&limit=100`),
        api.get('/communications/announcements?limit=8'),
        api.get('/communications/messages?folder=inbox'),
        api.get('/feedback'),
        api.get('/documents?limit=50'),
      ]);

      setBills(billsRes.data || []);
      setCommittees(committeesRes.data || []);
      setMeetings(meetingsRes.data || []);
      const attendanceList = attendanceRes.data?.records || [];
      setAttendanceRecords(attendanceList);
      setAttendanceSummary(computeAttendanceSummary(attendanceList));
      const feedbackItems = feedbackRes.data || [];
      setQuestions(feedbackItems.filter((item) => item.category === 'feedback_report' || item.category === 'public_comment'));
      setPetitionItems(feedbackItems.filter((item) => item.category === 'public_comment'));
      setParticipationItems(feedbackItems.filter((item) => item.category === 'event_notice'));
      setNotifications(announcementsRes.data || []);
      setMessages(messagesRes.data || []);
      setDocuments((documentsRes.data && documentsRes.data.documents) || documentsRes.data || []);
      setVotingSummary(null);

      setMessage('');
    } catch (error) {
      console.error('Failed to load MCA dashboard:', error);
      setMessage('Unable to load MCA dashboard data at this time.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setUserProfile((prev) => ({ ...prev, [name]: value }));
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setMessage('');

    if (!userProfile.name || !userProfile.email) {
      setMessage('Name and email are required.');
      return;
    }

    try {
      await api.put(`/users/${userId}`, {
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        ward: userProfile.ward,
        party: userProfile.party,
        committeeMemberships: userProfile.committeeMemberships,
      });
      setMessage('Profile update requested. If the backend allows it, your profile will be updated shortly.');
      loadDashboard();
    } catch (error) {
      console.error('Profile save failed:', error);
      setMessage('Profile update failed. Please ask your administrator to update your MCA profile.');
    }
  };

  const handleBillChange = (event) => {
    const { name, value } = event.target;
    setBillForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitBill = async (event) => {
    event.preventDefault();
    if (!billForm.title || !billForm.summary) {
      setMessage('Please enter both a bill title and summary.');
      return;
    }

    try {
      await api.post('/bills', {
        title: billForm.title,
        summary: billForm.summary,
        committee: billForm.committee || undefined,
        status: 'Draft',
      });
      setBillForm({ title: '', summary: '', committee: '' });
      setMessage('Bill draft created successfully.');
      loadDashboard();
    } catch (error) {
      console.error('Submit bill failed:', error);
      setMessage('Failed to submit the bill.');
    }
  };

  const submitAmendment = async (event) => {
    event.preventDefault();
    if (!selectedAmendmentBillId || !amendmentText) {
      setMessage('Select a bill and enter your amendment text.');
      return;
    }

    try {
      await api.post(`/bills/${selectedAmendmentBillId}/motions`, {
        text: amendmentText,
      });
      setAmendmentText('');
      setMessage('Amendment submitted as a motion.');
      loadDashboard();
    } catch (error) {
      console.error('Submit amendment failed:', error);
      setMessage('Failed to submit the amendment.');
    }
  };

  const submitMotion = async (event) => {
    event.preventDefault();
    if (!selectedMotionBillId || !motionText) {
      setMessage('Select a bill and enter the motion text.');
      return;
    }

    try {
      await api.post(`/bills/${selectedMotionBillId}/motions`, {
        text: motionText,
      });
      setMotionText('');
      setMessage('Motion submitted successfully.');
      loadDashboard();
    } catch (error) {
      console.error('Submit motion failed:', error);
      setMessage('Failed to create the motion.');
    }
  };

  const submitQuestion = async (event) => {
    event.preventDefault();
    if (!questionsForm.title || !questionsForm.description) {
      setMessage('Please enter a question title and description.');
      return;
    }

    try {
      await api.post('/feedback', {
        title: questionsForm.title,
        description: questionsForm.description,
        submittedBy: userProfile.name || currentUser.name,
        status: 'draft',
        category: 'feedback_report',
      });
      setQuestionsForm({ title: '', description: '' });
      setMessage('Question submitted to the County Executive team.');
      loadDashboard();
    } catch (error) {
      console.error('Submit question failed:', error);
      setMessage('Failed to submit the question.');
    }
  };

  const sponsorPetition = async (event) => {
    event.preventDefault();
    if (!selectedPetitionId || !petitionComment) {
      setMessage('Select a petition and add a comment before sponsoring.');
      return;
    }

    try {
      await api.post(`/feedback/${selectedPetitionId}/comment`, {
        name: userProfile.name || currentUser.name,
        email: userProfile.email || currentUser.email,
        message: petitionComment,
      });
      setPetitionComment('');
      setMessage('Your petition sponsorship comment was posted.');
      loadDashboard();
    } catch (error) {
      console.error('Sponsor petition failed:', error);
      setMessage('Failed to add comment to the petition.');
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!messageForm.subject || !messageForm.body) {
      setMessage('Please enter both a subject and message body.');
      return;
    }

    try {
      await api.post('/communications/messages', {
        subject: messageForm.subject,
        body: messageForm.body,
        to: messageForm.to ? [messageForm.to] : [],
      });
      setMessageForm({ subject: '', body: '', to: '' });
      setMessage('Message sent successfully.');
      loadDashboard();
    } catch (error) {
      console.error('Send message failed:', error);
      setMessage('Unable to send the message.');
    }
  };

  const castVote = async (bill, item, option) => {
    try {
      await api.post(`/bills/${bill._id}/vote`, {
        itemId: item._id,
        option,
      });
      setMessage('Vote cast successfully.');
      loadDashboard();
      setVotingSummary(null);
    } catch (error) {
      console.error('Cast vote failed:', error);
      setMessage('Unable to cast the vote.');
    }
  };

  const loadVotingSummary = async (billId) => {
    try {
      const res = await api.get(`/bills/${billId}/voting-summary`);
      setVotingSummary(res.data);
    } catch (error) {
      console.error('Load voting summary failed:', error);
      setMessage('Unable to load voting summary.');
    }
  };

  const downloadDocument = (doc) => {
    if (!doc || (!doc.url && !doc.path && !doc.fileName)) {
      setMessage('Document link is not available.');
      return;
    }
    const url = doc.url || doc.path || `/uploads/${doc.fileName}`;
    window.open(url, '_blank');
  };

  const downloadAttendanceReport = () => {
    if (attendanceRecords.length === 0) {
      setMessage('No attendance records to download.');
      return;
    }

    const csvRows = [
      ['Date', 'Status', 'Check In', 'Check Out'].join(','),
      ...attendanceRecords.map((record) => [
        formatDate(record.date),
        record.status,
        record.checkIn?.time ? formatTime(record.checkIn.time) : '-',
        record.checkOut?.time ? formatTime(record.checkOut.time) : '-',
      ].join(',')),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'attendance-report.csv';
    link.click();
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>MCA Dashboard</h1>
        </div>
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  const totalBillsAssigned = bills.filter((bill) => bill.proposer?._id === userId || bill.proposer === userId).length;
  const pendingMotions = bills.reduce((count, bill) => count + (bill.motions?.filter((motion) => motion.status === 'Pending').length || 0), 0);
  const committeeMeetingsThisWeek = meetings.filter((meeting) => {
    const meetingDate = new Date(meeting.startTime || meeting.date);
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return meetingDate >= now && meetingDate <= oneWeekFromNow && meeting.meetingType === 'committee';
  }).length;
  const pendingPetitions = petitionItems.filter((item) => item.status !== 'published').length;
  const questionsAwaitingResponse = questions.filter((item) => item.status !== 'published').length;
  const upcomingSitting = meetings.find((meeting) => meeting.meetingType === 'session');

  return (
    <div className="page mca-dashboard">
      <div className="page-header">
        <button type="button" className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div>
          <h1>MCA Dashboard</h1>
          <p>Manage bills, motions, questions, petitions, attendance, voting, and constituency work from one place.</p>
        </div>
      </div>

      {message && (
        <div className="notification">
          {message}
          <button className="close-button" onClick={() => setMessage('')}>
            ×
          </button>
        </div>
      )}

      <div className="dashboard-tabs">
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'profile', label: 'Profile', icon: '👤' },
          { id: 'bills', label: 'Bills', icon: '📄' },
          { id: 'motions', label: 'Motions', icon: '✍️' },
          { id: 'questions', label: 'Questions', icon: '❓' },
          { id: 'petitions', label: 'Petitions', icon: '📝' },
          { id: 'committees', label: 'Committees', icon: '🏛️' },
          { id: 'calendar', label: 'Calendar', icon: '🗓️' },
          { id: 'attendance', label: 'Attendance', icon: '📅' },
          { id: 'voting', label: 'Voting', icon: '✅' },
          { id: 'issues', label: 'Issues', icon: '📌' },
          { id: 'public', label: 'Participation', icon: '👥' },
          { id: 'documents', label: 'Documents', icon: '📁' },
          { id: 'notifications', label: 'Notifications', icon: '🔔' },
          { id: 'messages', label: 'Messaging', icon: '✉️' },
          { id: 'reports', label: 'Reports', icon: '📑' },
          { id: 'settings', label: 'Settings', icon: '⚙️' },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <section className="dashboard-section">
            <div className="dashboard-stats">
              <div className="stat-card blue">
                <span>Total Bills Assigned</span>
                <h3>{totalBillsAssigned}</h3>
                <p>Bills you have sponsored or are tracking.</p>
              </div>
              <div className="stat-card orange">
                <span>Pending Motions</span>
                <h3>{pendingMotions}</h3>
                <p>Actions waiting approval from committee or plenary.</p>
              </div>
              <div className="stat-card green">
                <span>Committee Meetings This Week</span>
                <h3>{committeeMeetingsThisWeek}</h3>
                <p>Upcoming committee sessions scheduled in the next seven days.</p>
              </div>
              <div className="stat-card black">
                <span>Attendance Percentage</span>
                <h3>{attendanceSummary.attendancePercentage}%</h3>
                <p>Your attendance performance from recent records.</p>
              </div>
              <div className="stat-card red">
                <span>Pending Petitions</span>
                <h3>{pendingPetitions}</h3>
                <p>Public petitions awaiting your sponsorship or review.</p>
              </div>
              <div className="stat-card purple">
                <span>Questions Awaiting Response</span>
                <h3>{questionsAwaitingResponse}</h3>
                <p>Questions sent to the executive that still need response.</p>
              </div>
              <div className="stat-card teal">
                <span>Notifications</span>
                <h3>{notifications.length}</h3>
                <p>Recent alerts for bills, motions, sittings, and petitions.</p>
              </div>
              <div className="stat-card navy">
                <span>Upcoming Assembly Sitting</span>
                <h3>{upcomingSitting ? formatDate(upcomingSitting.startTime || upcomingSitting.date) : 'None'}</h3>
                <p>{upcomingSitting ? upcomingSitting.title || upcomingSitting.agenda : 'No sittings scheduled.'}</p>
              </div>
            </div>

            <div className="card quick-actions-card">
              <h2>Quick Actions</h2>
              <div className="modules-grid">
                <Link to="/bills" className="module-card">
                  <h3>📄 Bills & Motions</h3>
                  <p>View bills, propose motions, and track legislative progress.</p>
                  <span className="module-link">Go to Bills</span>
                </Link>
                <Link to="/meetings" className="module-card">
                  <h3>🗓️ Meetings</h3>
                  <p>See upcoming sittings, committee meetings, and agendas.</p>
                  <span className="module-link">View Meetings</span>
                </Link>
                <Link to="/attendance" className="module-card">
                  <h3>📅 Attendance</h3>
                  <p>Review your attendance records and download reports.</p>
                  <span className="module-link">Open Attendance</span>
                </Link>
                <Link to="/voting" className="module-card">
                  <h3>✅ Voting</h3>
                  <p>Track votes, participate in decisions, and review outcomes.</p>
                  <span className="module-link">Open Voting</span>
                </Link>
                <Link to="/committees" className="module-card">
                  <h3>🏛️ Committees</h3>
                  <p>View your committee assignments and upcoming committee work.</p>
                  <span className="module-link">Open Committees</span>
                </Link>
                <Link to="/documents" className="module-card">
                  <h3>📁 Documents</h3>
                  <p>Access meeting reports, legislative documents, and reference files.</p>
                  <span className="module-link">View Documents</span>
                </Link>
                <Link to="/feedback" className="module-card">
                  <h3>👥 Participation</h3>
                  <p>Manage public comments, event notices, and community feedback.</p>
                  <span className="module-link">Open Participation</span>
                </Link>
              </div>
            </div>

            <div className="dashboard-grid">
              <div className="card">
                <h2>Latest Notifications</h2>
                {notifications.length === 0 ? (
                  <p>No recent notifications available.</p>
                ) : (
                  <div className="list-panel">
                    {notifications.slice(0, 5).map((item) => (
                      <div key={item._id} className="list-item">
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.body?.slice(0, 110) || 'No details available.'}</p>
                        </div>
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <h2>Upcoming Sessions & Meetings</h2>
                {meetings.length === 0 ? (
                  <p>No upcoming meetings found.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Date</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meetings.slice(0, 8).map((meeting) => (
                        <tr key={meeting._id}>
                          <td>{meeting.title || meeting.agenda || 'Meeting'}</td>
                          <td>{formatDate(meeting.startTime || meeting.date)}</td>
                          <td>{meeting.meetingType || 'General'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'profile' && (
          <section className="dashboard-section">
            <div className="card">
              <h2>My Profile</h2>
              <form onSubmit={saveProfile} className="form-row">
                <label>
                  Full Name
                  <input name="name" value={userProfile.name || ''} onChange={handleProfileChange} />
                </label>
                <label>
                  Email
                  <input type="email" name="email" value={userProfile.email || ''} onChange={handleProfileChange} />
                </label>
                <label>
                  Phone
                  <input name="phone" value={userProfile.phone || ''} onChange={handleProfileChange} />
                </label>
                <label>
                  Ward
                  <input name="ward" value={userProfile.ward || ''} onChange={handleProfileChange} />
                </label>
                <label>
                  Political Party
                  <input name="party" value={userProfile.party || ''} onChange={handleProfileChange} />
                </label>
                <label>
                  Committee Memberships
                  <input name="committeeMemberships" value={(userProfile.committeeMemberships || []).map((c) => c.name || c).join(', ')} disabled />
                </label>
                <label>
                  Profile Picture
                  <input type="file" disabled />
                  <small>Upload support is currently placeholder only.</small>
                </label>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button type="submit" className="primary-button">Save Profile</button>
                  <button type="button" className="secondary-button" onClick={() => setMessage('Profile edits require administrator approval in the current backend.')}>Need Help?</button>
                </div>
              </form>
            </div>
          </section>
        )}

        {activeTab === 'bills' && (
          <section className="dashboard-section">
            <div className="dashboard-grid">
              <div className="card">
                <h2>All Bills</h2>
                {bills.length === 0 ? (
                  <p>No bills available.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Committee</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map((bill) => (
                        <tr key={bill._id}>
                          <td>{bill.title}</td>
                          <td>{bill.status}</td>
                          <td>{bill.committee?.name || 'N/A'}</td>
                          <td>
                            <button className="secondary-button" type="button" onClick={() => setSelectedBill(bill)}>
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="card">
                <h2>Sponsor a New Bill</h2>
                <form onSubmit={submitBill} className="form-row">
                  <label>
                    Bill Title
                    <input name="title" value={billForm.title} onChange={handleBillChange} />
                  </label>
                  <label>
                    Committee
                    <select name="committee" value={billForm.committee} onChange={handleBillChange}>
                      <option value="">Select committee</option>
                      {committees.map((committee) => (
                        <option key={committee._id} value={committee._id}>{committee.name}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ gridColumn: '1 / -1' }}>
                    Summary
                    <textarea name="summary" value={billForm.summary} onChange={handleBillChange} rows="6" />
                  </label>
                  <button type="submit" className="primary-button" style={{ gridColumn: '1 / -1' }}>Create Bill Draft</button>
                </form>
              </div>
            </div>

            {selectedBill && (
              <div className="card" style={{ marginTop: '1.5rem' }}>
                <h2>{selectedBill.title}</h2>
                <p>{selectedBill.summary}</p>
                <div className="details-grid">
                  <div>
                    <strong>Status:</strong> {selectedBill.status}
                  </div>
                  <div>
                    <strong>Committee:</strong> {selectedBill.committee?.name || 'N/A'}
                  </div>
                </div>
                <div className="details-grid" style={{ marginTop: '1rem' }}>
                  <div>
                    <strong>Sponsor:</strong> {selectedBill.proposer?.name || 'Unknown'}
                  </div>
                  <div>
                    <strong>Created:</strong> {formatDate(selectedBill.createdAt)}
                  </div>
                </div>
                <div className="section-header">
                  <h3>Voting History</h3>
                </div>
                <button type="button" className="secondary-button" onClick={() => loadVotingSummary(selectedBill._id)}>
                  Load voting summary
                </button>
                {votingSummary && votingSummary.billId === selectedBill._id && (
                  <div className="list-panel" style={{ marginTop: '1rem' }}>
                    {votingSummary.summary.map((item) => (
                      <div key={item._id} className="card">
                        <strong>{item.question}</strong>
                        <p>Total votes: {item.totalVotes}</p>
                        <p>Result: {item.finalDecision || 'Pending'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {activeTab === 'motions' && (
          <section className="dashboard-section">
            <div className="dashboard-grid">
              <div className="card">
                <h2>Create a Motion</h2>
                <form onSubmit={submitMotion} className="form-row">
                  <label>
                    Select Bill
                    <select value={selectedMotionBillId} onChange={(e) => setSelectedMotionBillId(e.target.value)}>
                      <option value="">Select bill</option>
                      {bills.map((bill) => (
                        <option key={bill._id} value={bill._id}>{bill.title}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ gridColumn: '1 / -1' }}>
                    Motion Text
                    <textarea value={motionText} onChange={(e) => setMotionText(e.target.value)} rows="6" />
                  </label>
                  <button type="submit" className="primary-button" style={{ gridColumn: '1 / -1' }}>Submit Motion</button>
                </form>
              </div>

              <div className="card">
                <h2>Draft Motions & Status</h2>
                {bills.filter((bill) => bill.motions?.length > 0).length === 0 ? (
                  <p>No motions found.</p>
                ) : (
                  <div className="list-panel">
                    {bills.flatMap((bill) => bill.motions?.map((motion) => ({ bill, motion })) || []).map(({ bill, motion }) => (
                      <div key={motion._id} className="list-item">
                        <div>
                          <strong>{bill.title}</strong>
                          <p>{motion.text}</p>
                        </div>
                        <span className={`status-pill ${motion.status?.toLowerCase()}`}>{motion.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card" style={{ marginTop: '1.5rem' }}>
              <h2>Submit a Proposed Amendment</h2>
              <form onSubmit={submitAmendment} className="form-row">
                <label>
                  Select Bill
                  <select value={selectedAmendmentBillId} onChange={(e) => setSelectedAmendmentBillId(e.target.value)}>
                    <option value="">Select bill</option>
                    {bills.map((bill) => (
                      <option key={bill._id} value={bill._id}>{bill.title}</option>
                    ))}
                  </select>
                </label>
                <label style={{ gridColumn: '1 / -1' }}>
                  Amendment Text
                  <textarea value={amendmentText} onChange={(e) => setAmendmentText(e.target.value)} rows="5" />
                </label>
                <button type="submit" className="primary-button" style={{ gridColumn: '1 / -1' }}>Submit Amendment</button>
              </form>
            </div>
          </section>
        )}

        {activeTab === 'questions' && (
          <section className="dashboard-section">
            <div className="dashboard-grid">
              <div className="card">
                <h2>Submit a Question</h2>
                <form onSubmit={submitQuestion} className="form-row">
                  <label>
                    Question Title
                    <input value={questionsForm.title} onChange={(e) => setQuestionsForm((prev) => ({ ...prev, title: e.target.value }))} />
                  </label>
                  <label style={{ gridColumn: '1 / -1' }}>
                    Question Details
                    <textarea value={questionsForm.description} onChange={(e) => setQuestionsForm((prev) => ({ ...prev, description: e.target.value }))} rows="6" />
                  </label>
                  <button type="submit" className="primary-button" style={{ gridColumn: '1 / -1' }}>Submit Question</button>
                </form>
              </div>

              <div className="card">
                <h2>Questions to Executive</h2>
                {questions.length === 0 ? (
                  <p>No questions found.</p>
                ) : (
                  <div className="list-panel">
                    {questions.map((item) => (
                      <div key={item._id} className="list-item">
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.description?.slice(0, 100) || ''}</p>
                        </div>
                        <span className={`status-pill ${item.status}`}>{item.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'petitions' && (
          <section className="dashboard-section">
            <div className="dashboard-grid">
              <div className="card">
                <h2>Public Petitions</h2>
                {petitionItems.length === 0 ? (
                  <p>No petitions found.</p>
                ) : (
                  <div className="list-panel">
                    {petitionItems.map((petition) => (
                      <button
                        key={petition._id}
                        type="button"
                        className={`list-item ${selectedPetitionId === petition._id ? 'active' : ''}`}
                        onClick={() => setSelectedPetitionId(petition._id)}
                      >
                        <div>
                          <strong>{petition.title}</strong>
                          <p>{petition.description?.slice(0, 110) || 'No description provided.'}</p>
                        </div>
                        <span>{buildStatusLabel(petition.status)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <h2>Sponsor Petition</h2>
                <label>
                  Selected Petition
                  <input value={petitionItems.find((item) => item._id === selectedPetitionId)?.title || ''} disabled />
                </label>
                <label>
                  Add Comment
                  <textarea value={petitionComment} onChange={(e) => setPetitionComment(e.target.value)} rows="5" />
                </label>
                <button type="button" className="primary-button" onClick={sponsorPetition}>Sponsor Petition</button>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'committees' && (
          <section className="dashboard-section">
            <div className="dashboard-grid">
              <div className="card">
                <h2>Committee Memberships</h2>
                {committees.length === 0 ? (
                  <p>No committees available.</p>
                ) : (
                  <div className="list-panel">
                    {committees.map((committee) => (
                      <div key={committee._id} className="list-item">
                        <div>
                          <strong>{committee.name}</strong>
                          <p>{committee.description || 'No description provided.'}</p>
                        </div>
                        <span>{committee.meetingSchedule || 'Schedule not set'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <h2>Committee Reports & Attendance</h2>
                <p>Use the committee page to review minutes, meeting schedules, and upload recommendations if authorized.</p>
                <p>Current backend support is limited, so this view shows committee listings and agenda details.</p>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'calendar' && (
          <section className="dashboard-section">
            <div className="card">
              <h2>Assembly Calendar</h2>
              {meetings.length === 0 ? (
                <p>No upcoming public meetings or sessions scheduled.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Event</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meetings.map((meeting) => (
                      <tr key={meeting._id}>
                        <td>{formatDate(meeting.startTime || meeting.date)}</td>
                        <td>{meeting.title || meeting.agenda}</td>
                        <td>{meeting.meetingType || 'General'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}

        {activeTab === 'attendance' && (
          <section className="dashboard-section">
            <div className="dashboard-stats">
              <div className="stat-card blue">
                <span>Total Records</span>
                <h3>{attendanceSummary.totalDays}</h3>
                <p>Days recorded in your attendance log.</p>
              </div>
              <div className="stat-card green">
                <span>Present</span>
                <h3>{attendanceSummary.presentDays}</h3>
                <p>Days marked as present.</p>
              </div>
              <div className="stat-card red">
                <span>Absent</span>
                <h3>{attendanceSummary.absentDays}</h3>
                <p>Days marked as absent.</p>
              </div>
              <div className="stat-card black">
                <span>Attendance %</span>
                <h3>{attendanceSummary.attendancePercentage}%</h3>
                <p>Your attendance percentage from recorded data.</p>
              </div>
            </div>

            <div className="card">
              <h2>Attendance Records</h2>
              {attendanceRecords.length === 0 ? (
                <p>No attendance records found.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map((record) => (
                      <tr key={record._id}>
                        <td>{formatDate(record.date)}</td>
                        <td>{record.status}</td>
                        <td>{formatTime(record.checkIn?.time)}</td>
                        <td>{formatTime(record.checkOut?.time)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <button type="button" className="secondary-button" onClick={downloadAttendanceReport}>
                Download Attendance Report
              </button>
            </div>
          </section>
        )}

        {activeTab === 'voting' && (
          <section className="dashboard-section">
            <div className="card">
              <h2>Vote on Bills</h2>
              {bills.filter((bill) => bill.voting?.items?.length > 0).length === 0 ? (
                <p>No voting items currently available.</p>
              ) : (
                <div className="list-panel">
                  {bills.filter((bill) => bill.voting?.items?.length > 0).map((bill) => (
                    <div key={bill._id} className="card">
                      <strong>{bill.title}</strong>
                      <p>{bill.summary?.slice(0, 150) || 'No summary available.'}</p>
                      {bill.voting.items.map((item) => (
                        <div key={item._id} className="petition-card">
                          <h4>{item.question}</h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {(item.options || []).map((option) => (
                              <button
                                key={option}
                                className="secondary-button"
                                type="button"
                                onClick={() => castVote(bill, item, option)}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'issues' && (
          <section className="dashboard-section">
            <div className="card">
              <h2>Ward Issues</h2>
              <p>Use this area to track citizen complaints, development requests, and visit notes for your ward.</p>
              <p>The current backend does not have a dedicated constituency issues endpoint, so public feedback and documents are used as a proxy for issue tracking.</p>
            </div>
          </section>
        )}

        {activeTab === 'public' && (
          <section className="dashboard-section">
            <div className="card">
              <h2>Public Participation</h2>
              <p>Upcoming citizen forums and public participation events are shown here.</p>
              {participationItems.length === 0 ? (
                <p>No public participation events found. Visit the Public Participation page to create or manage notices.</p>
              ) : (
                <div className="list-panel">
                  {participationItems.map((item) => (
                    <div key={item._id} className="list-item">
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.description?.slice(0, 100) || 'Public participation event details.'}</p>
                      </div>
                      <span>{item.eventDate ? formatDate(item.eventDate) : 'No date'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'documents' && (
          <section className="dashboard-section">
            <div className="card">
              <h2>Documents</h2>
              {documents.length === 0 ? (
                <p>No documents found.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc._id || doc.fileName || doc.title}>
                        <td>{doc.title || doc.fileName || 'Untitled'}</td>
                        <td>{doc.type || 'Document'}</td>
                        <td>
                          <button type="button" className="secondary-button" onClick={() => downloadDocument(doc)}>
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}

        {activeTab === 'notifications' && (
          <section className="dashboard-section">
            <div className="card">
              <h2>Notifications</h2>
              {notifications.length === 0 ? (
                <p>No notifications available.</p>
              ) : (
                <div className="list-panel">
                  {notifications.map((item) => (
                    <div key={item._id} className="list-item">
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.body?.slice(0, 120) || 'No description provided.'}</p>
                      </div>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'messages' && (
          <section className="dashboard-section">
            <div className="dashboard-grid">
              <div className="card">
                <h2>Inbox</h2>
                {messages.length === 0 ? (
                  <p>No messages in your inbox.</p>
                ) : (
                  <div className="list-panel">
                    {messages.map((msg) => (
                      <div key={msg._id} className="list-item">
                        <div>
                          <strong>{msg.subject}</strong>
                          <p>{msg.body?.slice(0, 100) || 'No message content.'}</p>
                        </div>
                        <span>{formatDate(msg.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="card">
                <h2>Send Message</h2>
                <form onSubmit={sendMessage} className="form-row">
                  <label>
                    To (email or user id)
                    <input name="to" value={messageForm.to} onChange={(e) => setMessageForm((prev) => ({ ...prev, to: e.target.value }))} />
                  </label>
                  <label>
                    Subject
                    <input name="subject" value={messageForm.subject} onChange={(e) => setMessageForm((prev) => ({ ...prev, subject: e.target.value }))} />
                  </label>
                  <label style={{ gridColumn: '1 / -1' }}>
                    Message
                    <textarea name="body" value={messageForm.body} onChange={(e) => setMessageForm((prev) => ({ ...prev, body: e.target.value }))} rows="6" />
                  </label>
                  <button type="submit" className="primary-button" style={{ gridColumn: '1 / -1' }}>Send Message</button>
                </form>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'reports' && (
          <section className="dashboard-section">
            <div className="card">
              <h2>Report Generator</h2>
              <div className="report-grid">
                <div className="info-card">
                  <h3>Attendance Report</h3>
                  <p>Download a full attendance summary for your record.</p>
                  <button type="button" className="secondary-button" onClick={downloadAttendanceReport}>Download</button>
                </div>
                <div className="info-card">
                  <h3>Sponsored Bills</h3>
                  <p>Review and export the list of bills you have sponsored.</p>
                </div>
                <div className="info-card">
                  <h3>Voting Activity</h3>
                  <p>View your recent voting history and decisions.</p>
                </div>
                <div className="info-card">
                  <h3>Petition Activity</h3>
                  <p>See sponsorship and petition tracking summaries.</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="dashboard-section">
            <div className="card">
              <h2>Account Settings</h2>
              <form className="form-row" onSubmit={(event) => event.preventDefault()}>
                <label>
                  Notification preferences
                  <select
                    value={settings.notifications ? 'enabled' : 'disabled'}
                    onChange={(event) => setSettings((prev) => ({ ...prev, notifications: event.target.value === 'enabled' }))}
                  >
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </label>
                <label>
                  Two-factor authentication
                  <select
                    value={settings.twoFactor ? 'enabled' : 'disabled'}
                    onChange={(event) => setSettings((prev) => ({ ...prev, twoFactor: event.target.value === 'enabled' }))}
                  >
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </label>
                <label style={{ gridColumn: '1 / -1' }}>
                  Change Password
                  <input type="password" placeholder="New password" disabled />
                  <small>Password changes are managed by the authentication service.</small>
                </label>
              </form>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
