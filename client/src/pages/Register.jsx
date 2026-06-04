import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleName, setRoleName] = useState('Clerk');
  const [message, setMessage] = useState('');
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
    }
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/auth/register', { name, email, password, roleName });
      setMessage('Registration successful. Redirecting to login...');
      setName('');
      setEmail('');
      setPassword('');
      setTimeout(() => navigate('/login'), 1500);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Registration failed.');
    }
  };

  return (
    <div className="card">
      <h1>Register</h1>
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
            <option value="Security Officer">Security Officer</option>
            <option value="MCA">MCA</option>
            <option value="Clerk">Clerk</option>
            <option value="Intern">Intern</option>
          </select>
        </label>
        <button type="submit">Register</button>
      </form>
      {message && <div className="message">{message}</div>}
      <p>Already registered? <Link to="/login">Log in</Link></p>
    </div>
  );
}
