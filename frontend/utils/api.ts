const rawApiBase = process.env.NEXT_PUBLIC_API_URL || 'https://kyobodashboard-production.up.railway.app';
// Remove trailing /api or /api/ if present to avoid duplication
const API_BASE = rawApiBase.replace(/\/api\/?$/, '');

// 401 에러 시 자동 로그아웃 처리
function handleUnauthorized() {
  if (typeof window !== 'undefined') {
    // Clear any remaining localStorage items (user info only, token is in HttpOnly cookie)
    localStorage.removeItem('user');
    localStorage.removeItem('dev_mode');
    // 로그인 페이지로 리다이렉트
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
}

export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}/api${endpoint}`;

  const response = await fetch(url, {
    credentials: 'include', // Include HttpOnly cookies for authentication
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    // 401 Unauthorized - 토큰 만료 또는 유효하지 않음
    // 단, 로그인 API는 제외 (로그인 실패 시 에러 메시지 표시 필요)
    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      handleUnauthorized();
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// Helper function for authenticated requests
// Note: Authentication is now handled via HttpOnly cookies (credentials: 'include')
// No need to manually set Authorization header for browser requests
async function fetchApiAuth<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return fetchApi<T>(endpoint, options);
}

// Stats API (requires authentication)
export const statsApi = {
  getDashboard: () => fetchApiAuth<{ success: boolean; data: any }>('/stats/dashboard'),
  getDetailed: (params: { startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    return fetchApiAuth<{ success: boolean; data: any }>(`/stats/detailed?${query}`);
  },
  getPopular: (params: { startDate?: string; endDate?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    if (params.limit) query.set('limit', String(params.limit));
    return fetchApiAuth<{ success: boolean; data: any[] }>(`/stats/popular?${query}`);
  },
  getDaily: (params: { startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    return fetchApiAuth<{ success: boolean; data: any[] }>(`/stats/daily?${query}`);
  },
  getAlerts: () => fetchApiAuth<{ success: boolean; data: any[] }>('/stats/alerts'),
  resolveAlert: (id: string) => fetchApiAuth(`/stats/alerts/${id}/resolve`, { method: 'POST' }),
  getExportSessionsUrl: (params: { startDate?: string; endDate?: string; format?: string }) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    if (params.format) query.set('format', params.format);
    // Note: Authentication is handled via HttpOnly cookies
    return `${API_BASE}/api/stats/export/sessions?${query}`;
  },
  getExportLogsUrl: (params: { startDate?: string; endDate?: string; format?: string }) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    if (params.format) query.set('format', params.format);
    // Note: Authentication is handled via HttpOnly cookies
    return `${API_BASE}/api/stats/export/logs?${query}`;
  },
  getCalendarMonthly: (params: { year?: number; month?: number }) => {
    const query = new URLSearchParams();
    if (params.year) query.set('year', String(params.year));
    if (params.month) query.set('month', String(params.month));
    return fetchApiAuth<{
      success: boolean;
      data: Array<{ date: string; device_count: number; content_count: number; total_watch_time: number }>;
      year: number;
      month: number;
    }>(`/stats/calendar/monthly?${query}`);
  },
  getCalendarDaily: (date: string) => {
    return fetchApiAuth<{
      success: boolean;
      date: string;
      content_stats: Array<{
        content_id: string;
        content_name: string;
        action_type: string;
        timestamp: string;
        duration: number;
      }>;
      device_viewings: Array<{
        device_id: string;
        device_info: string;
        contents: Array<{ content_id: string; content_name: string; view_count: number; total_watch_time: number }>;
      }>;
    }>(`/stats/calendar/daily?date=${date}`);
  },
};

// Sessions API
export const sessionsApi = {
  getActive: () => fetchApi<{ success: boolean; data: any[] }>('/sessions/active'),
  getById: (id: string) => fetchApi<{ success: boolean; data: any }>(`/sessions/${id}`),
  getByDateRange: (params: { startDate?: string; endDate?: string; deviceId?: string }) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    if (params.deviceId) query.set('device_id', params.deviceId);
    return fetchApi<{ success: boolean; data: any[] }>(`/sessions?${query}`);
  },
};

// Logs API
export const logsApi = {
  getRecent: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return fetchApi<{ success: boolean; data: any[] }>(`/logs/recent${query}`);
  },
  getBySession: (sessionId: string) =>
    fetchApi<{ success: boolean; data: any[] }>(`/logs/session/${sessionId}`),
  getByDateRange: (params: { startDate?: string; endDate?: string; deviceId?: string; contentId?: string }) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    if (params.deviceId) query.set('device_id', params.deviceId);
    if (params.contentId) query.set('content_id', params.contentId);
    return fetchApi<{ success: boolean; data: any[] }>(`/logs?${query}`);
  },
  delete: (id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/logs/${id}`, {
      method: 'DELETE',
    }),
  deleteBulk: (ids: string[]) =>
    fetchApi<{ success: boolean; message: string; deleted_count: number }>('/logs/delete-bulk', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
  deleteByDateRange: (params: { startDate: string; endDate: string }) => {
    const query = new URLSearchParams();
    query.set('start_date', params.startDate);
    query.set('end_date', params.endDate);
    return fetchApi<{ success: boolean; message: string; deleted_count: number }>(`/logs/by-date-range?${query}`, {
      method: 'DELETE',
    });
  },
};

