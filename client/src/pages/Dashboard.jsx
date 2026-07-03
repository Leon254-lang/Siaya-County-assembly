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
    detail: 'Manage documents, attendance, meetings, and public feedback in one portal.',
  },
  {
    label: 'Meeting schedules',
    value: '8+',
    detail: 'View confirmed assembly and committee sittings with reminders and calendar access.',
  },
  {
    label: 'Public feedback',
    value: 'Open',
    detail: 'Receive and manage public participation enquiries and report submissions.',
  },
];

const imageFallback = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600"%3E%3Cdefs%3E%3ClinearGradient id="g" x1="0" y1="0" x2="1" y2="1"%3E%3Cstop offset="0" stop-color="%234f46e5"/%3E%3Cstop offset="1" stop-color="%2306b6d4"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="900" height="600" fill="url(%23g)"/%3E%3Ctext x="50%25" y="50%25" fill="%23ffffff" font-family="Inter, sans-serif" font-size="36" text-anchor="middle" dominant-baseline="middle"%3ESiaya County Assembly%3C/text%3E%3C/svg%3E';

const features = [
  {
    title: 'Citizen Services',
    description: 'Access public participation, feedback and notices from one central county portal.',
  },
  {
    title: 'Operational Transparency',
    description: 'Track meetings, documents and county workflows clearly and securely.',
  },
  {
    title: 'Staff Collaboration',
    description: 'Coordinate attendance, assets, visitors and intern management effortlessly.',
  },
  {
    title: 'Secure Administration',
    description: 'Manage sensitive records with role-based access and audit-ready reporting.',
  },
];

