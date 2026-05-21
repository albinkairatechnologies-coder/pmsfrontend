import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const saApi = axios.create({
  baseURL: `${API_URL}/superadmin`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

const getSAToken    = () => (typeof window !== 'undefined' ? localStorage.getItem('sa_token') : null);
const getSARefresh  = () => (typeof window !== 'undefined' ? localStorage.getItem('sa_refresh_token') : null);
const setSAToken    = (t: string) => localStorage.setItem('sa_token', t);
export const clearSATokens = () => {
  localStorage.removeItem('sa_token');
  localStorage.removeItem('sa_refresh_token');
};

saApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getSAToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let _refreshing = false;
saApi.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const isExpired = (error.response?.data as any)?.code === 'token_expired';
    if (error.response?.status === 401 && isExpired && !original._retry) {
      original._retry = true;
      _refreshing = true;
      try {
        const refreshToken = getSARefresh();
        if (!refreshToken) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_URL}/superadmin/refresh`, {}, {
          headers: { Authorization: `Bearer ${refreshToken}` },
        });
        setSAToken(data.token);
        original.headers.Authorization = `Bearer ${data.token}`;
        return saApi(original);
      } catch {
        clearSATokens();
        if (typeof window !== 'undefined') window.location.href = '/superadmin';
      } finally {
        _refreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export const superadminAPI = {
  login:        (email: string, password: string) => saApi.post('/login', { email, password }),
  verifyOtp:    (otp: string) => saApi.post('/verify-otp', { otp }),
  resendOtp:    () => saApi.post('/resend-otp'),
  me:           () => saApi.get('/me'),
  stats:        () => saApi.get('/stats'),
  auditLogs:    (params?: any) => saApi.get('/audit-logs', { params }),

  // Organisations
  getOrgs:      () => saApi.get('/organisations'),
  getOrg:       (id: number) => saApi.get(`/organisations/${id}`),
  createOrg:    (data: any) => saApi.post('/organisations', data),
  updateOrg:    (id: number, data: any) => saApi.put(`/organisations/${id}`, data),
  toggleOrg:    (id: number) => saApi.post(`/organisations/${id}/toggle`),
  deleteOrg:    (id: number) => saApi.delete(`/organisations/${id}`),

  // Org users
  getOrgUsers:  (id: number) => saApi.get(`/organisations/${id}/users`),
  getOrgStats:  (id: number) => saApi.get(`/organisations/${id}/stats`),
  createAdmin:  (id: number, data: any) => saApi.post(`/organisations/${id}/admins`, data),
  removeUser:   (orgId: number, userId: number) => saApi.delete(`/organisations/${orgId}/users/${userId}`),

  // Chat
  getChatContacts:  () => saApi.get('/chat/contacts'),
  getChatMessages:  (orgId: number) => saApi.get(`/chat/${orgId}/messages`),
  sendChatMessage:  (orgId: number, message: string) => saApi.post(`/chat/${orgId}/send`, { message }),
};
