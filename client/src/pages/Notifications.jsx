import { useEffect, useState } from 'react';
import api from '../services/api';

const preferenceLabels = {
  email: 'Email notifications',
  sms: 'SMS alerts',
  meetingReminders: 'Meeting reminders',
  approvalRequests: 'Approval requests',
  deadlines: 'Deadline reminders',
  statusUpdates: 'Workflow status updates',
  publicNotices: 'Public notice alerts',
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState({});
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const [notificationsResponse, preferencesResponse] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/preferences'),
      ]);
      setNotifications(notificationsResponse.data || []);
      setPreferences(preferencesResponse.data || {});
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to load notifications.');
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (notification) => {
    if (notification.readAt) return;
    try {
      const response = await api.post(`/notifications/${notification._id}/read`);
      setNotifications((current) => current.map((item) => item._id === notification._id ? response.data : item));
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to mark notification as read.');
    }
  };

  const updatePreference = async (key, value) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    try {
      await api.patch('/notifications/preferences', { [key]: value });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to update notification preferences.');
      setPreferences(preferences);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Notifications</h1>
        <p>Review alerts and control non-critical notification channels.</p>
      </div>
      {message && <div className="notification">{message}</div>}
      <div className="dashboard-grid two-column">
        <section className="card">
          <h2>Notification preferences</h2>
          {Object.entries(preferenceLabels).map(([key, label]) => (
            <label key={key} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.8rem' }}>
              <input type="checkbox" checked={preferences[key] !== false} onChange={(event) => updatePreference(key, event.target.checked)} />
              {label}
            </label>
          ))}
          <small>Critical security, approval rejection, and overdue escalation alerts cannot be disabled.</small>
        </section>
        <section className="card">
          <h2>Inbox</h2>
          {notifications.length === 0 ? <p>No notifications.</p> : (
            <div className="list-panel">
              {notifications.map((notification) => (
                <button key={notification._id} type="button" className="list-item" onClick={() => markRead(notification)} style={{ width: '100%', textAlign: 'left', opacity: notification.readAt ? 0.65 : 1 }}>
                  <strong>{notification.title}</strong>
                  <div>{notification.body}</div>
                  <small>{new Date(notification.createdAt).toLocaleString()} · {notification.readAt ? 'Read' : 'Unread'}</small>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}