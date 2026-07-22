import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/UI/Button';
import api from '../services/api';
import {
  getHRDashboard,
  getEmployees,
  getVacancies,
  getApplications,
  getTrainings,
} from '../services/api';
import HRPreviewCard from '../components/HRPreviewCard';

const sectionLinks = [
  { title: 'Dashboard', path: '/hr', icon: '📊' },
  { title: 'Employees', path: '/manage-users', icon: '👥' },
  { title: 'Recruitment', path: '/announcements', icon: '💼' },
  { title: 'Leave Management', path: '/leave-summary', icon: '🌴' },
  { title: 'Attendance', path: '/attendance', icon: '⏱️' },
  { title: 'Performance Appraisal', path: '/hr-appraisals', icon: '📝' },
  { title: 'Training', path: '/manage-interns', icon: '🎓' },
  { title: 'Payroll Support', path: '/finance', icon: '💰' },
  { title: 'Staff Welfare', path: '/feedback', icon: '❤️' },
  { title: 'Internships & Attachments', path: '/attachees', icon: '🏢' },
  { title: 'Disciplinary Cases', path: '/documents', icon: '⚖️' },
  { title: 'Retirement & Exit', path: '/documents', icon: '🔒' },
  { title: 'Documents', path: '/documents', icon: '📁' },
  { title: 'Reports', path: '/documents', icon: '📄' },
  { title: 'Announcements', path: '/announcements', icon: '📣' },
  { title: 'Notifications', path: '/messages', icon: '🔔' },
  { title: 'Settings', path: '/manage-users', icon: '⚙️' },
];

const infoTiles = [
  { title: 'Add new employees', description: 'Create accounts, assign departments, and track staff status.' },
  { title: 'Promote & transfer', description: 'Move staff between departments and update roles.' },
  { title: 'Approve leave', description: 'Review leave requests and update balances.' },
  { title: 'Create vacancies', description: 'Publish roles and receive applications.' },
  { title: 'Shortlist candidates', description: 'Select applicants and schedule interviews.' },
  { title: 'Manage appraisals', description: 'Create forms, review performance, and recommend promotions.' },
  { title: 'Track attendance', description: 'Monitor attendance and approve adjustments.' },
  { title: 'Manage trainings', description: 'Register participants and record completion.' },
];