// Devices API
export const devicesApi = {
  getAll: () => fetchApi<{ success: boolean; data: any[] }>('/devices'),
  getActive: () => fetchApi<{ success: boolean; data: any[] }>('/devices/active'),
  getById: (id: string) => fetchApi<{ success: boolean; data: any }>(`/devices/${id}`),
  delete: (id: string) =>
    fetchApi<{ success: boolean; message: string; logs_deleted: number; sessions_deleted: number }>(`/devices/${id}`, {
      method: 'DELETE',
    }),
};

// Videos API
export const videosApi = {
  getAll: (activeOnly?: boolean) => {
    const query = activeOnly ? '?active_only=true' : '';
    return fetchApi<{ success: boolean; data: any[]; count: number }>(`/videos${query}`);
  },
  getList: () => fetchApi<{ success: boolean; data: any[]; count: number }>('/videos/list'),
  getById: (id: string) => fetchApi<{ success: boolean; data: any }>(`/videos/${id}`),
  getByIndex: (index: number) => fetchApi<{ success: boolean; data: any }>(`/videos/index/${index}`),
  create: (data: any) =>
    fetchApi<{ success: boolean; data: any }>('/videos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    fetchApi<{ success: boolean; data: any }>(`/videos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchApi<{ success: boolean; message: string }>(`/videos/${id}`, {
      method: 'DELETE',
    }),
  toggleActive: (id: string) =>
    fetchApi<{ success: boolean; data: any }>(`/videos/${id}/toggle`, {
      method: 'POST',
    }),
  reorder: (videoIds: string[]) =>
    fetchApi<{ success: boolean; message: string }>('/videos/reorder', {
      method: 'POST',
      body: JSON.stringify({ video_ids: videoIds }),
    }),
  exportUrl: (activeOnly?: boolean) => {
    const query = activeOnly ? '?active_only=true' : '';
    return `${API_BASE}/api/videos/export${query}`;
  },
};

// Auth API
export const authApi = {
  login: (data: { email: string; password: string }) =>
    fetchApi<{ success: boolean; data: { user: any } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  logout: () =>
    fetchApi<{ success: boolean; message: string }>('/auth/logout', {
      method: 'POST',
    }),
  getMe: () =>
    fetchApiAuth<{ success: boolean; data: any }>('/auth/me'),
};

// Admin API
export const adminApi = {
  getUsers: () =>
    fetchApiAuth<{ success: boolean; data: any[]; count: number }>('/admin/users'),
  getUserById: (id: string) =>
    fetchApiAuth<{ success: boolean; data: any }>(`/admin/users/${id}`),
  createUser: (data: { email: string; username: string; password: string; name?: string; role?: string }) =>
    fetchApiAuth<{ success: boolean; data: any }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateUser: (id: string, data: { email?: string; username?: string; name?: string; role?: string; is_active?: boolean }) =>
    fetchApiAuth<{ success: boolean; data: any }>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  updateUserPassword: (id: string, password: string) =>
    fetchApiAuth<{ success: boolean; message: string }>(`/admin/users/${id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password }),
    }),
  deleteUser: (id: string) =>
    fetchApiAuth<{ success: boolean; message: string }>(`/admin/users/${id}`, {
      method: 'DELETE',
    }),
};
