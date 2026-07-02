import { Routes, Route, Navigate } from 'react-router-dom';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Documents from './pages/Documents';
import Committees from './pages/Committees';
import Attendance from './pages/Attendance';
import Visitors from './pages/Visitors';
import Meetings from './pages/Meetings';
import Sessions from './pages/Sessions';
import Mcas from './pages/Mcas';
import Bills from './pages/Bills';
import Assets from './pages/Assets';
import Tickets from './pages/Tickets';
import Interns from './pages/Interns';
import Feedback from './pages/Feedback';
import Leaders from './pages/Leaders';
import Procurement from './pages/Procurement';
import Finance from './pages/Finance';
import FAQ from './pages/FAQ';
import MediaCenter from './pages/MediaCenter';
import MediaPost from './pages/MediaPost';
import Voting from './pages/Voting';
import Announcements from './pages/Announcements';
import Messages from './pages/Messages';
import AuditLogs from './pages/AuditLogs';
import ManageUsers from './pages/ManageUsers';
import ClerkDashboard from './pages/ClerkDashboard';
import Attachees from './pages/Attachees';
import NetworkDevices from './pages/NetworkDevices';
import HrAppraisals from './pages/HrAppraisals';

function App() {
  return (
    <div className="app-shell">
      <NavBar />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/visitors" element={<Visitors />} />
          <Route path="/meetings" element={<Meetings />} />
          <Route path="/sessions" element={<Sessions />} />
          <Route path="/committees" element={<Committees />} />
          <Route path="/mcas" element={<Mcas />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/interns" element={<Interns />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/leaders" element={<Leaders />} />
          <Route path="/procurement" element={<Procurement />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/voting" element={<Voting />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/manage-users" element={<ManageUsers />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/media" element={<MediaCenter />} />
          <Route path="/media/:slug" element={<MediaPost />} />
          <Route path="/clerk-dashboard" element={<ClerkDashboard />} />
          <Route path="/attachees" element={<Attachees />} />
          <Route path="/network-devices" element={<NetworkDevices />} />
          <Route path="/hr-appraisals" element={<HrAppraisals />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
