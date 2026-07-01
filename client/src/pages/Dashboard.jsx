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
    title: 'Procurement',
    logo: '📋',
    description: 'Access procurement opportunities, tender notices, and information on how to participate in county procurement processes and contracts.',
    path: '/procurement',
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
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');

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

    loadMeetings();
  }, [isLoggedIn]);

  return (
    <div className="dashboard">
      <section className="hero">
        <div className="hero-copy">
          <span>County Assembly of Siaya</span>
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

          {userRole === 'ICT Admin' && (
            <section className="modules-section">
              <div className="section-header theme-red">
                <h2>💻 ICT Head of Department Workspace</h2>
                <p>Use this workspace to oversee ICT infrastructure, support, cybersecurity, systems, and digital operations for the Assembly.</p>
              </div>
              <div className="modules-grid">
                <div className="module-card">
                  <h3>🛠️ ICT Operations</h3>
                  <p>Monitor systems, support requests, maintenance planning, devices and infrastructure health across the Assembly.</p>
                  <Link to="/tickets" className="module-link">Open Helpdesk</Link>
                </div>
                <div className="module-card">
                  <h3>📊 Systems & Reports</h3>
                  <p>Review reports, procurement links, digital platforms and workflow automation for day-to-day ICT administration.</p>
                  <Link to="/documents" className="module-link">Open Documents</Link>
                </div>
                <div className="module-card">
                  <h3>🔐 Security & Access</h3>
                  <p>Coordinate cybersecurity, access rights, audit visibility, backups and continuity planning for critical Assembly systems.</p>
                  <Link to="/audit-logs" className="module-link">Open Audit Logs</Link>
                </div>
                <div className="module-card">
                  <h3>📡 Digital Communication</h3>
                  <p>Support digital communication, website operations, announcements and coordinated public-facing ICT services.</p>
                  <Link to="/messages" className="module-link">Open Messages</Link>
                </div>
              </div>
              <div className="card" style={{ marginTop: '1rem' }}>
                <h3>Core ICT responsibilities</h3>
                <ul>
                  {ictResponsibilities.map((item) => (
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
