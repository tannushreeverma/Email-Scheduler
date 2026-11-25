// ===== User / Auth =====
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ===== Email =====
export type EmailStatus = 'scheduled' | 'sent' | 'failed' | 'cancelled';

export interface Email {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleEmailRequest {
  from: string;
  to: string[];
  subject: string;
  body: string;
  scheduledAt: string;
  delayBetweenEmails: number; // seconds
  hourlyLimit: number;
}

export interface ScheduleEmailResponse {
  success: boolean;
  message: string;
  jobIds: string[];
}

// ===== API =====
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ===== Compose Form =====
export interface ComposeFormData {
  from: string;
  to: string[];
  subject: string;
  body: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  scheduledAt: string;
}

// ===== Sidebar =====
export interface SidebarItem {
  label: string;
  path: string;
  count?: number;
}
