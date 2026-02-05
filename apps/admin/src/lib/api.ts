import axios from 'axios';
import { useAuthStore } from './auth';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  },
);

export default api;

// API endpoints
export const adminApi = {
  // Auth
  login: (username: string, password: string) =>
    api.post<{ accessToken: string }>('/admin/auth/login', { username, password }),

  // Dashboard
  getDashboard: () => api.get('/admin/dashboard'),
  getMe: () => api.get('/admin/me'),

  // Users
  getUsers: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
    api.get('/admin/users', { params }),
  getUser: (id: string) => api.get(`/admin/users/${id}`),
  getUserDetail: (id: string) => api.get(`/admin/users/${id}/detail`),
  getUserReferrals: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/admin/users/${id}/referrals`, { params }),
  getUserTransactions: (
    id: string,
    params?: { type?: string; status?: string; page?: number; limit?: number },
  ) => api.get('/admin/transactions', { params: { ...params, userId: id } }),
  blockUser: (id: string, reason: string) => api.post(`/admin/users/${id}/block`, { reason }),
  unblockUser: (id: string) => api.post(`/admin/users/${id}/unblock`),
  updateUserRole: (id: string, role: string) => api.put(`/admin/users/${id}/role`, { role }),
  adjustBalance: (id: string, amount: number, reason: string) =>
    api.put(`/admin/users/${id}/balance`, { amount, reason }),

  // Transactions
  getTransactions: (params?: { type?: string; status?: string; page?: number; limit?: number }) =>
    api.get('/admin/transactions', { params }),
  getPendingWithdrawals: () => api.get('/admin/transactions/pending-withdrawals'),
  approveTransaction: (id: string) => api.post(`/admin/transactions/${id}/approve`),
  rejectTransaction: (id: string, reason: string) =>
    api.post(`/admin/transactions/${id}/reject`, { reason }),

  // Event Log
  getEventLog: (params?: { action?: string; page?: number; limit?: number }) =>
    api.get('/admin/event-log', { params }),

  // Global Settings
  getSettings: () => api.get('/admin/settings'),
  getSetting: (key: string) => api.get(`/admin/settings/${key}`),
  updateSetting: (key: string, value: unknown, description?: string) =>
    api.put(`/admin/settings/${key}`, { value, description }),
  updateSettings: (settings: Array<{ key: string; value: unknown; description?: string }>) =>
    api.put('/admin/settings', { settings }),

  // Tables (Active Games)
  getTables: () => api.get('/admin/tables'),
  getTable: (id: string) => api.get(`/admin/tables/${id}`),

  // Tasks
  getTasks: (params?: { status?: string; page?: number; pageSize?: number }) =>
    api.get('/admin/tasks', { params }),
  getTask: (id: string) => api.get(`/admin/tasks/${id}`),
  createTask: (data: {
    title: string;
    shortDescription?: string;
    longDescription?: string;
    rewardAmount?: number;
    rewardCurrency?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    autoVerify?: boolean;
  }) => api.post('/admin/tasks', data),
  updateTask: (
    id: string,
    data: {
      title?: string;
      shortDescription?: string;
      longDescription?: string;
      rewardAmount?: number;
      rewardCurrency?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
      autoVerify?: boolean;
    },
  ) => api.put(`/admin/tasks/${id}`, data),
  deleteTask: (id: string) => api.post(`/admin/tasks/${id}/delete`),
  getTaskCompletions: (
    taskId: string,
    params?: { status?: string; page?: number; pageSize?: number },
  ) => api.get(`/admin/tasks/${taskId}/completions`, { params }),
  approveTaskCompletion: (id: string) => api.post(`/admin/task-completions/${id}/approve`),
  rejectTaskCompletion: (id: string, reason: string) =>
    api.post(`/admin/task-completions/${id}/reject`, { reason }),
};
