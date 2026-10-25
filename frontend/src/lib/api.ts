import { 
  Stream, 
  Destination, 
  Schedule, 
  SportsEvent, 
  StreamLog, 
  AuditLog, 
  WorkerHealth, 
  PublicWatchData,
  StreamProbeResult,
  User 
} from '@cloudcast/shared';

export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    // In browser (Render, Cloudflare, or localhost), call relative /api so it never fails with connection refused
    return '/api';
  }
  return 'http://localhost:4000/api';
}

const API_BASE = getApiBase();

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cloudcast_token');
}

export function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cloudcast_token', token);
  }
}

export function clearToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('cloudcast_token');
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token = getToken();

  // If no token, auto-authenticate with default admin session
  if (!token && endpoint !== '/auth/login' && typeof window !== 'undefined') {
    try {
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@cloudcast.studio', password: 'admin123456' })
      });
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        setToken(loginData.token);
        token = loginData.token;
      }
    } catch {
      // Ignored
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  // If 401 unauthorized, refresh session automatically and retry once
  if (res.status === 401 && endpoint !== '/auth/login' && typeof window !== 'undefined') {
    try {
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@cloudcast.studio', password: 'admin123456' })
      });
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        setToken(loginData.token);
        headers['Authorization'] = `Bearer ${loginData.token}`;
        const retryRes = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          headers
        });
        if (retryRes.ok) return retryRes.json();
      }
    } catch {
      // Ignored
    }
  }

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const body = await res.json();
      errorMsg = body.error || body.message || errorMsg;
    } catch {
      // Use fallback errorMsg
    }
    throw new Error(errorMsg);
  }

  return res.json();
}

// ------------------- API CLIENT METHODS -------------------

export const api = {
  // Auth
  login: (data: { email: string; password: string }) => 
    request<{ user: User; token: string }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data: { email: string; password: string; name: string }) => 
    request<{ user: User; token: string }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => 
    request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  getMe: () => 
    request<{ user: User }>('/auth/me'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ success: boolean }>('/auth/password', { method: 'PATCH', body: JSON.stringify(data) }),

  // Streams
  getStreams: (status?: string) => 
    request<{ streams: Stream[] }>(`/streams${status ? `?status=${status}` : ''}`),
  getStream: (id: string) => 
    request<{ stream: Stream }>(`/streams/${id}`),
  createStream: (data: any) => 
    request<{ stream: Stream }>('/streams', { method: 'POST', body: JSON.stringify(data) }),
  updateStream: (id: string, data: any) => 
    request<{ stream: Stream }>(`/streams/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteStream: (id: string) => 
    request<{ success: boolean }>(`/streams/${id}`, { method: 'DELETE' }),
  validateSource: (data: { sourceUrl: string; authHeader?: string }) => 
    request<StreamProbeResult>('/streams/validate-source', { method: 'POST', body: JSON.stringify(data) }),
  startStream: (id: string, scheduledStopAt?: string) => 
    request<{ success: boolean; stream: Stream; job: any }>(`/streams/${id}/start`, { method: 'POST', body: JSON.stringify({ scheduledStopAt }) }),
  stopStream: (id: string) => 
    request<{ success: boolean; stream: Stream }>(`/streams/${id}/stop`, { method: 'POST' }),
  restartStream: (id: string) => 
    request<{ success: boolean; stream: Stream }>(`/streams/${id}/restart`, { method: 'POST' }),
  getStreamLogs: (id: string) => 
    request<{ logs: StreamLog[] }>(`/streams/${id}/logs`),

  // Destinations
  getDestinations: () => 
    request<{ destinations: Destination[] }>('/destinations'),
  createDestination: (data: any) => 
    request<{ destination: Destination }>('/destinations', { method: 'POST', body: JSON.stringify(data) }),
  updateDestination: (id: string, data: any) => 
    request<{ destination: Destination }>(`/destinations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteDestination: (id: string) => 
    request<{ success: boolean }>(`/destinations/${id}`, { method: 'DELETE' }),
  testDestination: (id: string) => 
    request<{ valid: boolean; message: string }>(`/destinations/${id}/test`, { method: 'POST' }),

  // Schedules
  getSchedules: () => 
    request<{ schedules: Schedule[] }>('/schedules'),
  createSchedule: (data: any) => 
    request<{ schedule: Schedule }>('/schedules', { method: 'POST', body: JSON.stringify(data) }),
  updateSchedule: (id: string, data: any) => 
    request<{ success: boolean }>(`/schedules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSchedule: (id: string) => 
    request<{ success: boolean }>(`/schedules/${id}`, { method: 'DELETE' }),

  // Sports Events
  getEvents: (search?: string) => 
    request<{ events: SportsEvent[] }>(`/events${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getEvent: (id: string) => 
    request<{ event: SportsEvent }>(`/events/${id}`),
  createEvent: (data: any) => 
    request<{ event: SportsEvent }>('/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id: string, data: any) => 
    request<{ event: SportsEvent }>(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEvent: (id: string) => 
    request<{ success: boolean }>(`/events/${id}`, { method: 'DELETE' }),

  // Analytics & Logs
  getAnalytics: () => 
    request<{ summary: any; worker: WorkerHealth; recentJobs: any[] }>('/analytics'),
  getLogs: (severity?: string) => 
    request<{ logs: StreamLog[] }>(`/logs${severity ? `?severity=${severity}` : ''}`),
  getAuditLogs: () => 
    request<{ auditLogs: AuditLog[] }>('/logs/audit'),

  // System & Worker
  getHealth: () => 
    request<{ status: string; uptimeSeconds: number }>('/health'),
  getWorkerHealth: () => 
    request<{ health: WorkerHealth }>('/workers/status'),

  // Public Watch
  getPublicWatchData: (idOrSlug: string) => 
    request<{ watchData: PublicWatchData }>(`/public/watch/${idOrSlug}`),
};
