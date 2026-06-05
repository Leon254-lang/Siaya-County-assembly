import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const defaultForm = {
  assetTag: '',
  name: '',
  category: 'other',
  location: '',
  purchaseDate: '',
  value: '',
  assignedTo: '',
  assignedDepartment: '',
  status: 'available',
};

const defaultMaintenance = {
  task: '',
  performedBy: '',
  date: '',
  notes: '',
};

const defaultDisposal = {
  date: '',
  reason: '',
  disposedBy: '',
  method: '',
  notes: '',
};

const moduleOptions = [
  { value: 'documents', label: 'Documents', path: '/documents' },
  { value: 'committees', label: 'Committees', path: '/committees' },
  { value: 'attendance', label: 'Attendance', path: '/attendance' },
  { value: 'visitors', label: 'Visitors', path: '/visitors' },
  { value: 'meetings', label: 'Meetings', path: '/meetings' },
  { value: 'sessions', label: 'Sessions', path: '/sessions' },
  { value: 'mcas', label: 'MCAs', path: '/mcas' },
  { value: 'assets', label: 'Assets', path: '/assets' },
  { value: 'finance', label: 'Finance', path: '/finance' },
  { value: 'procurement', label: 'Procurement', path: '/procurement' },
  { value: 'bills', label: 'Bills', path: '/bills' },
  { value: 'voting', label: 'Voting', path: '/voting' },
  { value: 'tickets', label: 'Helpdesk', path: '/tickets' },
  { value: 'interns', label: 'Interns', path: '/interns' },
  { value: 'leaders', label: 'Leaders', path: '/leaders' },
  { value: 'feedback', label: 'Public', path: '/feedback' },
  { value: 'faq', label: 'FAQ', path: '/faq' },
  { value: 'media', label: 'Media', path: '/media' },
];

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [assignment, setAssignment] = useState({ assignedTo: '', assignedDepartment: '', status: 'available' });
  const [maintenanceForm, setMaintenanceForm] = useState(defaultMaintenance);
  const [disposalForm, setDisposalForm] = useState(defaultDisposal);
  const [newDepartment, setNewDepartment] = useState({ name: '', description: '', modules: [] });
  const [message, setMessage] = useState('');

  const fetchAssets = async () => {
    try {
      const response = await api.get('/assets');
      setAssets(response.data);
    } catch (error) {
      console.error('Failed to load assets', error);
      setMessage('Unable to load asset records.');
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
    fetchAssets();
    fetchUsers();
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedAsset) {
      setAssignment({
        assignedTo: selectedAsset.assignedTo?._id || '',
        assignedDepartment: selectedAsset.assignedDepartment?._id || '',
        status: selectedAsset.status || 'available',
      });
      setMaintenanceForm(defaultMaintenance);
      setDisposalForm(defaultDisposal);
    }
  }, [selectedAsset]);

  const resetForm = () => {
    setForm(defaultForm);
    setMessage('');
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAssignmentChange = (event) => {
    const { name, value } = event.target;
    setAssignment((prev) => ({ ...prev, [name]: value }));
  };

  const handleMaintenanceChange = (event) => {
    const { name, value } = event.target;
    setMaintenanceForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDisposalChange = (event) => {
    const { name, value } = event.target;
    setDisposalForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewDepartmentChange = (event) => {
    const { name, value } = event.target;
    setNewDepartment((prev) => ({ ...prev, [name]: value }));
  };

  const handleModuleToggle = (moduleValue) => {
    setNewDepartment((prev) => {
      const modules = prev.modules.includes(moduleValue)
        ? prev.modules.filter((m) => m !== moduleValue)
        : [...prev.modules, moduleValue];
      return { ...prev, modules };
    });
  };

  const handleCreateDepartment = async (event) => {
    event.preventDefault();
    if (!newDepartment.name.trim()) {
      setMessage('Department name is required.');
      return;
    }

    try {
      const payload = {
        name: newDepartment.name.trim(),
        description: newDepartment.description.trim(),
        modules: newDepartment.modules,
      };
      const response = await api.post('/departments', payload);
      setDepartments((prev) => [...prev, response.data]);
      setNewDepartment({ name: '', description: '', modules: [] });
      setMessage(`Department '${response.data.name}' created.`);
    } catch (error) {
      console.error('Failed to create department:', error);
      setMessage('Unable to create department.');
    }
  };

  const handleCreateAsset = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      const payload = {
        assetTag: form.assetTag.trim(),
        name: form.name.trim(),
        category: form.category,
        location: form.location.trim(),
        purchaseDate: form.purchaseDate ? new Date(form.purchaseDate).toISOString() : undefined,
        value: form.value ? Number(form.value) : undefined,
        assignedTo: form.assignedTo || undefined,
        assignedDepartment: form.assignedDepartment || undefined,
        status: form.status,
      };

      const response = await api.post('/assets', payload);
      setAssets((prev) => [response.data, ...prev]);
      setSelectedAsset(response.data);
      resetForm();
      setMessage('Asset registered successfully.');
    } catch (error) {
      console.error('Error registering asset:', error);
      setMessage('Failed to register the asset. Check the asset tag and try again.');
    }
  };

  const handleSelectAsset = (asset) => {
    setSelectedAsset(asset);
    setMessage('');
  };

  const handleUpdateAssignment = async () => {
    if (!selectedAsset) return;

    try {
      const payload = {
        assignedTo: assignment.assignedTo || undefined,
        assignedDepartment: assignment.assignedDepartment || undefined,
        status: assignment.status,
      };
      const response = await api.put(`/assets/${selectedAsset._id}`, payload);
      setSelectedAsset(response.data);
      setAssets((prev) => prev.map((asset) => (asset._id === response.data._id ? response.data : asset)));
      setMessage('Asset assignment updated successfully.');
    } catch (error) {
      console.error('Failed to update assignment:', error);
      setMessage('Unable to update asset assignment.');
    }
  };

  const handleAddMaintenance = async (event) => {
    event.preventDefault();
    if (!selectedAsset) return;

    try {
      const payload = {
        task: maintenanceForm.task.trim(),
        performedBy: maintenanceForm.performedBy.trim(),
        date: maintenanceForm.date,
        notes: maintenanceForm.notes.trim(),
      };
      const response = await api.post(`/assets/${selectedAsset._id}/maintenance`, payload);
      setSelectedAsset(response.data);
      setAssets((prev) => prev.map((asset) => (asset._id === response.data._id ? response.data : asset)));
      setMaintenanceForm(defaultMaintenance);
      setMessage('Maintenance log added and asset moved to maintenance.');
    } catch (error) {
      console.error('Failed to add maintenance log:', error);
      setMessage('Unable to add maintenance log.');
    }
  };

  const handleRecordDisposal = async (event) => {
    event.preventDefault();
    if (!selectedAsset) return;

    try {
      const payload = {
        date: disposalForm.date,
        reason: disposalForm.reason.trim(),
        disposedBy: disposalForm.disposedBy.trim(),
        method: disposalForm.method.trim(),
        notes: disposalForm.notes.trim(),
      };
      const response = await api.post(`/assets/${selectedAsset._id}/dispose`, payload);
      setSelectedAsset(response.data);
      setAssets((prev) => prev.map((asset) => (asset._id === response.data._id ? response.data : asset)));
      setDisposalForm(defaultDisposal);
      setMessage('Disposal record saved and asset retired.');
    } catch (error) {
      console.error('Failed to record disposal:', error);
      setMessage('Unable to record disposal.');
    }
  };

  return (
    <div className="assets-page">
      <div className="page-header">
        <h1>Asset Management</h1>
        <p>Register assets, assign them to staff or departments, track maintenance, and record disposal.</p>
      </div>
      <div className="asset-grid">
        <section className="asset-panel">
          <h2>Register New Asset</h2>
          <form className="asset-form" onSubmit={handleCreateAsset}>
            <div className="form-grid">
              <label>
                Asset Tag
                <input name="assetTag" value={form.assetTag} onChange={handleInputChange} required />
              </label>
              <label>
                Asset Name
                <input name="name" value={form.name} onChange={handleInputChange} required />
              </label>
              <label>
                Category
                <select name="category" value={form.category} onChange={handleInputChange}>
                  <option value="ict">Laptop / ICT</option>
                  <option value="furniture">Furniture</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="office_supply">Office Supply</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Location
                <input name="location" value={form.location} onChange={handleInputChange} />
              </label>
              <label>
                Purchase Date
                <input type="date" name="purchaseDate" value={form.purchaseDate} onChange={handleInputChange} />
              </label>
              <label>
                Value
                <input type="number" name="value" value={form.value} onChange={handleInputChange} min="0" step="0.01" />
              </label>
              <label>
                Assign to Staff
                <select name="assignedTo" value={form.assignedTo} onChange={handleInputChange}>
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Assign to Department
                <select name="assignedDepartment" value={form.assignedDepartment} onChange={handleInputChange}>
                  <option value="">Unassigned</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Current Status
                <select name="status" value={form.status} onChange={handleInputChange}>
                  <option value="available">Available</option>
                  <option value="in_use">In Use</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button type="submit">Register Asset</button>
            </div>
          </form>
        </section>
        <section className="asset-panel">
          <h2>Departments</h2>
          <p className="form-note">Create departments here, then assign assets directly during registration or transfer.</p>
          <form className="asset-form" onSubmit={handleCreateDepartment}>
            <div className="form-grid">
              <label>
                Department Name
                <input
                  name="name"
                  value={newDepartment.name}
                  onChange={handleNewDepartmentChange}
                  required
                />
              </label>
              <label>
                Description
                <input
                  name="description"
                  value={newDepartment.description}
                  onChange={handleNewDepartmentChange}
                />
              </label>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Relevant Modules</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                {moduleOptions.map((option) => (
                  <label key={option.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={newDepartment.modules.includes(option.value)}
                      onChange={() => handleModuleToggle(option.value)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button type="submit">Create Department</button>
            </div>
          </form>
          <div className="department-list">
            {departments.length > 0 ? (
              <ul>
                {departments.map((dept) => (
                  <li key={dept._id} style={{ marginBottom: '0.75rem' }}>
                    <strong>{dept.name}</strong> {dept.description ? `- ${dept.description}` : ''}
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {dept.modules && dept.modules.length > 0 ? (
                        dept.modules.map((moduleKey) => {
                          const moduleOption = moduleOptions.find((option) => option.value === moduleKey);
                          return moduleOption ? (
                            <Link
                              key={moduleKey}
                              to={moduleOption.path}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: '#eff6ff',
                                borderRadius: '6px',
                                color: '#1d4ed8',
                                textDecoration: 'none',
                                fontSize: '0.85rem'
                              }}
                            >
                              {moduleOption.label}
                            </Link>
                          ) : null;
                        })
                      ) : (
                        <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>No modules assigned.</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No departments yet. Create one to assign assets.</p>
            )}
          </div>
        </section>
        <section className="asset-panel">
          <h2>Asset Inventory</h2>
          <div className="asset-list">
            {assets.map((asset) => (
              <button
                key={asset._id}
                type="button"
                className={`asset-item ${selectedAsset?._id === asset._id ? 'selected' : ''}`}
                onClick={() => handleSelectAsset(asset)}
              >
                <strong>{asset.assetTag}</strong>
                <div className="asset-meta">{asset.name}</div>
                <div className="asset-meta">{asset.category.replace('_', ' ')}</div>
                <div className="asset-meta">Status: {asset.status.replace('_', ' ')}</div>
                <div className="asset-meta">Assigned to: {asset.assignedTo?.name || asset.assignedDepartment?.name || 'None'}</div>
              </button>
            ))}
          </div>
        </section>
      </div>
      {selectedAsset && (
        <section className="asset-panel">
          <h2>Asset Details</h2>
          <div className="asset-details">
            <div className="form-grid">
              <div>
                <p><strong>Asset Tag:</strong> {selectedAsset.assetTag}</p>
                <p><strong>Name:</strong> {selectedAsset.name}</p>
                <p><strong>Category:</strong> {selectedAsset.category.replace('_', ' ')}</p>
                <p><strong>Status:</strong> {selectedAsset.status.replace('_', ' ')}</p>
                <p><strong>Location:</strong> {selectedAsset.location || 'Not set'}</p>
              </div>
              <div>
                <p><strong>Assigned Staff:</strong> {selectedAsset.assignedTo?.name || 'None'}</p>
                <p><strong>Assigned Department:</strong> {selectedAsset.assignedDepartment?.name || 'None'}</p>
                <p><strong>Purchase Date:</strong> {selectedAsset.purchaseDate ? new Date(selectedAsset.purchaseDate).toLocaleDateString() : 'Unknown'}</p>
                <p><strong>Value:</strong> {selectedAsset.value ? `KES ${selectedAsset.value.toLocaleString()}` : 'Not recorded'}</p>
              </div>
            </div>
            <div className="form-note">
              Use the assignment area below to transfer assets to staff or departments, then log maintenance or disposal events.
            </div>
            <div className="asset-actions form-grid">
              <label>
                Assign Staff
                <select name="assignedTo" value={assignment.assignedTo} onChange={handleAssignmentChange}>
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Assign Department
                <select name="assignedDepartment" value={assignment.assignedDepartment} onChange={handleAssignmentChange}>
                  <option value="">Unassigned</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Update Status
                <select name="status" value={assignment.status} onChange={handleAssignmentChange}>
                  <option value="available">Available</option>
                  <option value="in_use">In Use</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button type="button" onClick={handleUpdateAssignment}>Update Assignment</button>
            </div>
            <div className="asset-subpanels">
              <div className="asset-subpanel">
                <h3>Maintenance History</h3>
                {selectedAsset.maintenanceLogs?.length > 0 ? (
                  <ul>
                    {selectedAsset.maintenanceLogs.map((log, idx) => (
                      <li key={idx}>
                        <strong>{log.task}</strong> — {log.performedBy} on {new Date(log.date).toLocaleDateString()}
                        <p>{log.notes}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No maintenance records yet.</p>
                )}
                <form onSubmit={handleAddMaintenance} className="form-grid">
                  <label>
                    Task
                    <input name="task" value={maintenanceForm.task} onChange={handleMaintenanceChange} required />
                  </label>
                  <label>
                    Performed By
                    <input name="performedBy" value={maintenanceForm.performedBy} onChange={handleMaintenanceChange} required />
                  </label>
                  <label>
                    Date
                    <input type="date" name="date" value={maintenanceForm.date} onChange={handleMaintenanceChange} />
                  </label>
                  <label>
                    Notes
                    <input name="notes" value={maintenanceForm.notes} onChange={handleMaintenanceChange} />
                  </label>
                  <div className="form-actions">
                    <button type="submit">Add Maintenance</button>
                  </div>
                </form>
              </div>
              <div className="asset-subpanel">
                <h3>Disposal Records</h3>
                {selectedAsset.disposalRecords?.length > 0 ? (
                  <ul>
                    {selectedAsset.disposalRecords.map((record, idx) => (
                      <li key={idx}>
                        <strong>{new Date(record.date).toLocaleDateString()}</strong> — {record.reason}
                        <p>Disposed by {record.disposedBy}, method: {record.method}</p>
                        <p>{record.notes}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No disposal records.</p>
                )}
                <form onSubmit={handleRecordDisposal} className="form-grid">
                  <label>
                    Disposal Date
                    <input type="date" name="date" value={disposalForm.date} onChange={handleDisposalChange} required />
                  </label>
                  <label>
                    Reason
                    <input name="reason" value={disposalForm.reason} onChange={handleDisposalChange} required />
                  </label>
                  <label>
                    Disposed By
                    <input name="disposedBy" value={disposalForm.disposedBy} onChange={handleDisposalChange} required />
                  </label>
                  <label>
                    Method
                    <input name="method" value={disposalForm.method} onChange={handleDisposalChange} required />
                  </label>
                  <label>
                    Notes
                    <input name="notes" value={disposalForm.notes} onChange={handleDisposalChange} />
                  </label>
                  <div className="form-actions">
                    <button type="submit">Record Disposal</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>
      )}
      {message && <div className="message">{message}</div>}
    </div>
  );
}
