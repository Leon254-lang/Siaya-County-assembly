import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('icamsToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('icamsToken');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// HR helper endpoints
export const getHRDashboard = () => api.get('/hr/dashboard');
export const getEmployees = () => api.get('/hr/employees');
export const getEmployee = (id) => api.get(`/hr/employees/${id}`);
export const createEmployee = (payload) => api.post('/hr/employees', payload);
export const updateEmployee = (id, payload) => api.put(`/hr/employees/${id}`, payload);
export const uploadEmployeeDocument = (id, formData) => api.post(`/hr/employees/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const getVacancies = () => api.get('/hr/vacancies');
export const createVacancy = (payload) => api.post('/hr/vacancies', payload);
export const applyVacancy = (id, formData) => api.post(`/hr/vacancies/${id}/apply`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const getApplications = () => api.get('/hr/applications');
export const shortlistApplication = (id) => api.patch(`/hr/applications/${id}/shortlist`);
export const scheduleApplication = (id, payload) => api.patch(`/hr/applications/${id}/schedule`, payload);
export const updateApplicationResult = (id, payload) => api.patch(`/hr/applications/${id}/result`, payload);

export const getTrainings = () => api.get('/hr/trainings');
export const createTraining = (payload) => api.post('/hr/trainings', payload);

export const approveLeave = (id) => api.patch(`/hr/leave/${id}/approve`);
export const rejectLeave = (id, payload) => api.patch(`/hr/leave/${id}/reject`, payload);

export const getAppraisals = () => api.get('/hr/appraisals');
export const createAppraisal = (payload) => api.post('/hr/appraisals', payload);
