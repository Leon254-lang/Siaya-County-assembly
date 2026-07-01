import { useState, useEffect } from 'react';
import api from '../services/api';

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
};

const procurementActivities = [
  'Create and manage procurement plans.',
  'Create purchase requisitions.',
  'Review and approve requisitions within assigned authority levels.',
  'Generate purchase orders.',
  'Track procurement requests from initiation to completion.',
  'Manage procurement budgets and allocations.',
];

const storesActivities = [
  'Receiving goods delivered by suppliers.',
  'Verifying quantities and quality against delivery notes and LPOs.',
  'Updating stock records and inventory registers.',
  'Issuing items to departments.',
  'Conducting stock-taking and inventory audits.',
];

const recordsActivities = [
  'Filing procurement documents.',
  'Maintaining supplier databases.',
  'Organizing tender records and contract files.',
  'Digitizing procurement records.',
];

const itActivities = [
  'Data entry into procurement management systems.',
  'Managing procurement spreadsheets in Excel.',
  'Generating reports and summaries.',
  'Scanning and archiving procurement documents.',
  'Troubleshooting computers, printers, and scanners used in the department.',
  'Supporting electronic document management systems.',
  'Assisting with procurement software user accounts and permissions.',
];

const logbookExamples = [
  'Assisted in filing procurement documents.',
  'Prepared and updated supplier records.',
  'Received and verified delivered goods.',
  'Updated inventory records in Excel.',
  'Scanned and archived procurement documents.',
  'Assisted in preparing requests for quotations.',
  'Generated procurement reports.',
  'Maintained procurement department computer systems.',
];

