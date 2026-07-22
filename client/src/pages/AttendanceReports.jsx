import { useState, useEffect } from 'react';
import api from '../services/api';

export default function AttendanceReports() {
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    department: '',
    userType: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await api.get('/departments');
        setDepartments(response.data || []);
      } catch (err) {
        console.error('Failed to load departments', err);
      }
    };

    fetchDepartments();
  }, []);

  const generateReport = async () => {
    setError('');
    setLoading(true);
    try {
      const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
      const endDate = new Date(filters.year, filters.month, 0).toISOString().split('T')[0];
      const params = new URLSearchParams({ startDate, endDate });
      if (filters.department) params.append('department', filters.department);
      if (filters.userType) params.append('userType', filters.userType);

      const response = await api.get(`/attendance/report?${params.toString()}`);
      setReportData(response.data);
    } catch (err) {
      console.error('Unable to generate report', err);
      setError(err.response?.data?.message || 'Unable to generate report.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      present: '#10b981',
      absent: '#ef4444',
      leave: '#f59e0b',
      remote: '#8b5cf6',
      partial: '#f97316',
      late: '#f59e0b',
    };
    return colors[status] || '#6b7280';
  };

  return (
    <div className="page">
      <div className="card">
        <div className="section-header">
          <h2>Department Attendance Reports</h2>
          <p>Generate attendance summaries for departments and users over a selected month.</p>
        </div>

        <div className="filter-grid">
          <select
            className="select-control"
            value={filters.department}
            onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))}
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept._id} value={dept._id}>{dept.name}</option>
            ))}
          </select>

          <select
            className="select-control"
            value={filters.userType}
            onChange={(e) => setFilters((prev) => ({ ...prev, userType: e.target.value }))}
          >
            <option value="">All User Types</option>
            <option value="staff">Staff</option>
            <option value="intern">Intern</option>
            <option value="mca">MCA</option>
            <option value="visitor">Visitor</option>
          </select>

          <select
            className="select-control"
            value={filters.month}
            onChange={(e) => setFilters((prev) => ({ ...prev, month: parseInt(e.target.value, 10) }))}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>

          <select
            className="select-control"
            value={filters.year}
            onChange={(e) => setFilters((prev) => ({ ...prev, year: parseInt(e.target.value, 10) }))}
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - 2 + i;
              return <option key={year} value={year}>{year}</option>;
            })}
          </select>
        </div>

        <div className="action-group">
          <button type="button" onClick={generateReport} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Report'}
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: '1rem', padding: '1rem', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c' }}>
            {error}
          </div>
        )}

        {reportData?.departments?.length > 0 ? (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {reportData.departments.map((department) => (
              <div key={department.department._id || department.department.name} className="department-summary">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{department.department.name}</h3>
                    <p style={{ margin: '0.25rem 0 0', color: '#6b7280' }}>Department total attendance summary</p>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.95rem' }}>
                    <div><strong>Records:</strong> {department.summary.totalRecords}</div>
                    <div><strong>Hours:</strong> {department.summary.totalHours.toFixed(2)}h</div>
                  </div>
                </div>

                <div className="stats-grid">
                  {['present', 'absent', 'leave', 'remote', 'late', 'partial'].map((status) => (
                    <div key={status} className="stats-card">
                      <strong>{status.charAt(0).toUpperCase() + status.slice(1)}</strong>
                      <div style={{ color: getStatusColor(status), fontSize: '1.25rem' }}>{department.summary[status] || 0}</div>
                    </div>
                  ))}
                </div>

                {department.users?.length > 0 && (
                  <div>
                    <h4>User breakdown</h4>
                    <div className="report-panel">
                      {department.users.map((userReport) => (
                        <div key={userReport.user._id} className="user-summary">
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 600 }}>{userReport.user.name}</span>
                            <span style={{ color: '#6b7280' }}>{userReport.user.role?.name || userReport.userType || 'Staff'}</span>
                          </div>
                          <div className="stats-grid">
                            <div><strong>Present:</strong> {userReport.summary.present}</div>
                            <div><strong>Absent:</strong> {userReport.summary.absent}</div>
                            <div><strong>Leave:</strong> {userReport.summary.leave}</div>
                            <div><strong>Hours:</strong> {userReport.summary.totalHours.toFixed(2)}h</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : reportData ? (
          <p>No report data found for the selected filters.</p>
        ) : null}
      </div>
    </div>
  );
}
