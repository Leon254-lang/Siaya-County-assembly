import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function NavBar() {
  const isLoggedIn = !!localStorage.getItem('icamsToken');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (isLoggedIn) {
      const name = localStorage.getItem('userName');
      setUserName(name || 'User');
    }
  }, [isLoggedIn]);

  const handleLogout = () => {
    localStorage.removeItem('icamsToken');
    localStorage.removeItem('userName');
    window.location.href = '/login';
  };

  return (
    <nav className="nav-bar">
      <div className="brand">
        <Link to="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>
          <img src="/uploads/siaya.jpeg" alt="Siaya Logo" style={{ height: '60px', width: 'auto', marginRight: '12px', objectFit: 'contain' }} />
        </Link>
      </div>
      <div className="nav-links">
        {isLoggedIn ? (
          <>
            <Link to="/documents">Documents</Link>
            <Link to="/attendance">Attendance</Link>
            <Link to="/visitors">Visitors</Link>
            <Link to="/meetings">Meetings</Link>
            <Link to="/assets">Assets</Link>
            <Link to="/tickets">Helpdesk</Link>
            <Link to="/interns">Interns</Link>
            <Link to="/feedback">Public</Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>👤 {userName}</span>
              <button onClick={handleLogout}>Logout</button>
            </div>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
