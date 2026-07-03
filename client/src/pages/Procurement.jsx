import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount);
};

const formatDate = (value) => {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
};

const statusBadge = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('pending') || normalized.includes('open') || normalized.includes('submitted') || normalized.includes('clarification')) return 'badge badge-warning';
  if (normalized.includes('approved') || normalized.includes('issued') || normalized.includes('on track')) return 'badge badge-success';
  if (normalized.includes('rejected') || normalized.includes('needs review') || normalized.includes('poor') || normalized.includes('expiring')) return 'badge badge-danger';
  return 'badge badge-secondary';
};

export default function Procurement() {
  const [records, setRecords] = useState([]);
  const [procurementFiles, setProcurementFiles] = useState([]);
  const [procurementAnnouncements, setProcurementAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [requisitionForm, setRequisitionForm] = useState({ title: '', department: '', amount: '', priority: 'Medium', requestedBy: '', description: '' });
  const [supplierForm, setSupplierForm] = useState({ title: '', category: '', performance: 'Good', status: 'Active', contact: '' });
  const [tenderForm, setTenderForm] = useState({ title: '', closingDate: '', status: 'Open', bids: '0', recommendation: 'Pending Evaluation' });
  const [contractForm, setContractForm] = useState({ title: '', supplier: '', expiryDate: '', performance: 'On Track', documentStatus: 'Stored electronically' });
  const [planForm, setPlanForm] = useState({ title: '', department: '', budget: '', status: 'In Progress', deadline: '' });
  const [inventoryForm, setInventoryForm] = useState({ title: '', category: '', stock: '', reorderLevel: '', status: 'Available' });
  const [reportForm, setReportForm] = useState({ title: '', summary: '', status: 'Ready' });
  const [documentForm, setDocumentForm] = useState({ title: '', category: 'Quotation', reference: '', status: 'Stored', date: '' });
  const [selectedRequisition, setSelectedRequisition] = useState(null);
  const [requisitionItems, setRequisitionItems] = useState([]);
  const [newItem, setNewItem] = useState({ itemName: '', quantity: '', unit: '', justification: '' });
  const [requisitionNotes, setRequisitionNotes] = useState('');
  const [showRequisitionDetails, setShowRequisitionDetails] = useState(false);

  const procurementRecords = records || [];
  const requisitions = procurementRecords.filter((item) => item.type === 'requisition');
  const suppliers = procurementRecords.filter((item) => item.type === 'supplier');
  const tenders = procurementRecords.filter((item) => item.type === 'tender');
  const purchaseOrders = procurementRecords.filter((item) => item.type === 'po');
  const inventoryItems = procurementRecords.filter((item) => item.type === 'inventory');
  const contracts = procurementRecords.filter((item) => item.type === 'contract');
  const plans = procurementRecords.filter((item) => item.type === 'plan');
  const reports = procurementRecords.filter((item) => item.type === 'report');
  const documentRecords = procurementRecords.filter((item) => item.type === 'document');

  const pendingRequisitions = requisitions.filter((item) => item.status?.toLowerCase().includes('pending')).length;
  const rfqsInProgress = tenders.filter((item) => ['open', 'under evaluation', 'pending'].some((status) => item.status?.toLowerCase().includes(status))).length;
  const openTenders = tenders.filter((item) => item.status?.toLowerCase().includes('open')).length;
  const purchaseOrdersIssued = purchaseOrders.filter((item) => ['issued', 'approved'].some((status) => item.status?.toLowerCase().includes(status))).length;
  const deliveriesPendingInspection = inventoryItems.filter((item) => ['pending inspection', 'low stock', 'awaiting inspection'].some((status) => item.status?.toLowerCase().includes(status))).length;
  const contractsExpiringSoon = contracts.filter((item) => {
    if (!item.expiryDate) return false;
    const expiry = new Date(item.expiryDate);
    const diff = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 60;
  }).length;
  const supplierPerformanceAlerts = suppliers.filter((item) => ['needs review', 'poor', 'at risk', 'unreliable'].some((value) => item.performance?.toLowerCase().includes(value))).length;
  const notificationCount = pendingRequisitions + deliveriesPendingInspection + contractsExpiringSoon + supplierPerformanceAlerts + procurementAnnouncements.length;

  const summaryMetrics = [
    { label: 'Pending Purchase Requisitions', value: pendingRequisitions, anchor: '#requisitions' },
    { label: 'RFQs in Progress', value: rfqsInProgress, anchor: '#tenders' },
    { label: 'Open Tenders', value: openTenders, anchor: '#tenders' },
    { label: 'Purchase Orders Issued', value: purchaseOrdersIssued, anchor: '#purchase-orders' },
    { label: 'Deliveries Pending Inspection', value: deliveriesPendingInspection, anchor: '#delivery-management' },
    { label: 'Contracts Expiring Soon', value: contractsExpiringSoon, anchor: '#contracts' },
    { label: 'Supplier Performance Alerts', value: supplierPerformanceAlerts, anchor: '#suppliers' },
    { label: 'Notifications', value: notificationCount, anchor: '#notifications' },
  ];

  const procurementNotifications = procurementAnnouncements.map((announcement) => ({
    title: announcement.title,
    detail: announcement.body,
  }));

  const notifications = [
    {
      title: 'New requisitions for review',
      detail: `${pendingRequisitions} requisition${pendingRequisitions === 1 ? '' : 's'} require validation before forwarding to approval.`,
    },
    {
      title: 'Tender milestones',
      detail: `${openTenders} open tender${openTenders === 1 ? '' : 's'} are accepting submissions.`,
    },
    {
      title: 'Contract expiry reminders',
      detail: `${contractsExpiringSoon} contract${contractsExpiringSoon === 1 ? '' : 's'} are due to expire within 60 days.`,
    },
    {
      title: 'Pending inspection',
      detail: `${deliveriesPendingInspection} delivery item${deliveriesPendingInspection === 1 ? '' : 's'} need inspection or verification.`,
    },
    ...procurementNotifications,
  ];

  useEffect(() => {
    loadProcurementData();
  }, []);

  const loadProcurementData = async () => {
    setLoading(true);
    setError('');
    try {
      const [recordsResponse, filesResponse, announcementsResponse] = await Promise.all([
        api.get('/procurement-records'),
        api.get('/procurement/files'),
        api.get('/communications/announcements?role=Procurement Officer&limit=8'),
      ]);
      setRecords(recordsResponse.data.records || []);
      setProcurementFiles(filesResponse.data.files || []);
      setProcurementAnnouncements(announcementsResponse.data || []);
    } catch (err) {
      console.error(err);
      setError('Unable to load procurement dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const updateRecord = async (id, payload, successMessage) => {
    setError('');
    setMessage('');
    try {
      await api.put(`/procurement-records/${id}`, payload);
      setMessage(successMessage);
      setSelectedRequisition(null);
      setShowRequisitionDetails(false);
      setRequisitionItems([]);
      setRequisitionNotes('');
      await loadProcurementData();
    } catch (err) {
      console.error(err);
      setError('Unable to update record.');
    }
  };

  const handleAddRequisitionItem = () => {
    if (!newItem.itemName || !newItem.quantity) return;
    setRequisitionItems((prev) => [
      ...prev,
      { itemName: newItem.itemName, quantity: Number(newItem.quantity), unit: newItem.unit, justification: newItem.justification }
    ]);
    setNewItem({ itemName: '', quantity: '', unit: '', justification: '' });
  };

  const handleRemoveRequisitionItem = (index) => {
    setRequisitionItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const openRequisitionDetails = (item) => {
    setSelectedRequisition(item);
    setRequisitionItems(item.items || []);
    setRequisitionNotes(item.registryNotes || '');
    setShowRequisitionDetails(true);
  };

  const handleSubmitRequisitionDetails = async () => {
    if (!selectedRequisition) return;
    await updateRecord(selectedRequisition._id || selectedRequisition.id, {
      items: requisitionItems,
      registryNotes: requisitionNotes,
      status: 'Submitted to Registry',
      workflowStage: 'Submitted to Registry',
    }, 'Requisition filled and submitted to registry.');
  };

  const handleForwardToClerk = async (item) => {
    await updateRecord(item._id || item.id, {
      status: 'Submitted to Clerk',
      workflowStage: 'Submitted to Clerk',
    }, 'Requisition forwarded to clerk.');
  };

  const handleForwardToStores = async (item) => {
    await updateRecord(item._id || item.id, {
      status: 'Submitted to Stores',
      workflowStage: 'Submitted to Stores',
    }, 'Requisition forwarded to stores for final approval.');
  };

  const handleFinalStoreApproval = async (item) => {
    await updateRecord(item._id || item.id, {
      status: 'Stores Approved',
      workflowStage: 'Stores Approved',
    }, 'Requisition approved by stores.');
  };

  const handleRejectRequisition = async (item) => {
    await updateRecord(item._id || item.id, {
      status: 'Rejected',
      workflowStage: 'Rejected',
    }, 'Requisition rejected.');
  };

  const createRecord = async (type, payload, resetForm, successMessage) => {
    setError('');
    setMessage('');
    try {
      await api.post('/procurement-records', { type, ...payload });
      setMessage(successMessage);
      resetForm();
      await loadProcurementData();
      setActiveForm('');
    } catch (err) {
      console.error(err);
      setError('Unable to save the new record.');
    }
  };

  const handleRequisitionSave = (event) => {
    event.preventDefault();
    createRecord(
      'requisition',
      {
        title: requisitionForm.title,
        department: requisitionForm.department,
        amount: Number(requisitionForm.amount || 0),
        priority: requisitionForm.priority,
        requestedBy: requisitionForm.requestedBy || 'Department',
        description: requisitionForm.description,
        status: 'Pending Approval',
      },
      () => setRequisitionForm({ title: '', department: '', amount: '', priority: 'Medium', requestedBy: '', description: '' }),
      'Purchase requisition created successfully.'
    );
  };

  const handleSupplierSave = (event) => {
    event.preventDefault();
    createRecord(
      'supplier',
      {
        title: supplierForm.title,
        category: supplierForm.category,
        performance: supplierForm.performance,
        status: supplierForm.status,
        contact: supplierForm.contact,
      },
      () => setSupplierForm({ title: '', category: '', performance: 'Good', status: 'Active', contact: '' }),
      'Supplier record created successfully.'
    );
  };

  const handleTenderSave = (event) => {
    event.preventDefault();
    createRecord(
      'tender',
      {
        title: tenderForm.title,
        status: tenderForm.status,
        closingDate: tenderForm.closingDate,
        bids: Number(tenderForm.bids || 0),
        recommendation: tenderForm.recommendation,
      },
      () => setTenderForm({ title: '', closingDate: '', status: 'Open', bids: '0', recommendation: 'Pending Evaluation' }),
      'Tender record created successfully.'
    );
  };

  const handleContractSave = (event) => {
    event.preventDefault();
    createRecord(
      'contract',
      {
        title: contractForm.title,
        supplier: contractForm.supplier,
        expiryDate: contractForm.expiryDate,
        performance: contractForm.performance,
        documentStatus: contractForm.documentStatus,
      },
      () => setContractForm({ title: '', supplier: '', expiryDate: '', performance: 'On Track', documentStatus: 'Stored electronically' }),
      'Contract record created successfully.'
    );
  };

  const handlePlanSave = (event) => {
    event.preventDefault();
    createRecord(
      'plan',
      {
        title: planForm.title,
        department: planForm.department,
        budget: Number(planForm.budget || 0),
        status: planForm.status,
        deadline: planForm.deadline,
      },
      () => setPlanForm({ title: '', department: '', budget: '', status: 'In Progress', deadline: '' }),
      'Procurement plan created successfully.'
    );
  };

  const handleInventorySave = (event) => {
    event.preventDefault();
    createRecord(
      'inventory',
      {
        title: inventoryForm.title,
        category: inventoryForm.category,
        stock: Number(inventoryForm.stock || 0),
        reorderLevel: Number(inventoryForm.reorderLevel || 0),
        status: inventoryForm.status,
      },
      () => setInventoryForm({ title: '', category: '', stock: '', reorderLevel: '', status: 'Available' }),
      'Inventory record created successfully.'
    );
  };

  const handleReportSave = (event) => {
    event.preventDefault();
    createRecord(
      'report',
      {
        title: reportForm.title,
        status: reportForm.status,
        summary: reportForm.summary,
      },
      () => setReportForm({ title: '', summary: '', status: 'Ready' }),
      'Report record created successfully.'
    );
  };

  const handleDocumentSave = (event) => {
    event.preventDefault();
    createRecord(
      'document',
      {
        title: documentForm.title,
        category: documentForm.category,
        reference: documentForm.reference,
        status: documentForm.status,
        date: documentForm.date || new Date().toISOString().slice(0, 10),
      },
      () => setDocumentForm({ title: '', category: 'Quotation', reference: '', status: 'Stored', date: '' }),
      'Document metadata saved successfully.'
    );
  };

  const getFormMarkup = () => {
    switch (activeForm) {
      case 'requisition':
        return (
          <form onSubmit={handleRequisitionSave} className="form-card" style={{ gap: '0.75rem' }}>
            <h3>Create Purchase Requisition</h3>
            <div className="grid-columns" style={{ gap: '1rem' }}>
              <label>
                Title
                <input name="title" value={requisitionForm.title} onChange={(e) => setRequisitionForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} required />
              </label>
              <label>
                Department
                <input name="department" value={requisitionForm.department} onChange={(e) => setRequisitionForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} required />
              </label>
              <label>
                Amount
                <input name="amount" type="number" min="0" value={requisitionForm.amount} onChange={(e) => setRequisitionForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} required />
              </label>
              <label>
                Priority
                <select name="priority" value={requisitionForm.priority} onChange={(e) => setRequisitionForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </label>
              <label>
                Requested By
                <input name="requestedBy" value={requisitionForm.requestedBy} onChange={(e) => setRequisitionForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} />
              </label>
            </div>
            <label>
              Description
              <textarea name="description" rows="3" value={requisitionForm.description} onChange={(e) => setRequisitionForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} />
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="submit">Save requisition</button>
              <button type="button" className="secondary" onClick={() => setActiveForm('')}>Cancel</button>
            </div>
          </form>
        );
      case 'supplier':
        return (
          <form onSubmit={handleSupplierSave} className="form-card" style={{ gap: '0.75rem' }}>
            <h3>Register Supplier</h3>
            <div className="grid-columns" style={{ gap: '1rem' }}>
              <label>
                Supplier Name
                <input name="title" value={supplierForm.title} onChange={(e) => setSupplierForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} required />
              </label>
              <label>
                Category
                <input name="category" value={supplierForm.category} onChange={(e) => setSupplierForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} required />
              </label>
              <label>
                Contact
                <input name="contact" value={supplierForm.contact} onChange={(e) => setSupplierForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} />
              </label>
              <label>
                Performance
                <select name="performance" value={supplierForm.performance} onChange={(e) => setSupplierForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}>
                  <option>Excellent</option>
                  <option>Good</option>
                  <option>Needs Review</option>
                  <option>Poor</option>
                </select>
              </label>
              <label>
                Status
                <select name="status" value={supplierForm.status} onChange={(e) => setSupplierForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}>
                  <option>Active</option>
                  <option>Inactive</option>
                  <option>Suspended</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="submit">Save supplier</button>
              <button type="button" className="secondary" onClick={() => setActiveForm('')}>Cancel</button>
            </div>
          </form>
        );
      case 'tender':
        return (
          <form onSubmit={handleTenderSave} className="form-card" style={{ gap: '0.75rem' }}>
            <h3>Create Tender / RFQ</h3>
            <div className="grid-columns" style={{ gap: '1rem' }}>
              <label>
                Title
                <input name="title" value={tenderForm.title} onChange={(e) => setTenderForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} required />
              </label>
              <label>
                Closing Date
                <input name="closingDate" type="date" value={tenderForm.closingDate} onChange={(e) => setTenderForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} required />
              </label>
              <label>
                Status
                <select name="status" value={tenderForm.status} onChange={(e) => setTenderForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}>
                  <option>Open</option>
                  <option>Under Evaluation</option>
                  <option>Awarded</option>
                  <option>Closed</option>
                </select>
              </label>
              <label>
                Bids Received
                <input name="bids" type="number" min="0" value={tenderForm.bids} onChange={(e) => setTenderForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} />
              </label>
            </div>
            <label>
              Recommendation
              <textarea name="recommendation" rows="2" value={tenderForm.recommendation} onChange={(e) => setTenderForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} />
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="submit">Save tender</button>
              <button type="button" className="secondary" onClick={() => setActiveForm('')}>Cancel</button>
            </div>
          </form>
        );
      case 'contract':
        return (
          <form onSubmit={handleContractSave} className="form-card" style={{ gap: '0.75rem' }}>
            <h3>Record Contract</h3>
            <div className="grid-columns" style={{ gap: '1rem' }}>
              <label>
                Contract Title
                <input name="title" value={contractForm.title} onChange={(e) => setContractForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} required />
              </label>
              <label>
                Supplier
                <input name="supplier" value={contractForm.supplier} onChange={(e) => setContractForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} required />
              </label>
              <label>
                Expiry Date
                <input name="expiryDate" type="date" value={contractForm.expiryDate} onChange={(e) => setContractForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} required />
              </label>
              <label>
                Performance
                <select name="performance" value={contractForm.performance} onChange={(e) => setContractForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}>
                  <option>On Track</option>
                  <option>Needs Review</option>
                  <option>Delayed</option>
                </select>
              </label>
              <label>
                Document Status
                <select name="documentStatus" value={contractForm.documentStatus} onChange={(e) => setContractForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}>
                  <option>Stored electronically</option>
                  <option>Pending upload</option>
                  <option>Signed</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="submit">Save contract</button>
              <button type="button" className="secondary" onClick={() => setActiveForm('')}>Cancel</button>
            </div>
          </form>
        );
      case 'plan':
        return (
          <form onSubmit={handlePlanSave} className="form-card" style={{ gap: '0.75rem' }}>
            <h3>Create Procurement Plan</h3>
            <div className="grid-columns" style={{ gap: '1rem' }}>
              <label>
                Plan Title
                <input name="title" value={planForm.title} onChange={(e) => setPlanForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} required />
              </label>
              <label>
                Department
                <input name="department" value={planForm.department} onChange={(e) => setPlanForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} required />
              </label>
              <label>
                Budget
                <input name="budget" type="number" min="0" value={planForm.budget} onChange={(e) => setPlanForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} required />
              </label>
              <label>
                Deadline
                <input name="deadline" type="date" value={planForm.deadline} onChange={(e) => setPlanForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} />
              </label>
              <label>
                Status
                <select name="status" value={planForm.status} onChange={(e) => setPlanForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}>
                  <option>In Progress</option>
                  <option>Approved</option>
                  <option>Completed</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="submit">Save plan</button>
              <button type="button" className="secondary" onClick={() => setActiveForm('')}>Cancel</button>
            </div>
          </form>
        );
      case 'inventory':
        return (
          <form onSubmit={handleInventorySave} className="form-card" style={{ gap: '0.75rem' }}>
            <h3>Record Delivery / Inventory</h3>
            <div className="grid-columns" style={{ gap: '1rem' }}>
              <label>
                Item Name
                <input name="title" value={inventoryForm.title} onChange={(e) => setInventoryForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} required />
              </label>
              <label>
                Category
                <input name="category" value={inventoryForm.category} onChange={(e) => setInventoryForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} required />
              </label>
              <label>
                Stock
                <input name="stock" type="number" min="0" value={inventoryForm.stock} onChange={(e) => setInventoryForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} required />
              </label>
              <label>
                Reorder Level
                <input name="reorderLevel" type="number" min="0" value={inventoryForm.reorderLevel} onChange={(e) => setInventoryForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} required />
              </label>
              <label>
                Status
                <select name="status" value={inventoryForm.status} onChange={(e) => setInventoryForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}>
                  <option>Available</option>
                  <option>Low Stock</option>
                  <option>Pending Inspection</option>
                  <option>Awaiting Inspection</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="submit">Save inventory</button>
              <button type="button" className="secondary" onClick={() => setActiveForm('')}>Cancel</button>
            </div>
          </form>
        );
      case 'report':
        return (
          <form onSubmit={handleReportSave} className="form-card" style={{ gap: '0.75rem' }}>
            <h3>Generate Report Record</h3>
            <label>
              Title
              <input name="title" value={reportForm.title} onChange={(e) => setReportForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} required />
            </label>
            <label>
              Summary
              <textarea name="summary" rows="3" value={reportForm.summary} onChange={(e) => setReportForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} />
            </label>
            <label>
              Status
              <select name="status" value={reportForm.status} onChange={(e) => setReportForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}>
                <option>Ready</option>
                <option>Draft</option>
                <option>Under Review</option>
              </select>
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="submit">Save report</button>
              <button type="button" className="secondary" onClick={() => setActiveForm('')}>Cancel</button>
            </div>
          </form>
        );
      case 'document':
        return (
          <form onSubmit={handleDocumentSave} className="form-card" style={{ gap: '0.75rem' }}>
            <h3>Register Procurement Document</h3>
            <div className="grid-columns" style={{ gap: '1rem' }}>
              <label>
                Title
                <input name="title" value={documentForm.title} onChange={(e) => setDocumentForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} required />
              </label>
              <label>
                Category
                <select name="category" value={documentForm.category} onChange={(e) => setDocumentForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}>
                  <option>Quotation</option>
                  <option>Invoice</option>
                  <option>Contract</option>
                  <option>Delivery Note</option>
                  <option>Compliance</option>
                </select>
              </label>
              <label>
                Reference
                <input name="reference" value={documentForm.reference} onChange={(e) => setDocumentForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} required />
              </label>
              <label>
                Status
                <select name="status" value={documentForm.status} onChange={(e) => setDocumentForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))}>
                  <option>Stored</option>
                  <option>Reviewed</option>
                  <option>Archived</option>
                </select>
              </label>
              <label>
                Date
                <input name="date" type="date" value={documentForm.date} onChange={(e) => setDocumentForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="submit">Save document</button>
              <button type="button" className="secondary" onClick={() => setActiveForm('')}>Cancel</button>
            </div>
          </form>
        );
      default:
        return null;
    }
  };

  return (
    <div className="card procurement-card" style={{ padding: '1.5rem', display: 'grid', gap: '1.5rem' }}>
      <div className="page-header">
        <span className="eyebrow">Procurement Officer</span>
        <h1>Procurement Control Center</h1>
        <p>Manage requisitions, suppliers, RFQs, tenders, purchase orders, deliveries, contracts, planning, documents and notifications from one organized portal.</p>
      </div>

      {error && <div className="message error-message">{error}</div>}
      {message && <div className="message success-message">{message}</div>}

      <section className="dashboard-grid" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {summaryMetrics.map((metric) => (
          <a key={metric.label} href={metric.anchor} className="summary-card" style={{ display: 'block', textDecoration: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
              <p style={{ margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#334155' }}>{metric.label}</p>
            </div>
            <p style={{ margin: '0.85rem 0 0', fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>{metric.value}</p>
          </a>
        ))}
      </section>

      <section className="grid-columns" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1.2fr 0.8fr' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <h2>Quick Actions</h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <button type="button" onClick={() => setActiveForm('requisition')}>New Purchase Requisition</button>
            <button type="button" onClick={() => setActiveForm('supplier')}>Register Supplier</button>
            <button type="button" onClick={() => setActiveForm('tender')}>Create RFQ / Tender</button>
            <button type="button" onClick={() => setActiveForm('contract')}>Log Contract</button>
            <button type="button" onClick={() => setActiveForm('plan')}>Create Procurement Plan</button>
            <button type="button" onClick={() => setActiveForm('inventory')}>Record Delivery / Inventory</button>
            <button type="button" onClick={() => setActiveForm('document')}>Register Document</button>
            <button type="button" onClick={() => setActiveForm('report')}>Generate Report Record</button>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <h2>Connections</h2>
          <p>Use existing app pages for related procurement workflows and document handling.</p>
          <ul style={{ paddingLeft: '1.15rem', margin: '1rem 0 0', color: '#475569' }}>
            <li><Link to="/documents">Document repository and contract storage</Link></li>
            <li><Link to="/finance">Finance tracking and purchase order integration</Link></li>
            <li><Link to="/meetings">Meeting schedules for tender evaluations</Link></li>
            <li><Link to="/dashboard">Assembly dashboard overview</Link></li>
          </ul>
          <div style={{ marginTop: '1rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>Procurement documents</p>
            <p style={{ margin: 0 }}>{procurementFiles.length} uploaded document{procurementFiles.length === 1 ? '' : 's'} available for review.</p>
          </div>
        </div>
      </section>

      {activeForm && (
        <section className="card" style={{ padding: '1.25rem' }}>
          {getFormMarkup()}
        </section>
      )}

      {loading ? (
        <div className="card" style={{ padding: '1.25rem' }}>Loading procurement records…</div>
      ) : (
        <>
          <section id="requisitions" className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <div>
                <h2>Purchase Requisitions</h2>
                <p style={{ margin: 0, color: '#475569' }}>Verify requisitions, request clarification, and forward requests for approval.</p>
              </div>
              <button type="button" onClick={() => setActiveForm('requisition')}>New requisition</button>
            </div>
            {requisitions.length === 0 ? (
              <div className="empty-state">No purchase requisitions found.</div>
            ) : (
              <div className="table-card" style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table className="file-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Department</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Requested By</th>
                      <th>Last Stage</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requisitions.map((item) => (
                      <tr key={item._id || item.id}>
                        <td>{item.title}</td>
                        <td>{item.department || 'N/A'}</td>
                        <td>{formatCurrency(item.amount)}</td>
                        <td><span className={statusBadge(item.status)}>{item.status || 'Pending'}</span></td>
                        <td>{item.priority || 'Medium'}</td>
                        <td>{item.requestedBy || 'Department'}</td>
                        <td>{item.workflowStage || item.status || 'Pending'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {item.status === 'Pending Approval' && (
                              <>
                                <button type="button" onClick={() => updateRecord(item._id || item.id, { status: 'Procurement Approved', workflowStage: 'Procurement Approved' }, 'Requisition approved by procurement.')}>Approve</button>
                                <button type="button" onClick={() => updateRecord(item._id || item.id, { status: 'Clarification Requested', workflowStage: 'Clarification Requested' }, 'Clarification requested for requisition.')}>Request Clarification</button>
                              </>
                            )}
                            {item.status === 'Procurement Approved' && (
                              <button type="button" onClick={() => openRequisitionDetails(item)}>Fill Details for Registry</button>
                            )}
                            {item.status === 'Submitted to Registry' && (
                              <>
                                <button type="button" onClick={() => handleForwardToClerk(item)}>Forward to Clerk</button>
                                <button type="button" onClick={() => handleRejectRequisition(item)}>Reject</button>
                              </>
                            )}
                            {item.status === 'Submitted to Clerk' && (
                              <>
                                <button type="button" onClick={() => handleForwardToStores(item)}>Forward to Stores</button>
                                <button type="button" onClick={() => handleRejectRequisition(item)}>Reject</button>
                              </>
                            )}
                            {item.status === 'Submitted to Stores' && (
                              <>
                                <button type="button" onClick={() => handleFinalStoreApproval(item)}>Final Approve</button>
                                <button type="button" onClick={() => handleRejectRequisition(item)}>Reject</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {showRequisitionDetails && selectedRequisition && (
            <section className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h2>Fill Requisition Details</h2>
                  <p style={{ margin: 0, color: '#475569' }}>Complete the approved requisition and submit it to registry for next-stage review.</p>
                </div>
                <button type="button" onClick={() => { setShowRequisitionDetails(false); setSelectedRequisition(null); setRequisitionItems([]); setRequisitionNotes(''); }}>Close</button>
              </div>
              <p><strong>{selectedRequisition.title}</strong> — {selectedRequisition.department}</p>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Registry notes / instructions
                  <textarea value={requisitionNotes} onChange={(e) => setRequisitionNotes(e.target.value)} rows="3" style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: '1px solid #d1d5db' }} />
                </label>
              </div>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <input
                    type="text"
                    placeholder="Item name"
                    value={newItem.itemName}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, itemName: e.target.value }))}
                    style={{ padding: '0.85rem', borderRadius: '10px', border: '1px solid #d1d5db' }}
                  />
                  <input
                    type="number"
                    placeholder="Quantity"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, quantity: e.target.value }))}
                    style={{ padding: '0.85rem', borderRadius: '10px', border: '1px solid #d1d5db' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <input
                    type="text"
                    placeholder="Unit"
                    value={newItem.unit}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, unit: e.target.value }))}
                    style={{ padding: '0.85rem', borderRadius: '10px', border: '1px solid #d1d5db' }}
                  />
                  <input
                    type="text"
                    placeholder="Justification"
                    value={newItem.justification}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, justification: e.target.value }))}
                    style={{ padding: '0.85rem', borderRadius: '10px', border: '1px solid #d1d5db' }}
                  />
                </div>
                <button type="button" onClick={handleAddRequisitionItem}>Add item</button>
                {requisitionItems.length > 0 && (
                  <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem' }}>
                    <h4>Items added</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {requisitionItems.map((item, index) => (
                        <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid #e5e7eb' }}>
                          <span>{item.itemName} — {item.quantity} {item.unit}</span>
                          <button type="button" onClick={() => handleRemoveRequisitionItem(index)}>Remove</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button type="button" onClick={() => { setShowRequisitionDetails(false); setSelectedRequisition(null); setRequisitionItems([]); setRequisitionNotes(''); }}>Cancel</button>
                  <button type="button" onClick={handleSubmitRequisitionDetails} disabled={requisitionItems.length === 0}>Submit to Registry</button>
                </div>
              </div>
            </section>
          )}
          <section id="suppliers" className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <div>
                <h2>Supplier Management</h2>
                <p style={{ margin: 0, color: '#475569' }}>Register suppliers, monitor performance, and suspend or update supplier status.</p>
              </div>
              <button type="button" onClick={() => setActiveForm('supplier')}>Register supplier</button>
            </div>
            {suppliers.length === 0 ? (
              <div className="empty-state">No supplier records available.</div>
            ) : (
              <div className="table-card" style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table className="file-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Performance</th>
                      <th>Status</th>
                      <th>Contact</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((item) => (
                      <tr key={item._id || item.id}>
                        <td>{item.title}</td>
                        <td>{item.category}</td>
                        <td>{item.performance}</td>
                        <td><span className={statusBadge(item.status)}>{item.status}</span></td>
                        <td>{item.contact || 'N/A'}</td>
                        <td>
                          <button type="button" onClick={() => updateRecord(item._id || item.id, { status: item.status === 'Active' ? 'Suspended' : 'Active' }, `Supplier ${item.status === 'Active' ? 'suspended' : 're-activated'} successfully.`)}>
                            {item.status === 'Active' ? 'Suspend' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section id="tenders" className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <div>
                <h2>RFQ & Tender Management</h2>
                <p style={{ margin: 0, color: '#475569' }}>Create RFQs and tenders, view submissions, compare bids and publish outcomes.</p>
              </div>
              <button type="button" onClick={() => setActiveForm('tender')}>Create tender</button>
            </div>
            {tenders.length === 0 ? (
              <div className="empty-state">No tenders or RFQs found.</div>
            ) : (
              <div className="table-card" style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table className="file-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Bids</th>
                      <th>Closing Date</th>
                      <th>Recommendation</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenders.map((item) => (
                      <tr key={item._id || item.id}>
                        <td>{item.title}</td>
                        <td><span className={statusBadge(item.status)}>{item.status}</span></td>
                        <td>{item.bids || 0}</td>
                        <td>{formatDate(item.closingDate)}</td>
                        <td>{item.recommendation || 'Pending'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button type="button" onClick={() => updateRecord(item._id || item.id, { status: 'Under Evaluation' }, 'Tender moved to evaluation.')}>Evaluate</button>
                            <button type="button" onClick={() => updateRecord(item._id || item.id, { status: 'Awarded' }, 'Tender marked as awarded.')}>Publish award</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section id="purchase-orders" className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <div>
                <h2>Purchase Orders</h2>
                <p style={{ margin: 0, color: '#475569' }}>Track issued purchase orders, amend status, and prepare suppliers for delivery.</p>
              </div>
            </div>
            {purchaseOrders.length === 0 ? (
              <div className="empty-state">No purchase orders issued yet.</div>
            ) : (
              <div className="table-card" style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table className="file-table">
                  <thead>
                    <tr>
                      <th>PO Title</th>
                      <th>Supplier</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Issued At</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.map((item) => (
                      <tr key={item._id || item.id}>
                        <td>{item.title || `PO-${item._id || item.id}`}</td>
                        <td>{item.supplier || 'N/A'}</td>
                        <td>{formatCurrency(item.amount)}</td>
                        <td><span className={statusBadge(item.status)}>{item.status}</span></td>
                        <td>{formatDate(item.issuedAt)}</td>
                        <td>
                          <button type="button" onClick={() => updateRecord(item._id || item.id, { status: 'Completed' }, 'Purchase order marked complete.')}>Complete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section id="delivery-management" className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <div>
                <h2>Delivery & Inventory Coordination</h2>
                <p style={{ margin: 0, color: '#475569' }}>Record deliveries, verify quantities, and track low-stock items or pending inspection actions.</p>
              </div>
            </div>
            {inventoryItems.length === 0 ? (
              <div className="empty-state">No inventory or delivery records found.</div>
            ) : (
              <div className="table-card" style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table className="file-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Category</th>
                      <th>Stock</th>
                      <th>Reorder Level</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryItems.map((item) => (
                      <tr key={item._id || item.id}>
                        <td>{item.title}</td>
                        <td>{item.category}</td>
                        <td>{item.stock}</td>
                        <td>{item.reorderLevel}</td>
                        <td><span className={statusBadge(item.status)}>{item.status}</span></td>
                        <td>
                          <button type="button" onClick={() => updateRecord(item._id || item.id, { status: 'Available' }, 'Inventory item marked available.')}>Mark available</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section id="contracts" className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <div>
                <h2>Contract Management</h2>
                <p style={{ margin: 0, color: '#475569' }}>Monitor contract durations, renewals and signed document tracking.</p>
              </div>
              <button type="button" onClick={() => setActiveForm('contract')}>Add contract</button>
            </div>
            {contracts.length === 0 ? (
              <div className="empty-state">No contracts recorded yet.</div>
            ) : (
              <div className="table-card" style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table className="file-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Supplier</th>
                      <th>Expiry</th>
                      <th>Performance</th>
                      <th>Document</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((item) => (
                      <tr key={item._id || item.id}>
                        <td>{item.title}</td>
                        <td>{item.supplier}</td>
                        <td>{formatDate(item.expiryDate)}</td>
                        <td>{item.performance}</td>
                        <td>{item.documentStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section id="procurement-planning" className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <div>
                <h2>Procurement Planning</h2>
                <p style={{ margin: 0, color: '#475569' }}>Prepare, allocate and monitor annual procurement plans.</p>
              </div>
              <button type="button" onClick={() => setActiveForm('plan')}>New plan</button>
            </div>
            {plans.length === 0 ? (
              <div className="empty-state">No procurement plans created yet.</div>
            ) : (
              <div className="table-card" style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table className="file-table">
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th>Department</th>
                      <th>Budget</th>
                      <th>Status</th>
                      <th>Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((item) => (
                      <tr key={item._id || item.id}>
                        <td>{item.title}</td>
                        <td>{item.department}</td>
                        <td>{formatCurrency(item.budget)}</td>
                        <td>{item.status}</td>
                        <td>{formatDate(item.deadline)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section id="reports" className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <div>
                <h2>Reports</h2>
                <p style={{ margin: 0, color: '#475569' }}>Generate procurement status, supplier performance and contract outcome reports.</p>
              </div>
              <button type="button" onClick={() => setActiveForm('report')}>New report</button>
            </div>
            {reports.length === 0 ? (
              <div className="empty-state">No report records yet.</div>
            ) : (
              <div className="table-card" style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table className="file-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((item) => (
                      <tr key={item._id || item.id}>
                        <td>{item.title}</td>
                        <td>{item.status}</td>
                        <td>{item.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section id="document-management" className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <div>
                <h2>Document Management</h2>
                <p style={{ margin: 0, color: '#475569' }}>Store procurement documents, upload quotations, archive contracts, and search records.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => setActiveForm('document')}>Register document</button>
                <Link to="/documents"><button type="button" className="secondary">Open documents</button></Link>
              </div>
            </div>
            <div style={{ marginTop: '1rem' }}>
              <p style={{ margin: 0, color: '#475569' }}>Procurement file uploads: {procurementFiles.length} document{procurementFiles.length === 1 ? '' : 's'} available.</p>
            </div>
            {procurementFiles.length > 0 && (
              <div className="table-card" style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table className="file-table">
                  <thead>
                    <tr>
                      <th>File</th>
                      <th>Uploaded By</th>
                      <th>Department</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {procurementFiles.map((file) => (
                      <tr key={file._id || file.id}>
                        <td>{file.originalName || file.filename}</td>
                        <td>{file.uploadedBy?.name || 'N/A'}</td>
                        <td>{file.department?.name || 'N/A'}</td>
                        <td>{formatDate(file.uploadedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section id="notifications" className="card" style={{ padding: '1.25rem' }}>
            <h2>Notifications</h2>
            <div style={{ display: 'grid', gap: '0.9rem', marginTop: '1rem' }}>
              {notifications.map((note) => (
                <div key={note.title} className="notice-card" style={{ borderLeft: '4px solid #2563eb', padding: '1rem', background: '#f8fafc' }}>
                  <p style={{ margin: 0, fontWeight: 600 }}>{note.title}</p>
                  <p style={{ margin: '0.5rem 0 0', color: '#475569' }}>{note.detail}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
