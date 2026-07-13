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

      const meResponse = await api.get('/auth/me');
      const meUser = meResponse.data;
      const userRole = meUser.role?.name || meUser.role || response.data.user.role || 'User';
      const user = { ...meUser, role: userRole };

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userName', user.name);
      localStorage.setItem('userRole', userRole);
      localStorage.setItem('userId', user.id || user._id || '');
      setMessage('Signed in.');

      const redirectMap = {
        'Super Admin': '/dashboard',
        'ICT Admin': '/dashboard',
        'HR Officer': '/dashboard',
        'Finance Officer': '/finance',
        'Committee Officer': '/committees',
        'Procurement Officer': '/procurement',
        'Security Officer': '/visitors',
        'Clerk': '/dashboard',
        'MCA': '/mcas',
        'Intern': '/interns',
      };
      const redirectPath = redirectMap[userRole] || '/dashboard';
      setTimeout(() => navigate(redirectPath), 1000);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not sign in.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-panel">
        <div className="login-copy">
          <span>Siaya County Assembly</span>
          <h1>Access the county assembly portal</h1>
          <p>Sign in to manage meetings, documents, attendance, and public participation.</p>
        </div>

        <div className="login-card card">
          <div className="login-card-head">
            <div className="login-card-icon">🔐</div>
            <div>
              <h2>Sign in</h2>
              <p>Use your email and password to continue.</p>
            </div>
          </div>
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
      </div>

      <aside className="login-side">
        <div className="login-side-card">
          <h2>Why sign in</h2>
          <ul>
            <li>Access role-based dashboards and county workflows.</li>
            <li>Review assembly notices, meetings and committee schedules.</li>
            <li>Upload official documents and manage attendance records.</li>
            <li>Receive public feedback and monitor participation.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
