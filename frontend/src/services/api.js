import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to catch unauthorized errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clean stale auth data if token is invalid or expired
      const token = localStorage.getItem('access_token');
      if (token && !error.config.url.includes('/auth/login/')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth Endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login/', credentials),
  register: (userData) => api.post('/auth/register/', userData),
  getProfile: () => api.get('/auth/profile/'),
};

// Hotel Endpoints (Full CRUD)
export const hotelsAPI = {
  getAll: (params) => api.get('/hotels/', { params }),
  getById: (id) => api.get(`/hotels/${id}/`),
  create: (data) => api.post('/hotels/', data),
  update: (id, data) => api.put(`/hotels/${id}/`, data),
  patch: (id, data) => api.patch(`/hotels/${id}/`, data),
  delete: (id) => api.delete(`/hotels/${id}/`),
};

// Room Endpoints (Full CRUD)
export const roomsAPI = {
  getAll: (params) => api.get('/rooms/', { params }),
  getById: (id) => api.get(`/rooms/${id}/`),
  create: (data) => api.post('/rooms/', data),
  update: (id, data) => api.put(`/rooms/${id}/`, data),
  patch: (id, data) => api.patch(`/rooms/${id}/`, data),
  delete: (id) => api.delete(`/rooms/${id}/`),
};

// Reservation Endpoints (Full CRUD & Status Logic)
export const reservationsAPI = {
  getAll: (params) => api.get('/reservations/', { params }),
  getById: (id) => api.get(`/reservations/${id}/`),
  create: (data) => api.post('/reservations/', data),
  update: (id, data) => api.patch(`/reservations/${id}/`, data),
  updateStatus: (id, status) => api.patch(`/reservations/${id}/status/`, { status }),
  cancel: (id) => api.post(`/reservations/${id}/cancel/`),
  delete: (id, hard = false) => api.delete(`/reservations/${id}/`, { params: { hard } }),
};

// Reviews Endpoints
export const reviewsAPI = {
  getAll: (params) => api.get('/reviews/', { params }),
  create: (data) => api.post('/reviews/', data),
};

// Dashboard Stats Endpoint
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats/'),
};

export default api;

