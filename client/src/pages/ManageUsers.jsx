import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import FormGrid from '../components/UI/FormGrid';
import Button from '../components/UI/Button';

const roleOptions = [
  'Super Admin',
  'ICT Admin',
  'HR Officer',
  'Clerk',
  'Finance Officer',
  'Committee Officer',
  'Procurement Officer',
  'Security Officer',
  'Registry',
  'MCA',
  'Intern',
];

export default function ManageUsers() {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingUserId, setEditingUserId] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    roleName: 'Clerk',
    departmentId: '',
    isActive: true,
    password: '',
  });
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    roleName: 'ICT Admin',
    departmentId: '',
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

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'create') {
      setShowCreateForm(true);
      setMessage('Create a new account below.');
    }
    if (mode === 'reset') {
      setShowCreateForm(false);
      setMessage('Select a user and edit their account to reset the password.');
    }
  }, [searchParams]);

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

  const handleCreate = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      await api.post('/auth/register', {
        name: createForm.name,
        email: createForm.email,
        phone: createForm.phone,
        roleName: createForm.roleName,
        department: createForm.departmentId || undefined,
        password: createForm.password,
      });
      setMessage('User created successfully.');
      setShowCreateForm(false);
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        roleName: 'ICT Admin',
        departmentId: '',
        password: '',
      });
      await fetchUsers();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to create user.');
    }
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
      <p>Create accounts, update staff details, reset passwords, and manage access here.</p>

      {message && <div className="message">{message}</div>}

      <div className="button-group" style={{ marginBottom: '1.25rem' }}>
        <Button type="button" variant="secondary" onClick={() => setShowCreateForm((prev) => !prev)}>
          {showCreateForm ? 'Cancel' : 'Add New User'}
        </Button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreate} className="form-section">
          <FormGrid>
            <label>
              Full Name
              <input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} required />
            </label>
            <label>
              Email
              <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required />
            </label>
            <label>
              Phone
              <input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} />
            </label>
            <label>
              Role
              <select value={createForm.roleName} onChange={(e) => setCreateForm({ ...createForm, roleName: e.target.value })}>
                {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>
            <label>
              Department
              <select value={createForm.departmentId} onChange={(e) => setCreateForm({ ...createForm, departmentId: e.target.value })}>
                <option value="">No department</option>
                {departments.map((department) => (
                  <option key={department._id} value={department._id}>{department.name}</option>
                ))}
              </select>
            </label>
            <label>
              Temporary Password
              <input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} required />
            </label>
          </FormGrid>
          <div className="form-actions">
            <Button type="submit">Create User</Button>
          </div>
        </form>
      )}

      {editingUserId ? (
        <form onSubmit={handleSave} className="form-section">
          <FormGrid>
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
          </FormGrid>
          <div className="button-group">
            <Button type="submit">Save Changes</Button>
            <Button type="button" variant="secondary" onClick={() => setEditingUserId('')}>Cancel</Button>
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
                    <Button type="button" variant="tertiary" onClick={() => startEdit(user)} style={{ marginRight: '0.5rem' }}>
                      Edit
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => handleDelete(user._id)}>
                      Remove
                    </Button>
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
