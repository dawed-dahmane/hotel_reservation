import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const AUTH_KEYS = ['access_token', 'refresh_token', 'user_data'];

const clearAuth = () => {
  AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
};

// List endpoints are paginated ({count, next, previous, results}); this keeps
// call sites working with a plain array.
export const unwrapList = (payload) =>
  Array.isArray(payload) ? payload : payload?.results ?? [];

// Single-flight refresh: concurrent 401s share one rotation request so a
// rotated token is never replayed.
let refreshPromise = null;

const refreshAccessToken = () => {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) {
    return Promise.reject(new Error('No refresh token stored.'));
  }

  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh/`, { refresh })
      .then(({ data }) => {
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        if (data.user) {
          localStorage.setItem('user_data', JSON.stringify(data.user));
        }
        return data.access;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

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

// Response interceptor: rotate the refresh token once on 401, then retry.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;
    if (!response || response.status !== 401 || !config) {
      return Promise.reject(error);
    }

    const url = config.url || '';
    const isAuthCall = ['/auth/login/', '/auth/register/', '/auth/refresh/'].some(
      (path) => url.includes(path)
    );

    if (isAuthCall || config._retried) {
      clearAuth();
      return Promise.reject(error);
    }

    try {
      const access = await refreshAccessToken();
      config._retried = true;
      config.headers = { ...config.headers, Authorization: `Bearer ${access}` };
      return api(config);
    } catch {
      clearAuth();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
  }
);

// Auth Endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login/', credentials),
  register: (userData) => api.post('/auth/register/', userData),
  refresh: (refresh) => api.post('/auth/refresh/', { refresh }),
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
