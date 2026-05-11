import { useEffect, useState } from 'react';
import api from '../services/api';

const defaultForm = {
  name: '',
  email: '',
  phone: '',
  department: '',
  supervisor: '',
  placement: '',
  startDate: '',
  endDate: '',
  status: 'active',
};

const defaultLog = {
  date: '',
  activity: '',
  notes: '',
};

const defaultEvaluation = {
  score: '3',
  comments: '',
  date: '',
};

const defaultCompletion = {
  date: '',
  summary: '',
  remarks: '',
};

export default function Interns() {
  const [interns, setInterns] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [logForm, setLogForm] = useState(defaultLog);
  const [evaluationForm, setEvaluationForm] = useState(defaultEvaluation);
  const [completionForm, setCompletionForm] = useState(defaultCompletion);
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(defaultForm);

  const fetchInterns = async () => {
    try {
      const response = await api.get('/interns');
      setInterns(response.data);
    } catch (error) {
      console.error('Failed to load interns', error);
      setMessage('Unable to load interns.');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to load users', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to load departments', error);
    }
  };

  useEffect(() => {
    fetchInterns();
    fetchUsers();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedIntern) {
      setLogForm(defaultLog);
      setEvaluationForm(defaultEvaluation);
      setCompletionForm(defaultCompletion);
      setEditForm({
        name: selectedIntern.name,
        email: selectedIntern.email,
        phone: selectedIntern.phone,
        department: selectedIntern.department?._id || '',
        supervisor: selectedIntern.supervisor?._id || '',
        placement: selectedIntern.placement,
        startDate: selectedIntern.startDate ? selectedIntern.startDate.split('T')[0] : '',
        endDate: selectedIntern.endDate ? selectedIntern.endDate.split('T')[0] : '',
        status: selectedIntern.status,
      });
    }
  }, [selectedIntern]);

  const resetForm = () => {
    setForm(defaultForm);
    setMessage('');
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogChange = (event) => {
    const { name, value } = event.target;
    setLogForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEvaluationChange = (event) => {
    const { name, value } = event.target;
    setEvaluationForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCompletionChange = (event) => {
    const { name, value } = event.target;
    setCompletionForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateIntern = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        department: form.department || undefined,
        supervisor: form.supervisor || undefined,
        placement: form.placement.trim(),
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        status: form.status,
      };

      const response = await api.post('/interns', payload);
      setInterns((prev) => [response.data, ...prev]);
      setSelectedIntern(response.data);
      resetForm();
      setMessage('Intern registered successfully.');
    } catch (error) {
      console.error('Error registering intern:', error);
      setMessage('Failed to register the intern.');
    }
  };

  const handleSelectIntern = (intern) => {
    setSelectedIntern(intern);
    setIsEditing(false);
    setMessage('');
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateIntern = async (event) => {
    event.preventDefault();
    if (!selectedIntern) return;
    setMessage('');

    try {
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        department: editForm.department || undefined,
        supervisor: editForm.supervisor || undefined,
        placement: editForm.placement.trim(),
        startDate: editForm.startDate ? new Date(editForm.startDate).toISOString() : undefined,
        endDate: editForm.endDate ? new Date(editForm.endDate).toISOString() : undefined,
        status: editForm.status,
      };
      const response = await api.put(`/interns/${selectedIntern._id}`, payload);
      setSelectedIntern(response.data);
      setInterns((prev) => prev.map((intern) => (intern._id === response.data._id ? response.data : intern)));
      setIsEditing(false);
      setMessage('Intern profile updated.');
    } catch (error) {
      console.error('Failed to update intern:', error);
      setMessage('Unable to update intern.');
    }
  };

  const handleAddLog = async (event) => {
    event.preventDefault();
    if (!selectedIntern) return;
    setMessage('');

    try {
      const payload = {
        date: logForm.date || new Date().toISOString(),
        activity: logForm.activity.trim(),
        notes: logForm.notes.trim(),
      };
      const response = await api.post(`/interns/${selectedIntern._id}/log`, payload);
      setSelectedIntern(response.data);
      setInterns((prev) => prev.map((intern) => (intern._id === response.data._id ? response.data : intern)));
      setLogForm(defaultLog);
      setMessage('Daily log submitted.');
    } catch (error) {
      console.error('Failed to submit daily log:', error);
      setMessage('Unable to submit daily log.');
    }
  };

  const handleAddEvaluation = async (event) => {
    event.preventDefault();
    if (!selectedIntern) return;
    setMessage('');

    try {
      const payload = {
        score: Number(evaluationForm.score),
        comments: evaluationForm.comments.trim(),
        date: evaluationForm.date || new Date().toISOString(),
      };
      const response = await api.post(`/interns/${selectedIntern._id}/evaluate`, payload);
      setSelectedIntern(response.data);
      setInterns((prev) => prev.map((intern) => (intern._id === response.data._id ? response.data : intern)));
      setEvaluationForm(defaultEvaluation);
      setMessage('Evaluation recorded.');
    } catch (error) {
      console.error('Failed to record evaluation:', error);
      setMessage('Unable to record evaluation.');
    }
  };

  const handleCompleteIntern = async (event) => {
    event.preventDefault();
    if (!selectedIntern) return;
    setMessage('');

    try {
      const payload = {
        date: completionForm.date || new Date().toISOString(),
        summary: completionForm.summary.trim(),
        remarks: completionForm.remarks.trim(),
      };
      const response = await api.post(`/interns/${selectedIntern._id}/complete`, payload);
      setSelectedIntern(response.data);
      setInterns((prev) => prev.map((intern) => (intern._id === response.data._id ? response.data : intern)));
      setCompletionForm(defaultCompletion);
      setMessage('Completion report saved.');
    } catch (error) {
      console.error('Failed to save completion report:', error);
      setMessage('Unable to save completion report.');
    }
  };

  const supervisors = users.filter(
    (user) => user.role?.name && ['Supervisor', 'Administrator', 'Manager', 'Director', 'Head'].includes(user.role.name)
  );

  const counts = interns.reduce(
    (summary, intern) => {
      summary[intern.status] = (summary[intern.status] || 0) + 1;
      return summary;
    },
    { active: 0, completed: 0, cancelled: 0 }
  );

  return (
    <div className="interns-page">
      <div className="page-header">
        <h1>Internship Management</h1>
        <p>Register interns, assign departments and supervisors, submit daily logs, evaluations, and completion reports.</p>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Active Interns</h3>
          <p>{counts.active}</p>
        </div>
        <div className="card">
          <h3>Completed</h3>
          <p>{counts.completed}</p>
        </div>
        <div className="card">
          <h3>Cancelled</h3>
          <p>{counts.cancelled}</p>
        </div>
      </div>

      <div className="intern-grid">
        <section className="intern-panel">
          <h2>Register Intern</h2>
          <form className="intern-form" onSubmit={handleCreateIntern}>
            <div className="form-grid">
              <label>
                Name
                <input name="name" value={form.name} onChange={handleFormChange} required />
              </label>
              <label>
                Email
                <input type="email" name="email" value={form.email} onChange={handleFormChange} />
              </label>
              <label>
                Phone
                <input name="phone" value={form.phone} onChange={handleFormChange} />
              </label>
              <label>
                Department
                <select name="department" value={form.department} onChange={handleFormChange}>
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Supervisor
                <select name="supervisor" value={form.supervisor} onChange={handleFormChange}>
                  <option value="">Select Supervisor</option>
                  {supervisors.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.role?.name})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Placement
                <input name="placement" value={form.placement} onChange={handleFormChange} />
              </label>
              <label>
                Start Date
                <input type="date" name="startDate" value={form.startDate} onChange={handleFormChange} />
              </label>
              <label>
                End Date
                <input type="date" name="endDate" value={form.endDate} onChange={handleFormChange} />
              </label>
              <label>
                Status
                <select name="status" value={form.status} onChange={handleFormChange}>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button type="submit">Register Intern</button>
            </div>
          </form>
        </section>

        <section className="intern-panel">
          <h2>Intern Roster</h2>
          <div className="intern-list">
            {interns.map((intern) => (
              <button
                key={intern._id}
                type="button"
                className={`intern-item ${selectedIntern?._id === intern._id ? 'selected' : ''}`}
                onClick={() => handleSelectIntern(intern)}
              >
                <strong>{intern.name}</strong>
                <span className="intern-meta">{intern.department?.name || 'No department'}</span>
                <span className="intern-meta">Supervisor: {intern.supervisor?.name || 'Unassigned'}</span>
                <span className="intern-meta">Status: {intern.status}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {selectedIntern && (
        <section className="intern-panel">
          <div className="profile-header">
            <h2>Intern Profile</h2>
            <button type="button" onClick={() => setIsEditing(!isEditing)} className="edit-btn">
              {isEditing ? 'Cancel Edit' : 'Edit Profile'}
            </button>
          </div>
          {isEditing ? (
            <form onSubmit={handleUpdateIntern} className="intern-form">
              <div className="form-grid">
                <label>
                  Name
                  <input name="name" value={editForm.name} onChange={handleEditChange} required />
                </label>
                <label>
                  Email
                  <input type="email" name="email" value={editForm.email} onChange={handleEditChange} />
                </label>
                <label>
                  Phone
                  <input name="phone" value={editForm.phone} onChange={handleEditChange} />
                </label>
                <label>
                  Department
                  <select name="department" value={editForm.department} onChange={handleEditChange}>
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Supervisor
                  <select name="supervisor" value={editForm.supervisor} onChange={handleEditChange}>
                    <option value="">Select Supervisor</option>
                    {supervisors.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.name} ({user.role?.name})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Placement
                  <input name="placement" value={editForm.placement} onChange={handleEditChange} />
                </label>
                <label>
                  Start Date
                  <input type="date" name="startDate" value={editForm.startDate} onChange={handleEditChange} />
                </label>
                <label>
                  End Date
                  <input type="date" name="endDate" value={editForm.endDate} onChange={handleEditChange} />
                </label>
                <label>
                  Status
                  <select name="status" value={editForm.status} onChange={handleEditChange}>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
              </div>
              <div className="form-actions">
                <button type="submit">Save Changes</button>
              </div>
            </form>
          ) : (
            <div className="intern-details">
              <div className="form-grid">
                <div>
                  <p><strong>Name:</strong> {selectedIntern.name}</p>
                  <p><strong>Email:</strong> {selectedIntern.email || 'N/A'}</p>
                  <p><strong>Phone:</strong> {selectedIntern.phone || 'N/A'}</p>
                  <p><strong>Placement:</strong> {selectedIntern.placement || 'N/A'}</p>
                </div>
                <div>
                  <p><strong>Department:</strong> {selectedIntern.department?.name || 'None'}</p>
                  <p><strong>Supervisor:</strong> {selectedIntern.supervisor?.name || 'None'}</p>
                  <p><strong>Start Date:</strong> {selectedIntern.startDate ? new Date(selectedIntern.startDate).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>End Date:</strong> {selectedIntern.endDate ? new Date(selectedIntern.endDate).toLocaleDateString() : 'N/A'}</p>
                  <p><strong>Status:</strong> {selectedIntern.status}</p>
                </div>
              </div>

            <div className="intern-subpanels">
              <div className="intern-subpanel">
                <h3>Daily Logs</h3>
                {selectedIntern.dailyLogs?.length > 0 ? (
                  <ul className="record-list">
                    {selectedIntern.dailyLogs.map((log, idx) => (
                      <li key={idx}>
                        <strong>{new Date(log.date).toLocaleDateString()}</strong>
                        <p>{log.activity}</p>
                        <small>{log.notes}</small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No daily logs yet.</p>
                )}
                <form onSubmit={handleAddLog} className="form-grid">
                  <label>
                    Date
                    <input type="date" name="date" value={logForm.date} onChange={handleLogChange} />
                  </label>
                  <label>
                    Activity
                    <input name="activity" value={logForm.activity} onChange={handleLogChange} required />
                  </label>
                  <label>
                    Notes
                    <textarea name="notes" value={logForm.notes} onChange={handleLogChange} rows="3" />
                  </label>
                  <div className="form-actions">
                    <button type="submit">Submit Log</button>
                  </div>
                </form>
              </div>

              <div className="intern-subpanel">
                <h3>Evaluations</h3>
                {selectedIntern.evaluations?.length > 0 ? (
                  <ul className="record-list">
                    {selectedIntern.evaluations.map((evaluation, idx) => (
                      <li key={idx}>
                        <strong>{evaluation.reviewer?.name || 'Reviewer'}</strong> • {new Date(evaluation.date).toLocaleDateString()}
                        <p>Score: {evaluation.score}</p>
                        <small>{evaluation.comments}</small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No evaluations yet.</p>
                )}
                <form onSubmit={handleAddEvaluation} className="form-grid">
                  <label>
                    Score
                    <select name="score" value={evaluationForm.score} onChange={handleEvaluationChange}>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                  </label>
                  <label>
                    Date
                    <input type="date" name="date" value={evaluationForm.date} onChange={handleEvaluationChange} />
                  </label>
                  <label>
                    Comments
                    <textarea name="comments" value={evaluationForm.comments} onChange={handleEvaluationChange} rows="3" />
                  </label>
                  <div className="form-actions">
                    <button type="submit">Record Evaluation</button>
                  </div>
                </form>
              </div>

              <div className="intern-subpanel">
                <h3>Completion Report</h3>
                {selectedIntern.completionReports?.length > 0 ? (
                  <ul className="record-list">
                    {selectedIntern.completionReports.map((report, idx) => (
                      <li key={idx}>
                        <strong>{new Date(report.date).toLocaleDateString()}</strong>
                        <p>{report.summary}</p>
                        <small>Supervisor remarks: {report.remarks}</small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No completion reports yet.</p>
                )}
                <form onSubmit={handleCompleteIntern} className="form-grid">
                  <label>
                    Completion Date
                    <input type="date" name="date" value={completionForm.date} onChange={handleCompletionChange} />
                  </label>
                  <label>
                    Summary
                    <textarea name="summary" value={completionForm.summary} onChange={handleCompletionChange} rows="3" required />
                  </label>
                  <label>
                    Remarks
                    <textarea name="remarks" value={completionForm.remarks} onChange={handleCompletionChange} rows="3" />
                  </label>
                  <div className="form-actions">
                    <button type="submit">Save Completion</button>
                  </div>
                </form>
              </div>
            </div>
            </div>
          )}
        </section>
      )}

      {message && <div className="message">{message}</div>}
    </div>
  );
}
