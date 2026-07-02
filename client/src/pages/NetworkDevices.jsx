import { useEffect, useState } from 'react';
import api from '../services/api';

const defaultForm = {
  assetTag: '',
  name: '',
  deviceType: 'computer',
  brand: '',
  model: '',
  serialNumber: '',
  location: '',
  assignedTo: '',
  assignedDepartment: '',
  status: 'in_use',
  connectivityStatus: 'online',
  ipAddress: '',
  notes: '',
};

const defaultMaintenance = {
  task: '',
  performedBy: '',
  date: '',
  notes: '',
};

const typeToCategory = {
  computer: 'ict',
  printer: 'ict',
  scanner: 'ict',
  network: 'ict',
  other: 'other',
};

export default function NetworkDevices() {
  const [devices, setDevices] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [maintenanceForm, setMaintenanceForm] = useState(defaultMaintenance);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [devicesRes, usersRes, departmentsRes] = await Promise.all([
        api.get('/assets'),
        api.get('/users'),
        api.get('/departments'),
      ]);
      setDevices(devicesRes.data || []);
      setUsers(usersRes.data || []);
      setDepartments(departmentsRes.data || []);
    } catch (error) {
      console.error('Failed to load device inventory', error);
      setMessage('Unable to load device inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      setMaintenanceForm(defaultMaintenance);
    }
  }, [selectedDevice]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMaintenanceChange = (event) => {
    const { name, value } = event.target;
    setMaintenanceForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegisterDevice = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      const payload = {
        assetTag: form.assetTag.trim(),
        name: form.name.trim(),
        category: typeToCategory[form.deviceType] || 'ict',
        deviceType: form.deviceType,
        brand: form.brand.trim(),
        model: form.model.trim(),
        serialNumber: form.serialNumber.trim(),
        location: form.location.trim(),
        assignedTo: form.assignedTo || undefined,
        assignedDepartment: form.assignedDepartment || undefined,
        status: form.status,
        connectivityStatus: form.connectivityStatus,
        ipAddress: form.ipAddress.trim(),
        notes: form.notes.trim(),
      };

      const response = await api.post('/assets', payload);
      setDevices((prev) => [response.data, ...prev]);
      setSelectedDevice(response.data);
      setForm(defaultForm);
      setMessage('Device registered successfully.');
    } catch (error) {
      console.error('Failed to register device', error);
      setMessage(error.response?.data?.message || 'Unable to register the device.');
    }
  };

  const handleUpdateDevice = async () => {
    if (!selectedDevice) return;

    try {
      const payload = {
        assignedTo: form.assignedTo || undefined,
        assignedDepartment: form.assignedDepartment || undefined,
        status: form.status,
        connectivityStatus: form.connectivityStatus,
        location: form.location,
        notes: form.notes,
      };
      const response = await api.put(`/assets/${selectedDevice._id}`, payload);
      setDevices((prev) => prev.map((device) => (device._id === response.data._id ? response.data : device)));
      setSelectedDevice(response.data);
      setMessage('Device assignment updated.');
    } catch (error) {
      console.error('Failed to update device', error);
      setMessage('Unable to update device assignment.');
    }
  };

  const handleMaintenanceSubmit = async (event) => {
    event.preventDefault();
    if (!selectedDevice) return;

    try {
      const response = await api.post(`/assets/${selectedDevice._id}/maintenance`, {
        task: maintenanceForm.task.trim(),
        performedBy: maintenanceForm.performedBy.trim(),
        date: maintenanceForm.date,
        notes: maintenanceForm.notes.trim(),
      });
      setDevices((prev) => prev.map((device) => (device._id === response.data._id ? response.data : device)));
      setSelectedDevice(response.data);
      setMaintenanceForm(defaultMaintenance);
      setMessage('Maintenance log recorded.');
    } catch (error) {
      console.error('Failed to add maintenance log', error);
      setMessage('Unable to record maintenance.');
    }
  };

  const handleExportInventory = () => {
    const rows = filteredDevices.map((device) => ({
      assetTag: device.assetTag || '',
      name: device.name || '',
      type: device.deviceType || 'device',
      status: device.status || 'unknown',
      connectivity: device.connectivityStatus || 'unknown',
      assignedTo: device.assignedTo?.name || '',
      department: device.assignedDepartment?.name || '',
      location: device.location || '',
      ipAddress: device.ipAddress || '',
    }));

    const csvContent = [
      ['Asset Tag', 'Name', 'Type', 'Status', 'Connectivity', 'Assigned To', 'Department', 'Location', 'IP Address'].join(','),
      ...rows.map((row) => Object.values(row).map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).filter(Boolean),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ict-device-inventory.csv';
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Inventory export generated.');
  };

  const filteredDevices = devices.filter((device) => {
    if (filter === 'all') return true;
    if (filter === 'online') return device.connectivityStatus === 'online';
    if (filter === 'maintenance') return device.status === 'maintenance';
    if (filter === 'in_use') return device.status === 'in_use';
    if (filter === 'available') return device.status === 'available';
    return true;
  });

  const summary = {
    total: devices.length,
    online: devices.filter((device) => device.connectivityStatus === 'online').length,
    inUse: devices.filter((device) => device.status === 'in_use').length,
    maintenance: devices.filter((device) => device.status === 'maintenance').length,
  };

  return (
    <div className="card">
      <h1>🌐 Network & Device Management</h1>
      <p>Register computers, printers, scanners and connected devices, assign them to staff, track their status and export the inventory.</p>

      {message && <div className="message">{message}</div>}

      <div className="dashboard-grid" style={{ marginTop: '1.5rem' }}>
        <div className="dashboard-card">
          <h3>Total devices</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-color)' }}>{summary.total}</p>
        </div>
        <div className="dashboard-card">
          <h3>Connected</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-color)' }}>{summary.online}</p>
        </div>
        <div className="dashboard-card">
          <h3>In use</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{summary.inUse}</p>
        </div>
        <div className="dashboard-card">
          <h3>Under maintenance</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{summary.maintenance}</p>
        </div>
      </div>

      <div className="module-actions" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button type="button" onClick={fetchData}>Refresh inventory</button>
        <button type="button" onClick={handleExportInventory}>Export inventory CSV</button>
      </div>

      <div className="asset-grid">
        <section className="asset-panel">
          <h2>Register new device</h2>
          <form className="asset-form" onSubmit={handleRegisterDevice}>
            <div className="form-grid">
              <label>
                Asset tag
                <input name="assetTag" value={form.assetTag} onChange={handleInputChange} required />
              </label>
              <label>
                Device name
                <input name="name" value={form.name} onChange={handleInputChange} required />
              </label>
              <label>
                Device type
                <select name="deviceType" value={form.deviceType} onChange={handleInputChange}>
                  <option value="computer">Computer</option>
                  <option value="printer">Printer</option>
                  <option value="scanner">Scanner</option>
                  <option value="network">Network Device</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Brand
                <input name="brand" value={form.brand} onChange={handleInputChange} />
              </label>
              <label>
                Model
                <input name="model" value={form.model} onChange={handleInputChange} />
              </label>
              <label>
                Serial number
                <input name="serialNumber" value={form.serialNumber} onChange={handleInputChange} />
              </label>
              <label>
                Assigned staff
                <select name="assignedTo" value={form.assignedTo} onChange={handleInputChange}>
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>{user.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Department
                <select name="assignedDepartment" value={form.assignedDepartment} onChange={handleInputChange}>
                  <option value="">Unassigned</option>
                  {departments.map((department) => (
                    <option key={department._id} value={department._id}>{department.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Location
                <input name="location" value={form.location} onChange={handleInputChange} />
              </label>
              <label>
                Status
                <select name="status" value={form.status} onChange={handleInputChange}>
                  <option value="available">Available</option>
                  <option value="in_use">In Use</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
              </label>
              <label>
                Connectivity
                <select name="connectivityStatus" value={form.connectivityStatus} onChange={handleInputChange}>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </label>
              <label>
                IP address
                <input name="ipAddress" value={form.ipAddress} onChange={handleInputChange} />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                Notes
                <textarea name="notes" rows="3" value={form.notes} onChange={handleInputChange} />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit">Register device</button>
            </div>
          </form>
        </section>

        <section className="asset-panel">
          <h2>Inventory overview</h2>
          <label>
            Filter devices
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">All devices</option>
              <option value="online">Connected</option>
              <option value="in_use">In use</option>
              <option value="maintenance">Maintenance</option>
              <option value="available">Available</option>
            </select>
          </label>
          {loading ? (
            <p>Loading devices...</p>
          ) : filteredDevices.length === 0 ? (
            <p>No devices found.</p>
          ) : (
            <div className="asset-list">
              {filteredDevices.map((device) => (
                <button
                  key={device._id}
                  type="button"
                  className={`asset-item ${selectedDevice?._id === device._id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedDevice(device);
                    setForm({
                      assetTag: device.assetTag || '',
                      name: device.name || '',
                      deviceType: device.deviceType || 'computer',
                      brand: device.brand || '',
                      model: device.model || '',
                      serialNumber: device.serialNumber || '',
                      location: device.location || '',
                      assignedTo: device.assignedTo?._id || '',
                      assignedDepartment: device.assignedDepartment?._id || '',
                      status: device.status || 'in_use',
                      connectivityStatus: device.connectivityStatus || 'online',
                      ipAddress: device.ipAddress || '',
                      notes: device.notes || '',
                    });
                  }}
                >
                  <strong>{device.assetTag}</strong>
                  <div className="asset-meta">{device.name}</div>
                  <div className="asset-meta">Type: {device.deviceType || 'Device'}</div>
                  <div className="asset-meta">Status: {device.status || 'unknown'}</div>
                  <div className="asset-meta">Connectivity: {device.connectivityStatus || 'unknown'}</div>
                  <div className="asset-meta">Assigned: {device.assignedTo?.name || device.assignedDepartment?.name || 'Unassigned'}</div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedDevice && (
        <section className="asset-panel" style={{ marginTop: '1.5rem' }}>
          <h2>{selectedDevice.name}</h2>
          <div className="form-grid">
            <div>
              <p><strong>Asset tag:</strong> {selectedDevice.assetTag}</p>
              <p><strong>Type:</strong> {selectedDevice.deviceType || 'Device'}</p>
              <p><strong>Brand / Model:</strong> {selectedDevice.brand || 'N/A'} / {selectedDevice.model || 'N/A'}</p>
              <p><strong>Serial number:</strong> {selectedDevice.serialNumber || 'N/A'}</p>
            </div>
            <div>
              <p><strong>Status:</strong> {selectedDevice.status || 'unknown'}</p>
              <p><strong>Connectivity:</strong> {selectedDevice.connectivityStatus || 'unknown'}</p>
              <p><strong>IP address:</strong> {selectedDevice.ipAddress || 'N/A'}</p>
              <p><strong>Assigned to:</strong> {selectedDevice.assignedTo?.name || selectedDevice.assignedDepartment?.name || 'Unassigned'}</p>
            </div>
          </div>

          <div className="asset-actions form-grid" style={{ marginTop: '1rem' }}>
            <label>
              Status
              <select name="status" value={form.status} onChange={handleInputChange}>
                <option value="available">Available</option>
                <option value="in_use">In Use</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </select>
            </label>
            <label>
              Connectivity
              <select name="connectivityStatus" value={form.connectivityStatus} onChange={handleInputChange}>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </label>
            <label>
              Assigned staff
              <select name="assignedTo" value={form.assignedTo} onChange={handleInputChange}>
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>{user.name}</option>
                ))}
              </select>
            </label>
            <label>
              Department
              <select name="assignedDepartment" value={form.assignedDepartment} onChange={handleInputChange}>
                <option value="">Unassigned</option>
                {departments.map((department) => (
                  <option key={department._id} value={department._id}>{department.name}</option>
                ))}
              </select>
            </label>
            <label>
              Location
              <input name="location" value={form.location} onChange={handleInputChange} />
            </label>
            <label style={{ gridColumn: '1 / -1' }}>
              Notes
              <textarea name="notes" rows="3" value={form.notes} onChange={handleInputChange} />
            </label>
          </div>
          <div className="form-actions">
            <button type="button" onClick={handleUpdateDevice}>Update device</button>
          </div>

          <div className="asset-subpanels" style={{ marginTop: '1.5rem' }}>
            <div className="asset-subpanel">
              <h3>Maintenance history</h3>
              {selectedDevice.maintenanceLogs?.length > 0 ? (
                <ul>
                  {selectedDevice.maintenanceLogs.map((log, idx) => (
                    <li key={idx}>
                      <strong>{log.task}</strong> — {log.performedBy} on {new Date(log.date).toLocaleDateString()}
                      <p>{log.notes}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No maintenance entries yet.</p>
              )}

              <form onSubmit={handleMaintenanceSubmit} className="form-grid">
                <label>
                  Task
                  <input name="task" value={maintenanceForm.task} onChange={handleMaintenanceChange} required />
                </label>
                <label>
                  Performed by
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
                  <button type="submit">Log maintenance</button>
                </div>
              </form>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
