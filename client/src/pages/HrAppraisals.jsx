import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const fallbackEmployees = [
  { _id: 'emp-1', name: 'Jane Otieno', department: 'Clerk Office' },
  { _id: 'emp-2', name: 'Peter Muga', department: 'Finance' },
  { _id: 'emp-3', name: 'Asha Wanjala', department: 'ICT' },
  { _id: 'emp-4', name: 'Daniel Owuor', department: 'Procurement' },
];

const initialForm = {
  employeeId: '',
  period: 'Annual',
  performance: '4',
  communication: '4',
  reliability: '4',
  teamwork: '4',
  achievements: '',
  managerComments: '',
  dueDate: '',
};

function calculateScore(values) {
  const parsed = Object.values(values).slice(0, 4).map((value) => Number(value) || 0);
  const average = parsed.reduce((sum, value) => sum + value, 0) / parsed.length;
  const rounded = Number(average.toFixed(1));

  let rating = 'Needs Improvement';
  if (rounded >= 4.5) rating = 'Excellent';
  else if (rounded >= 3.5) rating = 'Strong';
  else if (rounded >= 2.5) rating = 'Satisfactory';

  return { score: rounded, rating };
}

export default function HrAppraisals() {
  const [employees, setEmployees] = useState(fallbackEmployees);
  const [appraisals, setAppraisals] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [selfAssessmentForm, setSelfAssessmentForm] = useState({
    employeeId: '',
    selfSummary: '',
    strengths: '',
    growthAreas: '',
    goals: '',
  });
  const [selfAssessments, setSelfAssessments] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [appraisalsResponse, selfAssessmentsResponse, usersResponse] = await Promise.all([
          api.get('/hr/appraisals'),
          api.get('/hr/self-assessments'),
          api.get('/users'),
        ]);

        const appraisalData = appraisalsResponse.data || [];
        const selfAssessmentData = selfAssessmentsResponse.data || [];
        const users = usersResponse.data || [];

        if (appraisalData.length > 0) {
          setAppraisals(appraisalData.map((item) => ({ ...item, id: item._id })));
        } else {
          setAppraisals([]);
        }

        if (selfAssessmentData.length > 0) {
          setSelfAssessments(selfAssessmentData.map((item) => ({ ...item, id: item._id })));
        } else {
          setSelfAssessments([]);
        }

        if (users.length > 0) {
          setEmployees(users);
        }
      } catch (error) {
        console.error('Unable to load HR data', error);
        setAppraisals([]);
        setSelfAssessments([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const summary = useMemo(() => {
    const total = appraisals.length;
    const pending = appraisals.filter((item) => item.status !== 'Reviewed').length;
    const reviewed = total - pending;
    const averageScore = total
      ? (appraisals.reduce((sum, item) => sum + Number(item.score || 0), 0) / total).toFixed(1)
      : '0.0';

    return { total, pending, reviewed, averageScore };
  }, [appraisals]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const selectedEmployee = employees.find((person) => person._id === form.employeeId);
    const computed = calculateScore({
      performance: form.performance,
      communication: form.communication,
      reliability: form.reliability,
      teamwork: form.teamwork,
    });

    const record = {
      employeeId: form.employeeId,
      employeeName: selectedEmployee?.name || 'Unassigned',
      department: selectedEmployee?.department?.name || selectedEmployee?.department || 'General',
      period: form.period,
      performance: Number(form.performance),
      communication: Number(form.communication),
      reliability: Number(form.reliability),
      teamwork: Number(form.teamwork),
      achievements: form.achievements.trim(),
      managerComments: form.managerComments.trim(),
      dueDate: form.dueDate,
      score: computed.score,
      rating: computed.rating,
      status: 'Pending Review',
    };

    try {
      const response = await api.post('/hr/appraisals', record);
      const savedRecord = { ...response.data, id: response.data._id };
      const next = [savedRecord, ...appraisals];
      setAppraisals(next);
      setForm(initialForm);
      setMessage(`Automatic appraisal generated for ${savedRecord.employeeName} with score ${savedRecord.score}/5.`);
    } catch (error) {
      console.error('Failed to save appraisal', error);
      setMessage('Unable to save the appraisal right now.');
    }
  };

  const handleStatusUpdate = async (id) => {
    try {
      const response = await api.put(`/hr/appraisals/${id}`, { status: 'Reviewed' });
      const updated = { ...response.data, id: response.data._id };
      const next = appraisals.map((item) => (item.id === id ? updated : item));
      setAppraisals(next);
    } catch (error) {
      console.error('Failed to update appraisal status', error);
      setMessage('Unable to update the appraisal status right now.');
    }
  };

  const upcomingDeadlines = useMemo(() => {
    return appraisals
      .filter((item) => item.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 4);
  }, [appraisals]);

  const handleSelfAssessmentChange = (event) => {
    const { name, value } = event.target;
    setSelfAssessmentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelfAssessmentSubmit = async (event) => {
    event.preventDefault();
    const selectedEmployee = employees.find((person) => person._id === selfAssessmentForm.employeeId);
    const entry = {
      employeeId: selfAssessmentForm.employeeId,
      employeeName: selectedEmployee?.name || 'Unassigned',
      department: selectedEmployee?.department?.name || selectedEmployee?.department || 'General',
      selfSummary: selfAssessmentForm.selfSummary.trim(),
      strengths: selfAssessmentForm.strengths.trim(),
      growthAreas: selfAssessmentForm.growthAreas.trim(),
      goals: selfAssessmentForm.goals.trim(),
    };

    try {
      const response = await api.post('/hr/self-assessments', entry);
      const savedEntry = { ...response.data, id: response.data._id };
      const next = [savedEntry, ...selfAssessments];
      setSelfAssessments(next);
      setSelfAssessmentForm({ employeeId: '', selfSummary: '', strengths: '', growthAreas: '', goals: '' });
      setMessage(`Self-assessment received for ${savedEntry.employeeName}.`);
    } catch (error) {
      console.error('Failed to save self assessment', error);
      setMessage('Unable to submit the self-assessment right now.');
    }
  };

  const handleExportReport = () => {
    const reportWindow = window.open('', '_blank', 'width=900,height=700');
    if (!reportWindow) {
      setMessage('Please allow pop-ups to export the appraisal report.');
      return;
    }

    const rows = appraisals.map((item) => `
      <tr>
        <td>${item.employeeName}</td>
        <td>${item.period}</td>
        <td>${item.score}/5</td>
        <td>${item.rating}</td>
        <td>${item.status}</td>
        <td>${item.dueDate || 'Open'}</td>
      </tr>`).join('');

    reportWindow.document.write(`<!DOCTYPE html>
      <html>
        <head>
          <title>HR Appraisal Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin-bottom: 0.5rem; }
            table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
            th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>HR Appraisal Report</h1>
          <p>Generated from the Assembly HR appraisal workspace.</p>
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Period</th>
                <th>Score</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>`);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  return (
    <div className="dashboard">
      <section className="card">
        <div className="section-header theme-red">
          <h2>📊 HR Appraisal Center</h2>
          <p>Run structured staff evaluations, auto-calculate scores, and track reviews from one simple workspace.</p>
        </div>

        {message && <div className="message">{message}</div>}

        <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
          <div className="dashboard-card">
            <h3>Active appraisals</h3>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-color)' }}>{summary.total}</p>
            <p>Review sessions created for staff.</p>
          </div>
          <div className="dashboard-card">
            <h3>Pending review</h3>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-color)' }}>{summary.pending}</p>
            <p>Needs manager follow-up.</p>
          </div>
          <div className="dashboard-card">
            <h3>Reviewed</h3>
            <p style={{ fontSize: '2rem', fontWeight: 700 }}>{summary.reviewed}</p>
            <p>Completed evaluation cycles.</p>
          </div>
          <div className="dashboard-card">
            <h3>Average score</h3>
            <p style={{ fontSize: '2rem', fontWeight: 700 }}>{summary.averageScore}/5</p>
            <p>Automatic performance benchmark.</p>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>📅 Upcoming appraisal reminders</h3>
        <p>These deadlines are surfaced automatically so HR can follow up before assessments lapse.</p>
        {upcomingDeadlines.length === 0 ? (
          <p>No deadlines recorded yet.</p>
        ) : (
          <div className="modules-grid" style={{ marginTop: '1rem' }}>
            {upcomingDeadlines.map((item) => (
              <div key={item.id} className="module-card">
                <h3>{item.employeeName}</h3>
                <p>{item.period} appraisal due {item.dueDate}</p>
                <p style={{ margin: 0, color: 'var(--primary-color)', fontWeight: 700 }}>{item.status}</p>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button type="button" onClick={handleExportReport}>Export appraisal report</button>
        </div>
      </section>

      <section className="card">
        <h3>⚙️ Create automatic appraisal</h3>
        <p>Use the guided form below to generate a quick appraisal for a staff member. The score is calculated automatically from the performance factors you enter.</p>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          <div className="grid-columns" style={{ gap: '1rem' }}>
            <label>
              Employee
              <select name="employeeId" value={form.employeeId} onChange={handleChange} required>
                <option value="">Select staff member</option>
                {employees.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Appraisal period
              <select name="period" value={form.period} onChange={handleChange}>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Mid-year">Mid-year</option>
                <option value="Annual">Annual</option>
              </select>
            </label>
            <label>
              Due date
              <input type="date" name="dueDate" value={form.dueDate} onChange={handleChange} />
            </label>
          </div>

          <div className="grid-columns" style={{ gap: '1rem' }}>
            <label>
              Performance (1-5)
              <select name="performance" value={form.performance} onChange={handleChange}>
                {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}</option>)}
              </select>
            </label>
            <label>
              Communication (1-5)
              <select name="communication" value={form.communication} onChange={handleChange}>
                {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}</option>)}
              </select>
            </label>
            <label>
              Reliability (1-5)
              <select name="reliability" value={form.reliability} onChange={handleChange}>
                {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}</option>)}
              </select>
            </label>
            <label>
              Teamwork (1-5)
              <select name="teamwork" value={form.teamwork} onChange={handleChange}>
                {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}</option>)}
              </select>
            </label>
          </div>

          <label>
            Key achievements
            <textarea name="achievements" rows="3" value={form.achievements} onChange={handleChange} placeholder="Summarize achievements, completed targets and notable contributions." />
          </label>

          <label>
            Manager comments
            <textarea name="managerComments" rows="3" value={form.managerComments} onChange={handleChange} placeholder="Add review comments or follow-up actions." />
          </label>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="submit">Generate automatic appraisal</button>
            <button type="button" className="secondary" onClick={() => setForm(initialForm)}>Clear</button>
          </div>
        </form>
      </section>

      <section className="card">
        <h3>📝 Employee self-assessment</h3>
        <p>Collect staff reflections, development goals and achievements before the formal review meeting.</p>
        <form onSubmit={handleSelfAssessmentSubmit} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          <label>
            Employee
            <select name="employeeId" value={selfAssessmentForm.employeeId} onChange={handleSelfAssessmentChange} required>
              <option value="">Select staff member</option>
              {employees.map((employee) => (
                <option key={employee._id} value={employee._id}>{employee.name}</option>
              ))}
            </select>
          </label>
          <label>
            Self-summary
            <textarea name="selfSummary" rows="3" value={selfAssessmentForm.selfSummary} onChange={handleSelfAssessmentChange} placeholder="Share a brief reflection on your performance." required />
          </label>
          <label>
            Strengths
            <textarea name="strengths" rows="2" value={selfAssessmentForm.strengths} onChange={handleSelfAssessmentChange} placeholder="List your key strengths and contributions." />
          </label>
          <label>
            Growth areas
            <textarea name="growthAreas" rows="2" value={selfAssessmentForm.growthAreas} onChange={handleSelfAssessmentChange} placeholder="Note areas for improvement or support needed." />
          </label>
          <label>
            Development goals
            <textarea name="goals" rows="2" value={selfAssessmentForm.goals} onChange={handleSelfAssessmentChange} placeholder="Describe your next development targets." />
          </label>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="submit">Submit self-assessment</button>
            <button type="button" className="secondary" onClick={() => setSelfAssessmentForm({ employeeId: '', selfSummary: '', strengths: '', growthAreas: '', goals: '' })}>Clear</button>
          </div>
        </form>
        {selfAssessments.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h4>Recent self-assessments</h4>
            <div className="modules-grid">
              {selfAssessments.slice(0, 4).map((item) => (
                <div className="module-card" key={item.id}>
                  <h3>{item.employeeName}</h3>
                  <p style={{ marginBottom: '0.4rem' }}>{item.selfSummary}</p>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Goals: {item.goals || 'No goals recorded'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h3>🧾 Appraisal records</h3>
        <p>Track each appraisal, review its auto-generated score and mark it as completed once approved.</p>
        {loading ? (
          <p>Loading staff records...</p>
        ) : appraisals.length === 0 ? (
          <p>No appraisals generated yet.</p>
        ) : (
          <div className="table-card" style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="file-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Period</th>
                  <th>Score</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {appraisals.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.employeeName}</strong>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{item.department}</div>
                    </td>
                    <td>{item.period}</td>
                    <td>{item.score}/5</td>
                    <td>{item.rating}</td>
                    <td>{item.status}</td>
                    <td>{item.dueDate || 'Open'}</td>
                    <td>
                      {item.status !== 'Reviewed' ? (
                        <button type="button" onClick={() => handleStatusUpdate(item.id)}>Mark reviewed</button>
                      ) : (
                        <span style={{ color: 'var(--accent-color)', fontWeight: 700 }}>Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
