import { useState, useEffect } from 'react';
import api from '../services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ user: '', action: '', entity: '' });
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalLogs: 0 });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [filters, pagination.currentPage]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...filters,
        page: pagination.currentPage,
        limit: 20,
      });
      const response = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(response.data.logs || []);
      setPagination(response.data.pagination || { currentPage: 1, totalPages: 1, totalLogs: 0 });
      setMessage('');
    } catch (error) {
      console.error('Unable to load audit logs:', error);
      setMessage('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, currentPage: newPage }));
  };

  return (
    <div className="page-content">
      <header className="page-header">
        <h1>Audit Logs</h1>
        <p>Track who performed critical operations and when they occurred.</p>
      </header>

      <section className="filters-grid">
        <label>
          User ID
          <input
            type="text"
            name="user"
            value={filters.user}
            onChange={handleFilterChange}
            placeholder="Filter by user id"
          />
        </label>
        <label>
          Action
          <input
            type="text"
            name="action"
            value={filters.action}
            onChange={handleFilterChange}
            placeholder="Filter by action"
          />
        </label>
        <label>
          Entity
          <input
            type="text"
            name="entity"
            value={filters.entity}
            onChange={handleFilterChange}
            placeholder="Filter by entity"
          />
        </label>
      </section>

      {message && <div className="alert warning">{message}</div>}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Details</th>
              <th>Path</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6">Loading...</td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="6">No audit logs found.</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id}>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td>{log.user ? `${log.user.name} (${log.user.email})` : 'System'}</td>
                  <td>{log.action}</td>
                  <td>{log.entity}{log.entityId ? ` (${log.entityId})` : ''}</td>
                  <td><pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(log.details || {}, null, 2)}</pre></td>
                  <td>{log.path}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination-controls">
        <button onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={pagination.currentPage <= 1}>
          Previous
        </button>
        <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
        <button onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={pagination.currentPage >= pagination.totalPages}>
          Next
        </button>
      </div>
    </div>
  );
}
