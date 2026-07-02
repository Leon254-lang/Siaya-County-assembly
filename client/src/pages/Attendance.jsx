import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Attendance() {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendance');
  const [showCheckInOut, setShowCheckInOut] = useState(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [currentAttendance, setCurrentAttendance] = useState(null);

  const normalizeRole = (value) => {
    if (typeof value === 'string') return value.trim();
    if (value && typeof value === 'object') return value.name || value.role || '';
    return '';
  };

  const canViewFullAttendance = ['Super Admin', 'HR Officer'].includes(normalizeRole(localStorage.getItem('userRole') || JSON.parse(localStorage.getItem('user') || 'null')?.role || ''));

  // Filters and pagination
  const [filters, setFilters] = useState({
    userType: '',
    status: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0
  });

  // Forms
  const [checkInOutForm, setCheckInOutForm] = useState({
    method: 'manual',
    location: '',
    breakTime: 0,
    latitude: null,
    longitude: null
  });

  const [geoLocation, setGeoLocation] = useState({
    latitude: null,
    longitude: null,
    distance: null,
    status: 'not-detected',
    error: ''
  });

  const [leaveForm, setLeaveForm] = useState({
    type: 'annual',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const ASSEMBLY_PREMISES = {
    latitude: 0.0626,
    longitude: 34.2878,
    radiusMeters: 3000
  };

  const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371000; // metres
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const isWithinPremises = (latitude, longitude) => {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return false;
    return getDistanceFromLatLonInMeters(
      latitude,
      longitude,
      ASSEMBLY_PREMISES.latitude,
      ASSEMBLY_PREMISES.longitude
    ) <= ASSEMBLY_PREMISES.radiusMeters;
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGeoLocation({
        latitude: null,
        longitude: null,
        distance: null,
        status: 'error',
        error: 'Geolocation is not supported by your browser.'
      });
      return;
    }

    setGeoLocation(prev => ({ ...prev, status: 'locating', error: '' }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const distance = getDistanceFromLatLonInMeters(
          latitude,
          longitude,
          ASSEMBLY_PREMISES.latitude,
          ASSEMBLY_PREMISES.longitude
        );
        const inside = distance <= ASSEMBLY_PREMISES.radiusMeters;

        setGeoLocation({
          latitude,
          longitude,
          distance,
          status: inside ? 'inside' : 'outside',
          error: inside ? '' : `You are outside the Siaya County Assembly premises (${Math.round(distance)}m away).`
        });
        setCheckInOutForm(prev => ({
          ...prev,
          latitude,
          longitude
        }));
      },
      (error) => {
        setGeoLocation({
          latitude: null,
          longitude: null,
          distance: null,
          status: 'error',
          error: error.message || 'Unable to detect your location.'
        });
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendanceRecords();
    } else if (activeTab === 'leave') {
      fetchLeaveRequests();
    }
    checkCurrentAttendance();
  }, [activeTab, filters, pagination.currentPage]);

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...filters,
        page: pagination.currentPage,
        limit: 10
      });

      const response = await api.get(`/attendance?${params}`);
      setAttendanceRecords(response.data.records);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch attendance records:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.currentPage,
        limit: 10
      });

      const response = await api.get(`/leave?${params}`);
      setLeaveRequests(response.data.requests);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkCurrentAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.get(`/attendance?date=${today}`);
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const todayRecord = response.data.records.find((record) => record.user?._id === (currentUser.id || currentUser._id));
      setCurrentAttendance(todayRecord);
    } catch (error) {
      console.error('Failed to check current attendance:', error);
    }
  };

  const handleCheckIn = async () => {
    if (!checkInOutForm.latitude || !checkInOutForm.longitude) {
      alert('Location is required. Please verify your device location before checking in.');
      return;
    }

    if (!isWithinPremises(checkInOutForm.latitude, checkInOutForm.longitude)) {
      alert('You must be within the Siaya County Assembly premises to sign in.');
      return;
    }

    try {
      const response = await api.post('/attendance/checkin', checkInOutForm);
      setCurrentAttendance(response.data);
      setShowCheckInOut(false);
      fetchAttendanceRecords();
      alert('Checked in successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    if (!checkInOutForm.latitude || !checkInOutForm.longitude) {
      alert('Location is required. Please verify your device location before checking out.');
      return;
    }

    if (!isWithinPremises(checkInOutForm.latitude, checkInOutForm.longitude)) {
      alert('You must be within the Siaya County Assembly premises to sign out.');
      return;
    }

    try {
      const response = await api.post('/attendance/checkout', checkInOutForm);
      setCurrentAttendance(response.data);
      setShowCheckInOut(false);
      fetchAttendanceRecords();
      alert('Checked out successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Check-out failed');
    }
  };

  const handleGenerateQR = async () => {
    try {
      const response = await api.post('/attendance/generate-qr', { expiresIn: 24 });
      setQrCode(response.data);
      alert('QR code generated successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'QR generation failed');
    }
  };

  const handleLeaveRequest = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leave', leaveForm);
      setShowLeaveForm(false);
      setLeaveForm({
        type: 'annual',
        startDate: '',
        endDate: '',
        reason: ''
      });
      fetchLeaveRequests();
      alert('Leave request submitted successfully!');
    } catch (error) {
      alert(error.response?.data?.message || 'Leave request failed');
    }
  };

  const handleLeaveAction = async (leaveId, action) => {
    const comments = prompt(`Comments for ${action}:`);
    if (comments === null) return;

    try {
      await api.post(`/leave/${leaveId}/${action}`, { comments });
      fetchLeaveRequests();
      alert(`Leave request ${action}d successfully!`);
    } catch (error) {
      alert(error.response?.data?.message || `Leave ${action} failed`);
    }
  };

  const generateReport = async () => {
    try {
      const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
      const endDate = new Date(filters.year, filters.month, 0).toISOString().split('T')[0];

      const response = await api.get(`/attendance/report?startDate=${startDate}&endDate=${endDate}`);
      setShowReport(response.data);
    } catch (error) {
      alert('Failed to generate report');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      present: '#10b981',
      absent: '#ef4444',
      leave: '#f59e0b',
      remote: '#8b5cf6',
      partial: '#f97316',
      late: '#f59e0b'
    };
    return colors[status] || '#6b7280';
  };

  const getLeaveStatusColor = (status) => {
    const colors = {
      pending: '#f59e0b',
      approved: '#10b981',
      rejected: '#ef4444',
      cancelled: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  if (loading && attendanceRecords.length === 0 && leaveRequests.length === 0) {
    return <div className="card"><p>Loading...</p></div>;
  }

  return (
    <div>
      <div className="card">
        <h1>⏰ Attendance Management System</h1>
        <p>Track daily attendance, manage leave requests, and generate comprehensive reports for staff, interns, and MCAs.</p>

        {/* Current Status */}
        <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
          <h3>Today's Status</h3>
          {currentAttendance ? (
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <div>
                <strong>Status:</strong>
                <span style={{
                  background: getStatusColor(currentAttendance.status),
                  color: 'white',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  marginLeft: '0.5rem'
                }}>
                  {currentAttendance.status.replace('_', ' ')}
                </span>
              </div>
              {currentAttendance.checkIn?.time && (
                <div>
                  <strong>Check-in:</strong> {new Date(currentAttendance.checkIn.time).toLocaleTimeString()}
                </div>
              )}
              {currentAttendance.checkOut?.time && (
                <div>
                  <strong>Check-out:</strong> {new Date(currentAttendance.checkOut.time).toLocaleTimeString()}
                </div>
              )}
              {currentAttendance.workingHours && (
                <div>
                  <strong>Hours:</strong> {currentAttendance.workingHours.toFixed(2)}h
                </div>
              )}
            </div>
          ) : (
            <p>No attendance record for today</p>
          )}
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #e5e7eb' }}>
          <button
            onClick={() => setActiveTab('attendance')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: activeTab === 'attendance' ? '#3b82f6' : 'transparent',
              color: activeTab === 'attendance' ? 'white' : '#374151',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            📊 Attendance
          </button>
          <button
            onClick={() => setActiveTab('leave')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: activeTab === 'leave' ? '#3b82f6' : 'transparent',
              color: activeTab === 'leave' ? 'white' : '#374151',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            📅 Leave Management
          </button>
        </div>

        {/* Action Buttons */}
        <div className="module-actions" style={{ marginBottom: '2rem' }}>
          {activeTab === 'attendance' && (
            <>
              <button onClick={() => setShowCheckInOut(true)}>
                {currentAttendance?.checkIn?.time && !currentAttendance?.checkOut?.time ? '🚪 Check Out' : '🚪 Check In/Out'}
              </button>
              <button onClick={handleGenerateQR}>📱 Generate QR Code</button>
              {canViewFullAttendance && <button onClick={generateReport}>📈 Generate Report</button>}
            </>
          )}
          {activeTab === 'leave' && (
            <>
              <button onClick={() => setShowLeaveForm(true)}>📝 Request Leave</button>
              <button onClick={fetchLeaveRequests}>🔄 Refresh</button>
            </>
          )}
        </div>

        {/* Filters */}
        <div style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
          <select
            value={filters.userType}
            onChange={(e) => setFilters({...filters, userType: e.target.value})}
            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
          >
            <option value="">All User Types</option>
            <option value="staff">Staff</option>
            <option value="intern">Intern</option>
            <option value="mca">MCA</option>
            <option value="visitor">Visitor</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
          >
            <option value="">All Status</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="leave">Leave</option>
            <option value="remote">Remote</option>
            <option value="partial">Partial</option>
            <option value="late">Late</option>
          </select>

          <select
            value={filters.month}
            onChange={(e) => setFilters({...filters, month: parseInt(e.target.value)})}
            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
          >
            {Array.from({length: 12}, (_, i) => (
              <option key={i+1} value={i+1}>
                {new Date(0, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>

          <select
            value={filters.year}
            onChange={(e) => setFilters({...filters, year: parseInt(e.target.value)})}
            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
          >
            {Array.from({length: 5}, (_, i) => (
              <option key={i} value={new Date().getFullYear() - 2 + i}>
                {new Date().getFullYear() - 2 + i}
              </option>
            ))}
          </select>
        </div>

        {/* Attendance Records */}
        {activeTab === 'attendance' && (
          <div className="attendance-list">
            {attendanceRecords.length === 0 ? (
              <p>No attendance records found.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Hours</th>
                    <th>Method</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map(record => (
                    <tr key={record._id}>
                      <td>{record.user?.name || 'Unknown'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{record.userType}</td>
                      <td>{new Date(record.date).toLocaleDateString()}</td>
                      <td>
                        <span style={{
                          background: getStatusColor(record.status),
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.875rem'
                        }}>
                          {record.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        {record.checkIn?.time ? new Date(record.checkIn.time).toLocaleTimeString() : '-'}
                        {record.checkIn?.method && (
                          <small style={{ display: 'block', color: '#6b7280' }}>
                            {record.checkIn.method.replace('_', ' ')}
                          </small>
                        )}
                      </td>
                      <td>
                        {record.checkOut?.time ? new Date(record.checkOut.time).toLocaleTimeString() : '-'}
                        {record.checkOut?.method && (
                          <small style={{ display: 'block', color: '#6b7280' }}>
                            {record.checkOut.method.replace('_', ' ')}
                          </small>
                        )}
                      </td>
                      <td>{record.workingHours ? `${record.workingHours.toFixed(2)}h` : '-'}</td>
                      <td>
                        {record.checkIn?.method === record.checkOut?.method
                          ? record.checkIn?.method?.replace('_', ' ')
                          : `${record.checkIn?.method?.replace('_', ' ') || '-'} / ${record.checkOut?.method?.replace('_', ' ') || '-'}`
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Leave Requests */}
        {activeTab === 'leave' && (
          <div className="leave-list">
            {leaveRequests.length === 0 ? (
              <p>No leave requests found.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Type</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveRequests.map(request => (
                    <tr key={request._id}>
                      <td>{request.user?.name || 'Unknown'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{request.type}</td>
                      <td>{new Date(request.startDate).toLocaleDateString()}</td>
                      <td>{new Date(request.endDate).toLocaleDateString()}</td>
                      <td>{request.daysRequested}</td>
                      <td>
                        <span style={{
                          background: getLeaveStatusColor(request.status),
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.875rem'
                        }}>
                          {request.status}
                        </span>
                      </td>
                      <td>
                        {request.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleLeaveAction(request._id, 'approve')}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                            >
                              ✅ Approve
                            </button>
                            <button
                              onClick={() => handleLeaveAction(request._id, 'reject')}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                            >
                              ❌ Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setPagination({...pagination, currentPage: pagination.currentPage - 1})}
              disabled={!pagination.hasPrev}
              style={{ padding: '0.5rem 1rem', borderRadius: '4px' }}
            >
              Previous
            </button>
            <span style={{ padding: '0.5rem', alignSelf: 'center' }}>
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination({...pagination, currentPage: pagination.currentPage + 1})}
              disabled={!pagination.hasNext}
              style={{ padding: '0.5rem 1rem', borderRadius: '4px' }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Check In/Out Modal */}
      {showCheckInOut && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h2>
              {currentAttendance?.checkIn?.time && !currentAttendance?.checkOut?.time ? 'Check Out' : 'Check In'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <select
                value={checkInOutForm.method}
                onChange={(e) => setCheckInOutForm({...checkInOutForm, method: e.target.value})}
                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
              >
                <option value="manual">Manual</option>
                <option value="fingerprint">Fingerprint</option>
                <option value="qr_code">QR Code</option>
                <option value="card">Card</option>
                <option value="face_recognition">Face Recognition</option>
              </select>

              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <button
                  onClick={detectLocation}
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #3b82f6', background: '#3b82f6', color: 'white', cursor: 'pointer' }}
                >
                  Verify Device Location
                </button>

                <div style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f8fafc' }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>Location status</p>
                  {geoLocation.status === 'locating' && <p style={{ margin: '0.5rem 0' }}>Detecting location…</p>}
                  {geoLocation.status === 'inside' && (
                    <p style={{ margin: '0.5rem 0', color: '#047857' }}>
                      Location detected inside the assembly premises.
                      {geoLocation.distance != null && ` (${Math.round(geoLocation.distance)}m from assembly center)`}
                    </p>
                  )}
                  {geoLocation.status === 'outside' && (
                    <p style={{ margin: '0.5rem 0', color: '#b91c1c' }}>{geoLocation.error}</p>
                  )}
                  {geoLocation.status === 'error' && (
                    <p style={{ margin: '0.5rem 0', color: '#b91c1c' }}>{geoLocation.error}</p>
                  )}
                  {geoLocation.status === 'inside' && (
                    <p style={{ margin: '0.5rem 0', color: '#047857' }}>
                      Location is inside the allowed premises. Current position: {geoLocation.latitude?.toFixed(6)}, {geoLocation.longitude?.toFixed(6)}.
                      {geoLocation.distance != null && ` Distance from center: ${Math.round(geoLocation.distance)}m.`}
                    </p>
                  )}
                  {geoLocation.status === 'not-detected' && (
                    <p style={{ margin: '0.5rem 0' }}>Location must be enabled on your device before you can sign attendance.</p>
                  )}
                </div>

                <input
                  type="text"
                  placeholder="Optional address or landmark"
                  value={checkInOutForm.location}
                  onChange={(e) => setCheckInOutForm({...checkInOutForm, location: e.target.value})}
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
              </div>

              {currentAttendance?.checkIn?.time && !currentAttendance?.checkOut?.time && (
                <input
                  type="number"
                  placeholder="Break time (minutes)"
                  value={checkInOutForm.breakTime}
                  onChange={(e) => setCheckInOutForm({...checkInOutForm, breakTime: parseInt(e.target.value) || 0})}
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowCheckInOut(false)}>Cancel</button>
                <button
                  onClick={currentAttendance?.checkIn?.time && !currentAttendance?.checkOut?.time ? handleCheckOut : handleCheckIn}
                  disabled={geoLocation.status !== 'inside'}
                  style={{ opacity: geoLocation.status !== 'inside' ? 0.6 : 1 }}
                >
                  {currentAttendance?.checkIn?.time && !currentAttendance?.checkOut?.time ? 'Check Out' : 'Check In'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Request Modal */}
      {showLeaveForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2>Request Leave</h2>
            <form onSubmit={handleLeaveRequest}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <select
                  value={leaveForm.type}
                  onChange={(e) => setLeaveForm({...leaveForm, type: e.target.value})}
                  required
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                >
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="maternity">Maternity Leave</option>
                  <option value="paternity">Paternity Leave</option>
                  <option value="emergency">Emergency Leave</option>
                  <option value="study">Study Leave</option>
                  <option value="compassionate">Compassionate Leave</option>
                </select>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({...leaveForm, startDate: e.target.value})}
                    required
                    style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                  <input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({...leaveForm, endDate: e.target.value})}
                    required
                    style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <textarea
                  placeholder="Reason for leave"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({...leaveForm, reason: e.target.value})}
                  required
                  rows="3"
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowLeaveForm(false)}>Cancel</button>
                  <button type="submit">Submit Request</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrCode && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center'
          }}>
            <h2>QR Code Generated</h2>
            <div style={{
              background: '#f8fafc',
              padding: '1rem',
              borderRadius: '8px',
              margin: '1rem 0',
              fontFamily: 'monospace',
              fontSize: '1.2rem',
              wordBreak: 'break-all'
            }}>
              {qrCode.qrCode}
            </div>
            <p><strong>Expires:</strong> {new Date(qrCode.expiresAt).toLocaleString()}</p>
            <p>Use this QR code for attendance check-in/check-out</p>
            <button onClick={() => setQrCode(null)} style={{ marginTop: '1rem' }}>Close</button>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>Attendance Report - {filters.month}/{filters.year}</h2>
              <button onClick={() => setShowReport(false)}>✕</button>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {showReport.map((userReport, index) => (
                <div key={index} style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <h3>{userReport.user.name}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                    <div><strong>Present:</strong> {userReport.summary.present}</div>
                    <div><strong>Absent:</strong> {userReport.summary.absent}</div>
                    <div><strong>Leave:</strong> {userReport.summary.leave}</div>
                    <div><strong>Late:</strong> {userReport.summary.late}</div>
                    <div><strong>Total Hours:</strong> {userReport.summary.totalHours.toFixed(2)}h</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}