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
    description: 'Meet the elected officials and key personnel leading Siaya County Assembly, including the Speaker, Members of County Assembly (MCAs), and executive committee.',
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
    setIsLoggedIn(!!token);
    setUserRole(localStorage.getItem('userRole') || '');
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
          <h1>Welcome to the official Siaya County Assembly system</h1>
          <p>Explore county services, manage meetings, documents, attendance, visitors, interns and public feedback through one central platform.</p>
          <div className="hero-actions">
            <Link to="/login" className="hero-action">Secure Access</Link>
            <Link to="/faq" className="hero-action secondary">Explore Services</Link>
          </div>
        </div>
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
          <h3>Super Admin only</h3>
          <p>Only authorized users can register staff and edit the system.</p>
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

      <div className="info-grid">
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
      </div>

      <div className="card">
        <h1>Integrated County Assembly Management System</h1>
        <p>Streamline county operations with our comprehensive digital platform. Access all modules from the navigation above or explore the features below.</p>
      </div>

      {!isLoggedIn ? (
        <section className="unauthenticated-dashboard card">
          <h2>Secure access required</h2>
          <p>Dashboard modules and management tools are available only after logging in. Please sign in with your credentials to continue.</p>
          <Link to="/login" className="module-link">Log In</Link>
        </section>
      ) : (
        <>
          <div className="dashboard-grid">
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
          </div>

          {userRole === 'HR Officer' && (
            <section className="modules-section">
              <div className="section-header theme-green">
                <h2>👩‍💼 HR Officer Workspace</h2>
                <p>Use this workspace to manage staff records, attendance, leave, correspondence and HR administration from one dashboard.</p>
              </div>
              <div className="modules-grid">
                <div className="module-card">
                  <h3>📋 HR Records & Files</h3>
                  <p>Access staff files, employment records, reports and document workflows for filing, archiving and confidential HR administration.</p>
                  <Link to="/documents" className="module-link">Open Documents</Link>
                </div>
                <div className="module-card">
                  <h3>⏰ Attendance & Leave</h3>
                  <p>Monitor attendance, manage leave applications and maintain staff attendance registers for consistent reporting.</p>
                  <Link to="/attendance" className="module-link">Open Attendance</Link>
                </div>
                <div className="module-card">
                  <h3>💬 Staff Communications</h3>
                  <p>Prepare notices, circulate updates and manage internal correspondence through announcements and messages.</p>
                  <Link to="/messages" className="module-link">Open Messages</Link>
                </div>
                <div className="module-card">
                  <h3>👥 Recruitment & Staff Support</h3>
                  <p>Coordinate recruitment support, intern records, training documents and staff welfare-related activities from one place.</p>
                  <Link to="/interns" className="module-link">Open Interns</Link>
                </div>
              </div>
              <div className="card" style={{ marginTop: '1rem' }}>
                <h3>Core HR responsibilities</h3>
                <ul>
                  {hrResponsibilities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Governance & Operations */}
          <section className="modules-section">
            <div className="section-header theme-black">
              <h2>🏛️ Governance & Operations</h2>
              <p>Core assembly management and decision-making processes</p>
            </div>
            <div className="modules-grid">
              <div className="module-card">
                <h3>🏛️ Committee & Meetings</h3>
                <p>Schedule meetings, manage committees, track agendas and minutes, and coordinate room bookings efficiently.</p>
                <Link to="/meetings" className="module-link">Access Meetings</Link>
              </div>

              <div className="module-card">
                <h3>📄 Document Tracking</h3>
                <p>Manage incoming/outgoing documents, memos, bills, reports, and minutes with full workflow tracking and approval processes.</p>
                <Link to="/documents" className="module-link">Access Documents</Link>
              </div>
            </div>
          </section>

          {/* Staff & Workforce Management */}
          <section className="modules-section">
            <div className="section-header theme-green">
              <h2>👥 Staff & Workforce Management</h2>
              <p>Manage personnel, attendance, and human resources</p>
            </div>
            <div className="modules-grid">
              <div className="module-card">
                <h3>⏰ Attendance Management</h3>
                <p>Track staff and intern attendance, manage leave requests, and generate comprehensive attendance reports.</p>
                <Link to="/attendance" className="module-link">Access Attendance</Link>
              </div>

              <div className="module-card">
                <h3>🎓 Internship Management</h3>
                <p>Handle intern registration, placement, daily logbooks, supervisor reviews, and comprehensive evaluation reports.</p>
                <Link to="/interns" className="module-link">Access Internships</Link>
              </div>

              <div className="module-card">
                <h3>👥 Visitor Management</h3>
                <p>Register visitors, track entry/exit times, generate badges, and maintain security logs with real-time monitoring.</p>
                <Link to="/visitors" className="module-link">Access Visitors</Link>
              </div>
            </div>
          </section>

          {/* Resource Management */}
          <section className="modules-section">
            <div className="section-header theme-red">
              <h2>💼 Resource Management</h2>
              <p>Manage assets, equipment, and supply chain</p>
            </div>
            <div className="modules-grid">
              <div className="module-card">
                <h3>💼 Asset Management</h3>
                <p>Track ICT equipment, furniture, vehicles, and office supplies with maintenance logs and assignment records.</p>
                <Link to="/assets" className="module-link">Access Assets</Link>
              </div>

              <div className="module-card">
                <h3>� Finance & Budget</h3>
                <p>Prepare budgets, track expenditure, log payment approvals, and monitor procurement-linked financial summaries.</p>
                <Link to="/finance" className="module-link">Access Finance</Link>
              </div>

              <div className="module-card">
                <h3>�📋 Procurement</h3>
                <p>Manage tender notices, procurement opportunities, and contracts with full transparency and compliance tracking.</p>
                <Link to="/procurement" className="module-link">Access Procurement</Link>
              </div>
            </div>
          </section>

          {/* Support & Engagement */}
          <section className="modules-section">
            <div className="section-header theme-black">
              <h2>🤝 Support & Public Engagement</h2>
              <p>Citizen services and operational support</p>
            </div>
            <div className="modules-grid">
              <div className="module-card">
                <h3>🌐 Public Participation</h3>
                <p>Publish bills for public comment, collect feedback, manage event notices, and track public engagement summaries.</p>
                <Link to="/feedback" className="module-link">Access Public</Link>
              </div>

              <div className="module-card">
                <h3>🎫 Complaint/Helpdesk</h3>
                <p>Manage IT support tickets, maintenance requests, and general complaints with priority tracking and resolution.</p>
                <Link to="/tickets" className="module-link">Access Helpdesk</Link>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
