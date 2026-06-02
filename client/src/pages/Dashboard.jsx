import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const heroImages = [
  {
    src: '/siaya-county-speaker.jpg',
    alt: 'Siaya county assembly speaker',
  },
  {
    src: '/a-800x650.jpg',
    alt: 'County assembly office exterior',
  },
  {
    src: '/c-800x650.jpg',
    alt: 'County assembly meeting room',
  },
  {
    src: 'https://siayaassembly.go.ke/wp-content/uploads/2024/01/WhatsApp-Image-2024-01-19-at-12.50.04-PM-240x300.jpeg',
    alt: 'Speaker George Owino Okode',
  },
  {
    src: 'https://siayaassembly.go.ke/wp-content/uploads/2017/09/promotion-performance-review-ringsidetalent-1024x683.jpg',
    alt: 'County assembly performance review',
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

const formatDateTime = (value) => {
  if (!value) return 'TBD';
  return new Date(value).toLocaleString();
};

export default function Dashboard() {
  const [nextMeetings, setNextMeetings] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);

  useEffect(() => {
    const loadMeetings = async () => {
      setLoadingMeetings(true);
      try {
        const [meetingsRes, remindersRes] = await Promise.all([
          api.get('/meetings?upcoming=true'),
          api.get('/meetings/reminders'),
        ]);
        setNextMeetings(meetingsRes.data.slice(0, 6));
        setReminders(remindersRes.data);
      } catch (error) {
        console.error('Failed to load dashboard meetings', error);
      } finally {
        setLoadingMeetings(false);
      }
    };

    loadMeetings();
  }, []);

  return (
    <div className="dashboard">
      <section className="hero">
        <div className="hero-copy">
          <span>County Assembly of Siaya</span>
          <h1>Welcome to the official Siaya County Assembly system</h1>
          <p>Explore county services, manage meetings, documents, attendance, visitors, interns and public feedback through one central platform.</p>
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

      {/* Governance & Operations */}
      <section className="modules-section">
        <div className="section-header">
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
        <div className="section-header">
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
        <div className="section-header">
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
        <div className="section-header">
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

      {/* Removed duplicate About Us section to avoid repetition with footer */}

      <footer className="site-footer">
        <div className="footer-inner app-main">
          <div className="footer-columns">
            <div className="footer-column about-foot">
              <h4>About Us</h4>
              <p>Siaya County Assembly management system provides secure access to documents, meetings, attendance, visitors, assets, and public feedback in one convenient portal.</p>
            </div>

            <div className="footer-column quicklinks-foot">
              <h4>Quick Links</h4>
              <ul>
                <li><Link to="/dashboard">Dashboard</Link></li>
                <li><Link to="/leaders">Know Your Leaders</Link></li>
                <li><Link to="/documents">Documents</Link></li>
                <li><Link to="/feedback">Public Feedback</Link></li>
              </ul>
            </div>

            <div className="footer-column importantlinks-foot">
              <h4>Important Links</h4>
              <ul>
                <li><a href="https://siayaassembly.go.ke/" target="_blank" rel="noopener noreferrer">Siaya Assembly Official Website</a></li>
                <li><a href="https://siayaassembly.go.ke/the-speakers-office/" target="_blank" rel="noopener noreferrer">Speaker’s Office</a></li>
                <li><a href="https://siayaassembly.go.ke/contact-us/" target="_blank" rel="noopener noreferrer">Contact Us</a></li>
                <li><a href="https://siayaassembly.go.ke/procurement/" target="_blank" rel="noopener noreferrer">Procurement</a></li>
              </ul>
            </div>

            <div className="footer-column recentposts-foot">
              <h4>Recent Posts</h4>
              <ul>
                <li><a href="https://siayaassembly.go.ke/2026/04/29/7848/" target="_blank" rel="noopener noreferrer">HOUSE APPROVES NOMINEES TO VARIOUS EXECUTIVE POSITIONS</a></li>
                <li><a href="https://siayaassembly.go.ke/2026/04/28/approval-hearing-for-the-cecm-nominees/" target="_blank" rel="noopener noreferrer">APPROVAL HEARING FOR THE NOMINEES IN THE POSITIONS OF CECM</a></li>
                <li><a href="https://siayaassembly.go.ke/2026/04/28/vetting-of-chief-officer-nominees/" target="_blank" rel="noopener noreferrer">VETTING OF GOVERNORS’ NOMINEES FOR THE POSITION OF CHIEF OFFICERS</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <small>© 2024 Siaya County Assembly. All rights reserved. Contact: <a href="mailto:clerk@siayaassembly.go.ke">clerk@siayaassembly.go.ke</a> | Phone: 057 5321021</small>
          </div>
        </div>
      </footer>
    </div>
  );
}
