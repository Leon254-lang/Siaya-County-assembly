import { useEffect, useState } from 'react';
import api from '../services/api';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  ward: '',
  party: '',
  phone: '',
  address: '',
  committeeMemberships: [],
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return date.toLocaleDateString();
};

export default function Mcas() {
  const [mcas, setMcas] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [selectedMca, setSelectedMca] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [performance, setPerformance] = useState(null);
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState('');

  const canRegisterMca = userRole === 'Super Admin' || userRole?.includes('Admin');

  const resetForm = () => {
    setSelectedMca(null);
    setForm(emptyForm);
    setPerformance(null);
    setAttendanceReport(null);
    setMessage('');
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [mcasRes, committeesRes] = await Promise.all([
        api.get('/mcas'),
        api.get('/committees'),
      ]);
      setMcas(mcasRes.data);
      setCommittees(committeesRes.data);
    } catch (error) {
      setMessage('Unable to load MCA data.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role || '');
    loadData();
  }, []);

  const handleFormChange = (event) => {
    const { name, value, type, options } = event.target;
    if (type === 'select-multiple') {
      const selected = Array.from(options).filter((item) => item.selected).map((item) => item.value);
      setForm((prev) => ({ ...prev, [name]: selected }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectMca = async (mca) => {
    setSelectedMca(mca);
    setForm({
      name: mca.name || '',
      email: mca.email || '',
      password: '',
      ward: mca.ward || '',
      party: mca.party || '',
      phone: mca.phone || '',
      address: mca.contactDetails?.address || '',
      committeeMemberships: mca.committeeMemberships?.map((committee) => committee._id) || [],
    });

    try {
      const [perfRes, attendanceRes] = await Promise.all([
        api.get(`/mcas/${mca._id}/performance`),
        api.get(`/mcas/${mca._id}/attendance-report`),
      ]);
      setPerformance(perfRes.data);
      setAttendanceReport(attendanceRes.data);
    } catch (error) {
      console.error('Failed to load MCA details:', error);
      setMessage('Unable to load MCA details.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    if (!form.name || !form.email || (!selectedMca && !form.password)) {
      setMessage('Name, email, and password are required when creating an MCA.');
      return;
    }

    try {
      if (selectedMca) {
        await api.put(`/mcas/${selectedMca._id}`, {
          name: form.name,
          ward: form.ward,
          party: form.party,
          phone: form.phone,
          address: form.address,
          committeeMemberships: form.committeeMemberships,
          password: form.password || undefined,
        });
        setMessage('MCA profile updated successfully.');
      } else {
        await api.post('/mcas', {
          name: form.name,
          email: form.email,
          password: form.password,
          ward: form.ward,
          party: form.party,
          phone: form.phone,
          address: form.address,
          committeeMemberships: form.committeeMemberships,
        });
        setMessage('MCA registered successfully.');
      }
      loadData();
      resetForm();
    } catch (error) {
      console.error('MCA save failed:', error);
      setMessage(error.response?.data?.message || 'Failed to save MCA profile.');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>MCA Management</h1>
        <p>Register MCAs, maintain profiles, review committee memberships, attendance summaries, and performance metrics.</p>
      </div>

      {message && <div className="notification">{message}</div>}

      <div className="grid-two-column">
        <section className="card">
          <h2>{selectedMca ? 'Update MCA Profile' : 'Register a New MCA'}</h2>
          {!canRegisterMca && !selectedMca && (
            <div className="notification warning">
              Only Admin users can register new MCAs. Your current role does not have MCA registration permission.
            </div>
          )}
          <form onSubmit={handleSubmit} className="form-grid">
            <label>
              Full name
              <input name="name" value={form.name} onChange={handleFormChange} required />
            </label>
            <label>
              Email address
              <input type="email" name="email" value={form.email} onChange={handleFormChange} required={!selectedMca} disabled={!!selectedMca} />
            </label>
            <label>
              Password
              <input type="password" name="password" value={form.password} onChange={handleFormChange} placeholder={selectedMca ? 'Leave blank to keep current password' : ''} />
            </label>
            <label>
              Ward represented
              <input name="ward" value={form.ward} onChange={handleFormChange} />
            </label>
            <label>
              Political party
              <input name="party" value={form.party} onChange={handleFormChange} />
            </label>
            <label>
              Phone number
              <input name="phone" value={form.phone} onChange={handleFormChange} />
            </label>
            <label>
              Office address
              <input name="address" value={form.address} onChange={handleFormChange} />
            </label>
            <label>
              Committee memberships
              <select name="committeeMemberships" value={form.committeeMemberships} onChange={handleFormChange} multiple>
                {committees.map((committee) => (
                  <option key={committee._id} value={committee._id}>
                    {committee.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="primary-button" disabled={!canRegisterMca && !selectedMca}>
              {selectedMca ? 'Save Changes' : 'Register MCA'}
            </button>
            {selectedMca && (
              <button type="button" className="secondary-button" onClick={resetForm}>
                Clear Selection
              </button>
            )}
          </form>
        </section>

        <section className="card">
          <h2>Registered MCAs</h2>
          {loading ? (
            <p>Loading MCAs...</p>
          ) : mcas.length === 0 ? (
            <p>No MCA profiles available.</p>
          ) : (
            <div className="list-panel">
              {mcas.map((mca) => (
                <button type="button" key={mca._id} className="list-item" onClick={() => handleSelectMca(mca)}>
                  <div>
                    <strong>{mca.name}</strong>
                    <div>{mca.ward || 'Ward not set'}</div>
                  </div>
                  <div>{mca.party || 'No party'}</div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedMca && (
        <section className="card">
          <h2>{selectedMca.name} — Profile & Performance</h2>
          <div className="details-grid">
            <div>
              <p><strong>Ward:</strong> {selectedMca.ward || 'Not specified'}</p>
              <p><strong>Party:</strong> {selectedMca.party || 'Not specified'}</p>
              <p><strong>Phone:</strong> {selectedMca.phone || 'Not specified'}</p>
              <p><strong>Office:</strong> {selectedMca.contactDetails?.address || 'Not specified'}</p>
            </div>
            <div>
              <p><strong>Committee memberships:</strong></p>
              <ul>
                {selectedMca.committeeMemberships?.length > 0 ? (
                  selectedMca.committeeMemberships.map((committee) => (
                    <li key={committee._id}>{committee.name}</li>
                  ))
                ) : (
                  <li>None assigned</li>
                )}
              </ul>
            </div>
          </div>

          <div className="details-grid">
            <div className="performance-card">
              <h3>Attendance performance</h3>
              {performance ? (
                <div>
                  <p><strong>Attendance rate:</strong> {performance.attendanceRate}%</p>
                  <p><strong>Present days:</strong> {performance.presentDays}</p>
                  <p><strong>Absent days:</strong> {performance.absentDays}</p>
                  <p><strong>Committee meetings attended:</strong> {performance.committeeMeetingsAttended} / {performance.committeeMeetingsScheduled}</p>
                  <p><strong>Plenary sessions attended:</strong> {performance.sessionMeetingsAttended} / {performance.sessionMeetingsScheduled}</p>
                </div>
              ) : (
                <p>Performance metrics are not available.</p>
              )}
            </div>

            <div className="performance-card">
              <h3>Recent attendance</h3>
              {attendanceReport?.records?.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceReport.records.slice(-8).map((record) => (
                      <tr key={record._id}>
                        <td>{formatDate(record.date)}</td>
                        <td>{record.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No attendance records available.</p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
