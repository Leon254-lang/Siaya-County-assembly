import { Link } from 'react-router-dom';

export default function Forbidden() {
  return (
    <div className="page">
      <div className="page-header">
        <h1>🚫 Access Denied</h1>
        <p>You don’t have permission to view this page.</p>
      </div>
      <div className="card" style={{ padding: '1.5rem', maxWidth: '640px', margin: '0 auto' }}>
        <p>
          Sign in with the right access level, or return to the dashboard.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
          <Link to="/dashboard"><button type="button">Return to Dashboard</button></Link>
        </div>
      </div>
    </div>
  );
}
