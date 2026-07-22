import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const heroImages = [
  {
    src: '/a-800x650.jpg',
    alt: 'County assembly office exterior',
  },
  {
    src: '/c-800x650.jpg',
    alt: 'County assembly meeting room',
  },
  {
    src: '/WhatsApp-Image-2021-01-29-at-9.01.31-AM2-800x650.jpeg',
    alt: 'County assembly building exterior',
  },
];

const heroStats = [
  {
    label: 'Live modules',
    value: '12',
    detail: 'Core workflows in one place.',
  },
  {
    label: 'Meeting schedules',
    value: '8+',
    detail: 'Confirmed sittings and committee plans.',
  },
  {
    label: 'Public feedback',
    value: 'Open',
    detail: 'Public input and updates are tracked.',
  },
];

const imageFallback = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"%3E%3Cdefs%3E%3ClinearGradient id="g" x1="0" y1="0" x2="1" y2="1"%3E%3Cstop offset="0" stop-color="%234f46e5"/%3E%3Cstop offset="1" stop-color="%2306b6d4"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="900" height="600" fill="url(%23g)"/%3E%3Ctext x="50%25" y="50%25" fill="%23ffffff" font-family="Inter, sans-serif" font-size="36" text-anchor="middle" dominant-baseline="middle"%3ESiaya County Assembly%3C/text%3E%3C/svg%3E';

const features = [
  {
    title: 'Citizen Services',
    description: 'Public participation and notices in one place.',
  },
  {
    title: 'Operational Transparency',
    description: 'Meetings, documents, and workflows at a glance.',
  },
  {
    title: 'Staff Collaboration',
    description: 'Attendance, assets, visitors, and interns together.',
  },
  {
    title: 'Secure Administration',
    description: 'Role-based access and audit-ready records.',
  },
];

const quickLinks = [
  {
    title: 'Know Your Leaders',
    logo: '👥',
    description: 'Speaker and MCA profiles.',
    path: '/leaders',
  },
  {
    title: 'Frequently Asked Questions',
    logo: '❓',
    description: 'Answers to common service questions.',
    path: '/faq',
  },
  {
    title: 'Media Center',
    logo: '📺',
    description: 'News, events, and media updates.',
    path: '/media',
  },
];

const hrResponsibilities = [
  'Maintain staff personal files, employment records and HR documents.',
  'Track leave applications, attendance registers and related reports.',
  'Support recruitment, onboarding, training, promotion and welfare activities.',
  'Prepare correspondence, meeting notices, monthly returns and archival records.',
  'Coordinate employee relations, policy implementation and confidential HR workflows.',
];

const ictResponsibilities = [
  'Plan and oversee the Assembly\'s ICT infrastructure and operations.',
  'Manage computer networks, servers, internet connectivity and digital systems.',
  'Supervise ICT officers, technicians and support staff.',
  'Develop and implement ICT policies, standards and procedures.',
  'Ensure cybersecurity, data protection and secure access management.',
  'Manage ICT projects, implementations, maintenance and repairs.',
  'Monitor system performance, backup, disaster recovery and continuity plans.',
  'Manage the Assembly website, digital platforms, email and user accounts.',
  'Provide technical support to MCAs and staff and coordinate training.',
  'Prepare budgets, procurement specifications, reports and strategic ICT plans.',
  'Support automation, records management, video conferencing and chamber ICT systems.',
];

const normalizeRole = (value) => {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') return value.name || value.role || '';
  return '';
};

const clerkResponsibilities = [
  'Provide administrative leadership and management of Assembly operations.',
  'Advise the Speaker and MCAs on parliamentary procedures and practices.',
  'Prepare Assembly calendars, schedules and order papers.',
  'Coordinate Assembly sittings, committee meetings and official functions.',
  'Keep and maintain official records, reports and proceedings.',
  'Custody of Assembly documents, minutes and legislative records.',
  'Supervise departments and staff within the Assembly.',
  'Implement resolutions and decisions made by the County Assembly.',
  'Manage human resource and administrative matters.',
  'Oversee financial management, budget implementation and procurement.',
  'Prepare administrative and performance reports and strategic plans.',
  'Facilitate communication with external stakeholders and public participation.',
  'Ensure compliance with legal, regulatory and policy requirements.',
  'Coordinate records management, archiving and official correspondence.',
];

