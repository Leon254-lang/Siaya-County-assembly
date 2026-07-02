import { Navigate, useLocation } from 'react-router-dom';

const getCurrentRole = () => {
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      return parsed?.role || localStorage.getItem('userRole') || '';
    } catch (error) {
      return localStorage.getItem('userRole') || '';
    }
  }
  return localStorage.getItem('userRole') || '';
};

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const location = useLocation();
  const token = localStorage.getItem('icamsToken');
  const role = getCurrentRole();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}