export default function Procurement() {
  const [files, setFiles] = useState([]);
  const [plans, setPlans] = useState([
    { id: 1, name: 'ICT Equipment Refresh', department: 'ICT', budget: 850000, status: 'Approved', deadline: '2026-06-30' },
    { id: 2, name: 'Office Supplies Batch', department: 'Administration', budget: 320000, status: 'In Progress', deadline: '2026-07-10' },
    { id: 3, name: 'Furniture Replacement', department: 'Facilities', budget: 600000, status: 'Approved', deadline: '2026-08-15' },
    { id: 4, name: 'Vehicle Maintenance', department: 'Transport', budget: 150000, status: 'In Progress', deadline: '2026-09-30' },
  ]);
  const [requisitions, setRequisitions] = useState([
    { id: 101, title: 'Laptop Procurement', department: 'ICT', amount: 450000, status: 'Pending Approval', priority: 'High', requestedBy: 'Deputy Clerk', createdAt: '2026-06-11' },
    { id: 102, title: 'Stationery Supply', department: 'Administration', amount: 120000, status: 'Approved', priority: 'Medium', requestedBy: 'Procurement Officer', createdAt: '2026-06-10' },
  ]);
  const [purchaseOrders, setPurchaseOrders] = useState([
    { id: 201, requisitionId: 102, supplier: 'County Supplies Ltd', amount: 120000, status: 'Issued', issuedAt: '2026-06-11' },
  ]);
  const [tenders, setTenders] = useState([
    { id: 401, title: 'ICT Equipment Supply', status: 'Open', bids: 4, closingDate: '2026-06-20', recommendation: 'Pending Evaluation' },
    { id: 402, title: 'Office Furniture Supply', status: 'Awarded', bids: 6, closingDate: '2026-06-14', recommendation: 'Recommended: County Supplies Ltd' },
  ]);
  const [inventoryItems, setInventoryItems] = useState([
    { id: 501, name: 'Laptop', category: 'ICT', stock: 18, reorderLevel: 5, status: 'Available' },
    { id: 502, name: 'Printer Paper', category: 'Office', stock: 3, reorderLevel: 10, status: 'Low Stock' },
  ]);
  const [contracts, setContracts] = useState([
    { id: 601, title: 'ICT Equipment Maintenance', supplier: 'TechHub Solutions', expiryDate: '2026-12-31', performance: 'On Track', documentStatus: 'Stored electronically' },
    { id: 602, title: 'Office Supplies Framework', supplier: 'County Supplies Ltd', expiryDate: '2026-09-30', performance: 'Needs Review', documentStatus: 'Stored electronically' },
  ]);
  const [reports, setReports] = useState([
    { id: 701, title: 'Procurement Report', status: 'Ready', summary: 'Monthly procurement activity and request status.' },
    { id: 702, title: 'Supplier Performance Report', status: 'Ready', summary: 'Supplier ratings, categories, and delivery performance.' },
    { id: 703, title: 'Tender Evaluation Report', status: 'Ready', summary: 'Bid comparison and recommendation outcomes.' },
    { id: 704, title: 'Expenditure & Procurement Summary', status: 'Ready', summary: 'Budget usage, orders issued, and procurement spend.' },
  ]);
  const [documentRecords, setDocumentRecords] = useState([
    { id: 801, title: 'Quotation - Office Furniture', category: 'Quotation', reference: 'QTN/2026/001', status: 'Stored', date: '2026-06-01' },
    { id: 802, title: 'Invoice - ICT Supplies', category: 'Invoice', reference: 'INV/2026/042', status: 'Matched', date: '2026-06-05' },
    { id: 803, title: 'Contract - Maintenance Services', category: 'Contract', reference: 'CNT/2026/018', status: 'Archived', date: '2026-06-08' },
  ]);
  const [auditTrail, setAuditTrail] = useState([
    { id: 901, event: 'Purchase requisition approved', actor: 'Procurement Officer', time: '09:45 AM' },
    { id: 902, event: 'Low stock alert triggered for printer paper', actor: 'Stores Clerk', time: '11:10 AM' },
    { id: 903, event: 'Contract expiry reminder generated', actor: 'Compliance Unit', time: '01:25 PM' },
  ]);
  const [suppliers, setSuppliers] = useState([
    { id: 301, name: 'County Supplies Ltd', category: 'Office Supplies', performance: 'Excellent', status: 'Active', contact: 'procurement@countysupplies.co.ke' },
    { id: 302, name: 'TechHub Solutions', category: 'ICT Equipment', performance: 'Good', status: 'Active', contact: 'sales@techhubsolutions.co.ke' },
  ]);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [userRole, setUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState('');
  const [deleting, setDeleting] = useState({});
  const [planForm, setPlanForm] = useState({ name: '', department: '', budget: '', deadline: '', status: 'In Progress' });
  const [requisitionForm, setRequisitionForm] = useState({ title: '', department: '', amount: '', priority: 'Medium', requestedBy: '', description: '' });
  const [supplierForm, setSupplierForm] = useState({ name: '', category: '', performance: 'Good', status: 'Active', contact: '' });
  const [tenderForm, setTenderForm] = useState({ title: '', closingDate: '', status: 'Open', bids: '', recommendation: '' });
  const [inventoryForm, setInventoryForm] = useState({ name: '', category: '', stock: '', reorderLevel: '', status: 'Available' });
  const [contractForm, setContractForm] = useState({ title: '', supplier: '', expiryDate: '', performance: 'On Track', documentStatus: 'Stored electronically' });
  const [reportForm, setReportForm] = useState({ title: '', type: 'Procurement Report', summary: '' });
  const [documentForm, setDocumentForm] = useState({ title: '', category: 'Quotation', reference: '', status: 'Stored', date: '' });
  const [documentSearch, setDocumentSearch] = useState('');

  const isHOD = userRole === 'HOD' || userRole === 'Super Admin';
  const canUpload =
    isHOD ||
    userRole === 'Procurement Officer' ||
    userRole?.includes('Admin');

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    setUserRole(role);
    setCurrentUserId(userId || '');
    fetchFiles();
    fetchRecords();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const response = await api.get('/procurement/files');
      setFiles(response.data.files || []);
    } catch (error) {
      console.error('Failed to load procurement documents:', error);
      setErrorMessage('Could not load procurement documents. Please refresh or check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    try {
      setRecordsLoading(true);
      const response = await api.get('/procurement-records');
      const records = response.data.records || [];
      if (records.length) {
        setPlans(records.filter((item) => item.type === 'plan'));
        setRequisitions(records.filter((item) => item.type === 'requisition'));
        setPurchaseOrders(records.filter((item) => item.type === 'po'));
        setSuppliers(records.filter((item) => item.type === 'supplier'));
        setTenders(records.filter((item) => item.type === 'tender'));
        setInventoryItems(records.filter((item) => item.type === 'inventory'));
        setContracts(records.filter((item) => item.type === 'contract'));
        setReports(records.filter((item) => item.type === 'report'));
        setDocumentRecords(records.filter((item) => item.type === 'document'));
      }
    } catch (error) {
      console.error('Failed to load procurement records:', error);
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleFilesSelected = (event) => {
    const filesArray = Array.from(event.target.files || []);
    setSelectedFiles(filesArray);
    setErrorMessage('');
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) {
      setErrorMessage('Please select one or more files first.');
      return;
    }

    if (!canUpload) {
      setErrorMessage('Only Procurement Officer, HOD, Admin, or Super Admin can upload procurement documents.');
      return;
    }

    const data = new FormData();
    selectedFiles.forEach((file) => data.append('files', file));
    if (description) {
      data.append('description', description);
    }

    try {
      setUploading(true);
      setUploadMessage('Uploading documents...');
      setErrorMessage('');
      await api.post('/procurement/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadMessage('Documents uploaded successfully.');
      setDescription('');
      setSelectedFiles([]);
      setFileInputKey(Date.now());
      fetchFiles();
    } catch (error) {
      console.error('Upload failed:', error);
      if (error?.response?.status === 403) {
        setErrorMessage('You do not have permission to upload procurement documents. Only Procurement Officer, HOD, or Admin users can upload.');
      } else {
        setErrorMessage(error?.response?.data?.message || 'Unable to upload documents.');
      }
      setUploadMessage('');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      setDeleting({ ...deleting, [documentId]: true });
      setErrorMessage('');
      await api.delete(`/procurement/${documentId}`);
      setUploadMessage('Document deleted successfully.');
      fetchFiles();
    } catch (error) {
      console.error('Delete failed:', error);
      setErrorMessage(error?.response?.data?.message || 'Unable to delete document.');
    } finally {
      setDeleting({ ...deleting, [documentId]: false });
    }
  };

  const fileCount = files.length;
  const latestUpload = files[0] ? formatDateTime(files[0].uploadedAt) : 'No uploads yet';
  const totalBudget = plans.reduce((sum, item) => sum + Number(item.budget || 0), 0);
  const pendingApprovals = requisitions.filter((item) => item.status === 'Pending Approval').length;
  const completedOrders = purchaseOrders.filter((item) => item.status === 'Completed' || item.status === 'Issued').length;
  const lowStockItems = inventoryItems.filter((item) => item.stock <= item.reorderLevel);
  const renewalReminders = contracts.filter((item) => {
    const expiry = new Date(item.expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 45;
  });
  const workflowCompletion = Math.min(100, Math.round(((plans.length + requisitions.length + purchaseOrders.length + suppliers.length + tenders.length + inventoryItems.length + contracts.length) / 70) * 100));
  const openTenders = tenders.filter((item) => item.status === 'Open' || item.status === 'Under Evaluation').length;
  const totalExpenditure = purchaseOrders.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const supplierStats = suppliers.reduce((acc, item) => {
    acc[item.performance] = (acc[item.performance] || 0) + 1;
    return acc;
  }, {});
  const complianceChecks = [
    'Procurement records are archived and accessible for audit review.',
    'Approved requisitions and purchase orders are aligned with policy thresholds.',
    'Supplier performance and tender outcomes are regularly reviewed.',
  ];
  const notifications = [
    {
      id: 'approval',
      title: 'Pending approvals',
      detail: `${pendingApprovals} requisition${pendingApprovals === 1 ? '' : 's'} need${pendingApprovals === 1 ? 's' : ''} review.`,
      tone: 'warning',
    },
    {
      id: 'stock',
      title: 'Low stock alerts',
      detail: `${lowStockItems.length} item${lowStockItems.length === 1 ? '' : 's'} are below or at reorder level.`,
      tone: 'danger',
    },
    {
      id: 'renewal',
      title: 'Contract renewal reminders',
      detail: `${renewalReminders.length} contract${renewalReminders.length === 1 ? '' : 's'} need${renewalReminders.length === 1 ? 's' : ''} renewal attention soon.`,
      tone: 'info',
    },
  ];

  const handlePlanFormChange = (event) => {
    const { name, value } = event.target;
    setPlanForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRequisitionFormChange = (event) => {
    const { name, value } = event.target;
    setRequisitionForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSupplierFormChange = (event) => {
    const { name, value } = event.target;
    setSupplierForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTenderFormChange = (event) => {
    const { name, value } = event.target;
    setTenderForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleInventoryFormChange = (event) => {
    const { name, value } = event.target;
    setInventoryForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleContractFormChange = (event) => {
    const { name, value } = event.target;
    setContractForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleReportFormChange = (event) => {
    const { name, value } = event.target;
    setReportForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDocumentFormChange = (event) => {
    const { name, value } = event.target;
    setDocumentForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlanSubmit = async (event) => {
    event.preventDefault();
    if (!planForm.name || !planForm.department || !planForm.budget) return;

    const record = {
      type: 'plan',
      title: planForm.name,
      department: planForm.department,
      budget: Number(planForm.budget),
      status: planForm.status,
      deadline: planForm.deadline || 'TBD',
    };

    try {
      const response = await api.post('/procurement-records', record);
      setPlans((prev) => [
        { id: response.data._id, name: response.data.title, department: response.data.department, budget: response.data.budget, status: response.data.status, deadline: response.data.deadline },
        ...prev,
      ]);
      setPlanForm({ name: '', department: '', budget: '', deadline: '', status: 'In Progress' });
    } catch (error) {
      console.error('Failed to save plan:', error);
      setErrorMessage('Unable to save procurement plan to the backend.');
    }
  };

  const handleRequisitionSubmit = async (event) => {
    event.preventDefault();
    if (!requisitionForm.title || !requisitionForm.department || !requisitionForm.amount) return;

    const record = {
      type: 'requisition',
      title: requisitionForm.title,
      department: requisitionForm.department,
      amount: Number(requisitionForm.amount),
      status: 'Pending Approval',
      priority: requisitionForm.priority,
      requestedBy: requisitionForm.requestedBy || 'Department Head',
      description: requisitionForm.description,
    };

    try {
      const response = await api.post('/procurement-records', record);
      setRequisitions((prev) => [
        { id: response.data._id, title: response.data.title, department: response.data.department, amount: response.data.amount, status: response.data.status, priority: response.data.priority, requestedBy: response.data.requestedBy, createdAt: new Date(response.data.createdAt).toISOString().slice(0, 10) },
        ...prev,
      ]);
      setRequisitionForm({ title: '', department: '', amount: '', priority: 'Medium', requestedBy: '', description: '' });
    } catch (error) {
      console.error('Failed to save requisition:', error);
      setErrorMessage('Unable to save requisition to the backend.');
    }
  };

  const updateRequisitionStatus = async (id, status) => {
    try {
      let updatedRecord = null;
      if (typeof id === 'string' && id.length >= 8) {
        const response = await api.put(`/procurement-records/${id}`, { status });
        updatedRecord = response.data;
      }

      setRequisitions((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          return { ...item, status: updatedRecord?.status || status };
        })
      );

      await fetchRecords();
    } catch (error) {
      console.error('Failed to update requisition status:', error);
      setErrorMessage('Unable to update requisition status in the backend.');
    }
  };

  const generatePurchaseOrder = async (requisition) => {
    try {
      const response = await api.post('/procurement-records', {
        type: 'po',
        requisitionId: requisition.id,
        supplier: `${requisition.department} Vendor`,
        amount: requisition.amount,
        status: 'Issued',
        issuedAt: new Date().toISOString().slice(0, 10),
        title: `PO for ${requisition.title}`,
      });

      setPurchaseOrders((prev) => [
        {
          id: response.data._id,
          requisitionId: response.data.requisitionId,
          supplier: response.data.supplier,
          amount: response.data.amount,
          status: response.data.status,
          issuedAt: response.data.issuedAt,
        },
        ...prev,
      ]);

      await api.put(`/procurement-records/${requisition.id}`, { status: 'Approved' });
      await fetchRecords();
    } catch (error) {
      console.error('Failed to generate purchase order:', error);
      setErrorMessage('Unable to save purchase order to the backend.');
      return;
    }
  };

  const handleSupplierSubmit = async (event) => {
    event.preventDefault();
    if (!supplierForm.name || !supplierForm.category) return;

    const record = {
      type: 'supplier',
      title: supplierForm.name,
      category: supplierForm.category,
      performance: supplierForm.performance,
      status: supplierForm.status,
      contact: supplierForm.contact || 'Contact details pending',
    };

    try {
      const response = await api.post('/procurement-records', record);
      setSuppliers((prev) => [
        { id: response.data._id, name: response.data.title, category: response.data.category, performance: response.data.performance, status: response.data.status, contact: response.data.contact },
        ...prev,
      ]);
      setSupplierForm({ name: '', category: '', performance: 'Good', status: 'Active', contact: '' });
    } catch (error) {
      console.error('Failed to save supplier:', error);
      setErrorMessage('Unable to save supplier record to the backend.');
    }
  };

  const handleTenderSubmit = async (event) => {
    event.preventDefault();
    if (!tenderForm.title || !tenderForm.closingDate) return;

    const record = {
      type: 'tender',
      title: tenderForm.title,
      status: tenderForm.status,
      bids: Number(tenderForm.bids) || 0,
      closingDate: tenderForm.closingDate,
      recommendation: tenderForm.recommendation || 'Pending Evaluation',
    };

    try {
      const response = await api.post('/procurement-records', record);
      setTenders((prev) => [
        { id: response.data._id, title: response.data.title, status: response.data.status, bids: response.data.bids, closingDate: response.data.closingDate, recommendation: response.data.recommendation },
        ...prev,
      ]);
      setTenderForm({ title: '', closingDate: '', status: 'Open', bids: '', recommendation: '' });
    } catch (error) {
      console.error('Failed to save tender:', error);
      setErrorMessage('Unable to save tender record to the backend.');
    }
  };

  const handleInventorySubmit = async (event) => {
    event.preventDefault();
    if (!inventoryForm.name || !inventoryForm.category) return;

    const record = {
      type: 'inventory',
      title: inventoryForm.name,
      category: inventoryForm.category,
      stock: Number(inventoryForm.stock) || 0,
      reorderLevel: Number(inventoryForm.reorderLevel) || 0,
      status: Number(inventoryForm.stock) <= Number(inventoryForm.reorderLevel) ? 'Low Stock' : inventoryForm.status,
    };

    try {
      const response = await api.post('/procurement-records', record);
      setInventoryItems((prev) => [
        { id: response.data._id, name: response.data.title, category: response.data.category, stock: response.data.stock, reorderLevel: response.data.reorderLevel, status: response.data.status },
        ...prev,
      ]);
      setInventoryForm({ name: '', category: '', stock: '', reorderLevel: '', status: 'Available' });
    } catch (error) {
      console.error('Failed to save inventory:', error);
      setErrorMessage('Unable to save inventory record to the backend.');
    }
  };

  const handleContractSubmit = async (event) => {
    event.preventDefault();
    if (!contractForm.title || !contractForm.supplier || !contractForm.expiryDate) return;

    const record = {
      type: 'contract',
      title: contractForm.title,
      supplier: contractForm.supplier,
      expiryDate: contractForm.expiryDate,
      performance: contractForm.performance,
      documentStatus: contractForm.documentStatus,
    };

    try {
      const response = await api.post('/procurement-records', record);
      setContracts((prev) => [
        { id: response.data._id, title: response.data.title, supplier: response.data.supplier, expiryDate: response.data.expiryDate, performance: response.data.performance, documentStatus: response.data.documentStatus },
        ...prev,
      ]);
      setContractForm({ title: '', supplier: '', expiryDate: '', performance: 'On Track', documentStatus: 'Stored electronically' });
    } catch (error) {
      console.error('Failed to save contract:', error);
      setErrorMessage('Unable to save contract record to the backend.');
    }
  };

  const handleReportSubmit = async (event) => {
    event.preventDefault();
    if (!reportForm.title) return;

    const record = {
      type: 'report',
      title: reportForm.title,
      status: 'Ready',
      summary: reportForm.summary || 'Report generated for procurement review.',
    };

    try {
      const response = await api.post('/procurement-records', record);
      setReports((prev) => [
        { id: response.data._id, title: response.data.title, status: response.data.status, summary: response.data.summary },
        ...prev,
      ]);
      setReportForm({ title: '', type: 'Procurement Report', summary: '' });
    } catch (error) {
      console.error('Failed to save report:', error);
      setErrorMessage('Unable to save report record to the backend.');
    }
  };

  const handlePrintTender = (tender) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      setErrorMessage('Please allow pop-ups to print tender documents.');
      return;
    }

    const content = `
      <html>
        <head>
          <title>Print Tender - ${tender.title}</title>
          <style>
            @page { size: A4; margin: 16mm; }
            body { font-family: Arial, Helvetica, sans-serif; color: #111827; padding: 18px; background: #fff; }
            .header { border-bottom: 2px solid #b22234; padding-bottom: 10px; margin-bottom: 12px; }
            .title { font-size: 22px; font-weight: 700; color: #111827; margin: 0; }
            .sub { color: #4b5563; font-size: 12px; margin-top: 4px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
            .box { border: 1px solid #d1d5db; border-radius: 10px; padding: 12px; background: #fff; }
            .label { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 2px; }
            .value { font-size: 14px; font-weight: 600; color: #111827; }
            .note { color: #374151; font-size: 12px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Tender Document</div>
            <div class="sub">Siaya County Assembly Procurement Office · Official printout</div>
          </div>
          <div class="grid">
            <div class="box"><div class="label">Tender title</div><div class="value">${tender.title || 'Untitled tender'}</div></div>
            <div class="box"><div class="label">Status</div><div class="value">${tender.status || 'Pending'}</div></div>
            <div class="box"><div class="label">Bids received</div><div class="value">${tender.bids || 0}</div></div>
            <div class="box"><div class="label">Closing date</div><div class="value">${tender.closingDate || 'Not specified'}</div></div>
          </div>
          <div class="box" style="margin-top:12px;">
            <div class="label">Recommendation / award notice</div>
            <div class="value">${tender.recommendation || 'Pending evaluation'}</div>
          </div>
          <div class="note">Generated from the procurement dashboard. Print this page for official tender record keeping.</div>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handlePrintSupplier = (supplier) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      setErrorMessage('Please allow pop-ups to print supplier documents.');
      return;
    }

    const content = `
      <html>
        <head>
          <title>Print Supplier - ${supplier.name}</title>
          <style>@page{size:A4;margin:16mm;}body{font-family:Arial,Helvetica,sans-serif;color:#111827;padding:18px;background:#fff;}.header{border-bottom:2px solid #b22234;padding-bottom:10px;margin-bottom:12px;}.title{font-size:22px;font-weight:700;color:#111827;margin:0;}.sub{color:#4b5563;font-size:12px;margin-top:4px;}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;}.box{border:1px solid #d1d5db;border-radius:10px;padding:12px;background:#fff;}.label{color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;}.value{font-size:14px;font-weight:600;color:#111827;}.note{color:#374151;font-size:12px;margin-top:10px;}</style>
        </head>
        <body>
          <div class="header"><div class="title">Supplier Record</div><div class="sub">Siaya County Assembly Procurement Office · Official printout</div></div>
          <div class="grid">
            <div class="box"><div class="label">Supplier name</div><div class="value">${supplier.name || 'Unnamed supplier'}</div></div>
            <div class="box"><div class="label">Category</div><div class="value">${supplier.category || 'Not specified'}</div></div>
            <div class="box"><div class="label">Performance</div><div class="value">${supplier.performance || 'Not rated'}</div></div>
            <div class="box"><div class="label">Status</div><div class="value">${supplier.status || 'Active'}</div></div>
          </div>
          <div class="box" style="margin-top:12px;"><div class="label">Contact</div><div class="value">${supplier.contact || 'Not provided'}</div></div>
          <div class="note">Generated from the procurement dashboard. Print this page for supplier documentation.</div>
        </body>
      </html>`;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handlePrintContract = (contract) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      setErrorMessage('Please allow pop-ups to print contract documents.');
      return;
    }

    const content = `
      <html>
        <head>
          <title>Print Contract - ${contract.title}</title>
          <style>@page{size:A4;margin:16mm;}body{font-family:Arial,Helvetica,sans-serif;color:#111827;padding:18px;background:#fff;}.header{border-bottom:2px solid #b22234;padding-bottom:10px;margin-bottom:12px;}.title{font-size:22px;font-weight:700;color:#111827;margin:0;}.sub{color:#4b5563;font-size:12px;margin-top:4px;}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;}.box{border:1px solid #d1d5db;border-radius:10px;padding:12px;background:#fff;}.label{color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;}.value{font-size:14px;font-weight:600;color:#111827;}.note{color:#374151;font-size:12px;margin-top:10px;}</style>
        </head>
        <body>
          <div class="header"><div class="title">Contract Record</div><div class="sub">Siaya County Assembly Procurement Office · Official printout</div></div>
          <div class="grid">
            <div class="box"><div class="label">Contract title</div><div class="value">${contract.title || 'Untitled contract'}</div></div>
            <div class="box"><div class="label">Supplier</div><div class="value">${contract.supplier || 'Not specified'}</div></div>
            <div class="box"><div class="label">Expiry date</div><div class="value">${contract.expiryDate || 'Not specified'}</div></div>
            <div class="box"><div class="label">Performance</div><div class="value">${contract.performance || 'On Track'}</div></div>
          </div>
          <div class="box" style="margin-top:12px;"><div class="label">Document status</div><div class="value">${contract.documentStatus || 'Stored electronically'}</div></div>
          <div class="note">Generated from the procurement dashboard. Print this page for contract administration.</div>
        </body>
      </html>`;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handlePrintPurchaseOrder = (order) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      setErrorMessage('Please allow pop-ups to print purchase orders.');
      return;
    }

    const content = `
      <html>
        <head>
          <title>Print Purchase Order - ${order.id}</title>
          <style>@page{size:A4;margin:16mm;}body{font-family:Arial,Helvetica,sans-serif;color:#111827;padding:18px;background:#fff;}.header{border-bottom:2px solid #b22234;padding-bottom:10px;margin-bottom:12px;}.title{font-size:22px;font-weight:700;color:#111827;margin:0;}.sub{color:#4b5563;font-size:12px;margin-top:4px;}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;}.box{border:1px solid #d1d5db;border-radius:10px;padding:12px;background:#fff;}.label{color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:2px;}.value{font-size:14px;font-weight:600;color:#111827;}.note{color:#374151;font-size:12px;margin-top:10px;}</style>
        </head>
        <body>
          <div class="header"><div class="title">Purchase Order</div><div class="sub">Siaya County Assembly Procurement Office · Official printout</div></div>
          <div class="grid">
            <div class="box"><div class="label">PO number</div><div class="value">PO-${order.id || '000'}</div></div>
            <div class="box"><div class="label">Status</div><div class="value">${order.status || 'Issued'}</div></div>
            <div class="box"><div class="label">Supplier</div><div class="value">${order.supplier || 'Not specified'}</div></div>
            <div class="box"><div class="label">Amount</div><div class="value">${new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(order.amount || 0)}</div></div>
          </div>
          <div class="note">Generated from the procurement dashboard. Print this page for purchase order records.</div>
        </body>
      </html>`;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleDocumentSubmit = async (event) => {
    event.preventDefault();
    if (!documentForm.title || !documentForm.reference) return;

    const record = {
      type: 'document',
      title: documentForm.title,
      category: documentForm.category,
      reference: documentForm.reference,
      status: documentForm.status,
      date: documentForm.date || new Date().toISOString().slice(0, 10),
    };

    try {
      const response = await api.post('/procurement-records', record);
      setDocumentRecords((prev) => [
        { id: response.data._id, title: response.data.title, category: response.data.category, reference: response.data.reference, status: response.data.status, date: response.data.date },
        ...prev,
      ]);
      setDocumentForm({ title: '', category: 'Quotation', reference: '', status: 'Stored', date: '' });
    } catch (error) {
      console.error('Failed to save document record:', error);
      setErrorMessage('Unable to save document record to the backend.');
    }
  };

  const filteredDocumentRecords = documentRecords.filter((item) => {
    const query = documentSearch.trim().toLowerCase();
    if (!query) return true;

    return [item.title, item.category, item.reference, item.status].some((value) =>
      String(value).toLowerCase().includes(query)
    );
  });

  const clerkModules = [
    { title: 'Dashboard', description: 'View pending approvals, upcoming sittings, notifications, and statistics.' },
    { title: 'Member Management', description: 'Register, update, suspend, and manage MCAs and staff records.' },
    { title: 'Assembly Sessions', description: 'Schedule sittings, publish agendas, record attendance, and manage calendars.' },
    { title: 'Bills Management', description: 'Create, review, approve, track, and archive bills through different legislative stages.' },
    { title: 'Motions & Petitions', description: 'Receive, assign, approve, and track motions and public petitions.' },
    { title: 'Committee Management', description: 'Create committees, assign members, schedule meetings, and upload reports.' },
    { title: 'Minutes & Hansard', description: 'Record proceedings, upload minutes, and maintain official Assembly records.' },
    { title: 'Document Management', description: 'Upload, organize, search, approve, and archive official documents.' },
    { title: 'Correspondence', description: 'Receive and send official letters, memos, notices, and circulars.' },
    { title: 'Public Participation', description: 'Publish notices, receive public submissions, and manage feedback.' },
    { title: 'User Management', description: 'Create accounts, assign roles, reset passwords, and manage permissions.' },
    { title: 'Reports', description: 'Generate attendance, committee, legislative, financial, and activity reports.' },
    { title: 'Notifications', description: 'Send meeting reminders, announcements, and approval requests.' },
    { title: 'Budget & Finance (Optional)', description: 'View budgets, approve expenditures, and monitor Assembly finances.' },
    { title: 'Audit Logs', description: 'Track all user activities for accountability and security.' },
  ];

  return (
    <div className="card procurement-card">
      <div className="procurement-header">
        <div>
          <span className="eyebrow">Clerk’s Office</span>
          <h1>Module Functions</h1>
          <p>Core functions available through the Clerk’s page.</p>
        </div>
      </div>

      <div className="procurement-info-grid" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', width: '100%', marginTop: '1rem' }}>
        {clerkModules.map((module) => (
          <section key={module.title} className="card" style={{ padding: '1rem' }}>
            <h3 style={{ marginTop: 0 }}>{module.title}</h3>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)' }}>{module.description}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
