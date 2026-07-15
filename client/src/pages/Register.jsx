import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleName, setRoleName] = useState('Clerk');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');
  const [isAllowed, setIsAllowed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('icamsToken');
    const role = localStorage.getItem('userRole');
    if (!token) {
      navigate('/login');
      return;
    }
    if (role !== 'Super Admin') {
      navigate('/dashboard');
      return;
    }
    setIsAllowed(true);
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setSuccess('');

    try {
      await api.post('/auth/register', { name, email, password, roleName });
      setSuccess('User created. A verification email has been sent.');
      setName('');
      setEmail('');
      setPassword('');
      setRoleName('Clerk');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not create user.');
    }
  };

  if (!isAllowed) {
    return (
      <div className="card">
        <h1>Access denied</h1>
        <p>Only Super Admin users can add new users to the system.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>Create User</h1>
      <p>Only Super Admins can create accounts and assign roles.</p>
      <form onSubmit={handleSubmit}>
        <label>
          Full Name
          <input value={name} onChange={(e) => setName(e.target.value)} type="text" required />
        </label>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        <label>
          Role
          <select value={roleName} onChange={(e) => setRoleName(e.target.value)}>
            <option value="Super Admin">Super Admin</option>
            <option value="ICT Admin">ICT Admin</option>
            <option value="HR Officer">HR Officer</option>
            <option value="Finance Officer">Finance Officer</option>
            <option value="Committee Officer">Committee Officer</option>
            <option value="Procurement Officer">Procurement Officer</option>
              <option value="Registry">Registry</option>
            <option value="Security Officer">Security Officer</option>
            <option value="MCA">MCA</option>
            <option value="Clerk">Clerk</option>
            <option value="Intern">Intern</option>
          </select>
        </label>
        <button type="submit">Create User</button>
      </form>
      {success && <div className="success-message">{success}</div>}
      {message && <div className="message">{message}</div>}
    </div>
  );
}
