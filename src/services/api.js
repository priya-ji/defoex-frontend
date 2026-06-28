import axios from 'axios';

const api = axios.create({
  // Empty baseURL in dev → requests go through setupProxy.js (same-origin, no CORS)
  baseURL: process.env.REACT_APP_API_URL || '',
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor - attach token (skip auth endpoints)
api.interceptors.request.use(config => {
  const isAuthRoute = /\/api\/auth\/(login|logout|refresh)/.test(config.url || '');
  if (!isAuthRoute) {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    const isAuthRoute = /\/api\/auth\/(login|refresh)/.test(original?.url || '');
    if (err.response?.status === 401 && !original._retry && !isAuthRoute) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) throw new Error('No refresh token');
        const baseURL = (api.defaults.baseURL || '').replace(/\/$/, '');
        const { data } = await axios.post(`${baseURL}/api/auth/refresh`, {}, {
          headers: { Authorization: `Bearer ${refresh}` }
        });
        localStorage.setItem('access_token', data.data.access_token);
        original.headers.Authorization = `Bearer ${data.data.access_token}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
