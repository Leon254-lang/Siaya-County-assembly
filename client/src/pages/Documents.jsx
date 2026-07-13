import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [inboxDocuments, setInboxDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDetails, setShowDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [departments, setDepartments] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [inboxDepartment, setInboxDepartment] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    category: '',
    priority: '',
    department: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalDocuments: 0
  });
  const [moveFields, setMoveFields] = useState({ toDepartment: '', reason: '' });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'incoming',
    category: 'administrative',
    priority: 'medium',
    origin: '',
    destination: '',
    currentDepartment: '',
    department: '',
    sender: { name: '', organization: '', contact: '' },
    recipient: { name: '', organization: '', contact: '' },
    tags: '',
    dueDate: '',
    responseStatus: 'not_requested',
    responseNotes: '',
  });
  const [requisitionRequestForm, setRequisitionRequestForm] = useState({
    title: '',
    department: '',
    amount: '',
    priority: 'Medium',
    description: '',
  });
  const [requestMessage, setRequestMessage] = useState('');
  const [requestError, setRequestError] = useState('');

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (activeTab === 'all') {
      fetchDocuments();
    }
  }, [searchTerm, filters, pagination.currentPage, activeTab]);

  useEffect(() => {
    if (showDetails) {
      setMoveFields({ toDepartment: '', reason: '' });
    }
  }, [showDetails]);

  useEffect(() => {
    if (activeTab === 'inbox') {
      fetchInboxDocuments(inboxDepartment);
    }
  }, [activeTab, inboxDepartment]);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const handleRequestFormChange = (event) => {
    const { name, value } = event.target;
    setRequisitionRequestForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitRequisitionRequest = async (event) => {
    event.preventDefault();
    setRequestMessage('');
    setRequestError('');

    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
      await api.post('/procurement-records', {
        type: 'requisition',
        title: requisitionRequestForm.title,
        department: requisitionRequestForm.department || storedUser?.department?.name || '',
        amount: Number(requisitionRequestForm.amount) || 0,
        priority: requisitionRequestForm.priority,
        requestedBy: storedUser?.name || 'Department',
        description: requisitionRequestForm.description,
        status: 'Requested',
        workflowStage: 'Requested',
      });
      setRequestMessage('Request submitted.');
      setRequisitionRequestForm({ title: '', department: '', amount: '', priority: 'Medium', description: '' });
      if (activeTab === 'all') {
        fetchDocuments();
      }
    } catch (error) {
      console.error('Failed to submit procurement request:', error);
      setRequestError(error.response?.data?.message || 'Could not submit request.');
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        ...filters,
        page: pagination.currentPage,
        limit: 10
      });

      const response = await api.get(`/documents?${params}`);
      setDocuments(response.data.documents);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInboxDocuments = async (departmentName) => {
    if (!departmentName) {
      setInboxDocuments([]);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        currentDepartment: departmentName,
        page: 1,
        limit: 50
      });
      const response = await api.get(`/documents?${params}`);
      setInboxDocuments(response.data.documents);
    } catch (error) {
      console.error('Failed to fetch department inbox documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async (e) => {
    e.preventDefault();
    try {
      const selectedDept = departments.find((dept) => dept._id === formData.department);
      const payload = {
        ...formData,
        currentDepartment: formData.currentDepartment || selectedDept?.name || '',
        department: formData.department,
        responseStatus: formData.responseStatus,
        responseNotes: formData.responseNotes,
      };

      await api.post('/documents', payload);
      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        type: 'incoming',
        category: 'administrative',
        priority: 'medium',
        origin: '',
        destination: '',
        currentDepartment: '',
        department: '',
        sender: { name: '', organization: '', contact: '' },
        recipient: { name: '', organization: '', contact: '' },
        tags: '',
        dueDate: '',
        responseStatus: 'not_requested',
        responseNotes: '',
      });
      fetchDocuments();
    } catch (error) {
      console.error('Failed to create document:', error);
    }
  };

  const fetchDocument = async (documentId) => {
    try {
      const response = await api.get(`/documents/${documentId}`);
      setShowDetails(response.data);
    } catch (error) {
      console.error('Failed to load document details:', error);
    }
  };

  const handleFileUpload = async (documentId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post(`/documents/${documentId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchDocuments();
      if (showDetails) {
        fetchDocument(documentId);
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
  };

  const handleStatusChange = async (documentId, action, comment = '') => {
    try {
      await api.post(`/documents/${documentId}/${action}`, { comment });
      fetchDocuments();
      if (showDetails) {
        fetchDocument(documentId);
      }
    } catch (error) {
      console.error(`Failed to ${action} document:`, error);
    }
  };

  const handleMoveDocument = async (documentId, toDepartment, reason) => {
    try {
      await api.post(`/documents/${documentId}/move`, { toDepartment, reason });
      fetchDocuments();
      if (showDetails) {
        const response = await api.get(`/documents/${documentId}`);
        setShowDetails(response.data);
      }
    } catch (error) {
      console.error('Failed to move document:', error);
    }
  };

  const handleAssignDocument = async (documentId, assignedTo, comment) => {
    try {
      await api.post(`/documents/${documentId}/assign`, { assignedTo, comment });
      fetchDocuments();
      if (showDetails) {
        const response = await api.get(`/documents/${documentId}`);
        setShowDetails(response.data);
      }
    } catch (error) {
      console.error('Failed to assign document:', error);
    }
  };

  const handleResponseUpdate = async (documentId, status, notes = '') => {
    try {
      const payload = {
        status,
        responseNotes: notes,
        responseReceivedAt: status === 'received' ? new Date().toISOString() : undefined,
      };
      await api.post(`/documents/${documentId}/response`, payload);
      fetchDocuments();
      if (showDetails) {
        const response = await api.get(`/documents/${documentId}`);
        setShowDetails(response.data);
      }
    } catch (error) {
      console.error('Failed to update response status:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: '#6b7280',
      pending: '#f59e0b',
      under_review: '#3b82f6',
      approved: '#10b981',
      rejected: '#ef4444',
      archived: '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  if (loading && documents.length === 0) {
    return <div className="card"><p>Loading documents...</p></div>;
  }

  return (
    <div>
      <div className="card">
        <h1>📄 Document Tracking & Management</h1>
        <p>Manage incoming/outgoing documents, memos, bills, reports, and minutes with full workflow tracking.</p>

        <div className="module-actions" style={{ marginBottom: '2rem' }}>
          <button onClick={() => setShowCreateForm(true)}>➕ Create New Document</button>
          <button onClick={() => {
            if (activeTab === 'all') fetchDocuments();
            else fetchInboxDocuments(inboxDepartment);
          }}>🔄 Refresh</button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: activeTab === 'all' ? '2px solid #3b82f6' : '1px solid #d1d5db',
              background: activeTab === 'all' ? '#eff6ff' : 'white'
            }}
          >All Documents</button>
          <button
            onClick={() => setActiveTab('inbox')}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              border: activeTab === 'inbox' ? '2px solid #3b82f6' : '1px solid #d1d5db',
              background: activeTab === 'inbox' ? '#eff6ff' : 'white'
            }}
          >Department Inbox</button>
        </div>

        {/* Search and Filters */}
        {activeTab === 'all' && (
          <div style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: '1rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
            />
            <select
              value={filters.department}
              onChange={(e) => setFilters({...filters, department: e.target.value})}
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
            >
              <option value="">All Types</option>
              <option value="incoming">Incoming</option>
              <option value="outgoing">Outgoing</option>
              <option value="memo">Memo</option>
              <option value="bill">Bill</option>
              <option value="report">Report</option>
              <option value="minutes">Minutes</option>
              <option value="letter">Letter</option>
              <option value="contract">Contract</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
            >
              <option value="">All Categories</option>
              <option value="administrative">Administrative</option>
              <option value="financial">Financial</option>
              <option value="legal">Legal</option>
              <option value="technical">Technical</option>
              <option value="personnel">Personnel</option>
              <option value="public">Public</option>
            </select>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({...filters, priority: e.target.value})}
              style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        )}

        {/* Documents Table */}
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <h2>Request Procurement Requisition</h2>
              <p style={{ margin: '0.5rem 0 0', color: '#475569' }}>Submit a procurement request for review by procurement officers. This request will appear in the procurement workflow as a new requisition.</p>
            </div>
          </div>

          {requestMessage && <div className="message success-message">{requestMessage}</div>}
          {requestError && <div className="message error-message">{requestError}</div>}

          <form onSubmit={handleSubmitRequisitionRequest} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
            <div className="grid-columns" style={{ gap: '1rem' }}>
              <label>
                Title
                <input name="title" value={requisitionRequestForm.title} onChange={handleRequestFormChange} required />
              </label>
              <label>
                Department
                <select name="department" value={requisitionRequestForm.department} onChange={handleRequestFormChange} required>
                  <option value="">Select department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Amount
                <input name="amount" type="number" min="0" value={requisitionRequestForm.amount} onChange={handleRequestFormChange} required />
              </label>
              <label>
                Priority
                <select name="priority" value={requisitionRequestForm.priority} onChange={handleRequestFormChange}>
                  {['Low', 'Medium', 'High'].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Description
              <textarea name="description" rows="3" value={requisitionRequestForm.description} onChange={handleRequestFormChange} required />
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="submit">Submit request</button>
              <button type="button" className="secondary" onClick={() => {
                setRequisitionRequestForm({ title: '', department: '', amount: '', priority: 'Medium', description: '' });
                setRequestMessage('');
                setRequestError('');
              }}>Clear</button>
            </div>
          </form>
        </div>

        <div className="documents-list">
          {activeTab === 'inbox' ? (
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', marginBottom: '1rem' }}>
                <select
                  value={inboxDepartment}
                  onChange={(e) => setInboxDepartment(e.target.value)}
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                >
                  <option value="">Select department inbox</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => fetchInboxDocuments(inboxDepartment)}
                  disabled={!inboxDepartment}
                  style={{ padding: '0.75rem 1rem', borderRadius: '8px' }}
                >
                  📥 Load Inbox
                </button>
              </div>
              {inboxDocuments.length === 0 ? (
                <p>{inboxDepartment ? 'No documents currently in this department inbox.' : 'Choose a department to view its inbox.'}</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Doc Number</th>
                      <th>Title</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Current Dept</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inboxDocuments.map(doc => (
                      <tr key={doc._id}>
                        <td style={{ fontWeight: '600', color: '#3b82f6' }}>{doc.docNumber}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</td>
                        <td>
                          <span style={{
                            background: '#f3f4f6',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            textTransform: 'capitalize'
                          }}>
                            {doc.type}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            background: getStatusColor(doc.status),
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            textTransform: 'capitalize'
                          }}>
                            {doc.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            background: doc.priority === 'urgent' ? '#ef4444' :
                                       doc.priority === 'high' ? '#f59e0b' :
                                       doc.priority === 'medium' ? '#3b82f6' : '#6b7280',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            textTransform: 'capitalize'
                          }}>
                            {doc.priority}
                          </span>
                        </td>
                        <td>{doc.currentDepartment || 'N/A'}</td>
                        <td>{new Date(doc.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => fetchDocument(doc._id)}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                            >
                              👁️ View
                            </button>
                            {doc.files && doc.files.length > 0 && (
                              <button
                                onClick={() => window.open(`${api.defaults.baseURL}/documents/${doc._id}/download/${doc.files[0]._id}`, '_blank')}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                              >
                                📥 Download
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            documents.length === 0 ? (
              <p>No documents found. Create your first document!</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Doc Number</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Department</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(doc => (
                    <tr key={doc._id}>
                      <td style={{ fontWeight: '600', color: '#3b82f6' }}>{doc.docNumber}</td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.title}</td>
                      <td>
                        <span style={{
                          background: '#f3f4f6',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          textTransform: 'capitalize'
                        }}>
                          {doc.type}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          background: getStatusColor(doc.status),
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          textTransform: 'capitalize'
                        }}>
                          {doc.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          background: doc.priority === 'urgent' ? '#ef4444' :
                                     doc.priority === 'high' ? '#f59e0b' :
                                     doc.priority === 'medium' ? '#3b82f6' : '#6b7280',
                          color: 'white',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          textTransform: 'capitalize'
                        }}>
                          {doc.priority}
                        </span>
                      </td>
                      <td>{doc.currentDepartment || 'N/A'}</td>
                      <td>{new Date(doc.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setShowDetails(doc)}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                          >
                            👁️ View
                          </button>
                          {doc.files && doc.files.length > 0 ? (
                            <>
                              <button
                                onClick={() => window.open(`${api.defaults.baseURL}/documents/${doc._id}/download/${doc.files[0]._id}`, '_blank')}
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                              >
                                📥 Download
                              </button>
                              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                📎 {doc.files.length}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>

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

      {/* Create Document Modal */}
      {showCreateForm && (
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
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h2>Create New Document</h2>
            <form onSubmit={handleCreateDocument}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <input
                  type="text"
                  placeholder="Document Title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />

                <textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  >
                    <option value="incoming">Incoming</option>
                    <option value="outgoing">Outgoing</option>
                    <option value="memo">Memo</option>
                    <option value="bill">Bill</option>
                    <option value="report">Report</option>
                    <option value="minutes">Minutes</option>
                    <option value="letter">Letter</option>
                    <option value="contract">Contract</option>
                  </select>

                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  >
                    <option value="administrative">Administrative</option>
                    <option value="financial">Financial</option>
                    <option value="legal">Legal</option>
                    <option value="technical">Technical</option>
                    <option value="personnel">Personnel</option>
                    <option value="public">Public</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>

                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                    style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <select
                    value={formData.responseStatus}
                    onChange={(e) => setFormData({ ...formData, responseStatus: e.target.value })}
                    style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  >
                    <option value="not_requested">No response required</option>
                    <option value="awaiting">Awaiting response</option>
                    <option value="received">Response received</option>
                    <option value="overdue">Overdue response</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Response notes"
                    value={formData.responseNotes}
                    onChange={(e) => setFormData({ ...formData, responseNotes: e.target.value })}
                    style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>

                <input
                  type="text"
                  placeholder="Origin/Source"
                  value={formData.origin}
                  onChange={(e) => setFormData({...formData, origin: e.target.value})}
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                    style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Current Department"
                    value={formData.currentDepartment}
                    onChange={(e) => setFormData({...formData, currentDepartment: e.target.value})}
                    style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Destination/Recipient Department"
                  value={formData.destination}
                  onChange={(e) => setFormData({...formData, destination: e.target.value})}
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />

                <input
                  type="text"
                  placeholder="Tags (comma separated)"
                  value={formData.tags}
                  onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setShowCreateForm(false)}>Cancel</button>
                  <button type="submit">Create Document</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Details Modal */}
      {showDetails && (
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
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2>{showDetails.docNumber} - {showDetails.title}</h2>
              <button onClick={() => setShowDetails(null)}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div>
                <strong>Type:</strong> {showDetails.type}
              </div>
              <div>
                <strong>Status:</strong>
                <span style={{
                  background: getStatusColor(showDetails.status),
                  color: 'white',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  marginLeft: '0.5rem'
                }}>
                  {showDetails.status.replace('_', ' ')}
                </span>
              </div>
              <div>
                <strong>Priority:</strong> {showDetails.priority}
              </div>
              <div>
                <strong>Category:</strong> {showDetails.category}
              </div>
              <div>
                <strong>Current Department:</strong> {showDetails.currentDepartment || 'N/A'}
              </div>
              <div>
                <strong>Created:</strong> {new Date(showDetails.createdAt).toLocaleString()}
              </div>
              <div>
                <strong>Response Status:</strong> {showDetails.responseStatus ? showDetails.responseStatus.replace('_', ' ') : 'Not requested'}
              </div>
              <div>
                <strong>Response Notes:</strong> {showDetails.responseNotes || 'None'}
              </div>
              {showDetails.responseReceivedAt && (
                <div>
                  <strong>Response Received:</strong> {new Date(showDetails.responseReceivedAt).toLocaleString()}
                </div>
              )}
            </div>

            {showDetails.description && (
              <div style={{ marginBottom: '2rem' }}>
                <strong>Description:</strong>
                <p>{showDetails.description}</p>
              </div>
            )}

            {/* File Upload Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h3>📎 Files</h3>
              <input
                type="file"
                onChange={(e) => {
                  if (e.target.files[0]) {
                    handleFileUpload(showDetails._id, e.target.files[0]);
                  }
                }}
                style={{ marginBottom: '1rem' }}
              />
              {showDetails.files && showDetails.files.length > 0 ? (
                <div>
                  {showDetails.files.map((file, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.5rem',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      marginBottom: '0.5rem'
                    }}>
                      <div>
                        <strong>{file.originalName}</strong>
                        <span style={{ marginLeft: '1rem', color: '#6b7280' }}>
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                      <div>
                        <button
                          onClick={() => window.open(`${api.defaults.baseURL}/documents/${showDetails._id}/download/${file._id}`, '_blank')}
                          style={{ marginRight: '0.5rem' }}
                        >
                          📥 Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No files attached</p>
              )}
            </div>

            {/* Workflow Actions */}
            <div style={{ marginBottom: '2rem' }}>
              <h3>⚙️ Actions</h3>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {showDetails.status === 'draft' && (
                  <button onClick={() => handleStatusChange(showDetails._id, 'submit', 'Submitted for review')}>
                    📤 Submit
                  </button>
                )}
                {(showDetails.status === 'pending' || showDetails.status === 'under_review') && (
                  <>
                    <button onClick={() => handleStatusChange(showDetails._id, 'approve', 'Approved')}>
                      ✅ Approve
                    </button>
                    <button onClick={() => handleStatusChange(showDetails._id, 'reject', 'Rejected')}>
                      ❌ Reject
                    </button>
                  </>
                )}
                {showDetails.status !== 'archived' && (
                  <button onClick={() => handleStatusChange(showDetails._id, 'archive', 'Archived')}>
                    📦 Archive
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3>✉️ Correspondence Response</h3>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button onClick={() => handleResponseUpdate(showDetails._id, 'awaiting', 'Awaiting response')}>⏳ Mark Awaiting Response</button>
                <button onClick={() => handleResponseUpdate(showDetails._id, 'received', 'Response received')}>✅ Mark Response Received</button>
                <button onClick={() => handleResponseUpdate(showDetails._id, 'overdue', 'Response is overdue')}>⚠️ Mark Overdue</button>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3>🔄 Send / Move Document to Another Department</h3>
              <div style={{ display: 'grid', gap: '1rem', maxWidth: '480px' }}>
                <select
                  value={moveFields.toDepartment}
                  onChange={(e) => setMoveFields({ ...moveFields, toDepartment: e.target.value })}
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                >
                  <option value="">Select destination department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
                <textarea
                  placeholder="Reason or instructions for the receiving department"
                  value={moveFields.reason}
                  onChange={(e) => setMoveFields({ ...moveFields, reason: e.target.value })}
                  rows="3"
                  style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
                <button
                  onClick={() => handleMoveDocument(showDetails._id, moveFields.toDepartment, moveFields.reason)}
                  disabled={!moveFields.toDepartment}
                >
                  ➡️ Send to Department
                </button>
              </div>
            </div>

            {/* Movement and Approval History */}
            {showDetails.movementHistory && showDetails.movementHistory.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h3>📌 Movement History</h3>
                <div style={{ maxHeight: '180px', overflow: 'auto' }}>
                  {showDetails.movementHistory.map((entry, index) => (
                    <div key={index} style={{
                      padding: '0.5rem',
                      borderLeft: '3px solid #10b981',
                      marginBottom: '0.5rem',
                      background: '#f8fafc'
                    }}>
                      <strong>{entry.fromDepartment || 'Unknown'}</strong> ➡️ <strong>{entry.toDepartment || 'Unknown'}</strong>
                      <div>By: {entry.movedBy?.name || 'Unknown'}</div>
                      <div>{new Date(entry.movedAt).toLocaleString()}</div>
                      {entry.reason && <p>{entry.reason}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {showDetails.approvalHistory && showDetails.approvalHistory.length > 0 && (
              <div>
                <h3>📋 History</h3>
                <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                  {showDetails.approvalHistory.map((entry, index) => (
                    <div key={index} style={{
                      padding: '0.5rem',
                      borderLeft: '3px solid #3b82f6',
                      marginBottom: '0.5rem',
                      background: '#f8fafc'
                    }}>
                      <strong>{entry.action}</strong> by {entry.by?.name || 'Unknown'} on {new Date(entry.when).toLocaleString()}
                      {entry.comment && <p>{entry.comment}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}