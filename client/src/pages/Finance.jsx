import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const categories = ['Budget', 'Expenditure', 'Payment', 'Procurement'];
const approvalStatuses = ['Pending', 'Approved', 'Rejected'];
const recordStatuses = ['Draft', 'Submitted', 'Approved', 'Rejected', 'Paid', 'Completed'];

const financeModules = [
  {
    title: 'Budget Management',
    description: 'Create proposals, allocate funds, track utilization, and monitor remaining balances for every department.',
  },
  {
    title: 'Payment Management',
    description: 'Receive payment requests, verify documents, record payments, and track approval status.',
  },
  {
    title: 'Revenue Management',
    description: 'Record revenue receipts by source, track collections, and generate revenue reports.',
  },
  {
    title: 'Expenditure Management',
    description: 'Categorize expenses, compare actual spending against approved budget, and control overspend.',
  },
  {
    title: 'Invoice Management',
    description: 'Receive supplier bills, verify invoice details, match purchase orders, and track unpaid invoices.',
  },
  {
    title: 'Procurement Integration',
    description: 'View approved requisitions, purchase orders, and confirm funds before payment processing.',
  },
];

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getMonthKey = (dateString) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return `${date.toLocaleString('en-KE', { month: 'short' })} ${date.getFullYear()}`;
};