export default function HRPage() {
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    employeesOnLeave: 0,
    pendingLeaveRequests: 0,
    newApplications: 0,
    internsCount: 0,
    upcomingExpiries: 0,
    upcomingRetirements: 0,
  });
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [applications, setApplications] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);

  const vacancyPreview = vacancies.slice(0, 3);
  const applicationPreview = applications.slice(0, 3);
  const trainingPreview = trainings.slice(0, 3);

  useEffect(() => {
    const loadHRData = async () => {
      try {
        const [summaryRes, announcementsRes, employeeRes, vacancyRes, applicationRes, trainingRes] = await Promise.all([
          getHRDashboard(),
          api.get('/communications/announcements?limit=6'),
          getEmployees(),
          getVacancies(),
          getApplications(),
          getTrainings(),
        ]);

        setSummary(summaryRes.data || summary);
        setRecentAnnouncements(announcementsRes.data || []);
        setEmployees(employeeRes.data?.slice(0, 6) || []);
        setVacancies(vacancyRes.data || []);
        setApplications(applicationRes.data || []);
        setTrainings(trainingRes.data || []);

        const birthdays = (employeeRes.data || []).filter((emp) => emp.dateOfBirth).slice(0, 4);
        setUpcomingBirthdays(birthdays);
      } catch (err) {
        console.error('HR load failed', err);
      } finally {
        setLoading(false);
      }
    };

    loadHRData();
  }, []);

  return (
    <div className="hr-page">
      <aside className="hr-sidebar">
        <div className="hr-panel hr-panel--sticky">
          <h3>HR Module</h3>
          <p>Quick navigation to core HR sections and support tools.</p>
          <nav className="hr-nav">
            {sectionLinks.map((item) => (
              <Link key={item.title} to={item.path} className="hr-nav-link">
                <span className="hr-nav-icon">{item.icon}</span>
                <span>{item.title}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="hr-panel hr-panel--mini">
          <h4>Quick facts</h4>
          <ul>
            <li>{vacancies.length} Vacancy posts</li>
            <li>{applications.length} Applications</li>
            <li>{trainings.length} Training programs</li>
            <li>{recentAnnouncements.length} Recent announcements</li>
          </ul>
        </div>
      </aside>

      <main className="hr-main">
        <section className="hr-hero">
          <div>
            <span className="section-label">Human Resources</span>
            <h1>Complete HR operations from one central dashboard.</h1>
            <p>Manage employees, recruitment, leave, performance, attendance, training, welfare, discipline, and exit processing in one place.</p>
          </div>
          <div className="hr-hero-actions">
            <Link to="/manage-users"><Button variant="primary">Add Employee</Button></Link>
            <Link to="/hr-appraisals"><Button variant="secondary">Start Appraisal</Button></Link>
            <Link to="/leave-summary"><Button variant="secondary">Review Leaves</Button></Link>
          </div>
        </section>

        <section className="hr-summary-grid">
          <article className="hr-stat-card">
            <span>Total employees</span>
            <h2>{loading ? 'Loading…' : summary.totalEmployees}</h2>
          </article>
          <article className="hr-stat-card">
            <span>Employees on leave</span>
            <h2>{loading ? 'Loading…' : summary.employeesOnLeave}</h2>
          </article>
          <article className="hr-stat-card">
            <span>Pending leave requests</span>
            <h2>{loading ? 'Loading…' : summary.pendingLeaveRequests}</h2>
          </article>
          <article className="hr-stat-card">
            <span>New job applications</span>
            <h2>{loading ? 'Loading…' : summary.newApplications}</h2>
          </article>
          <article className="hr-stat-card">
            <span>Interns &amp; attachés</span>
            <h2>{loading ? 'Loading…' : summary.internsCount}</h2>
          </article>
          <article className="hr-stat-card">
            <span>Contract expiries (30d)</span>
            <h2>{loading ? 'Loading…' : summary.upcomingExpiries}</h2>
          </article>
          <article className="hr-stat-card">
            <span>Upcoming retirements (90d)</span>
            <h2>{loading ? 'Loading…' : summary.upcomingRetirements}</h2>
          </article>
          <article className="hr-stat-card">
            <span>Birthdays</span>
            <h2>{upcomingBirthdays.length || 'None'}</h2>
          </article>
        </section>

        <section className="hr-section">
            <div className="section-header">
              <div>
                <h2>Employee Management</h2>
                <p>Manage employees, transfers, promotions, suspensions, exits and employee profile documents.</p>
              </div>
            <Link to="/manage-users"><Button variant="secondary">Open employees</Button></Link>
          </div>

          <div className="hr-card-grid">
            <article className="hr-card">
              <h3>Add new employees</h3>
              <p>Create employee profiles, assign departments, roles and onboarding paperwork.</p>
            </article>
            <article className="hr-card">
              <h3>Edit employee information</h3>
              <p>Update contact details, roles, departments, and employee status for each profile.</p>
            </article>
            <article className="hr-card">
              <h3>Transfer & promote</h3>
              <p>Move staff between departments and promote employees to new positions.</p>
            </article>
            <article className="hr-card">
              <h3>Suspend & deactivate</h3>
              <p>Temporarily suspend staff or deactivate resigned and retired employees.</p>
            </article>
            <article className="hr-card">
              <h3>Upload documents</h3>
              <p>Store ID copies, certificates, contracts, appointment letters and performance reports.</p>
            </article>
          </div>
        </section>

        <section className="hr-section hr-section--split">
          <div>
            <div className="section-header">
              <div>
                <h2>Recruitment Management</h2>
                <p>Create vacancies, receive applications, shortlist candidates, schedule interviews and record decisions.</p>
              </div>
              <Link to="/announcements" className="btn btn-secondary">View announcements</Link>
            </div>
            <div className="hr-inner-grid">
              <HRPreviewCard
                title="Open vacancies"
                items={vacancyPreview}
                emptyMessage="No vacancies have been published yet."
                renderItem={(vacancy) => (
                  <>
                    <strong>{vacancy.title || 'Untitled role'}</strong>
                    <span>{vacancy.department?.name || 'Department not set'} • {vacancy.status || 'Draft'}</span>
                    <span>Deadline: {vacancy.closingDate ? new Date(vacancy.closingDate).toLocaleDateString() : 'TBD'}</span>
                  </>
                )}
                summary={`${vacancies.length} vacancy post${vacancies.length === 1 ? '' : 's'} total`}
              />

              <HRPreviewCard
                title="Recent applications"
                items={applicationPreview}
                emptyMessage="No recent applications available."
                renderItem={(application) => (
                  <>
                    <strong>{application.applicantName || 'Unnamed applicant'}</strong>
                    <span>{application.vacancy?.title || 'Position not specified'}</span>
                    <span>Status: {application.status || 'Pending'}</span>
                  </>
                )}
                summary={`${applications.length} application${applications.length === 1 ? '' : 's'} total`}
              />

              <div className="hr-card hr-summary-card">
                <h3>Shortlist pipeline</h3>
                <p>{applications.filter((app) => app.status === 'shortlisted').length} applicants currently shortlisted.</p>
                <p>{applications.filter((app) => app.status === 'interview_scheduled').length} applicants scheduled for interviews.</p>
              </div>

              <div className="hr-card hr-summary-card">
                <h3>Interview follow-up</h3>
                <p>Keep decision notes, upload interview feedback, and move chosen candidates to offer stage.</p>
                <p>{applicationPreview.length} applications shown.</p>
              </div>
            </div>
          </div>

          <div className="hr-panel hr-panel--secondary">
            <h4>Top recruitment actions</h4>
            <ol>
              <li>Create vacancy adverts and publish them.</li>
              <li>Receive and track online applications.</li>
              <li>Shortlist and schedule interviews.</li>
              <li>Record outcome and send appointment letters.</li>
            </ol>
          </div>
        </section>

        <section className="hr-section hr-section--split">
          <div>
            <div className="section-header">
              <div>
                <h2>Leave Management</h2>
                <p>Approve, reject, cancel leave, view calendars, track balances and generate leave reports.</p>
              </div>
              <Link to="/leave-summary" className="btn btn-secondary">Review leave</Link>
            </div>
            <div className="hr-card-grid">
              {['Annual Leave', 'Sick Leave', 'Maternity Leave', 'Paternity Leave', 'Compassionate Leave', 'Study Leave'].map((name) => (
                <article key={name} className="hr-card hr-card--small">
                  <h4>{name}</h4>
                </article>
              ))}
            </div>
          </div>

          <div className="hr-panel hr-panel--secondary">
            <h4>Leave workflow</h4>
            <ul>
              <li>Approvals and rejections with comments.</li>
              <li>Balance tracking by employee.</li>
              <li>Leave calendar visibility for HR planners.</li>
              <li>Leave report exports for payroll and audits.</li>
            </ul>
          </div>
        </section>

        <section className="hr-section hr-section--split">
          <div>
            <div className="section-header">
              <div>
                <h2>Performance Management</h2>
                <p>Create appraisal forms, assign reviews, score performance, and recommend promotions.</p>
              </div>
              <Link to="/hr-appraisals" className="btn btn-secondary">Open appraisals</Link>
            </div>
            <div className="hr-card-grid">
              <article className="hr-card">
                <h3>Appraisal forms</h3>
                <p>Define criteria and review templates for staff performance records.</p>
              </article>
              <article className="hr-card">
                <h3>Score employees</h3>
                <p>Store ratings, supervisor feedback, and promotion recommendations.</p>
              </article>
              <article className="hr-card">
                <h3>Performance reports</h3>
                <p>Generate reports for review cycles, training needs and promotion decisions.</p>
              </article>
            </div>
          </div>

          <div className="hr-panel hr-panel--secondary">
            <h4>Key metrics</h4>
            <p>Track appraisal status, overdue reviews, performance trends, and promotion readiness.</p>
          </div>
        </section>

        <section className="hr-section hr-section--split">
          <div>
            <div className="section-header">
              <div>
                <h2>Attendance & Training</h2>
                <p>Monitor attendance, corrections, training programs, participant tracking, and certificates.</p>
              </div>
            </div>
            <div className="hr-inner-grid">
              <article className="hr-card">
                <h3>Attendance monitoring</h3>
                <p>View lateness, absenteeism and approve corrections for payroll support.</p>
              </article>
              <HRPreviewCard
                title="Upcoming trainings"
                items={trainingPreview}
                emptyMessage="No training programs are scheduled currently."
                renderItem={(training) => (
                  <>
                    <strong>{training.title || 'Training session'}</strong>
                    <span>{training.description ? training.description.slice(0, 60) + (training.description.length > 60 ? '...' : '') : 'General training'}</span>
                    <span>Starts: {training.startDate ? new Date(training.startDate).toLocaleDateString() : 'TBD'}</span>
                  </>
                )}
                summary={`${trainings.length} program${trainings.length === 1 ? '' : 's'} total`}
              />
              <article className="hr-card">
                <h3>Certificates</h3>
                <p>Upload training certificates and capture evaluation results.</p>
              </article>
            </div>
          </div>

          <div className="hr-panel hr-panel--secondary">
            <h4>Training summary</h4>
            <p>{trainings.length} programs tracked, including completion status and participant evaluation.</p>
          </div>
        </section>

        <section className="hr-section hr-section--split">
          <div>
            <div className="section-header">
              <div>
                <h2>Staff Welfare, Payroll & Discipline</h2>
                <p>Support medical benefits, payroll data, disciplinary cases, welfare groups, and exit clearance.</p>
              </div>
            </div>
            <div className="hr-card-grid">
              <article className="hr-card hr-card--small">
                <h4>Payroll details</h4>
                <p>Salary, allowances, deductions and payroll export support.</p>
              </article>
              <article className="hr-card hr-card--small">
                <h4>Staff welfare</h4>
                <p>Record insurance, medical benefits, emergency support, and welfare requests.</p>
              </article>
              <article className="hr-card hr-card--small">
                <h4>Disciplinary cases</h4>
                <p>Log cases, warnings, hearings, suspensions and case closure details.</p>
              </article>
              <article className="hr-card hr-card--small">
                <h4>Retirement & exit</h4>
                <p>Process resignations, retirements, exit interviews and clearance forms.</p>
              </article>
            </div>
          </div>

          <div className="hr-panel hr-panel--secondary">
            <h4>Support objectives</h4>
            <ul>
              <li>Payroll data for finance handover.</li>
              <li>Staff welfare and emergency tracking.</li>
              <li>Disciplinary workflow and service exit management.</li>
              <li>Document archival and safe employee record keeping.</li>
            </ul>
          </div>
        </section>

        <section className="hr-section">
          <div className="section-header">
            <div>
              <h2>Recent HR announcements</h2>
              <p>Communications targeted to staff and departments.</p>
            </div>
            <Link to="/announcements" className="btn btn-secondary">View all announcements</Link>
          </div>
          <div className="hr-announcements">
            {recentAnnouncements.length === 0 ? (
              <p>No active announcements yet.</p>
            ) : (
              recentAnnouncements.map((announcement) => (
                <article key={announcement._id} className="hr-announcement-card">
                  <div>
                    <h3>{announcement.title}</h3>
                    <p>{announcement.body}</p>
                  </div>
                  <div className="announcement-meta">
                    <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                    <span>{announcement.createdBy?.name || 'HR'}</span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      <style>{`
        .hr-page {
          display: grid;
          grid-template-columns: minmax(260px, 280px) 1fr;
          gap: 1.75rem;
          padding: 1rem 0;
        }

        .hr-sidebar {
          display: grid;
          gap: 1.25rem;
        }

        .hr-panel {
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(15, 23, 42, 0.08);
          padding: 1.35rem;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.05);
        }

        .hr-panel--sticky {
          position: sticky;
          top: 1rem;
        }

        .hr-panel--mini ul,
        .hr-panel--secondary ul {
          list-style: inside disc;
          padding-left: 0.5rem;
          margin: 0.75rem 0 0;
          color: rgba(0, 0, 0, 0.78);
        }

        .hr-nav {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .hr-nav-link {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.85rem 1rem;
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.04);
          color: var(--text-primary);
          text-decoration: none;
          transition: background 0.2s ease;
        }

        .hr-nav-link:hover {
          background: rgba(15, 23, 42, 0.08);
        }

        .hr-nav-icon {
          min-width: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .hr-main {
          display: grid;
          gap: 1.75rem;
        }

        .hr-hero {
          display: grid;
          gap: 1.5rem;
          padding: 2rem;
          border-radius: 28px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(243, 244, 246, 0.98));
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: 0 22px 55px rgba(15, 23, 42, 0.06);
        }

        .section-label {
          display: inline-block;
          margin-bottom: 0.8rem;
          font-size: 0.82rem;
          color: var(--primary-color);
          text-transform: uppercase;
          letter-spacing: 0.15em;
          font-weight: 700;
        }

        .hr-hero h1 {
          margin: 0;
          font-size: clamp(2rem, 2.6vw, 2.55rem);
          line-height: 1.05;
        }

        .hr-hero p {
          margin: 0;
          color: var(--text-secondary);
          max-width: 760px;
          line-height: 1.75;
        }

        .hr-hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.85rem;
        }

        .hr-summary-grid,
        .hr-card-grid,
        .hr-inner-grid {
          display: grid;
          gap: 1rem;
        }

        .hr-summary-grid {
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        }

        .hr-stat-card {
          padding: 1.5rem;
          min-height: 150px;
          border-radius: 22px;
          background: linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96));
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: 0 18px 42px rgba(15, 23, 42, 0.05);
        }

        .hr-stat-card span {
          display: block;
          margin-bottom: 1.2rem;
          color: rgba(0,0,0,0.65);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 0.78rem;
          font-weight: 700;
        }

        .hr-stat-card h2 {
          margin: 0;
          font-size: 2rem;
          color: var(--text-primary);
        }

        .hr-section {
          display: grid;
          gap: 1rem;
        }

        .hr-section--split {
          grid-template-columns: 1.5fr 0.9fr;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .section-header h2 {
          margin: 0;
          font-size: 1.55rem;
          color: var(--text-primary);
        }

        .section-header p {
          margin: 0.4rem 0 0;
          color: var(--text-secondary);
          max-width: 720px;
          line-height: 1.7;
        }

        .hr-card-grid {
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }

        .hr-card,
        .hr-preview-card {
          padding: 1.4rem;
          border-radius: 20px;
          background: rgba(255,255,255,0.96);
          border: 1px solid rgba(15, 23, 42, 0.07);
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);
        }

        .hr-card h3,
        .hr-card h4,
        .hr-preview-card h3 {
          margin-top: 0;
          margin-bottom: 0.8rem;
          color: var(--text-primary);
        }

        .hr-preview-list {
          display: grid;
          gap: 0.9rem;
        }

        .hr-list-item {
          display: grid;
          gap: 0.3rem;
          padding: 0.95rem 0.8rem;
          border-radius: 16px;
          background: rgba(243, 244, 246, 0.9);
          border: 1px solid rgba(15, 23, 42, 0.06);
        }

        .hr-preview-summary {
          margin-top: 1rem;
          color: var(--text-secondary);
          font-size: 0.95rem;
          font-weight: 600;
        }

        .hr-card p {
          margin: 0;
          color: var(--text-secondary);
          line-height: 1.75;
        }

        .hr-card--small {
          min-height: 120px;
        }

        .hr-panel--secondary {
          background: rgba(15, 23, 42, 0.03);
          color: var(--text-primary);
        }

        .hr-panel--secondary h4 {
          margin-top: 0;
        }

        .hr-announcements {
          display: grid;
          gap: 1rem;
        }

        .hr-announcement-card {
          padding: 1.2rem 1.4rem;
          border-radius: 18px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(255,255,255,0.98);
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
        }

        .hr-announcement-card h3 {
          margin: 0 0 0.35rem;
          font-size: 1.1rem;
        }

        .hr-announcement-card p {
          margin: 0;
          color: var(--text-secondary);
          line-height: 1.75;
        }

        .announcement-meta {
          display: flex;
          justify-content: space-between;
          gap: 0.75rem;
          margin-top: 1rem;
          color: rgba(0,0,0,0.6);
          font-size: 0.92rem;
          flex-wrap: wrap;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.95rem 1.25rem;
          border-radius: 999px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          text-decoration: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
          color: white;
        }

        .btn-secondary {
          background: rgba(15,23,42,0.08);
          color: var(--text-primary);
        }

        .btn:hover {
          transform: translateY(-1px);
        }

        @media (max-width: 1080px) {
          .hr-page {
            grid-template-columns: 1fr;
          }

          .hr-section--split {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .hr-nav-link {
            padding: 0.75rem 0.85rem;
          }

          .hr-panel {
            padding: 1.1rem;
          }

          .hr-hero {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
