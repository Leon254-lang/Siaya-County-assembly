import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function NavBar() {
  const isLoggedIn = !!localStorage.getItem('icamsToken');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    if (isLoggedIn) {
      const name = localStorage.getItem('userName');
      const role = localStorage.getItem('userRole');
      setUserName(name || 'User');
      setUserRole(role || '');
    }
  }, [isLoggedIn]);

  const getAllowedLinks = (role) => {
    const allLinks = [
      { to: '/documents', label: 'Documents', roles: ['Super Admin', 'Clerk', 'ICT Admin', 'HR Officer'] },
      { to: '/attendance', label: 'Attendance', roles: ['Super Admin', 'HR Officer'] },
      { to: '/visitors', label: 'Visitors', roles: ['Super Admin', 'Security Officer'] },
      { to: '/meetings', label: 'Meetings', roles: ['Super Admin', 'Committee Officer'] },
      { to: '/assets', label: 'Assets', roles: ['Super Admin', 'Finance Officer'] },
      { to: '/tickets', label: 'Helpdesk', roles: ['Super Admin', 'ICT Admin'] },
      { to: '/interns', label: 'Interns', roles: ['Super Admin', 'HR Officer'] },
      { to: '/leaders', label: 'Leaders', roles: ['Super Admin', 'HR Officer', 'Security Officer', 'Committee Officer', 'Finance Officer', 'ICT Admin', 'Clerk', 'Intern'] },
      { to: '/feedback', label: 'Public', roles: ['Super Admin', 'HR Officer', 'Security Officer', 'Committee Officer', 'Finance Officer', 'ICT Admin', 'Clerk', 'Intern'] },
    ];
    return allLinks.filter(link => link.roles.includes(role));
  };

  const allowedLinks = getAllowedLinks(userRole);

  const handleLogout = () => {
    localStorage.removeItem('icamsToken');
    localStorage.removeItem('userName');
    window.location.href = '/login';
  };

  return (
    <nav className="nav-bar">
      <div className="brand">
        <Link to="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>
          <img src="https://siayaassembly.go.ke/wp-content/uploads/2020/05/logo.png" alt="Siaya County Assembly Logo" style={{ height: '60px', width: 'auto', marginRight: '12px', objectFit: 'contain' }} />
        </Link>
      </div>
      <div className="nav-links">
        {isLoggedIn ? (
          <>
            {allowedLinks.map(link => (
              <Link key={link.to} to={link.to}>{link.label}</Link>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>👤 {userName} ({userRole})</span>
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
