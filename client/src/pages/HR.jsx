import { useEffect, useState } from 'react';
import { getHRDashboard, getEmployees } from '../services/api';

export default function HRPage() {
  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: dash }, { data: emps }] = await Promise.all([getHRDashboard(), getEmployees()]);
        setSummary(dash);
        setEmployees(emps.slice(0, 6));
      } catch (err) {
        console.error('HR load failed', err);
      }
    })();
  }, []);

  return (
    <div className="page-content">
      <h2>HR Dashboard</h2>
      {summary ? (
        <div className="hr-summary-grid">
          <div className="card">Total Employees: <strong>{summary.totalEmployees}</strong></div>
          <div className="card">On Leave: <strong>{summary.employeesOnLeave}</strong></div>
          <div className="card">Pending Leave: <strong>{summary.pendingLeaveRequests}</strong></div>
          <div className="card">New Applications: <strong>{summary.newApplications}</strong></div>
          <div className="card">Interns: <strong>{summary.internsCount}</strong></div>
          <div className="card">Contract Expiries (30d): <strong>{summary.upcomingExpiries}</strong></div>
          <div className="card">Retirements (90d): <strong>{summary.upcomingRetirements}</strong></div>
        </div>
      ) : (
        <p>Loading summary…</p>
      )}

      <section style={{ marginTop: '1.5rem' }}>
        <h3>Recent employees</h3>
        <ul>
          {employees.map((e) => (
            <li key={e._id}>{e.name} — {e.email} — {e.role?.name || '—'}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
