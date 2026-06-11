import { useEffect, useState } from 'react';
import api from '../services/api';

const roleOptions = [
  'Super Admin',
  'ICT Admin',
  'HR Officer',
  'Clerk',
  'Finance Officer',
  'Committee Officer',
  'Procurement Officer',
  'Security Officer',
  'MCA',
  'Intern',
];

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingUserId, setEditingUserId] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    roleName: 'Clerk',
    departmentId: '',
    isActive: true,
    password: '',
  });

  const fetchUsers = async () => {
    try {
      const [usersRes, departmentsRes] = await Promise.all([
        api.get('/users'),
        api.get('/departments'),
      ]);
      setUsers(usersRes.data || []);
      setDepartments(departmentsRes.data || []);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const startEdit = (user) => {
    setEditingUserId(user._id);
    setForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      roleName: user.role?.name || 'Clerk',
      departmentId: user.department?._id || '',
      isActive: user.isActive !== false,
      password: '',
    });
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      await api.put(`/users/${editingUserId}`, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        roleName: form.roleName,
        departmentId: form.departmentId || undefined,
        isActive: form.isActive,
        password: form.password || undefined,
      });
      setMessage('User updated successfully.');
      setEditingUserId('');
      setForm({
        name: '',
        email: '',
        phone: '',
        roleName: 'Clerk',
        departmentId: '',
        isActive: true,
        password: '',
      });
      await fetchUsers();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Update failed.');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user? This action cannot be undone.')) return;

    try {
      await api.delete(`/users/${userId}`);
      setMessage('User deleted successfully.');
      await fetchUsers();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Delete failed.');
    }
  };

  return (
    <div className="card">
      <h1>Manage Users</h1>
      <p>Use this page to update account details and remove staff accounts from the system.</p>

      {message && <div className="message">{message}</div>}

      {editingUserId ? (
        <form onSubmit={handleSave} style={{ marginBottom: '1.5rem' }}>
          <label>
            Full Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label>
            Role
            <select value={form.roleName} onChange={(e) => setForm({ ...form, roleName: e.target.value })}>
              {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </label>
          <label>
            Department
            <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">No department</option>
              {departments.map((department) => (
                <option key={department._id} value={department._id}>{department.name}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={form.isActive ? 'active' : 'inactive'} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label>
            New Password (optional)
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Leave blank to keep current password" />
          </label>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="submit">Save Changes</button>
            <button type="button" onClick={() => setEditingUserId('')} className="button secondary">Cancel</button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <p>Loading users...</p>
      ) : users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role?.name || 'Unknown'}</td>
                  <td>{user.isActive === false ? 'Inactive' : 'Active'}</td>
                  <td>
                    <button type="button" onClick={() => startEdit(user)} style={{ marginRight: '0.5rem' }}>
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(user._id)} className="button secondary">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