const formatDateTime = (value) => {
  if (!value) return 'TBD';
  return new Date(value).toLocaleString();
};

export default function Dashboard() {
  const [nextMeetings, setNextMeetings] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [ictOverview, setIctOverview] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    departments: 0,
    assets: 0,
    openTickets: 0,
    resolvedTickets: 0,
    announcements: 0,
    auditLogs: 0,
  });
  const [ictUsers, setIctUsers] = useState([]);
  const [departmentForm, setDepartmentForm] = useState({ name: '', description: '', modules: [], boardroom: '' });
  const [editingDepartmentId, setEditingDepartmentId] = useState('');
  const [departmentMessage, setDepartmentMessage] = useState('');
  const [adminSettings, setAdminSettings] = useState({
    systemSettings: true,
    modulesEnabled: true,
    emailNotifications: true,
    smsNotifications: true,
    passwordPolicy: 'Strong',
    sessionTimeout: '30',
  });
  const [documentTemplateForm, setDocumentTemplateForm] = useState({
    title: '',
    description: '',
    category: 'administrative',
    priority: 'medium',
    department: '',
    type: 'memo',
  });
  const [documentMessage, setDocumentMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('icamsToken');
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    const role = normalizeRole(storedUser?.role || localStorage.getItem('userRole'));

    setIsLoggedIn(!!token);
    setUserRole(role);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    const loadMeetings = async () => {
      setLoadingMeetings(true);
      try {
        const [meetingsRes, remindersRes, announcementsRes] = await Promise.all([
          api.get('/meetings?upcoming=true'),
          api.get('/meetings/reminders'),
          api.get('/communications/announcements?limit=3'),
        ]);
        setNextMeetings(meetingsRes.data.slice(0, 6));
        setReminders(remindersRes.data);
        setAnnouncements(announcementsRes.data);
      } catch (error) {
        console.error('Failed to load dashboard meetings', error);
      } finally {
        setLoadingMeetings(false);
      }
    };

    const loadDashboardData = async () => {
      try {
        const departmentsRes = await api.get('/departments');
        setDepartments(departmentsRes.data || []);
      } catch (error) {
        console.error('Failed to load dashboard departments', error);
      }
    };

    loadMeetings();
    loadDashboardData();
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !['ICT Admin', 'Super Admin'].includes(userRole)) return;

    const loadIctOverview = async () => {
      try {
        const [usersRes, departmentsRes, assetsRes, ticketsRes, auditRes, announcementsRes] = await Promise.all([
          api.get('/users'),
          api.get('/departments'),
          api.get('/assets'),
          api.get('/tickets'),
          api.get('/audit-logs?limit=100'),
          api.get('/communications/announcements?limit=20'),
        ]);

        const users = usersRes.data || [];
        const tickets = ticketsRes.data || [];
        const auditLogs = auditRes.data?.logs || [];
        const announcements = announcementsRes.data || [];

        setIctUsers(users);
        setIctOverview({
          totalUsers: users.length,
          activeUsers: users.filter((user) => user.isActive !== false).length,
          inactiveUsers: users.filter((user) => user.isActive === false).length,
          departments: (departmentsRes.data || []).length,
          assets: (assetsRes.data || []).length,
          openTickets: (tickets || []).filter((ticket) => ticket.status !== 'resolved').length,
          resolvedTickets: (tickets || []).filter((ticket) => ticket.status === 'resolved').length,
          announcements: announcements.length,
          auditLogs: auditLogs.length,
        });
      } catch (error) {
        console.error('Failed to load ICT overview data', error);
      }
    };

    loadIctOverview();
  }, [isLoggedIn, userRole]);


  const hrQuickActions = [
    { title: 'Start appraisal', icon: '📝', description: 'Create a new staff appraisal.', path: '/hr-appraisals' },
    { title: 'Review performance', icon: '✅', description: 'Mark completed reviews.', path: '/hr-appraisals' },
    { title: 'View HR records', icon: '📁', description: 'Open the HR workspace.', path: '/attendance' },
  ];

  const ictQuickActions = [
    { title: 'Add User', icon: '➕', description: 'Create a staff account.', path: '/manage-users?mode=create' },
    { title: 'Reset Password', icon: '🔑', description: 'Update a staff password.', path: '/manage-users?mode=reset' },
    { title: 'Register ICT Asset', icon: '🖥️', description: 'Log new devices and equipment.', path: '/network-devices' },
    { title: 'Review Audit Logs', icon: '🧾', description: 'Check recent admin activity.', path: '/audit-logs' },
    { title: 'Resolve Tickets', icon: '🛠️', description: 'Work through support requests.', path: '/tickets' },
    { title: 'Share Notice', icon: '📢', description: 'Publish updates to staff.', path: '/announcements' },
  ];

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('ictAdminSettings');
      if (savedSettings) {
        setAdminSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Unable to restore ICT settings', error);
    }
  }, []);

  const handleDepartmentInputChange = (event) => {
    const { name, value } = event.target;
    setDepartmentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDepartmentModuleToggle = (moduleName) => {
    setDepartmentForm((prev) => ({
      ...prev,
      modules: prev.modules.includes(moduleName)
        ? prev.modules.filter((item) => item !== moduleName)
        : [...prev.modules, moduleName],
    }));
  };

  const resetDepartmentForm = () => {
    setDepartmentForm({ name: '', description: '', modules: [], boardroom: '' });
    setEditingDepartmentId('');
    setDepartmentMessage('');
  };

  const handleDepartmentSubmit = async (event) => {
    event.preventDefault();
    setDepartmentMessage('');

    try {
      if (editingDepartmentId) {
        await api.put(`/departments/${editingDepartmentId}`, {
          name: departmentForm.name,
          description: departmentForm.description,
          modules: departmentForm.modules,
          boardroom: departmentForm.boardroom || undefined,
        });
        setDepartmentMessage('Department updated successfully.');
      } else {
        await api.post('/departments', {
          name: departmentForm.name,
          description: departmentForm.description,
          modules: departmentForm.modules,
          boardroom: departmentForm.boardroom || undefined,
        });
        setDepartmentMessage('Department created successfully.');
      }

      const departmentsRes = await api.get('/departments');
      setDepartments(departmentsRes.data || []);
      resetDepartmentForm();
    } catch (error) {
      setDepartmentMessage(error.response?.data?.message || 'Unable to save department.');
    }
  };

  const startDepartmentEdit = (department) => {
    setEditingDepartmentId(department._id);
    setDepartmentForm({
      name: department.name || '',
      description: department.description || '',
      modules: department.modules || [],
      boardroom: department.boardroom || '',
    });
    setDepartmentMessage('');
  };

  const handleAdministrationSave = (event) => {
    event.preventDefault();
    localStorage.setItem('ictAdminSettings', JSON.stringify(adminSettings));
    setDepartmentMessage('Administration settings saved.');
  };

  const handleDocumentTemplateSubmit = async (event) => {
    event.preventDefault();
    setDocumentMessage('');

    try {
      await api.post('/documents', {
        title: documentTemplateForm.title,
        description: documentTemplateForm.description,
        type: documentTemplateForm.type,
        category: documentTemplateForm.category,
        priority: documentTemplateForm.priority,
        currentDepartment: documentTemplateForm.department || 'ICT',
        department: documentTemplateForm.department || '',
        responseStatus: 'not_requested',
      });
      setDocumentMessage('Document template created successfully.');
      setDocumentTemplateForm({
        title: '',
        description: '',
        category: 'administrative',
        priority: 'medium',
        department: '',
        type: 'memo',
      });
    } catch (error) {
      setDocumentMessage(error.response?.data?.message || 'Unable to create document.');
    }
  };

  const departmentStaffGroups = departments.map((department) => ({
    ...department,
    users: ictUsers.filter((user) => user.department?._id === department._id || user.department === department._id),
  }));

  const ictOperationCards = [
    {
      title: 'User Accounts',
      icon: '👤',
      description: 'Create and manage staff accounts.',
      operations: ['Create accounts', 'Reset passwords', 'Assign roles'],
      path: '/manage-users',
    },
    {
      title: 'Departments & Teams',
      icon: '🏛️',
      description: 'Keep departments and staff groups aligned.',
      operations: ['Add departments', 'Assign staff', 'Transfer staff'],
      path: '/assets',
    },
    {
      title: 'Devices, Assets & Software',
      icon: '🖥️',
      description: 'Track equipment and support items.',
      operations: ['Register devices', 'Track maintenance', 'Monitor inventory'],
      path: '/assets',
    },
    {
      title: 'Helpdesk & Support',
      icon: '🛠️',
      description: 'Manage ICT support requests.',
      operations: ['Create tickets', 'Assign technicians', 'Close issues'],
      path: '/tickets',
    },
    {
      title: 'Security, Audit & Backup',
      icon: '🔐',
      description: 'Review access and system activity.',
      operations: ['Review audit logs', 'Check backups', 'Track alerts'],
      path: '/audit-logs',
    },
    {
      title: 'Documents, Announcements & Reports',
      icon: '📁',
      description: 'Share notices and official documents.',
      operations: ['Publish notices', 'View documents', 'Generate reports'],
      path: '/documents',
    },
  ];

  return (
    <div className="dashboard">
      <section className="hero">
        <div className="hero-copy">
          <span>County Assembly of Siaya</span>
          <div className="hero-badges">
            <span className="hero-badge">Secure</span>
            <span className="hero-badge">Accessible</span>
            <span className="hero-badge">Real-time</span>
          </div>
          <h1>One secure portal for assembly work and public services</h1>
          <p>Manage meetings, documents, staff, and public feedback from one simple workspace.</p>

          <div className="hero-actions">
            {!isLoggedIn && (
              <Link to="/login" className="hero-action">Secure Access</Link>
            )}
            <Link to="/faq" className="hero-action secondary">Explore Services</Link>
          </div>

          <div className="hero-quickstats">
            {heroStats.map((stat) => (
              <div className="hero-stat" key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <p>{stat.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-images">
            {heroImages.map((image) => (
              <div className="hero-image" key={image.alt}>
                <img
                  src={image.src}
                  alt={image.alt}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = imageFallback;
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard-stats">
        <div className="stat-card red">
          <span>Upcoming Meetings</span>
          <h3>8 confirmed</h3>
          <p>Latest committee and assembly sessions are scheduled and ready to review.</p>
        </div>
        <div className="stat-card green">
          <span>Active Modules</span>
          <h3>12 live</h3>
          <p>Access to workflows for documents, attendance, finance, visitors and more.</p>
        </div>
        <div className="stat-card black">
          <span>Open Tasks</span>
          <h3>5 pending</h3>
          <p>Notifications, approvals, and actions waiting in the system.</p>
        </div>
        <div className="stat-card green">
          <span>Secure Access</span>
          <h3>Role-based</h3>
          <p>Only authorized staff can manage accounts and records.</p>
        </div>
      </section>

      <section className="feature-block">
        <h2>Key County Services</h2>
        <div className="feature-grid">
          {features.map((feature) => (
            <div className="feature-card" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="quick-links-section">
        <h2>Quick Links</h2>
        <div className="quick-links-grid">
          {quickLinks.map((link) => (
            <div className="quick-link-card" key={link.title}>
              <div className="link-logo">{link.logo}</div>
              <h3>{link.title}</h3>
              <p>{link.description}</p>
              <Link to={link.path} className="link-arrow">→</Link>
            </div>
          ))}

        </div>
      </section>

      <div className="hero-feature-grid">
        <div className="info-card find-us-card">
          <h2>How to Find Us</h2>
          <p>Visit the Siaya County Assembly Complex on Riat Road in Siaya town.</p>
          <ul>
            <li>From town center, head east on Riat Road.</li>
            <li>From Kisumu, continue on the Siaya road into town.</li>
            <li>Public transport to the County Assembly Complex is available.</li>
          </ul>
          <p><strong>Contact:</strong> +254 700 000 000 | <a href="mailto:info@siaya.go.ke">info@siaya.go.ke</a></p>
        </div>

        <div className="card summary-card">
          <h2>Integrated County Assembly Management System</h2>
          <p>A simple digital platform for the Assembly’s daily operations and public services.</p>
          <ul>
            <li>One place for documents, meetings, and participation.</li>
            <li>Role-based access for secure administration.</li>
            <li>Live updates for announcements and feedback.</li>
          </ul>
          {!isLoggedIn && (
            <div className="summary-actions">
              <Link to="/login" className="hero-action">Get Started</Link>
            </div>
          )}
        </div>
      </div>

      {!isLoggedIn ? (
        <section className="unauthenticated-dashboard card">
          <h2>Sign in required</h2>
          <p>Sign in to view dashboard tools and modules.</p>
          <Link to="/login" className="module-link">Log In</Link>
        </section>
      ) : (
        <>
          <section className="dashboard-preview">
            <div className="dashboard-card reminder-card">
              <h2>Upcoming Meeting Reminders</h2>
              {loadingMeetings ? (
                <p>Loading reminders...</p>
              ) : reminders.length === 0 ? (
                <p>No immediate reminders. All meetings are on schedule.</p>
              ) : (
                <ul>
                  {reminders.map((meeting) => (
                    <li key={meeting._id}>
                      <strong>{meeting.title}</strong> in {meeting.room || 'TBD'} at {formatDateTime(meeting.startTime)}
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/meetings" className="module-link">View Meeting Schedule</Link>
            </div>

            <div className="dashboard-card announcement-card">
              <h2>Latest Notices</h2>
              {loadingMeetings ? (
                <p>Loading notices...</p>
              ) : announcements.length === 0 ? (
                <p>No current announcements.</p>
              ) : (
                <ul>
                  {announcements.map((item) => (
                    <li key={item._id}>
                      <strong>{item.title}</strong>
                      <div>{item.type}</div>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/announcements" className="module-link">View Announcements</Link>
            </div>

            <div className="dashboard-card calendar-card">
              <h2>Next Meetings Calendar</h2>
              {loadingMeetings ? (
                <p>Loading calendar...</p>
              ) : nextMeetings.length === 0 ? (
                <p>No meetings scheduled for the next two weeks.</p>
              ) : (
                <div className="calendar-list">
                  {nextMeetings.map((meeting) => (
                    <div key={meeting._id} className="calendar-entry">
                      <div className="calendar-date">{new Date(meeting.startTime).toLocaleDateString()}</div>
                      <div>
                        <strong>{meeting.title}</strong>
                        <div>{meeting.room || 'Room TBD'} • {formatDateTime(meeting.startTime)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

    
          {(userRole === 'ICT Admin' || userRole === 'Super Admin') && (
            <section className="modules-section">
              <div className="section-header theme-red">
                <h2>💻 ICT Officer Dashboard</h2>
                <p>Manage users, assets, requests, and communications.</p>
              </div>

              <div className="dashboard-grid">
                <div className="dashboard-card">
                  <h3>Total users</h3>
                  <p className="big-number primary">{ictOverview.totalUsers}</p>
                  <p>{ictOverview.activeUsers} active • {ictOverview.inactiveUsers} inactive</p>
                </div>
                <div className="dashboard-card">
                  <h3>Departments</h3>
                  <p className="big-number accent">{ictOverview.departments}</p>
                  <p>Configured units for administration, finance, procurement, ICT and more.</p>
                </div>
                <div className="dashboard-card">
                  <h3>ICT assets</h3>
                  <p className="big-number">{ictOverview.assets}</p>
                  <p>Registered computers, printers, scanners and related equipment.</p>
                </div>
                <div className="dashboard-card">
                  <h3>Support queue</h3>
                  <p className="big-number primary">{ictOverview.openTickets}</p>
                  <p>{ictOverview.resolvedTickets} resolved • {ictOverview.auditLogs} audit records</p>
                </div>
              </div>

              <div className="card mb-1">
                <h3>⚡ Quick Actions</h3>
                <div className="modules-grid">
                  {ictQuickActions.map((action) => (
                    <Link to={action.path} className="module-card" key={action.title}>
                      <h3>{action.icon} {action.title}</h3>
                      <p>{action.description}</p>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="card" style={{ marginBottom: '1rem' }}>
                <h3>🏛️ Department Management</h3>
                {departmentMessage && <div className="message">{departmentMessage}</div>}
                <form onSubmit={handleDepartmentSubmit} className="form-grid">
                  <label>
                    Department name
                    <input name="name" value={departmentForm.name} onChange={handleDepartmentInputChange} required />
                  </label>
                  <label>
                    Description
                    <input name="description" value={departmentForm.description} onChange={handleDepartmentInputChange} />
                  </label>
                  <label>
                    Assigned boardroom
                    <select name="boardroom" value={departmentForm.boardroom} onChange={handleDepartmentInputChange}>
                      <option value="">No boardroom assigned</option>
                      {['Boardroom 1', 'Boardroom 2', 'Boardroom 3', 'Boardroom 4', 'Boardroom 5'].map((room) => (
                        <option key={room} value={room}>{room}</option>
                      ))}
                    </select>
                  </label>
                  <div>
                    <strong>Enabled modules</strong>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                      {['Documents', 'Assets', 'Helpdesk', 'Announcements', 'Audit'].map((moduleName) => (
                        <label key={moduleName} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input type="checkbox" checked={departmentForm.modules.includes(moduleName)} onChange={() => handleDepartmentModuleToggle(moduleName)} />
                          {moduleName}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button type="submit">{editingDepartmentId ? 'Update Department' : 'Add Department'}</button>
                    <button type="button" onClick={resetDepartmentForm} className="secondary">Clear</button>
                  </div>
                </form>
                  <div style={{ marginTop: '1.5rem', display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                  {departmentStaffGroups.length === 0 ? (
                    <p style={{ gridColumn: '1 / -1' }}>No departments available yet.</p>
                  ) : departmentStaffGroups.map((department) => (
                    <div key={department._id} className="card dept-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.98rem' }}>{department.name}</strong>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button type="button" onClick={() => startDepartmentEdit(department)} style={{ padding: '0.45rem 0.7rem' }}>Edit</button>
                          <Link to="/manage-users?mode=reset" className="module-link" style={{ marginTop: 0, padding: '0.45rem 0.7rem' }}>Assign</Link>
                        </div>
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{department.description || 'No description added yet.'}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <span style={{ color: department.boardroom ? 'var(--primary-color)' : 'var(--text-secondary)', fontWeight: department.boardroom ? 600 : 400, fontSize: '0.85rem' }}>
                          {department.boardroom ? `Boardroom: ${department.boardroom}` : 'No boardroom assigned'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {department.modules?.length ? department.modules.map((moduleName) => (
                          <span key={moduleName} style={{ padding: '0.25rem 0.5rem', background: '#f8fafc', borderRadius: '999px', fontSize: '0.8rem' }}>{moduleName}</span>
                        )) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No modules enabled</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {department.users.length === 0 ? (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No assigned staff yet</span>
                        ) : (
                          <>
                            {department.users.slice(0, 4).map((user) => (
                              <span key={user._id} style={{ padding: '0.25rem 0.5rem', background: '#f1f5f9', borderRadius: '999px', fontSize: '0.8rem' }}>{user.name}</span>
                            ))}
                            {department.users.length > 4 && <span style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>+{department.users.length - 4} more</span>}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ marginBottom: '1rem' }}>
                <h3>⚙️ System Administration</h3>
                <form onSubmit={handleAdministrationSave} style={{ display: 'grid', gap: '0.75rem', marginTop: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.6rem 0.7rem', borderRadius: '10px' }}>
                    <input type="checkbox" checked={adminSettings.systemSettings} onChange={(event) => setAdminSettings((prev) => ({ ...prev, systemSettings: event.target.checked }))} />
                    Core settings
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.6rem 0.7rem', borderRadius: '10px' }}>
                    <input type="checkbox" checked={adminSettings.modulesEnabled} onChange={(event) => setAdminSettings((prev) => ({ ...prev, modulesEnabled: event.target.checked }))} />
                    Application modules
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.6rem 0.7rem', borderRadius: '10px' }}>
                    <input type="checkbox" checked={adminSettings.emailNotifications} onChange={(event) => setAdminSettings((prev) => ({ ...prev, emailNotifications: event.target.checked }))} />
                    Email alerts
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.6rem 0.7rem', borderRadius: '10px' }}>
                    <input type="checkbox" checked={adminSettings.smsNotifications} onChange={(event) => setAdminSettings((prev) => ({ ...prev, smsNotifications: event.target.checked }))} />
                    SMS alerts
                  </label>
                  <label style={{ display: 'grid', gap: '0.35rem', background: '#f8fafc', padding: '0.6rem 0.7rem', borderRadius: '10px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Password policy</span>
                    <select value={adminSettings.passwordPolicy} onChange={(event) => setAdminSettings((prev) => ({ ...prev, passwordPolicy: event.target.value }))}>
                      <option value="Standard">Standard</option>
                      <option value="Strong">Strong</option>
                      <option value="Very Strong">Very Strong</option>
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: '0.35rem', background: '#f8fafc', padding: '0.6rem 0.7rem', borderRadius: '10px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Session timeout</span>
                    <select value={adminSettings.sessionTimeout} onChange={(event) => setAdminSettings((prev) => ({ ...prev, sessionTimeout: event.target.value }))}>
                      <option value="15">15 min</option>
                      <option value="30">30 min</option>
                      <option value="60">60 min</option>
                      <option value="120">120 min</option>
                    </select>
                  </label>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-start' }}>
                    <button type="submit" style={{ padding: '0.6rem 0.9rem' }}>Save</button>
                  </div>
                </form>
              </div>

              <div className="card" style={{ marginBottom: '1rem' }}>
                <h3>📄 Document & File Operations</h3>
                {documentMessage && <div className="message">{documentMessage}</div>}
                <form onSubmit={handleDocumentTemplateSubmit} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                  <label>
                    Title
                    <input value={documentTemplateForm.title} onChange={(event) => setDocumentTemplateForm((prev) => ({ ...prev, title: event.target.value }))} required />
                  </label>
                  <label>
                    Description
                    <textarea value={documentTemplateForm.description} onChange={(event) => setDocumentTemplateForm((prev) => ({ ...prev, description: event.target.value }))} rows="3" />
                  </label>
                  <label>
                    Type
                    <select value={documentTemplateForm.type} onChange={(event) => setDocumentTemplateForm((prev) => ({ ...prev, type: event.target.value }))}>
                      <option value="memo">Memo</option>
                      <option value="template">Template</option>
                      <option value="notice">Notice</option>
                    </select>
                  </label>
                  <label>
                    Category
                    <select value={documentTemplateForm.category} onChange={(event) => setDocumentTemplateForm((prev) => ({ ...prev, category: event.target.value }))}>
                      <option value="administrative">Administrative</option>
                      <option value="technical">Technical</option>
                      <option value="financial">Financial</option>
                      <option value="legal">Legal</option>
                    </select>
                  </label>
                  <label>
                    Priority
                    <select value={documentTemplateForm.priority} onChange={(event) => setDocumentTemplateForm((prev) => ({ ...prev, priority: event.target.value }))}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </label>
                  <label>
                    Department
                    <input value={documentTemplateForm.department} onChange={(event) => setDocumentTemplateForm((prev) => ({ ...prev, department: event.target.value }))} placeholder="ICT, Clerk, Finance..." />
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button type="submit">Create document</button>
                    <Link to="/documents" className="module-link" style={{ marginTop: 0 }}>Open document workspace</Link>
                  </div>
                </form>
              </div>

              <div className="modules-grid">
                {ictOperationCards.map((card) => (
                  <div className="module-card" key={card.title}>
                    <h3>{card.icon} {card.title}</h3>
                    <p>{card.description}</p>
                    <ul style={{ margin: '0 0 1rem 1.1rem', padding: 0, color: 'var(--text-secondary)' }}>
                      {card.operations.map((item) => (
                        <li key={item} style={{ marginBottom: '0.35rem' }}>{item}</li>
                      ))}
                    </ul>
                    <Link to={card.path} className="module-link">Open {card.title}</Link>
                  </div>
                ))}
              </div>


            </section>
          )}

          {userRole === 'HR Officer' && (
            <section className="modules-section">
              <div className="section-header theme-red">
                <h2>👩‍💼 HR Performance & Appraisal Center</h2>
                <p>Run appraisals automatically, track completion, and maintain a clear review workflow for staff performance.</p>
              </div>
              <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="modules-grid">
                  {hrQuickActions.map((action) => (
                    <Link to={action.path} className="module-card" key={action.title}>
                      <h3>{action.icon} {action.title}</h3>
                      <p>{action.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {userRole === 'Clerk' && (
            <section className="modules-section">
              <div className="section-header theme-black">
                <h2>📘 Clerk’s Office Workspace</h2>
                <p>Core functions available in the Clerk’s office dashboard.</p>
              </div>
              <div className="modules-grid">
                <Link to="/clerk-dashboard" className="module-card">
                  <h3>📊 Dashboard</h3>
                  <p>View pending approvals, upcoming sittings, notifications, and statistics.</p>
                </Link>
                <Link to="/mcas" className="module-card">
                  <h3>👥 Member Management</h3>
                  <p>Register, update, suspend, and manage MCAs and staff records.</p>
                </Link>
                <Link to="/sessions" className="module-card">
                  <h3>🗓️ Assembly Sessions</h3>
                  <p>Schedule sittings, publish agendas, record attendance, and manage calendars.</p>
                </Link>
                <Link to="/bills" className="module-card">
                  <h3>🧾 Bills Management</h3>
                  <p>Create, review, approve, track, and archive bills through different legislative stages.</p>
                </Link>
                <Link to="/announcements" className="module-card">
                  <h3>📝 Motions & Petitions</h3>
                  <p>Receive, assign, approve, and track motions and public petitions.</p>
                </Link>
                <Link to="/committees" className="module-card">
                  <h3>🏛️ Committee Management</h3>
                  <p>Create committees, assign members, schedule meetings, and upload reports.</p>
                </Link>
                <Link to="/meetings" className="module-card">
                  <h3>📄 Minutes & Hansard</h3>
                  <p>Record proceedings, upload minutes, and maintain official Assembly records.</p>
                </Link>
                <Link to="/documents" className="module-card">
                  <h3>📁 Document Management</h3>
                  <p>Upload, organize, search, approve, and archive official documents.</p>
                </Link>
                <Link to="/messages" className="module-card">
                  <h3>✉️ Correspondence</h3>
                  <p>Receive and send official letters, memos, notices, and circulars.</p>
                </Link>
                <Link to="/feedback" className="module-card">
                  <h3>🌍 Public Participation</h3>
                  <p>Publish notices, receive public submissions, and manage feedback.</p>
                </Link>
                <Link to="/manage-users" className="module-card">
                  <h3>🔐 User Management</h3>
                  <p>Create accounts, assign roles, reset passwords, and manage permissions.</p>
                </Link>
                <Link to="/announcements" className="module-card">
                  <h3>📈 Reports</h3>
                  <p>Generate attendance, committee, legislative, financial, and activity reports.</p>
                </Link>
                <Link to="/announcements" className="module-card">
                  <h3>🔔 Notifications</h3>
                  <p>Send meeting reminders, announcements, and approval requests.</p>
                </Link>
                <Link to="/finance" className="module-card">
                  <h3>💰 Budget & Finance (Optional)</h3>
                  <p>View budgets, approve expenditures, and monitor Assembly finances.</p>
                </Link>
                <Link to="/audit-logs" className="module-card">
                  <h3>🛡️ Audit Logs</h3>
                  <p>Track all user activities for accountability and security.</p>
                </Link>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
