const API_BASE = 'https://kyobodashboard-production.up.railway.app';

export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}/api${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// Stats API
export const statsApi = {
  getDashboard: () => fetchApi<{ success: boolean; data: any }>('/stats/dashboard'),
  getDetailed: (params: { startDate?: string; endDate?: string; spaceId?: string }) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    if (params.spaceId) query.set('space_id', params.spaceId);
    return fetchApi<{ success: boolean; data: any }>(`/stats/detailed?${query}`);
  },
  getPopular: (params: { startDate?: string; endDate?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    if (params.limit) query.set('limit', String(params.limit));
    return fetchApi<{ success: boolean; data: any[] }>(`/stats/popular?${query}`);
  },
  getDaily: (params: { startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    return fetchApi<{ success: boolean; data: any[] }>(`/stats/daily?${query}`);
  },
  getAlerts: () => fetchApi<{ success: boolean; data: any[] }>('/stats/alerts'),
  resolveAlert: (id: string) => fetchApi(`/stats/alerts/${id}/resolve`, { method: 'POST' }),
  exportSessions: (params: { startDate?: string; endDate?: string; format?: string }) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    if (params.format) query.set('format', params.format);
    return `${API_BASE}/api/stats/export/sessions?${query}`;
  },
  exportLogs: (params: { startDate?: string; endDate?: string; format?: string }) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    if (params.format) query.set('format', params.format);
    return `${API_BASE}/api/stats/export/logs?${query}`;
  },
};

// Sessions API
export const sessionsApi = {
  getActive: () => fetchApi<{ success: boolean; data: any[] }>('/sessions/active'),
  getById: (id: string) => fetchApi<{ success: boolean; data: any }>(`/sessions/${id}`),
  getByDateRange: (params: { startDate?: string; endDate?: string; spaceId?: string; deviceId?: string }) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    if (params.spaceId) query.set('space_id', params.spaceId);
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
  getByDateRange: (params: { startDate?: string; endDate?: string; spaceId?: string; deviceId?: string; contentId?: string }) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    if (params.spaceId) query.set('space_id', params.spaceId);
    if (params.deviceId) query.set('device_id', params.deviceId);
    if (params.contentId) query.set('content_id', params.contentId);
    return fetchApi<{ success: boolean; data: any[] }>(`/logs?${query}`);
  },
};

// Spaces API
export const spacesApi = {
  getAll: () => fetchApi<{ success: boolean; data: any[] }>('/spaces'),
  getById: (id: string) => fetchApi<{ success: boolean; data: any }>(`/spaces/${id}`),
  getStats: (id: string, params: { startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params.startDate) query.set('start_date', params.startDate);
    if (params.endDate) query.set('end_date', params.endDate);
    return fetchApi<{ success: boolean; data: any }>(`/spaces/${id}/stats?${query}`);
  },
};

// Devices API
export const devicesApi = {
  getAll: (spaceId?: string) => {
    const query = spaceId ? `?space_id=${spaceId}` : '';
    return fetchApi<{ success: boolean; data: any[] }>(`/devices${query}`);
  },
  getActive: () => fetchApi<{ success: boolean; data: any[] }>('/devices/active'),
  getById: (id: string) => fetchApi<{ success: boolean; data: any }>(`/devices/${id}`),
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
    fetchApi<{ success: boolean; data: { user: any; token: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getMe: (token: string) =>
    fetchApi<{ success: boolean; data: any }>('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
};