export default function Finance() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({});
  const [departments, setDepartments] = useState([]);
  const [procurementRecords, setProcurementRecords] = useState([]);
  const [userRole, setUserRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [exportError, setExportError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    department: '',
    status: '',
    approvalStatus: '',
    search: '',
  });
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalRecords: 0 });
  const [auditTrail, setAuditTrail] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ currentPage: 1, totalPages: 1, totalLogs: 0 });
  const [exportFormat, setExportFormat] = useState('csv');
  const [departmentSpending, setDepartmentSpending] = useState([]);
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

  const canView = ['Finance Officer', 'Super Admin'].includes(userRole);
  const canEdit = canView;

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role || '');
    loadDashboard();
    loadAuditTrail(1);
  }, []);

  if (!canView && !loading) {
    return (
      <div className="card finance-card">
        <div className="page-header">
          <span className="eyebrow">Finance Officer Dashboard</span>
          <h1>Access Denied</h1>
          <p>You do not have permission to access the finance dashboard. Please sign in with a Finance Officer or Super Admin account.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (pagination.currentPage !== 1 || Object.values(filters).some((value) => value)) {
      loadDashboard();
    }
  }, [filters, pagination.currentPage]);

  useEffect(() => {
    loadAuditTrail(auditPagination.currentPage);
  }, [auditPagination.currentPage]);

  const loadDashboard = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const params = buildQueryParams({
        page: pagination.currentPage,
        limit: 10,
        ...filters,
      });

      const [recordsRes, summaryRes, departmentsRes, procurementRes] = await Promise.all([
        api.get(`/finance/records?${params}`),
        api.get('/finance/reports/summary'),
        api.get('/departments'),
        api.get('/procurement-records'),
      ]);

      setRecords(recordsRes.data.records || []);
      setPagination(recordsRes.data.pagination || { currentPage: 1, totalPages: 1, totalRecords: 0 });
      setSummary(summaryRes.data.summary || {});
      setDepartments(departmentsRes.data || []);
      setProcurementRecords(procurementRes.data.records || []);
      setAccessDenied(false);

      if (summaryRes.data.departmentSpending) {
        setDepartmentSpending(summaryRes.data.departmentSpending);
      }
    } catch (error) {
      console.error('Failed to load finance dashboard data', error);
      if (error.response?.status === 403) {
        setAccessDenied(true);
      } else {
        setErrorMessage('Unable to load finance dashboard data.');
      }
    } finally {
      setLoading(false);
    }
  };

  const buildQueryParams = (paramsObject) => {
    const params = new URLSearchParams();
    Object.entries(paramsObject).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    return params.toString();
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
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
      await loadDashboard();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Unable to save finance record.');
    } finally {
      setSaving(false);
    }
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, currentPage: newPage }));
  };

  const handleExportCsv = async () => {
    try {
      setExportError('');
      const params = buildQueryParams(filters);
      const response = await api.get(`/finance/records/export?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'finance-records.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setExportError(error.response?.data?.message || 'Unable to export records.');
    }
  };

  const handleExportExcel = async () => {
    try {
      setExportError('');
      const params = buildQueryParams({ ...filters, format: 'excel' });
      const response = await api.get(`/finance/records/export?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'finance-records.xls');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setExportError(error.response?.data?.message || 'Unable to export records.');
    }
  };

  const handleExportRecords = async () => {
    if (exportFormat === 'pdf') {
      handleExportPdf();
      return;
    }

    try {
      setExportError('');
      const params = buildQueryParams({ ...filters, format: exportFormat });
      const response = await api.get(`/finance/records/export?${params}`, { responseType: 'blob' });
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', exportFormat === 'excel' ? 'finance-records.xls' : 'finance-records.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setExportError(error.response?.data?.message || 'Unable to export records.');
    }
  };

  const handleExportPdf = () => {
    const exportRows = records.map((record) => ({
      title: record.title,
      category: record.category,
      department: record.department?.name || 'N/A',
      amount: record.amountRequested || record.amountApproved || record.amountSpent || 0,
      status: record.status,
      approvalStatus: record.approvalStatus,
      createdAt: formatDate(record.createdAt),
    }));

    const tableRows = exportRows.map((row) => `
      <tr>
        <td>${row.title}</td>
        <td>${row.category}</td>
        <td>${row.department}</td>
        <td>${formatCurrency(row.amount)}</td>
        <td>${row.status}</td>
        <td>${row.approvalStatus}</td>
        <td>${row.createdAt}</td>
      </tr>
    `).join('');

    const printContent = `<!DOCTYPE html><html><head><title>Finance Report</title><style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
      th { background: #f3f4f6; }
      h1, h2 { margin: 0; }
      .summary { margin-top: 16px; }
    </style></head><body>
      <h1>Finance Report</h1>
      <div class="summary">
        <p><strong>Approved Budget:</strong> ${formatCurrency(approvedBudget)}</p>
        <p><strong>Current Expenditure:</strong> ${formatCurrency(currentExpenditure)}</p>
        <p><strong>Invoice Count:</strong> ${invoiceCount}</p>
        <p><strong>Revenue Collected:</strong> ${formatCurrency(revenueCollected)}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Department</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Approval</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </body></html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const loadAuditTrail = async (page = 1) => {
    try {
      const params = buildQueryParams({ page, limit: 10 });
      const response = await api.get(`/finance/audit?${params}`);
      setAuditTrail(response.data.logs || []);
      setAuditPagination(response.data.pagination || { currentPage: 1, totalPages: 1, totalLogs: 0 });
    } catch (error) {
      console.error('Failed to load finance audit trail', error);
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('Delete this finance record?')) return;
    setErrorMessage('');
    try {
      await api.delete(`/finance/records/${recordId}`);
      setMessage('Record deleted successfully.');
      await loadDashboard();
      await loadAuditTrail(auditPagination.currentPage);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Unable to delete record.');
    }
  };

  const approvedBudget = summary.totalBudgetApproved || 0;
  const currentExpenditure = summary.totalExpenditure || 0;

  const pendingPaymentRequests = records.filter((item) => item.category === 'Payment' && item.approvalStatus === 'Pending');
  const pendingPurchaseOrders = procurementRecords.filter((item) => item.type === 'po' && item.status?.toLowerCase().includes('pending'));
  const purchaseOrderPaymentCount = pendingPurchaseOrders.length;
  const requisitionApprovalCount = procurementRecords.filter((item) => item.type === 'requisition' && item.status?.toLowerCase().includes('pending')).length;
  const outstandingBills = records.filter((item) => item.category === 'Payment' && item.status !== 'Paid');
  const outstandingBillsTotal = outstandingBills.reduce((sum, item) => sum + (item.amountRequested || item.amountApproved || 0), 0);
  const invoiceRecords = records.filter((item) => item.category === 'Payment');
  const invoiceCount = invoiceRecords.length;
  const totalInvoiceAmount = invoiceRecords.reduce((sum, item) => sum + (item.amountRequested || item.amountApproved || item.amountSpent || 0), 0);
  const revenueCollected = summary.revenueCollected || 0;

  const monthlySummary = records.reduce((acc, item) => {
    const monthKey = getMonthKey(item.createdAt || item.createdAt);
    const row = acc[monthKey] || { budget: 0, expenditure: 0, paymentRequests: 0 };
    if (item.category === 'Budget') row.budget += item.amountApproved || item.amountRequested || 0;
    if (item.category === 'Expenditure') row.expenditure += item.amountSpent || item.amountRequested || 0;
    if (item.category === 'Payment' && item.approvalStatus === 'Pending') row.paymentRequests += 1;
    acc[monthKey] = row;
    return acc;
  }, {});

  const monthlyRows = Object.entries(monthlySummary)
    .sort((a, b) => new Date(b[0]) - new Date(a[0]))
    .slice(0, 6);

  const notificationThresholdAlerts = departmentSpending
    .filter((item) => item.totalApproved > 0 && item.totalSpent / item.totalApproved >= 0.85)
    .map((item) => ({
      title: `Budget alert: ${item.departmentName}`,
      detail: `${item.departmentName} has spent ${Math.round((item.totalSpent / item.totalApproved) * 100)}% of its approved budget.`,
    }));

  const notifications = [
    {
      title: 'Pending payment approvals',
      detail: `${pendingPaymentRequests.length} payment request${pendingPaymentRequests.length !== 1 ? 's' : ''} waiting for review.`,
    },
    ...notificationThresholdAlerts,
    {
      title: 'Overdue supplier invoices',
      detail: `${outstandingBills.length} unpaid bill${outstandingBills.length !== 1 ? 's' : ''} need attention.`,
    },
    {
      title: 'Procurement review',
      detail: `${requisitionApprovalCount} purchase requisition${requisitionApprovalCount !== 1 ? 's' : ''} pending procurement approval.`,
    },
  ];

  return (
    <div className="card finance-card">
      <div className="page-header">
        <span className="eyebrow">Finance Officer Dashboard</span>
        <h1>Finance Operations, Payments & Budget Control</h1>
        <p>Track budgets, expenditures, payments, revenue, invoices and procurement handoff from a unified finance workspace.</p>
      </div>

      <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="summary-card">
          <h3>Approved Budget</h3>
          <strong>{formatCurrency(approvedBudget)}</strong>
        </div>
        <div className="summary-card">
          <h3>Current Expenditure</h3>
          <strong>{formatCurrency(currentExpenditure)}</strong>
        </div>
        <div className="summary-card">
          <h3>Pending Payment Requests</h3>
          <strong>{pendingPaymentRequests.length}</strong>
        </div>
        <div className="summary-card">
          <h3>Pending Purchase Orders</h3>
          <strong>{purchaseOrderPaymentCount}</strong>
        </div>
        <div className="summary-card">
          <h3>Total Invoices</h3>
          <strong>{invoiceCount}</strong>
        </div>
        <div className="summary-card">
          <h3>Invoice Value</h3>
          <strong>{formatCurrency(totalInvoiceAmount)}</strong>
        </div>
      </div>

      <section className="modules-section" style={{ marginBottom: '1.5rem' }}>
        <div className="section-header theme-blue">
          <h2>Finance Modules & Responsibilities</h2>
          <p>Practical finance workflows for budgets, payments, revenue, expenses, invoices and procurement.</p>
        </div>
        <div className="feature-grid">
          {financeModules.map((module) => (
            <div className="feature-card" key={module.title}>
              <h3>{module.title}</h3>
              <p>{module.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3>Monthly Financial Summary</h3>
          <p style={{ margin: '0 0 1rem', color: '#475569' }}>Review the latest monthly totals by budget, expenses and payment requests.</p>
          {monthlyRows.length === 0 ? (
            <div className="empty-state">No monthly finance data available yet.</div>
          ) : (
            <div className="table-card" style={{ overflowX: 'auto' }}>
              <table className="file-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Approved Budget</th>
                    <th>Expenditure</th>
                    <th>Payment Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRows.map(([month, totals]) => (
                    <tr key={month}>
                      <td>{month}</td>
                      <td>{formatCurrency(totals.budget)}</td>
                      <td>{formatCurrency(totals.expenditure)}</td>
                      <td>{totals.paymentRequests}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '1.5rem' }}>
          <h3>Notifications</h3>
          <p style={{ margin: '0 0 1rem', color: '#475569' }}>Receive alerts for approvals, budgets, overdue invoices, and procurement deadlines.</p>
          {notifications.map((note) => (
            <div key={note.title} className="notification-card" style={{ marginBottom: '0.75rem', padding: '1rem', borderRadius: '0.75rem', background: '#f8fafc' }}>
              <strong>{note.title}</strong>
              <p style={{ margin: '0.5rem 0 0', color: '#475569' }}>{note.detail}</p>
            </div>
          ))}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/procurement" className="module-link">Open Procurement</Link>
            <Link to="/documents" className="module-link">Open Documents</Link>
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="section-header" style={{ marginBottom: '1rem' }}>
          <h2>Filters & Export</h2>
          <p style={{ margin: 0, color: '#475569' }}>Search, filter, and export finance records for reporting and audit.</p>
        </div>

        <div className="grid-columns" style={{ gap: '1rem', marginBottom: '1rem' }}>
          <label>
            Search
            <input
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search invoices, vendors, budget titles"
            />
          </label>
          <label>
            Category
            <select name="category" value={filters.category} onChange={handleFilterChange}>
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">All statuses</option>
              {recordStatuses.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Approval Status
            <select name="approvalStatus" value={filters.approvalStatus} onChange={handleFilterChange}>
              <option value="">All approval statuses</option>
              {approvalStatuses.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Department
            <select name="department" value={filters.department} onChange={handleFilterChange}>
              <option value="">All departments</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid-columns" style={{ gap: '1rem', marginBottom: '1rem', alignItems: 'end' }}>
          <label style={{ minWidth: '170px' }}>
            Export format
            <select name="exportFormat" value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
              <option value="pdf">PDF</option>
            </select>
          </label>
          <button type="button" onClick={handleExportRecords} className="button secondary">Export</button>
          <span style={{ color: '#475569' }}>Showing records page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalRecords} total).</span>
        </div>
        {exportError && <div className="message error-message" style={{ marginTop: '1rem' }}>{exportError}</div>}
      </section>

      <section className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="section-header" style={{ marginBottom: '1rem' }}>
          <h2>Audit Trail</h2>
          <p style={{ margin: 0, color: '#475569' }}>Recent finance activity logged for approvals, updates, and record changes.</p>
        </div>
        {auditTrail.length === 0 ? (
          <div className="empty-state">No recent finance audit events are available.</div>
        ) : (
          <>
            <div className="table-card" style={{ overflowX: 'auto' }}>
              <table className="file-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditTrail.map((log) => (
                    <tr key={log._id}>
                      <td>{formatDate(log.createdAt)}</td>
                      <td>{log.user?.name || log.user?.email || 'Unknown'}</td>
                      <td>{log.action}</td>
                      <td style={{ maxWidth: '360px', wordBreak: 'break-word' }}>{typeof log.details === 'string' ? log.details : JSON.stringify(log.details || {})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                className="button secondary"
                disabled={auditPagination.currentPage <= 1}
                onClick={() => setAuditPagination((prev) => ({ ...prev, currentPage: prev.currentPage - 1 }))}
              >
                Previous
              </button>
              <span style={{ color: '#475569' }}>
                Page {auditPagination.currentPage} of {auditPagination.totalPages} ({auditPagination.totalLogs} logs)
              </span>
              <button
                type="button"
                className="button secondary"
                disabled={auditPagination.currentPage >= auditPagination.totalPages}
                onClick={() => setAuditPagination((prev) => ({ ...prev, currentPage: prev.currentPage + 1 }))}
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>

      <section className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }} id="finance-export-area">
        <div className="section-header" style={{ marginBottom: '1rem' }}>
          <h2>Quick Actions</h2>
          <p style={{ margin: 0, color: '#475569' }}>Create budget proposals, payment records, and invoice-worthy finance entries.</p>
        </div>

        {canEdit ? (
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
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
            </div>

            <div className="grid-columns" style={{ gap: '1rem' }}>
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
            </div>

            <div className="grid-columns" style={{ gap: '1rem' }}>
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
                Reference #
                <input name="referenceNumber" value={form.referenceNumber} onChange={handleInputChange} />
              </label>
            </div>

            <div className="grid-columns" style={{ gap: '1rem' }}>
              <label>
                Vendor / Supplier
                <input name="vendor" value={form.vendor} onChange={handleInputChange} />
              </label>
              <label style={{ minWidth: '200px' }}>
                Description
                <textarea name="description" value={form.description} onChange={handleInputChange} rows="3" />
              </label>
            </div>

            <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Finance Record'}</button>
            {message && <div className="message success-message">{message}</div>}
            {errorMessage && <div className="message error-message">{errorMessage}</div>}
          </form>
        ) : (
          <div className="note card">
            <p>Only Finance Officers and Super Admins can create finance records.</p>
          </div>
        )}
      </section>

      <section className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="section-header" style={{ marginBottom: '1rem' }}>
          <h2>Department Utilization</h2>
          <p style={{ margin: 0, color: '#475569' }}>Budget utilization by department with automated threshold alerts.</p>
        </div>

        {departmentSpending.length === 0 ? (
          <div className="empty-state">No department budget utilization available yet.</div>
        ) : (
          <div className="stacked-list">
            {departmentSpending.map((dept) => {
              const utilization = dept.totalApproved ? (dept.totalSpent / dept.totalApproved) * 100 : 0;
              return (
                <div key={dept.departmentId} style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <strong>{dept.departmentName}</strong>
                    <span>{Math.round(utilization)}%</span>
                  </div>
                  <div style={{ background: '#e2e8f0', height: '12px', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, utilization)}%`, height: '100%', background: utilization >= 85 ? '#dc3545' : '#2563eb' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card" style={{ padding: '1.5rem' }}>
        <div className="section-header" style={{ marginBottom: '1rem' }}>
          <h2>Recent Finance Records</h2>
          <p style={{ margin: 0, color: '#475569' }}>Latest budgets, expenditures and payment activity.</p>
        </div>

        {loading ? (
          <p>Loading finance records…</p>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <h3>No finance records found</h3>
            <p>Create your first budget, expense or payment record above.</p>
          </div>
        ) : (
          <div className="table-card" style={{ overflowX: 'auto' }}>
            <table className="file-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Department</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Approval</th>
                  <th>Created</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 10).map((record) => (
                  <tr key={record._id}>
                    <td>{record.title}</td>
                    <td>{record.category}</td>
                    <td>{record.department?.name || 'N/A'}</td>
                    <td>{formatCurrency(record.amountRequested || record.amountApproved || record.amountSpent)}</td>
                    <td>{record.status}</td>
                    <td>{record.approvalStatus}</td>
                    <td>{formatDate(record.createdAt)}</td>
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
      </section>
    </div>
  );
}
