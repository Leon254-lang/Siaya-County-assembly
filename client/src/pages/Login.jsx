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
      localStorage.setItem('icamsToken', response.data.token);
      localStorage.setItem('userName', response.data.user.name);
      localStorage.setItem('userRole', response.data.user.role);
      setMessage('Login successful.');
      // Redirect based on role
      const role = response.data.user.role;
      let redirectPath = '/dashboard';
      if (role === 'HR Officer') redirectPath = '/attendance';
      else if (role === 'Security Officer') redirectPath = '/visitors';
      else if (role === 'Committee Officer') redirectPath = '/meetings';
      else if (role === 'Finance Officer') redirectPath = '/assets';
      else if (role === 'ICT Admin') redirectPath = '/tickets';
      else if (role === 'Clerk') redirectPath = '/documents';
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
