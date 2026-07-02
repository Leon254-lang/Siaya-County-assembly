import { useEffect, useState } from 'react';
import api from '../services/api';

export default function ClerkDashboard() {
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [upcomingSittings, setUpcomingSittings] = useState([]);
  const [procurementRequisitions, setProcurementRequisitions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [statistics, setStatistics] = useState({
    totalBills: 0,
    totalCommittees: 0,
    totalMeetings: 0,
    totalMembers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load pending approvals (bills, motions, documents)
      const billsRes = await api.get('/bills');
      const pendingBills = billsRes.data.filter(b => b.status !== 'Archived');
      setPendingApprovals(pendingBills.slice(0, 5));

      // Load procurement requisitions that are submitted to clerk
      const requisitionsRes = await api.get('/procurement-records');
      const requisitionsForClerk = requisitionsRes.data.records
        .filter((item) => item.type === 'requisition' && item.status === 'Submitted to Clerk');
      setProcurementRequisitions(requisitionsForClerk);

      // Load upcoming sittings/meetings
      const meetingsRes = await api.get('/meetings');
      const upcomingMeets = meetingsRes.data.filter(m => new Date(m.date) > new Date());
      setUpcomingSittings(upcomingMeets.slice(0, 5));

      // Load notifications/announcements
      const announcementsRes = await api.get('/announcements');
      setNotifications(announcementsRes.data.slice(0, 5));

      // Load statistics
      const stats = {
        totalBills: billsRes.data.length,
        totalCommittees: 0,
        totalMeetings: meetingsRes.data.length,
        totalMembers: 0,
      };

      try {
        const committeesRes = await api.get('/committees');
        stats.totalCommittees = committeesRes.data.length;
      } catch (err) {
        console.error('Failed to load committees:', err);
      }

      try {
        const mcasRes = await api.get('/mcas');
        stats.totalMembers = mcasRes.data.length;
      } catch (err) {
        console.error('Failed to load MCAs:', err);
      }

      setStatistics(stats);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load clerk dashboard data:', err);
      setMessage('Failed to load dashboard data. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const approveItem = async (itemId, itemType) => {
    try {
      if (itemType === 'bill') {
        await api.put(`/bills/${itemId}`, { status: 'Approved' });
      } else if (itemType === 'procurement') {
        await api.put(`/procurement-records/${itemId}`, { status: 'Submitted to Stores', workflowStage: 'Submitted to Stores' });
      }
      setMessage(`${itemType} approved successfully.`);
      loadDashboardData();
    } catch (err) {
      console.error('Failed to approve:', err);
      setMessage('Failed to approve. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>📊 Clerk's Dashboard</h1>
          <p>View pending approvals, upcoming sittings, notifications, and statistics.</p>
        </div>
        <div className="loading">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>📊 Clerk's Dashboard</h1>
        <p>View pending approvals, upcoming sittings, notifications, and statistics.</p>
      </div>

      {message && (
        <div className="notification">
          {message}
          <button onClick={() => setMessage('')} style={{ marginLeft: '1rem' }}>×</button>
        </div>
      )}

      {/* Statistics Section */}
      <section className="dashboard-section">
        <h2>📈 Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{statistics.totalBills}</div>
            <div className="stat-label">Bills</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{statistics.totalCommittees}</div>
            <div className="stat-label">Committees</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{statistics.totalMeetings}</div>
            <div className="stat-label">Meetings</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{statistics.totalMembers}</div>
            <div className="stat-label">Members</div>
          </div>
        </div>
      </section>

      {/* Pending Approvals Section */}
      <section className="dashboard-section">
        <h2>⏳ Pending Approvals</h2>
        {pendingApprovals.length > 0 ? (
          <div className="approval-list">
            {pendingApprovals.map((item) => (
              <div key={item._id} className="approval-item">
                <div className="approval-info">
                  <h4>{item.title}</h4>
                  <p>{item.summary || 'No description'}</p>
                  <small>Status: <strong>{item.status || 'Pending'}</strong></small>
                </div>
                <div className="approval-actions">
                  {item.status === 'Pending' && (
                    <>
                      <button
                        className="btn-small btn-success"
                        onClick={() => approveItem(item._id, 'bill')}
                      >
                        Approve
                      </button>
                      <button className="btn-small btn-secondary">Reject</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No pending approvals at this time.</p>
        )}
      </section>

      <section className="dashboard-section">
        <h2>🧾 Procurement Requisitions for Clerk Review</h2>
        {procurementRequisitions.length > 0 ? (
          <div className="approval-list">
            {procurementRequisitions.map((item) => (
              <div key={item._id} className="approval-item">
                <div className="approval-info">
                  <h4>{item.title}</h4>
                  <p>{item.description || item.summary || 'No requisition details provided.'}</p>
                  <small>Department: <strong>{item.department || 'N/A'}</strong></small>
                  <br />
                  <small>Current stage: <strong>{item.workflowStage || item.status}</strong></small>
                </div>
                <div className="approval-actions">
                  <button
                    className="btn-small btn-success"
                    onClick={() => approveItem(item._id, 'procurement')}
                  >
                    Forward to Stores
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No requisitions currently assigned to clerk review.</p>
        )}
      </section>

      {/* Upcoming Sittings Section */}
      <section className="dashboard-section">
        <h2>🗓️ Upcoming Sittings</h2>
        {upcomingSittings.length > 0 ? (
          <div className="sittings-list">
            {upcomingSittings.map((sitting) => (
              <div key={sitting._id} className="sitting-item">
                <div className="sitting-date">
                  <div className="date-day">{new Date(sitting.date).getDate()}</div>
                  <div className="date-month">{new Date(sitting.date).toLocaleString('en', { month: 'short' })}</div>
                </div>
                <div className="sitting-info">
                  <h4>{sitting.title || 'Assembly Sitting'}</h4>
                  <p>{sitting.description || 'Regular assembly sitting'}</p>
                  <small>📍 {sitting.location || 'Assembly Hall'} • ⏰ {new Date(sitting.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No upcoming sittings scheduled.</p>
        )}
      </section>

      {/* Notifications Section */}
      <section className="dashboard-section">
        <h2>🔔 Recent Notifications</h2>
        {notifications.length > 0 ? (
          <div className="notifications-list">
            {notifications.map((notif) => (
              <div key={notif._id} className="notification-item">
                <div className="notification-icon">📢</div>
                <div className="notification-content">
                  <h4>{notif.title}</h4>
                  <p>{notif.content || notif.description}</p>
                  <small>{new Date(notif.createdAt || notif.date).toLocaleDateString()}</small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No recent notifications.</p>
        )}
      </section>

      <style>{`
        .dashboard-section {
          margin: 2rem 0;
          padding: 1.5rem;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .dashboard-section h2 {
          margin-top: 0;
          color: #1f2937;
          margin-bottom: 1.5rem;
          font-size: 1.3rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          text-align: center;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .stat-number {
          font-size: 2rem;
          font-weight: bold;
          color: #4f46e5;
        }

        .stat-label {
          font-size: 0.9rem;
          color: #6b7280;
          margin-top: 0.5rem;
        }

        .approval-list, .sittings-list, .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .approval-item {
          background: white;
          padding: 1rem;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .approval-info h4 {
          margin: 0 0 0.5rem 0;
          color: #1f2937;
        }

        .approval-info p {
          margin: 0.25rem 0;
          color: #6b7280;
          font-size: 0.9rem;
        }

        .approval-info small {
          display: block;
          margin-top: 0.5rem;
          color: #9ca3af;
        }

        .approval-actions {
          display: flex;
          gap: 0.5rem;
        }

        .btn-small {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-success {
          background: #10b981;
          color: white;
        }

        .btn-success:hover {
          background: #059669;
        }

        .btn-secondary {
          background: #9ca3af;
          color: white;
        }

        .btn-secondary:hover {
          background: #6b7280;
        }

        .sitting-item {
          background: white;
          padding: 1rem;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          display: flex;
          gap: 1rem;
        }

        .sitting-date {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 70px;
          background: #4f46e5;
          color: white;
          border-radius: 6px;
          padding: 0.75rem;
          font-weight: bold;
        }

        .date-day {
          font-size: 1.5rem;
        }

        .date-month {
          font-size: 0.8rem;
          opacity: 0.9;
        }

        .sitting-info h4 {
          margin: 0 0 0.5rem 0;
          color: #1f2937;
        }

        .sitting-info p {
          margin: 0.25rem 0;
          color: #6b7280;
          font-size: 0.9rem;
        }

        .sitting-info small {
          display: block;
          margin-top: 0.5rem;
          color: #9ca3af;
        }

        .notification-item {
          background: white;
          padding: 1rem;
          border-radius: 6px;
          border-left: 4px solid #4f46e5;
          display: flex;
          gap: 1rem;
        }

        .notification-icon {
          font-size: 1.5rem;
          min-width: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notification-content h4 {
          margin: 0 0 0.5rem 0;
          color: #1f2937;
        }

        .notification-content p {
          margin: 0.25rem 0;
          color: #6b7280;
          font-size: 0.9rem;
        }

        .notification-content small {
          display: block;
          margin-top: 0.5rem;
          color: #9ca3af;
        }

        .empty-state {
          text-align: center;
          padding: 2rem;
          color: #9ca3af;
          font-style: italic;
        }

        .loading {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .page-header {
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .page-header h1 {
          margin: 0 0 0.5rem 0;
          color: #111827;
        }

        .page-header p {
          margin: 0;
          color: #6b7280;
        }
      `}</style>
    </div>
  );
}
