import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      const response = await api.post('/auth/login', { email, password });
      const userRole = response.data.user.role?.name || response.data.user.role || 'User';
      const user = { ...response.data.user, role: userRole };

      localStorage.setItem('icamsToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userName', user.name);
      localStorage.setItem('userRole', userRole);
      localStorage.setItem('userId', user.id || user._id || '');
      setMessage('Login successful.');
      // Redirect based on role
      const role = userRole;
      const redirectMap = {
        'Super Admin': '/dashboard',
        'ICT Admin': '/tickets',
        'HR Officer': '/dashboard',
        'Finance Officer': '/finance',
        'Committee Officer': '/committees',
        'Procurement Officer': '/procurement',
        'Security Officer': '/visitors',
        'Clerk': '/documents',
        'MCA': '/voting',
        'Intern': '/interns',
      };
      const redirectPath = redirectMap[role] || '/dashboard';
      setTimeout(() => navigate(redirectPath), 1000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Login failed.');
    }
  };

  return (
    <div className="card">
      <h1>Login</h1>
      <p>Please register first and then log in with your credentials.</p>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        <button type="submit">Sign In</button>
      </form>
      {message && <div className="message">{message}</div>}
    </div>
  );
}
