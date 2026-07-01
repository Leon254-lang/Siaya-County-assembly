import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const categories = ['Budget', 'Expenditure', 'Payment', 'Procurement'];
const approvalStatuses = ['Pending', 'Approved', 'Rejected'];
const recordStatuses = ['Draft', 'Submitted', 'Approved', 'Rejected', 'Paid', 'Completed'];
const requisitionPriorities = ['Low', 'Medium', 'High'];

const formatCurrency = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'KES 0.00';
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 2,
  }).format(value);
};

export default function Finance() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [departments, setDepartments] = useState([]);
  const [userRole, setUserRole] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [requisitionMessage, setRequisitionMessage] = useState('');
  const [requisitionError, setRequisitionError] = useState('');
  const [requisitionForm, setRequisitionForm] = useState({
    title: '',
    departmentId: '',
    amount: '',
    priority: 'Medium',
    requestedBy: '',
    description: '',
  });
  const [form, setForm] = useState({
    title: '',
    category: 'Budget',
    department: '',
    amountRequested: '',
    amountApproved: '',
    amountSpent: '',
    status: 'Draft',
    approvalStatus: 'Pending',
    referenceNumber: '',
    vendor: '',
    description: '',
  });

  const canEdit = ['Finance Officer', 'Super Admin'].includes(userRole);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    setUserRole(role || '');
    setUserName(storedUser?.name || localStorage.getItem('userName') || 'Department');
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await Promise.all([fetchRecords(), fetchSummary(), fetchDepartments()]);
    } catch (error) {
      setErrorMessage('Unable to load finance data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    const response = await api.get('/finance/records');
    setRecords(response.data.records || []);
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get('/finance/reports/summary');
      setSummary(response.data.summary || {});
    } catch (error) {
      console.warn('Could not load finance summary', error);
    }
  };

  const fetchDepartments = async () => {
    const response = await api.get('/departments');
    setDepartments(response.data || []);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRequisitionInputChange = (event) => {
    const { name, value } = event.target;
    setRequisitionForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRequisitionSubmit = async (event) => {
    event.preventDefault();
    setRequisitionMessage('');
    setRequisitionError('');

    const selectedDepartment = departments.find((dept) => dept._id === requisitionForm.departmentId);
    const departmentName = selectedDepartment?.name || requisitionForm.departmentId;

    const payload = {
      type: 'requisition',
      title: requisitionForm.title,
      department: departmentName,
      amount: Number(requisitionForm.amount) || 0,
      priority: requisitionForm.priority,
      requestedBy: requisitionForm.requestedBy || userName || 'Department',
      description: requisitionForm.description,
      status: 'Pending Approval',
    };

    try {
      await api.post('/procurement-records', payload);
      setRequisitionMessage('Purchase requisition submitted successfully.');
      setRequisitionForm({
        title: '',
        departmentId: '',
        amount: '',
        priority: 'Medium',
        requestedBy: '',
        description: '',
      });
    } catch (error) {
      setRequisitionError(error.response?.data?.message || 'Unable to submit requisition.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setErrorMessage('');

    try {
      const payload = {
        ...form,
        amountRequested: Number(form.amountRequested) || 0,
        amountApproved: Number(form.amountApproved) || 0,
        amountSpent: Number(form.amountSpent) || 0,
      };
      await api.post('/finance/records', payload);
      setMessage('Finance record saved successfully.');
      setForm({
        title: '',
        category: 'Budget',
        department: '',
        amountRequested: '',
        amountApproved: '',
        amountSpent: '',
        status: 'Draft',
        approvalStatus: 'Pending',
        referenceNumber: '',
        vendor: '',
        description: '',
      });
      await fetchRecords();
      await fetchSummary();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Unable to save finance record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Delete this finance record?')) return;
    setErrorMessage('');
    try {
      await api.delete(`/finance/records/${recordId}`);
      setMessage('Record deleted successfully.');
      await fetchRecords();
      await fetchSummary();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Unable to delete record.');
    }
  };

  return (
    <div className="card finance-card">
      <div className="page-header">
        <span className="eyebrow">Finance & Budget</span>
        <h1>Financial Management</h1>
        <p>Manage budgets, track expenditure, monitor procurement records, and approve payments from one secure finance dashboard.</p>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="summary-card">
          <h3>Total Budget Requested</h3>
          <strong>{formatCurrency(summary.totalBudgetRequested || 0)}</strong>
        </div>
        <div className="summary-card">
          <h3>Total Budget Approved</h3>
          <strong>{formatCurrency(summary.totalBudgetApproved || 0)}</strong>
        </div>
        <div className="summary-card">
          <h3>Total Expenditure</h3>
          <strong>{formatCurrency(summary.totalExpenditure || 0)}</strong>
        </div>
        <div className="summary-card">
          <h3>Total Payments</h3>
          <strong>{formatCurrency(summary.totalPayments || 0)}</strong>
        </div>
      </div>

      <section className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h2>Submit Department Requisition</h2>
            <p style={{ margin: 0, color: '#475569' }}>Create a purchase requisition and send it into the procurement queue for review.</p>
          </div>
          <Link to="/procurement" className="module-link">Go to Procurement</Link>
        </div>

        {requisitionMessage && <div className="message success-message">{requisitionMessage}</div>}
        {requisitionError && <div className="message error-message">{requisitionError}</div>}

        <form onSubmit={handleRequisitionSubmit} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          <div className="grid-columns" style={{ gap: '1rem' }}>
            <label>
              Requisition title
              <input name="title" value={requisitionForm.title} onChange={handleRequisitionInputChange} required />
            </label>
            <label>
              Department
              <select name="departmentId" value={requisitionForm.departmentId} onChange={handleRequisitionInputChange} required>
                <option value="">Select department</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </label>
            <label>
              Amount
              <input name="amount" type="number" min="0" value={requisitionForm.amount} onChange={handleRequisitionInputChange} required />
            </label>
            <label>
              Priority
              <select name="priority" value={requisitionForm.priority} onChange={handleRequisitionInputChange}>
                {requisitionPriorities.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label>
              Requested by
              <input name="requestedBy" value={requisitionForm.requestedBy} onChange={handleRequisitionInputChange} />
            </label>
          </div>

          <label>
            Description
            <textarea name="description" rows="3" value={requisitionForm.description} onChange={handleRequisitionInputChange} />
          </label>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="submit">Submit requisition</button>
            <button type="button" className="secondary" onClick={() => {
              setRequisitionForm({
                title: '',
                departmentId: '',
                amount: '',
                priority: 'Medium',
                requestedBy: '',
                description: '',
              });
              setRequisitionMessage('');
              setRequisitionError('');
            }}>
              Clear form
            </button>
          </div>
        </form>
      </section>

      {message && <div className="message success-message">{message}</div>}
      {errorMessage && <div className="message error-message">{errorMessage}</div>}

      {canEdit ? (
        <div className="form-card">
          <div className="card-header">
            <h2>Create Finance Record</h2>
            <span className="badge">Finance Officer</span>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid-columns" style={{ gap: '1rem' }}>
              <label>
                Title
                <input name="title" value={form.title} onChange={handleInputChange} required />
              </label>
              <label>
                Category
                <select name="category" value={form.category} onChange={handleInputChange}>
                  {categories.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                Department
                <select name="department" value={form.department} onChange={handleInputChange}>
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>{dept.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Amount Requested
                <input name="amountRequested" value={form.amountRequested} onChange={handleInputChange} type="number" min="0" step="0.01" />
              </label>
              <label>
                Amount Approved
                <input name="amountApproved" value={form.amountApproved} onChange={handleInputChange} type="number" min="0" step="0.01" />
              </label>
              <label>
                Amount Spent
                <input name="amountSpent" value={form.amountSpent} onChange={handleInputChange} type="number" min="0" step="0.01" />
              </label>
              <label>
                Status
                <select name="status" value={form.status} onChange={handleInputChange}>
                  {recordStatuses.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                Approval Status
                <select name="approvalStatus" value={form.approvalStatus} onChange={handleInputChange}>
                  {approvalStatuses.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label>
                Reference Number
                <input name="referenceNumber" value={form.referenceNumber} onChange={handleInputChange} />
              </label>
              <label>
                Vendor / Supplier
                <input name="vendor" value={form.vendor} onChange={handleInputChange} />
              </label>
            </div>
            <label>
              Description
              <textarea name="description" value={form.description} onChange={handleInputChange} rows="4" />
            </label>
            <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Record'}</button>
          </form>
        </div>
      ) : (
        <div className="note card" style={{ marginBottom: '1.5rem' }}>
          <p>Only Finance Officers and Super Admins may create or edit finance records in this module.</p>
        </div>
      )}

      <div className="table-card">
        <div className="card-header">
          <h2>Finance Records</h2>
          <span className="badge">{records.length} records</span>
        </div>

        {loading ? (
          <p>Loading finance records…</p>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <h3>No finance records found</h3>
            <p>Create a finance record to start tracking budget, payments, and expenditure.</p>
          </div>
        ) : (
          <div className="table-card" style={{ overflowX: 'auto' }}>
            <table className="file-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Department</th>
                  <th>Requested</th>
                  <th>Approved</th>
                  <th>Spent</th>
                  <th>Status</th>
                  <th>Approval</th>
                  <th>Added By</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record._id}>
                    <td>
                      <strong>{record.title}</strong>
                      {record.referenceNumber && <div className="file-meta">Ref: {record.referenceNumber}</div>}
                    </td>
                    <td>{record.category}</td>
                    <td>{record.department?.name || 'N/A'}</td>
                    <td>{formatCurrency(record.amountRequested)}</td>
                    <td>{formatCurrency(record.amountApproved)}</td>
                    <td>{formatCurrency(record.amountSpent)}</td>
                    <td>{record.status}</td>
                    <td>{record.approvalStatus}</td>
                    <td>{record.createdBy?.name || 'Unknown'}</td>
                    <td className="text-right">
                      {canEdit && (
                        <button onClick={() => handleDelete(record._id)} className="button small-button" style={{ backgroundColor: '#dc3545', color: '#fff' }}>
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
