import axios from 'axios';
import type {
  Email,
  ScheduleEmailRequest,
  ScheduleEmailResponse,
  ApiResponse,
  PaginatedResponse,
  User,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ===== Auth =====
export const authApi = {
  loginWithGoogle: () => {
    window.location.href = `${API_BASE_URL}/auth/google`;
  },

  loginWithEmail: async (email: string, password: string): Promise<ApiResponse<{ token: string; user: User }>> => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    const { data } = await api.get('/auth/me');
    return data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    localStorage.removeItem('auth_token');
  },
};

// ===== Emails =====
export const emailApi = {
  getScheduledEmails: async (
    page = 1,
    pageSize = 20,
    search?: string
  ): Promise<ApiResponse<PaginatedResponse<Email>>> => {
    const { data } = await api.get('/emails/scheduled', {
      params: { page, pageSize, search },
    });
    return data;
  },

  getSentEmails: async (
    page = 1,
    pageSize = 20,
    search?: string
  ): Promise<ApiResponse<PaginatedResponse<Email>>> => {
    const { data } = await api.get('/emails/sent', {
      params: { page, pageSize, search },
    });
    return data;
  },

  getEmailById: async (id: string): Promise<ApiResponse<Email>> => {
    const { data } = await api.get(`/emails/${id}`);
    return data;
  },

  scheduleEmails: async (payload: ScheduleEmailRequest): Promise<ScheduleEmailResponse> => {
    const { data } = await api.post('/emails/schedule', payload);
    return data;
  },

  cancelScheduledEmail: async (id: string): Promise<ApiResponse<null>> => {
    const { data } = await api.delete(`/emails/${id}`);
    return data;
  },

  getCancelledEmails: async (
    page = 1,
    pageSize = 20,
    search?: string
  ): Promise<ApiResponse<PaginatedResponse<Email>>> => {
    const { data } = await api.get('/emails/cancelled', {
      params: { page, pageSize, search },
    });
    return data;
  },

  getFailedEmails: async (
    page = 1,
    pageSize = 20,
    search?: string
  ): Promise<ApiResponse<PaginatedResponse<Email>>> => {
    const { data } = await api.get('/emails/failed', {
      params: { page, pageSize, search },
    });
    return data;
  },

  getEmailCounts: async (): Promise<ApiResponse<{ scheduled: number; sent: number; cancelled: number; failed: number }>> => {
    const { data } = await api.get('/emails/counts');
    return data;
  },

  searchEmails: async (query: string): Promise<ApiResponse<Email[]>> => {
    const { data } = await api.get('/emails/search', { params: { q: query } });
    return data;
  },

  uploadLeadsList: async (file: File): Promise<ApiResponse<{ emails: string[]; count: number }>> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/emails/upload-leads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};

// ===== Slack =====
export const slackApi = {
  connectSlack: () => {
    window.location.href = `${API_BASE_URL}/slack/connect`;
  },

  disconnectSlack: async (): Promise<ApiResponse<null>> => {
    const { data } = await api.post('/slack/disconnect');
    return data;
  },

  getSlackStatus: async (): Promise<ApiResponse<{ connected: boolean; workspace?: string }>> => {
    const { data } = await api.get('/slack/status');
    return data;
  },
};

export default api;
