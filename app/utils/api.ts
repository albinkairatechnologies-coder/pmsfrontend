import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ── Axios instance ────────────────────────────────────────────
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// ── Token helpers ─────────────────────────────────────────────
const getToken    = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
const getRefresh  = () => (typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null);
const setToken    = (t: string) => localStorage.setItem('token', t);
const clearTokens = () => { localStorage.removeItem('token'); localStorage.removeItem('refresh_token'); };

// ── Request interceptor — attach Bearer token ─────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor — auto-refresh on 401 ───────────────
let _refreshing = false;
let _queue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  _queue.forEach(p => (token ? p.resolve(token) : p.reject(error)));
  _queue = [];
};

api.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only attempt refresh on 401 with code token_expired, not on /auth/login or /auth/refresh
    const isAuthRoute = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');
    const isExpired   = (error.response?.data as any)?.code === 'token_expired';

    if (error.response?.status === 401 && isExpired && !original._retry && !isAuthRoute) {
      if (_refreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          _queue.push({
            resolve: (token) => {
              original.headers.Authorization = `Bearer ${token}`;
              resolve(api(original));
            },
            reject,
          });
        });
      }

      original._retry = true;
      _refreshing = true;

      try {
        const refreshToken = getRefresh();
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, {}, {
          headers: { Authorization: `Bearer ${refreshToken}` },
        });

        setToken(data.token);
        processQueue(null, data.token);
        original.headers.Authorization = `Bearer ${data.token}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearTokens();
        if (typeof window !== 'undefined') window.location.href = '/';
        return Promise.reject(refreshError);
      } finally {
        _refreshing = false;
      }
    }

    // Normalize error message
    const message =
      (error.response?.data as any)?.error ||
      (error.response?.data as any)?.message ||
      error.message ||
      'An unexpected error occurred';

    return Promise.reject({ ...error, message });
  }
);

// ── API modules ───────────────────────────────────────────────

export const authAPI = {
  login:          (email: string, password: string) => api.post('/auth/login', { email, password }),
  register:       (data: any) => api.post('/auth/register', data),
  refresh:        () => api.post('/auth/refresh'),
  getCurrentUser: () => api.get('/auth/me'),
  getUsers:       (params?: any) => api.get('/auth/users', { params }),
  changePassword: (data: any) => api.post('/auth/change-password', data),
  updateProfile:  (data: any) => api.put('/auth/profile', data),
  updateUser:     (userId: number, data: any) => api.put(`/auth/users/${userId}`, data),
  uploadProfileImage: (formData: FormData) =>
    api.post('/auth/profile/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getProfileImageUrl: (filename: string) => `${API_URL}/auth/profile/image/${filename}`,
};

export const clientAPI = {
  create:  (data: any) => api.post('/clients', data),
  getAll:  (status?: string) => api.get('/clients', { params: { status } }),
  getById: (id: number) => api.get(`/clients/${id}`),
  update:  (id: number, data: any) => api.put(`/clients/${id}`, data),
  search:  (query: string) => api.get('/clients/search', { params: { q: query } }),
};

export const taskAPI = {
  create:         (data: any) => api.post('/tasks', data),
  getAll:         (params?: any) => api.get('/tasks', { params }),
  getById:        (id: number) => api.get(`/tasks/${id}`),
  update:         (id: number, data: any) => api.put(`/tasks/${id}`, data),
  delete:         (id: number) => api.delete(`/tasks/${id}`),
  addComment:     (id: number, comment: string) => api.post(`/tasks/${id}/comments`, { comment }),
  getClientStats: (clientId: number) => api.get(`/clients/${clientId}/stats`),
  getMessages: (id: number) => api.get(`/tasks/${id}/messages`),
  sendMessage: (id: number, data: any) => api.post(`/tasks/${id}/messages`, data),
  addParticipant: (id: number, user_id: number) => api.post(`/tasks/${id}/participants`, { user_id }),
  addObserver: (id: number, user_id: number) => api.post(`/tasks/${id}/observers`, { user_id }),
  removeParticipant: (id: number, userId: number) => api.delete(`/tasks/${id}/participants/${userId}`),
  removeObserver: (id: number, userId: number) => api.delete(`/tasks/${id}/observers/${userId}`),
  deleteMessage: (taskId: number, msgId: number) => api.delete(`/tasks/${taskId}/messages/delete/${msgId}`),
};

export const orgAPI = {
  getTeams:         () => api.get('/teams'),
  createTeam:       (data: any) => api.post('/teams', data),
  deleteTeam:       (id: number) => api.delete(`/teams/${id}`),
  getDepartments:   (team_id?: number) => api.get('/departments', { params: { team_id } }),
  createDepartment: (data: any) => api.post('/departments', data),
  deleteDepartment: (id: number) => api.delete(`/departments/${id}`),
  getMembers:       (params?: any) => api.get('/members', { params }),
  createMember:     (data: any) => api.post('/members', data),
  updateMember:     (id: number, data: any) => api.put(`/members/${id}`, data),
  deleteMember:     (id: number) => api.delete(`/members/${id}`),
  getTeamLeads:     () => api.get('/members/team-leads'),
  getSubordinates:  (id: number) => api.get(`/members/${id}/subordinates`),
  getOrgChart:      () => api.get('/org-chart'),
};

export const workLogAPI = {
  create:           (data: any) => api.post('/worklogs', data),
  submit:           (data: any) => api.post('/worklogs/submit', data),
  getAll:           (params?: any) => api.get('/worklogs', { params }),
  getTeam:          (params?: any) => api.get('/worklogs/team', { params }),
  approve:          (id: number) => api.patch(`/worklogs/${id}/approve`),
  reject:           (id: number) => api.patch(`/worklogs/${id}/reject`),
  getClientSummary: (clientId: number, params?: any) => api.get(`/worklogs/summary/${clientId}`, { params }),
};

export const reportsAPI = {
  clientSummary: (params: any) => api.get('/reports/client-summary', { params }),
  department:    (params: any) => api.get('/reports/department', { params }),
  employee:      (params: any) => api.get('/reports/employee', { params }),
  full:          (params: any) => api.get('/reports/full', { params }),
  exportCSV:     (data: any) => api.post('/reports/export-csv', data, { responseType: 'blob' }),
  generatePDF:   (data: any) => api.post('/reports/generate-pdf', data, { responseType: 'arraybuffer' }),
  salaryReport:  (month: number, year: number) => api.get('/reports/salary-report', { params: { month, year }, responseType: 'arraybuffer' }),
  salaryReportDocx: (month: number, year: number) => api.get('/reports/salary-report-docx', { params: { month, year }, responseType: 'arraybuffer' }),
};

export const activityAPI = {
  heartbeat:      (data: { status: string; idle_seconds: number; events: any[] }) =>
    api.post('/activity/heartbeat', data),
  getLive:        () => api.get('/activity/live'),
  getSummary:     (user_id?: number, date?: string) =>
    api.get('/activity/summary', { params: { user_id, date } }),
  getProductivity: (params: any) => api.get('/activity/productivity', { params }),
  goOffline:      () => api.post('/activity/offline'),
};

export const attendanceAPI = {
  checkIn:        (data?: any) => api.post('/attendance/checkin', data || {}),
  checkOut:       () => api.post('/attendance/checkout'),
  getToday:       () => api.get('/attendance/today'),
  getMy:          (month?: string, year?: string) => api.get('/attendance/my', { params: { month, year } }),
  getAdmin:       (date?: string) => api.get('/attendance/admin', { params: { date } }),
  getReport:      (params: any) => api.get('/attendance/report', { params }),
  startBreak:     (break_type: 'lunch' | 'short' | 'meeting') => api.post('/attendance/break/start', { break_type }),
  endBreak:       () => api.post('/attendance/break/end'),
  getBreaksAdmin: (date?: string) => api.get('/attendance/breaks/admin', { params: { date } }),
};

export const leaveAPI = {
  apply:       (data: any) => api.post('/leaves', data),
  getMy:       () => api.get('/leaves/my'),
  getPending:  () => api.get('/leaves/pending'),
  getAll:      (params?: any) => api.get('/leaves/all', { params }),
  getCalendar: (year: string, month: string) => api.get('/leaves/calendar', { params: { year, month } }),
  getStats:    () => api.get('/leaves/stats'),
  approve:     (id: number) => api.patch(`/leaves/${id}/approve`),
  reject:      (id: number, note?: string) => api.patch(`/leaves/${id}/reject`, { note }),
};

export const permissionAPI = {
  apply:      (data: any) => api.post('/permissions', data),
  getMy:      () => api.get('/permissions/my'),
  getPending: () => api.get('/permissions/pending'),
  getAll:     (params?: any) => api.get('/permissions/all', { params }),
  approve:    (id: number) => api.patch(`/permissions/${id}/approve`),
  reject:     (id: number) => api.patch(`/permissions/${id}/reject`),
};

export const companyAPI = {
  getLetterhead:    () => api.get('/company/letterhead'),
  updateLetterhead: (data: any) => api.put('/company/letterhead', data),
};

export const analyticsAPI = {
  getHR: (params?: { start?: string; end?: string }) => api.get('/analytics/hr', { params }),
  getMarketing: () => api.get('/analytics/marketing'),
};

export const proposalAPI = {
  aiAssist:   (task: string, input_data: string) => api.post('/proposals/ai', { task, input_data }),
  create:     (data: any) => api.post('/proposals', data),
  getAll:     (status?: string) => api.get('/proposals', { params: { status } }),
  getById:    (id: number) => api.get(`/proposals/${id}`),
  update:     (id: number, data: any) => api.put(`/proposals/${id}`, data),
  delete:     (id: number) => api.delete(`/proposals/${id}`),
  send:       (data: any) => api.post('/proposals/send', data),
  getByClient: (clientId: number) => api.get(`/proposals/client/${clientId}`),
  markViewed: (id: number) => api.patch(`/proposals/${id}/viewed`),
};

export const invoiceAPI = {
  create:  (data: any) => api.post('/invoices', data),
  getAll:  (params?: any) => api.get('/invoices', { params }),
  getById: (id: number) => api.get(`/invoices/${id}`),
  update:  (id: number, data: any) => api.put(`/invoices/${id}`, data),
  delete:  (id: number) => api.delete(`/invoices/${id}`),
};

export const feedbackAPI = {
  submit:   (data: any) => api.post('/feedback', data),
  getMy:    () => api.get('/feedback/my'),
  getAll:   (category?: string) => api.get('/feedback/all', { params: { category } }),
  getStats: () => api.get('/feedback/stats'),
};

export const reviewAPI = {
  schedule: (data: any) => api.post('/reviews', data),
  complete: (id: number, data: any) => api.patch(`/reviews/${id}/complete`, data),
  cancel:   (id: number) => api.patch(`/reviews/${id}/cancel`),
  getMy:    () => api.get('/reviews/my'),
  getAll:   (params?: any) => api.get('/reviews/all', { params }),
};

export const notificationAPI = {
  getAll:       (unread?: boolean) => api.get('/notifications', { params: { unread } }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead:     (id: number) => api.patch(`/notifications/${id}/read`),
  markAllRead:  () => api.patch('/notifications/read-all'),
};

export const fileAPI = {
  upload:      (formData: FormData) =>
    api.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getByClient: (clientId: number) => api.get('/files', { params: { client_id: clientId } }),
};

export const dashboardAPI = {
  getAdminDashboard: () => api.get('/dashboard/admin'),
  getLeadDashboard:  () => api.get('/dashboard/lead'),
  getStaffDashboard: () => api.get('/dashboard/staff'),
  getReports:        (type: string, startDate: string, endDate: string) =>
    api.get('/dashboard/reports', { params: { type, start_date: startDate, end_date: endDate } }),
};

export const salaryAPI = {
  getConfigs:   () => api.get('/salary/configs'),
  updateConfig: (data: { user_id: number, base_salary: number, allowance: number }) => api.post('/salary/configs', data),
  paySalary:    (data: { user_id: number, amount: number, allowance: number, month: number, year: number }) => api.post('/salary/pay', data),
  getHistory:   () => api.get('/salary/history'),
  getStats:     () => api.get('/salary/stats'),
  calculate:    (params: { user_id: number, month: number, year: number }) => api.get('/salary/calculate', { params }),
  getCoinSettings:  () => api.get('/salary/coin-settings'),
  updateCoinSettings: (data: { coin_value_rupees: number }) => api.put('/salary/coin-settings', data),
  awardCoins:   (data: { user_id: number, amount: number, reason: string }) => api.post('/salary/award-coins', data),
  getCoinsSummary: () => api.get('/salary/coins-summary'),
  getCoinHistory:  (userId: number) => api.get(`/salary/coin-history/${userId}`),
  getCoinRules:    () => api.get('/salary/coin-rules'),
  updateCoinRule:  (id: number, data: { coins?: number, is_active?: number, description?: string }) => api.put(`/salary/coin-rules/${id}`, data),
};

export const messageAPI = {
  getContacts: () => api.get('/messages/contacts'),
  getHistory: (otherUserId: number, isGroup: boolean = false) => 
    api.get(`/messages/${otherUserId}`, { params: { is_group: isGroup } }),
  sendMessage: (data: { receiver_id?: number; group_id?: number; content?: string; file_url?: string; file_name?: string; file_type?: string }) => 
    api.post('/messages', data),
  createGroup: (data: { name: string; member_ids: number[] }) => 
    api.post('/messages/groups', data),
  addGroupMembers: (groupId: number, data: { member_ids: number[] }) => 
    api.post(`/messages/groups/${groupId}/members`, data),
  uploadChatMessage: (formData: FormData) => 
    api.post('/messages/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getDownloadUrl: (filename: string) => `${API_URL}/messages/attachments/${filename}`,
  editMessage: (messageId: number, content: string) => 
    api.put(`/messages/${messageId}`, { content }),
  deleteMessage: (messageId: number) => api.delete(`/messages/delete/${messageId}`),
};

export const documentAPI = {
  getAll:   () => api.get('/documents'),
  upload:   (formData: FormData) =>
    api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete:   (id: number) => api.delete(`/documents/${id}`),
  getDownloadUrl: (filename: string) => `${API_URL}/documents/download/${filename}`,
};

export const announcementAPI = {
  getAll:      () => api.get('/announcements'),
  create:      (data: any) => api.post('/announcements', data),
  update:      (id: number, data: any) => api.put(`/announcements/${id}`, data),
  delete:      (id: number) => api.delete(`/announcements/${id}`),
  getComments: (id: number) => api.get(`/announcements/${id}/comments`),
  addComment:  (id: number, content: string) => api.post(`/announcements/${id}/comments`, { content }),
  toggleLike:  (id: number) => api.post(`/announcements/${id}/like`),
  recordView:  (id: number) => api.post(`/announcements/${id}/view`),
  getViewers:  (id: number) => api.get(`/announcements/${id}/viewers`),
  togglePin:   (id: number) => api.post(`/announcements/${id}/pin`),
  votePoll:    (id: number, optionIndex: number) => api.post(`/announcements/${id}/vote`, { option_index: optionIndex }),
  deleteComment: (commentId: number) => api.delete(`/comments/${commentId}`),
  updateComment: (commentId: number, content: string) => api.put(`/comments/${commentId}`, { content }),
};

export const calendarAPI = {
  create:       (data: any) => api.post('/calendar/events', data),
  getAll:       (params?: any) => api.get('/calendar/events', { params }),
  delete:       (id: number) => api.delete(`/calendar/events/${id}`),
  getUserEvents:(userId: number, params?: any) => api.get(`/calendar/events/user/${userId}`, { params }),
};

export const rewardsAPI = {
  getStats: () => api.get('/user/rewards'),
};

export const leadsAPI = {
  getAll:       (params?: any) => api.get('/leads', { params }),
  getStats:     () => api.get('/leads/stats'),
  getById:      (id: number) => api.get(`/leads/${id}`),
  create:       (data: any) => api.post('/leads', data),
  update:       (id: number, data: any) => api.put(`/leads/${id}`, data),
  delete:       (id: number) => api.delete(`/leads/${id}`),
  addFollowup:  (id: number, data: any) => api.post(`/leads/${id}/followups`, data),
  convert:      (id: number, data: any) => api.post(`/leads/${id}/convert`, data),
  getActivities:   (id: number) => api.get(`/leads/${id}/activities`),
  addActivity:     (id: number, data: any) => api.post(`/leads/${id}/activities`, data),
  deleteActivity:  (actId: number) => api.delete(`/leads/activities/${actId}`),
  getAnalytics:    () => api.get('/leads/analytics'),
};

export const clientProfileAPI = {
  getAll:   (clientId: number) => api.get(`/clients/${clientId}/profiles`),
  create:   (clientId: number, data: any) => api.post(`/clients/${clientId}/profiles`, data),
  update:   (profileId: number, data: any) => api.put(`/clients/profiles/${profileId}`, data),
  delete:   (profileId: number) => api.delete(`/clients/profiles/${profileId}`),
  getLogs:  (profileId: number) => api.get(`/clients/profiles/${profileId}/logs`),
};

export const eodAPI = {
  getMy:    (params?: any) => api.get('/eod/my', { params }),
  getByDate:(date: string) => api.get('/eod/date', { params: { date } }),
  edit:     (data: any)   => api.post('/eod/edit', data),
  getAdmin: (date: string) => api.get('/eod/admin', { params: { date } }),
};

export const domainAPI = {
  getAll:    () => api.get('/domains'),
  getAlerts: () => api.get('/domains/alerts'),
  create:    (data: any) => api.post('/domains', data),
  update:    (id: number, data: any) => api.put(`/domains/${id}`, data),
  delete:    (id: number) => api.delete(`/domains/${id}`),
};

export const financeAPI = {
  getSummary:       () => api.get('/finance/summary'),
  getStats:         () => api.get('/finance/stats'),
  getClientFinance: (clientId: number) => api.get(`/finance/clients/${clientId}`),
  addPayment:       (clientId: number, data: any) => api.post(`/finance/clients/${clientId}/payments`, data),
  deletePayment:    (paymentId: number) => api.delete(`/finance/payments/${paymentId}`),
  updateTotal:      (clientId: number, total_amount: number) => api.put(`/finance/clients/${clientId}/total`, { total_amount }),
  getAllPayments:   (params?: any) => api.get('/finance/payments', { params }),
};

export const adminChatAPI = {
  getMessages:  () => api.get('/admin/chat/messages'),
  sendMessage:  (message: string) => api.post('/admin/chat/send', { message }),
  getUnread:    () => api.get('/admin/chat/unread'),
};

export const campaignAPI = {
  getAll:   () => api.get('/campaigns'),
  create:   (data: any) => api.post('/campaigns', data),
  update:   (id: number, data: any) => api.put(`/campaigns/${id}`, data),
  delete:   (id: number) => api.delete(`/campaigns/${id}`),
  getStats: () => api.get('/campaigns/stats'),
};

export const expenseAPI = {
  getAll:     (params?: any) => api.get('/expenses', { params }),
  create:     (data: any) => api.post('/expenses', data),
  getStats:   () => api.get('/expenses/stats'),
  getMonthly: () => api.get('/expenses/monthly-summary'),
  delete:     (id: number) => api.delete(`/expenses/${id}`),
};

export default api;
