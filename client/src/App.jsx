import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Documents from './pages/Documents';
import Committees from './pages/Committees';
import Attendance from './pages/Attendance';
import Visitors from './pages/Visitors';
import Meetings from './pages/Meetings';
import LeaveSummaryPage from './pages/LeaveSummaryPage';
import AttendanceReports from './pages/AttendanceReports';
import ManageInterns from './pages/ManageInterns';
import Sessions from './pages/Sessions';
import LegislativeCore from './pages/LegislativeCore';
import Mcas from './pages/Mcas';
import Bills from './pages/Bills';
import Assets from './pages/Assets';
import Tickets from './pages/Tickets';
import Interns from './pages/Interns';
import Feedback from './pages/Feedback';
import Leaders from './pages/Leaders';
import Procurement from './pages/Procurement';
import ProcurementRequests from './pages/ProcurementRequests';
import MyRequests from './pages/MyRequests';
import Finance from './pages/Finance';
import FAQ from './pages/FAQ';
import MediaCenter from './pages/MediaCenter';
import MediaPost from './pages/MediaPost';
import Voting from './pages/Voting';
import Announcements from './pages/Announcements';
import Messages from './pages/Messages';
import Notifications from './pages/Notifications';
import ReportsDashboard from './pages/ReportsDashboard';
import AuditLogs from './pages/AuditLogs';
import ManageUsers from './pages/ManageUsers';
import ClerkDashboard from './pages/ClerkDashboard';
import Attachees from './pages/Attachees';
import NetworkDevices from './pages/NetworkDevices';
import HrAppraisals from './pages/HrAppraisals';
import HR from './pages/HR';
import Registry from './pages/Registry';
import Stores from './pages/Stores';
import AssemblyAssistant from './pages/AssemblyAssistant';
import AiTrainingCenter from './pages/AiTrainingCenter';
import SecurityCenter from './pages/SecurityCenter';
import IncidentDetails from './pages/IncidentDetails';
import Forbidden from './pages/Forbidden';
import PublicPortal from './pages/PublicPortal';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const isLoggedIn = !!localStorage.getItem('icamsToken');
  const showAssistantLauncher = isLoggedIn && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/public') && !window.location.pathname.startsWith('/register') && !window.location.pathname.startsWith('/verify-email');

  return (
    <div className="app-shell">
      {installPrompt && (
        <div style={{ background: '#0d6efd', color: '#fff', padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600 }}>
          Install this app for faster access on your device.
          <button type="button" onClick={handleInstallClick} style={{ marginLeft: '0.75rem', background: '#fff', color: '#0d6efd', border: 'none', borderRadius: '999px', padding: '0.35rem 0.8rem', cursor: 'pointer', fontWeight: 700 }}>
            Install
          </button>
        </div>
      )}
      <NavBar />
      {showAssistantLauncher && (
        <Link to="/assistant" className="global-assistant-launcher" title="Ask ICAMS" aria-label="Ask ICAMS">
          <span className="fab-icon">🎤</span>
          <span className="fab-label">Ask ICAMS</span>
        </Link>
      )}
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/public" element={<PublicPortal />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
          <Route path="/my-requests" element={<ProtectedRoute><MyRequests /></ProtectedRoute>} />
          <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
          <Route path="/visitors" element={<ProtectedRoute><Visitors /></ProtectedRoute>} />
          <Route path="/meetings" element={<ProtectedRoute><Meetings /></ProtectedRoute>} />
          <Route path="/sessions" element={<ProtectedRoute><Sessions /></ProtectedRoute>} />
          <Route path="/legislative-core" element={<ProtectedRoute><LegislativeCore /></ProtectedRoute>} />
          <Route path="/committees" element={<ProtectedRoute><Committees /></ProtectedRoute>} />
          <Route path="/mcas" element={<ProtectedRoute><Mcas /></ProtectedRoute>} />
          <Route path="/assets" element={<ProtectedRoute><Assets /></ProtectedRoute>} />
          <Route path="/tickets" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
          <Route path="/interns" element={<ProtectedRoute><Interns /></ProtectedRoute>} />
          <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
          <Route path="/leaders" element={<ProtectedRoute><Leaders /></ProtectedRoute>} />
          <Route path="/procurement" element={<ProtectedRoute allowedRoles={['Super Admin', 'Procurement Officer', 'Clerk']}><Procurement /></ProtectedRoute>} />
          <Route
            path="/procurement/registry"
            element={
              <ProtectedRoute allowedRoles={['Super Admin', 'Procurement Officer', 'Clerk']}>
                <Navigate to="/registry" replace />
              </ProtectedRoute>
            }
          />
          <Route path="/registry" element={<ProtectedRoute allowedRoles={['Registry','Super Admin','Procurement Officer','Clerk']}><Registry /></ProtectedRoute>} />
          <Route path="/procurement/requests" element={<ProtectedRoute allowedRoles={['Super Admin', 'Procurement Officer', 'Clerk']}><ProcurementRequests /></ProtectedRoute>} />
          <Route
            path="/procurement/stores"
            element={
              <ProtectedRoute allowedRoles={['Super Admin', 'Procurement Officer', 'Clerk']}>
                <Stores />
              </ProtectedRoute>
            }
          />
          <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
          <Route path="/bills" element={<ProtectedRoute><Bills /></ProtectedRoute>} />
          <Route path="/voting" element={<ProtectedRoute><Voting /></ProtectedRoute>} />
          <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><ReportsDashboard /></ProtectedRoute>} />
          <Route path="/public-reports" element={<ReportsDashboard publicView />} />
          <Route path="/audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
          <Route path="/manage-users" element={<ProtectedRoute><ManageUsers /></ProtectedRoute>} />
          <Route path="/assistant" element={<ProtectedRoute><AssemblyAssistant /></ProtectedRoute>} />
          <Route path="/ai-training-center" element={<ProtectedRoute allowedRoles={['Super Admin', 'ICT Admin']}><AiTrainingCenter /></ProtectedRoute>} />
          <Route path="/security-center" element={<ProtectedRoute allowedRoles={['Super Admin', 'ICT Admin', 'Security Officer']}><SecurityCenter /></ProtectedRoute>} />
          <Route path="/incident/:id" element={<ProtectedRoute allowedRoles={['Super Admin', 'ICT Admin', 'Security Officer']}><IncidentDetails /></ProtectedRoute>} />
          <Route path="/faq" element={<ProtectedRoute><FAQ /></ProtectedRoute>} />
          <Route path="/media" element={<ProtectedRoute><MediaCenter /></ProtectedRoute>} />
          <Route path="/media/:slug" element={<ProtectedRoute><MediaPost /></ProtectedRoute>} />
          <Route path="/clerk-dashboard" element={<ProtectedRoute><ClerkDashboard /></ProtectedRoute>} />
          <Route path="/leave-summary" element={<ProtectedRoute allowedRoles={["Super Admin","HR Officer"]}><LeaveSummaryPage /></ProtectedRoute>} />
          <Route path="/attendance-reports" element={<ProtectedRoute allowedRoles={["Super Admin","HR Officer"]}><AttendanceReports /></ProtectedRoute>} />
          <Route path="/manage-interns" element={<ProtectedRoute allowedRoles={["Super Admin","HR Officer"]}><ManageInterns /></ProtectedRoute>} />
          <Route path="/attachees" element={<ProtectedRoute><Attachees /></ProtectedRoute>} />
          <Route path="/network-devices" element={<ProtectedRoute><NetworkDevices /></ProtectedRoute>} />
          <Route path="/hr-appraisals" element={<ProtectedRoute><HrAppraisals /></ProtectedRoute>} />
          <Route path="/hr" element={<ProtectedRoute allowedRoles={["Super Admin","HR Officer"]}><HR /></ProtectedRoute>} />
          <Route path="/forbidden" element={<ProtectedRoute><Forbidden /></ProtectedRoute>} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