const quickLinks = [
  {
  title: 'Know Your Leaders',
  logo: '👥',
  description: 'Get to know the dedicated leaders serving the people of Siaya County. Access comprehensive profiles of the Speaker, MCAs, County Assembly committees, and key administrative officials. Learn about their responsibilities, leadership journeys, represented wards, ongoing initiatives, and contributions to policy-making, oversight, and community development. This platform promotes transparency, accountability, and citizen engagement by providing easy access to information about your elected and appointed leaders.',
  path: '/leaders',
},
  {
    title: 'Frequently Asked Questions',
    logo: '❓',
    description: 'Find answers to common questions about county services, procedures, and how to engage with the Siaya County Assembly.',
    path: '/faq',
  },
  {
    title: 'Media Center',
    logo: '📺',
    description: 'Stay updated with the latest news, press releases, events, and media resources from Siaya County Assembly.',
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
  const [departmentForm, setDepartmentForm] = useState({ name: '', description: '', modules: [] });
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
    { title: 'Start appraisal', icon: '📝', description: 'Generate a new appraisal for a staff member.', path: '/hr-appraisals' },
    { title: 'Review performance', icon: '✅', description: 'Mark appraisals as reviewed after manager approval.', path: '/hr-appraisals' },
    { title: 'View HR records', icon: '📁', description: 'Open the HR workspace for attendance and staff documents.', path: '/attendance' },
  ];

  const ictQuickActions = [
    { title: 'Add User', icon: '➕', description: 'Create a new staff account and assign a role.', path: '/manage-users?mode=create' },
    { title: 'Reset Password', icon: '🔑', description: 'Update a staff password from the user management screen.', path: '/manage-users?mode=reset' },
    { title: 'Register ICT Asset', icon: '🖥️', description: 'Register new computers, printers, scanners and related equipment.', path: '/network-devices' },
    { title: 'Backup Database', icon: '💾', description: 'Review the backup and continuity status from the administration workspace.', path: '/audit-logs' },
    { title: 'Restore Backup', icon: '↩️', description: 'Open the security and audit workspace to verify and restore backup history.', path: '/audit-logs' },
    { title: 'View Audit Logs', icon: '🧾', description: 'Review user actions, access changes and key system events.', path: '/audit-logs' },
    { title: 'Resolve Support Ticket', icon: '🛠️', description: 'Work through helpdesk issues and update ticket status.', path: '/tickets' },
    { title: 'Send Announcement', icon: '📢', description: 'Publish notices and internal communications to staff.', path: '/announcements' },
    { title: 'Generate Reports', icon: '📊', description: 'Open the reporting and document workspace for operational reports.', path: '/documents' },
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
    setDepartmentForm({ name: '', description: '', modules: [] });
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
        });
        setDepartmentMessage('Department updated successfully.');
      } else {
        await api.post('/departments', {
          name: departmentForm.name,
          description: departmentForm.description,
          modules: departmentForm.modules,
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
      description: 'Create, edit, activate or deactivate staff accounts, reset passwords and manage roles.',
      operations: ['Create accounts', 'Edit staff profiles', 'Reset passwords', 'Assign roles', 'Activate or disable access'],
      path: '/manage-users',
    },
    {
      title: 'Departments & Teams',
      icon: '🏛️',
      description: 'Add departments, assign users, transfer staff and maintain team structure.',
      operations: ['Add departments', 'Assign staff', 'Transfer staff', 'View departmental lists', 'Manage module access'],
      path: '/assets',
    },
    {
      title: 'Devices, Assets & Software',
      icon: '🖥️',
      description: 'Register computers, printers, scanners, software and track maintenance history.',
      operations: ['Register devices', 'Assign equipment', 'Track maintenance', 'Record disposal', 'Monitor inventory'],
      path: '/assets',
    },
    {
      title: 'Helpdesk & Support',
      icon: '🛠️',
      description: 'Receive ICT support requests, assign tickets, update status and close resolved issues.',
      operations: ['Create support tickets', 'Assign technicians', 'Track pending issues', 'Close resolved requests', 'Record maintenance reports'],
      path: '/tickets',
    },
    {
      title: 'Security, Audit & Backup',
      icon: '🔐',
      description: 'Review login history, audit entries, failed attempts and backup readiness from one place.',
      operations: ['Review audit logs', 'Monitor failed logins', 'View access activity', 'Track backup status', 'Manage security alerts'],
      path: '/audit-logs',
    },
    {
      title: 'Documents, Announcements & Reports',
      icon: '📁',
      description: 'Publish notices, manage official documents and generate operational reports.',
      operations: ['Upload templates', 'Publish announcements', 'Share notices', 'View document repository', 'Generate activity reports'],
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
          <h1>Secure digital access to assembly services, meetings, documents and citizen engagement</h1>
          <p>Manage county assembly operations, stay informed on sittings and announcements, and participate in public feedback from one central portal.</p>

          <div className="hero-actions">
            <Link to="/login" className="hero-action">Secure Access</Link>
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
          <p>Only authorized staff can register users, approve actions, and manage official records.</p>
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
          {userRole === 'Super Admin' && (
            <div className="quick-link-card">
              <div className="link-logo">👤</div>
              <h3>Manage Users</h3>
              <p>Update staff details, roles, status and remove user accounts from one secure control page.</p>
              <Link to="/manage-users" className="link-arrow">→</Link>
            </div>
          )}
          {(userRole === 'Super Admin' || userRole === 'ICT Admin') && (
            <div className="quick-link-card">
              <div className="link-logo">🛡️</div>
              <h3>Audit Logs</h3>
              <p>Review system activity, user operations, and audit entries for secure administration.</p>
              <Link to="/audit-logs" className="link-arrow">→</Link>
            </div>
          )}
        </div>
      </section>

      <div className="hero-feature-grid">
        <div className="info-card find-us-card">
          <h2>How to Find Us</h2>
          <p>Our offices are located at the Siaya County Assembly Complex, along Riat Road in Siaya town. We are centrally positioned for easy access by county staff, residents, and visitors.</p>
          <ul>
            <li>From Siaya town center: head east on Riat Road toward the county complex.</li>
            <li>From Kisumu: take the Kisumu–Siaya Highway and continue onto Riat Road after entering Siaya town.</li>
            <li>By public transport: use matatus and boda bodas serving Siaya town; ask for the County Assembly Complex stop.</li>
          </ul>
          <p><strong>Contact:</strong> +254 700 000 000 | <a href="mailto:info@siaya.go.ke">info@siaya.go.ke</a></p>
        </div>

        <div className="card summary-card">
          <h2>Integrated County Assembly Management System</h2>
          <p>Streamline county operations with our comprehensive digital platform. Access all modules from the navigation above or explore the features below.</p>
          <ul>
            <li>Single access point for documents, meetings, attendance and public participation.</li>
            <li>Role-based controls for secure administration and audit-ready workflows.</li>
            <li>Real-time updates for announcements, schedules and citizen feedback.</li>
          </ul>
          <div className="summary-actions">
            <Link to="/login" className="hero-action">Get Started</Link>
          </div>
        </div>
      </div>

      {!isLoggedIn ? (
        <section className="unauthenticated-dashboard card">
          <h2>Secure access required</h2>
          <p>Dashboard modules and management tools are available only after logging in. Please sign in with your credentials to continue.</p>
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
                <p>Use this workspace as your central operations center for user administration, ICT assets, support requests, security, backups and communications.</p>
              </div>

              <div className="dashboard-grid">
                <div className="dashboard-card">
                  <h3>Total users</h3>
                  <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-color)' }}>{ictOverview.totalUsers}</p>
                  <p>{ictOverview.activeUsers} active • {ictOverview.inactiveUsers} inactive</p>
                </div>
                <div className="dashboard-card">
                  <h3>Departments</h3>
                  <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-color)' }}>{ictOverview.departments}</p>
                  <p>Configured units for administration, finance, procurement, ICT and more.</p>
                </div>
                <div className="dashboard-card">
                  <h3>ICT assets</h3>
                  <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{ictOverview.assets}</p>
                  <p>Registered computers, printers, scanners and related equipment.</p>
                </div>
                <div className="dashboard-card">
                  <h3>Support queue</h3>
                  <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-color)' }}>{ictOverview.openTickets}</p>
                  <p>{ictOverview.resolvedTickets} resolved • {ictOverview.auditLogs} audit records</p>
                </div>
              </div>

              <div className="card" style={{ marginBottom: '1rem' }}>
                <h3>⚡ Quick Actions</h3>
                <p>These shortcuts give the ICT officer instant access to the most common administrative tasks.</p>
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
                <p>Create or update departments, review staff by department, and keep team assignments aligned.</p>
                {departmentMessage && <div className="message">{departmentMessage}</div>}
                <form onSubmit={handleDepartmentSubmit} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                  <label>
                    Department name
                    <input name="name" value={departmentForm.name} onChange={handleDepartmentInputChange} required />
                  </label>
                  <label>
                    Description
                    <input name="description" value={departmentForm.description} onChange={handleDepartmentInputChange} />
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
                <div style={{ marginTop: '1.5rem', display: 'grid', gap: '0.75rem' }}>
                  {departmentStaffGroups.length === 0 ? (
                    <p>No departments available yet.</p>
                  ) : departmentStaffGroups.map((department) => (
                    <div key={department._id} className="card" style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <strong>{department.name}</strong>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button type="button" onClick={() => startDepartmentEdit(department)} style={{ padding: '0.6rem 0.9rem' }}>Edit</button>
                          <Link to="/manage-users?mode=reset" className="module-link" style={{ marginTop: 0, padding: '0.6rem 0.9rem' }}>Assign Users</Link>
                        </div>
                      </div>
                      <p style={{ margin: '0.3rem 0 0.7rem' }}>{department.description || 'Department records are active.'}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {department.users.length === 0 ? (
                          <span style={{ color: 'var(--text-secondary)' }}>No assigned staff yet.</span>
                        ) : department.users.map((user) => (
                          <span key={user._id} style={{ padding: '0.35rem 0.6rem', background: '#f8fafc', borderRadius: '999px' }}>{user.name}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ marginBottom: '1rem' }}>
                <h3>⚙️ System Administration</h3>
                <p>Enable modules, configure email and SMS notifications, set password policy, and adjust session timeout settings.</p>
                <form onSubmit={handleAdministrationSave} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input type="checkbox" checked={adminSettings.systemSettings} onChange={(event) => setAdminSettings((prev) => ({ ...prev, systemSettings: event.target.checked }))} />
                    Enable core system settings
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input type="checkbox" checked={adminSettings.modulesEnabled} onChange={(event) => setAdminSettings((prev) => ({ ...prev, modulesEnabled: event.target.checked }))} />
                    Enable application modules
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input type="checkbox" checked={adminSettings.emailNotifications} onChange={(event) => setAdminSettings((prev) => ({ ...prev, emailNotifications: event.target.checked }))} />
                    Email notifications
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input type="checkbox" checked={adminSettings.smsNotifications} onChange={(event) => setAdminSettings((prev) => ({ ...prev, smsNotifications: event.target.checked }))} />
                    SMS notifications
                  </label>
                  <label>
                    Password policy
                    <select value={adminSettings.passwordPolicy} onChange={(event) => setAdminSettings((prev) => ({ ...prev, passwordPolicy: event.target.value }))}>
                      <option value="Standard">Standard</option>
                      <option value="Strong">Strong</option>
                      <option value="Very Strong">Very Strong</option>
                    </select>
                  </label>
                  <label>
                    Session timeout (minutes)
                    <select value={adminSettings.sessionTimeout} onChange={(event) => setAdminSettings((prev) => ({ ...prev, sessionTimeout: event.target.value }))}>
                      <option value="15">15</option>
                      <option value="30">30</option>
                      <option value="60">60</option>
                      <option value="120">120</option>
                    </select>
                  </label>
                  <button type="submit">Save administration settings</button>
                </form>
              </div>

              <div className="card" style={{ marginBottom: '1rem' }}>
                <h3>📄 Document & File Operations</h3>
                <p>Create official templates, notices, or templates for storage and share them with departments.</p>
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

              <div className="card" style={{ marginTop: '1rem' }}>
                <h3>📌 ICT Officer Mandate & Responsibilities</h3>
                <p>This workspace supports the ICT Officer’s core mandate for planning infrastructure, managing networks, securing systems and supporting Assembly operations.</p>
                <ul>
                  {ictResponsibilities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {['HR Officer', 'Super Admin'].includes(userRole) && (
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
              <div className="card">
                <h3>HR responsibilities</h3>
                <ul>
                  {hrResponsibilities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
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
