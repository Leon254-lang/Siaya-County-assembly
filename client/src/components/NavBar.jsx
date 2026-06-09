import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function NavBar() {
  const isLoggedIn = !!localStorage.getItem('icamsToken');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopMenuOpen, setIsDesktopMenuOpen] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      const name = localStorage.getItem('userName');
      const role = localStorage.getItem('userRole');
      setUserName(name || 'User');
      setUserRole(role || '');
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      } else {
        setIsDesktopMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getAllowedLinks = (role) => {
    const allLinks = [
      { to: '/documents', label: 'Documents', roles: ['Super Admin', 'Clerk', 'ICT Admin', 'HR Officer', 'Finance Officer', 'Committee Officer', 'Procurement Officer'] },
      { to: '/announcements', label: 'Announcements', roles: ['Super Admin', 'Clerk', 'ICT Admin', 'HR Officer', 'Finance Officer', 'Committee Officer', 'Procurement Officer', 'MCA', 'Intern', 'Security Officer'] },
      { to: '/messages', label: 'Messages', roles: ['Super Admin', 'Clerk', 'ICT Admin', 'HR Officer', 'Finance Officer', 'Committee Officer', 'Procurement Officer', 'MCA', 'Intern', 'Security Officer'] },
      { to: '/audit-logs', label: 'Audit Logs', roles: ['Super Admin', 'ICT Admin'] },
      { to: '/committees', label: 'Committees', roles: ['Super Admin', 'Committee Officer', 'Clerk', 'HR Officer'] },
      { to: '/attendance', label: 'Attendance', roles: ['Super Admin', 'ICT Admin', 'HR Officer', 'Clerk', 'Finance Officer', 'Committee Officer', 'Procurement Officer', 'MCA', 'Intern', 'Security Officer'] },
      { to: '/visitors', label: 'Visitors', roles: ['Super Admin', 'Security Officer'] },
      { to: '/meetings', label: 'Meetings', roles: ['Super Admin', 'Committee Officer'] },
      { to: '/sessions', label: 'Sessions', roles: ['Super Admin', 'Committee Officer', 'Clerk'] },
      { to: '/mcas', label: 'MCAs', roles: ['Super Admin', 'HR Officer', 'Committee Officer', 'Clerk'] },
      { to: '/assets', label: 'Assets', roles: ['Super Admin', 'Finance Officer'] },
      { to: '/finance', label: 'Finance', roles: ['Super Admin', 'Finance Officer'] },
      { to: '/procurement', label: 'Procurement', roles: ['Super Admin', 'ICT Admin', 'Procurement Officer'] },
      { to: '/bills', label: 'Bills', roles: ['Super Admin', 'Clerk', 'Committee Officer', 'MCA'] },
      { to: '/voting', label: 'Voting', roles: ['Super Admin', 'Clerk', 'Committee Officer', 'MCA'] },
      { to: '/tickets', label: 'Helpdesk', roles: ['Super Admin', 'ICT Admin'] },
      { to: '/interns', label: 'Interns', roles: ['Super Admin', 'HR Officer', 'Intern'] },
      { to: '/leaders', label: 'Leaders', roles: ['Super Admin', 'HR Officer', 'Security Officer', 'Committee Officer', 'Finance Officer', 'ICT Admin', 'Clerk', 'Intern', 'Procurement Officer', 'MCA'] },
      { to: '/feedback', label: 'Public', roles: ['Super Admin', 'HR Officer', 'Security Officer', 'Committee Officer', 'Finance Officer', 'ICT Admin', 'Clerk', 'Intern', 'Procurement Officer', 'MCA'] },
      { to: '/faq', label: 'FAQ', roles: ['Super Admin', 'HR Officer', 'Security Officer', 'Committee Officer', 'Finance Officer', 'ICT Admin', 'Clerk', 'Intern', 'Procurement Officer', 'MCA'] },
      { to: '/media', label: 'Media', roles: ['Super Admin', 'HR Officer', 'Security Officer', 'Committee Officer', 'Finance Officer', 'ICT Admin', 'Clerk', 'Intern', 'Procurement Officer', 'MCA'] },
    ];
    return allLinks.filter(link => link.roles.includes(role));
  };

  const allowedLinks = getAllowedLinks(userRole);

  const handleLogout = () => {
    localStorage.removeItem('icamsToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    setIsMobileMenuOpen(false);
    setIsDesktopMenuOpen(false);
    window.location.href = '/login';
  };

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
    setIsDesktopMenuOpen(false);
  };

  return (
    <>
      <nav className="nav-bar">
        <div className="brand">
          <Link to="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }} onClick={handleLinkClick}>
            <img src="https://siayaassembly.go.ke/wp-content/uploads/2020/05/logo.png" alt="Siaya County Assembly Logo" style={{ height: '60px', width: 'auto', marginRight: '12px', objectFit: 'contain' }} />
          </Link>
        </div>
        <button 
          className="mobile-menu-toggle" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
          style={{ display: 'none' }}
        >
          ☰
        </button>
        <div className="nav-actions">
          <button
            className="desktop-menu-toggle"
            type="button"
            onClick={() => setIsDesktopMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
          >
            Menu ▾
          </button>

          <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
            {isLoggedIn ? (
              <>
                {allowedLinks.map(link => (
                  <Link key={link.to} to={link.to} onClick={handleLinkClick}>{link.label}</Link>
                ))}
                {userRole === 'Super Admin' && (
                  <Link to="/register" onClick={handleLinkClick}>Register</Link>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', width: '100%', justifyContent: 'center' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '500', fontSize: '0.9rem' }}>👤 {userName}</span>
                  <button onClick={handleLogout}>Logout</button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" onClick={handleLinkClick}>Login</Link>
              </>
            )}
          </div>

          <div className={`desktop-dropdown ${isDesktopMenuOpen ? 'open' : ''}`}>
            {isLoggedIn ? (
              <>
                {allowedLinks.map(link => (
                  <Link key={link.to} to={link.to} onClick={handleLinkClick}>{link.label}</Link>
                ))}
                {userRole === 'Super Admin' && (
                  <Link to="/register" onClick={handleLinkClick}>Register</Link>
                )}
                <button type="button" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <Link to="/login" onClick={handleLinkClick}>Login</Link>
            )}
          </div>
        </div>
      </nav>
      <style>{`
        @media screen and (min-width: 769px) {
          .nav-actions {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            position: relative;
          }

          .desktop-menu-toggle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
            color: #fff;
            border: none;
            border-radius: 999px;
            padding: 0.55rem 0.9rem;
            font-weight: 600;
            cursor: pointer;
            box-shadow: var(--shadow);
          }

          .desktop-dropdown {
            display: none;
            position: absolute;
            top: calc(100% + 0.5rem);
            right: 0;
            min-width: 260px;
            background: rgba(255, 255, 255, 0.98);
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 14px;
            box-shadow: var(--shadow-hover);
            flex-direction: column;
            padding: 0.5rem;
            z-index: 120;
          }

          .desktop-dropdown.open {
            display: flex;
          }

          .desktop-dropdown a,
          .desktop-dropdown button {
            width: 100%;
            text-align: left;
            padding: 0.65rem 0.75rem;
            border-radius: 10px;
            color: var(--text-primary);
            text-decoration: none;
            background: transparent;
            border: none;
            cursor: pointer;
            font-weight: 500;
          }

          .desktop-dropdown a:hover,
          .desktop-dropdown button:hover {
            background: rgba(178, 34, 52, 0.08);
          }

          .nav-links {
            display: none;
          }
        }

        @media screen and (max-width: 768px) {
          .nav-actions {
            width: 100%;
            display: flex;
            justify-content: flex-end;
          }

          .desktop-menu-toggle,
          .desktop-dropdown {
            display: none;
          }

          .mobile-menu-toggle {
            display: flex !important;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--text-primary);
            padding: 0.5rem;
            order: 3;
          }

          .nav-links {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(20px);
            flex-direction: column;
            width: 100%;
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            padding: 0;
          }

          .nav-links.mobile-open {
            max-height: 500px;
            padding: 1rem;
          }

          .nav-links a,
          .nav-links button {
            width: 100%;
            text-align: center;
            margin: 0.5rem 0;
          }

          .nav-links a {
            display: block;
            padding: 0.75rem 0.5rem;
            border-radius: 6px;
            transition: background 0.2s;
          }

          .nav-links a:hover {
            background: rgba(178, 34, 52, 0.08);
          }

          .nav-links button {
            padding: 0.75rem 1rem;
          }

          .nav-bar {
            flex-wrap: wrap;
            position: relative;
          }

          .nav-links > div {
            width: 100% !important;
            justify-content: center !important;
            margin-top: 0.5rem;
          }
        }
      `}</style>
    </>
  );
}
