// services/api.ts
import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import type {
  Client, Invoice, Plan, MikrotikDevice, Alert,
  DashboardSummary, MonthlyStats, User, TrafficSnapshot
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor: añadir token JWT automáticamente
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor: manejar 401 (token expirado)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// === AUTH ===
export const authAPI = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { email, password }),
  me: () => api.get<{ user: User }>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword })
};

// === DASHBOARD ===
export const dashboardAPI = {
  getSummary: () => api.get<DashboardSummary>('/dashboard/summary'),
  getClientsByPlan: () => api.get<Array<{ name: string; count: number }>>('/dashboard/clients-by-plan')
};

// === CLIENTS ===
export const clientsAPI = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<{ total: number; clients: Client[] }>('/clients', { params }),
  getOne: (id: string) => api.get<Client>(`/clients/${id}`),
  create: (data: Partial<Client>) => api.post<Client>('/clients', data),
  update: (id: string, data: Partial<Client>) => api.put<Client>(`/clients/${id}`, data),
  suspend: (id: string) => api.post(`/clients/${id}/suspend`),
  activate: (id: string) => api.post(`/clients/${id}/activate`),
  remove: (id: string) => api.delete(`/clients/${id}`)
};

// === INVOICES ===
export const invoicesAPI = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<{ total: number; invoices: Invoice[] }>('/invoices', { params }),
  getStats: (months?: number) =>
    api.get<{ monthlyStats: MonthlyStats[]; summary: unknown[] }>('/invoices/stats', { params: { months } }),
  markAsPaid: (id: string, data: { paymentMethod: string; notes?: string }) =>
    api.post(`/invoices/${id}/pay`, data),
  generateMonthly: (month?: string) =>
    api.post('/invoices/generate-monthly', { month })
};

// === PLANS ===
export const plansAPI = {
  getAll: () => api.get<Plan[]>('/plans'),
  getOne: (id: string) => api.get<Plan>(`/plans/${id}`),
  create: (data: Partial<Plan>) => api.post<Plan>('/plans', data),
  update: (id: string, data: Partial<Plan>) => api.put<Plan>(`/plans/${id}`, data)
};

// === MIKROTIK ===
export const mikrotikAPI = {
  getDevices: () => api.get<MikrotikDevice[]>('/mikrotik/devices'),
  createDevice: (data: Partial<MikrotikDevice> & { password: string }) =>
    api.post<MikrotikDevice>('/mikrotik/devices', data),
  getTraffic: (deviceId: string, hours?: number) =>
    api.get<TrafficSnapshot[]>(`/mikrotik/devices/${deviceId}/traffic`, { params: { hours } }),
  getOnlineUsers: (deviceId: string) =>
    api.get<unknown[]>(`/mikrotik/devices/${deviceId}/users`),
  rebootDevice: (deviceId: string) =>
    api.post(`/mikrotik/devices/${deviceId}/reboot`)
};

// === ALERTS ===
export const alertsAPI = {
  getAll: (params?: Record<string, unknown>) =>
    api.get<{ total: number; alerts: Alert[] }>('/alerts', { params }),
  resolve: (id: string) => api.put(`/alerts/${id}/resolve`)
};

// === USERS ===
export const usersAPI = {
  getAll: () => api.get<User[]>('/users'),
  update: (id: string, data: Partial<User>) => api.put<User>(`/users/${id}`, data),
  remove: (id: string) => api.delete(`/users/${id}`)
};

export default api;
