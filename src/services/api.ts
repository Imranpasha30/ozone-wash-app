import axios, { AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../utils/constants';

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach JWT ─────────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Retry helper ─────────────────────────────────────────────────────────────
// One retry on transient failures (network error or 5xx) for safe verbs only,
// 1.5 s back-off. Mutating verbs that are not explicitly idempotent are not
// retried to avoid double-charging Razorpay / double-creating bookings.
const RETRY_BACKOFF_MS = 1500;
const isRetryableMethod = (method?: string) => {
  const m = (method || 'get').toLowerCase();
  return m === 'get' || m === 'head' || m === 'options' || m === 'put' || m === 'delete';
};
const isRetryableError = (error: any) => {
  if (!error) return false;
  if (error.config?.__isRetry) return false; // already retried once
  if (!error.response) return true; // network / timeout / DNS
  const code = error.response.status;
  return code >= 500 && code < 600; // server errors only
};
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ── Response interceptor — unwrap data, handle auth errors, retry once ───────
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const cfg = error?.config;
    if (cfg && isRetryableMethod(cfg.method) && isRetryableError(error)) {
      cfg.__isRetry = true;
      await sleep(RETRY_BACKOFF_MS);
      try {
        return await api.request(cfg);
      } catch (e) {
        // fall through to normal error handling on second failure
        error = e;
      }
    }
    const message = error.response?.data?.message || 'Something went wrong';
    const status = error.response?.status;
    if (status === 401) {
      await AsyncStorage.multiRemove(['token', 'user']);
    }
    return Promise.reject({ message, status });
  }
);

// ── GET Cache + In-flight deduplication ──────────────────────────────────────
// Prevents the same GET URL from being called multiple times simultaneously
// (e.g. BookingHomeScreen + MyBookingsScreen both mount at the same time).
// Cached responses are served instantly for `ttlMs` milliseconds.
// This cuts data usage significantly on mobile connections.

interface CacheEntry { data: any; expiresAt: number; }
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<any>>();

const TTL: Record<string, number> = {
  '/bookings/slots':    5 * 60 * 1000,  // 5 min — slot availability
  '/bookings/price':   2 * 60 * 1000,   // 2 min — pricing
  '/amc/plans':       10 * 60 * 1000,   // 10 min — static plan list
  '/ecoscore/leaderboard': 5 * 60 * 1000,
  default:             30 * 1000,        // 30 sec — all other GETs
};

const getTtl = (url: string): number => {
  for (const [key, ttl] of Object.entries(TTL)) {
    if (url.includes(key)) return ttl;
  }
  return TTL.default;
};

const cachedGet = (url: string, config?: AxiosRequestConfig): Promise<any> => {
  const key = url + (config?.params ? JSON.stringify(config.params) : '');
  const now = Date.now();

  // 1. Return from cache if still fresh
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return Promise.resolve(cached.data);

  // 2. Deduplicate: if same request is already in-flight, return that promise
  if (inFlight.has(key)) return inFlight.get(key)!;

  // 3. Make the real request
  const promise = api.get(url, config)
    .then((data) => {
      cache.set(key, { data, expiresAt: now + getTtl(url) });
      inFlight.delete(key);
      return data;
    })
    .catch((err) => {
      inFlight.delete(key);
      throw err;
    });

  inFlight.set(key, promise);
  return promise;
};

/** Call this after any mutation (POST/PATCH/DELETE) that invalidates GET caches. */
export const invalidateCache = (urlFragment: string) => {
  for (const key of cache.keys()) {
    if (key.includes(urlFragment)) cache.delete(key);
  }
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  sendOtp: (phone: string) =>
    api.post('/auth/send-otp', { phone }),

  verifyOtp: (phone: string, otp: string, fcm_token?: string) =>
    api.post('/auth/verify-otp', { phone, otp, fcm_token }),

  getProfile: () =>
    cachedGet('/auth/profile'),

  updateProfile: (data: { name?: string; email?: string }) => {
    invalidateCache('/auth/profile');
    return api.patch('/auth/profile', data);
  },
};

// ── Admin Auth (username + bcrypt password, no OTP) ──────────────────────────
// Spec: Master Prompt v2.0 PART 2.2.3. Distinct from phone-OTP customer auth.
// All admin endpoints carry a JWT with `type: 'admin'` and a `session_id`
// that the backend validates against the admin_sessions table — server-side
// session revocation is supported.
export const adminAuthAPI = {
  login: (username: string, password: string) =>
    api.post('/admin-auth/login', { username, password }),

  logout: () => api.post('/admin-auth/logout'),

  me: () => api.get('/admin-auth/me'),

  changePassword: (old_password: string, new_password: string) =>
    api.post('/admin-auth/change-password', { old_password, new_password }),

  // ── Super-admin only ──────────────────────────────────────────────────────
  listAccounts: () => api.get('/admin-auth/accounts'),

  createAccount: (body: {
    username: string;
    email: string;
    full_name: string;
    phone?: string;
    admin_role?: 'super_admin' | 'ops_manager' | 'finance' | 'support' | 'read_only';
    password?: string;            // omit to auto-generate a temp password (returned once)
  }) => api.post('/admin-auth/accounts', body),

  deactivateAccount: (id: string) =>
    api.patch(`/admin-auth/accounts/${id}/deactivate`),

  revokeSessions: (id: string) =>
    api.post(`/admin-auth/accounts/${id}/revoke-sessions`),

  auditLog: (params?: { limit?: number; offset?: number; admin_id?: string; action?: string }) =>
    api.get('/admin-auth/audit-log', { params }),
};

// ── Bookings ──────────────────────────────────────────────────────────────────
export const bookingAPI = {
  getSlots: (date: string) =>
    cachedGet('/bookings/slots', { params: { date } }),

  // Legacy: tank_type + addons one-time pricing (kept for old screens)
  getPrice: (tank_type: string, tank_size_litres: number, addons: string[]) =>
    cachedGet('/bookings/price', { params: { tank_type, tank_size_litres, addons: addons.join(',') } }),

  // New: pricing-matrix mode — tier × plan × tank_count
  getMatrixPrice: (tank_size_litres: number, tank_count: number, plan: 'one_time' | 'monthly' | 'quarterly' | 'half_yearly') =>
    cachedGet('/bookings/price', { params: { tank_size_litres, tank_count, plan } }),

  createBooking: (data: any) => {
    invalidateCache('/bookings');
    return api.post('/bookings', data);
  },

  getMyBookings: () =>
    cachedGet('/bookings/my'),

  getBooking: (id: string) =>
    cachedGet(`/bookings/${id}`),

  cancelBooking: (id: string) => {
    invalidateCache('/bookings');
    return api.patch(`/bookings/${id}/cancel`);
  },
};

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const jobAPI = {
  getMyJobs: () =>
    cachedGet('/jobs/my'),

  getJob: (id: string) =>
    cachedGet(`/jobs/${id}`),

  startJob: (id: string) => {
    invalidateCache('/jobs');
    return api.patch(`/jobs/${id}/start`);
  },

  completeJob: (id: string) => {
    invalidateCache('/jobs');
    return api.patch(`/jobs/${id}/complete`);
  },

  getAllJobs: (filters?: any) =>
    cachedGet('/jobs', { params: filters }),

  assignTeam: (jobId: string, team_id: string) => {
    invalidateCache('/jobs');
    return api.patch(`/jobs/${jobId}/assign`, { team_id });
  },

  getTeamList: () =>
    cachedGet('/jobs/teams'),

  getTodayStats: () =>
    api.get('/jobs/stats'),  // no cache — role-dependent response

  // OTP endpoints
  generateStartOtp: (jobId: string) => {
    invalidateCache('/jobs');
    return api.post(`/jobs/${jobId}/generate-start-otp`);
  },

  verifyStartOtp: (jobId: string, otp: string) => {
    invalidateCache('/jobs');
    return api.post(`/jobs/${jobId}/verify-start-otp`, { otp });
  },

  generateEndOtp: (jobId: string) => {
    invalidateCache('/jobs');
    return api.post(`/jobs/${jobId}/generate-end-otp`);
  },

  verifyEndOtp: (jobId: string, otp: string) => {
    invalidateCache('/jobs');
    return api.post(`/jobs/${jobId}/verify-end-otp`, { otp });
  },

  // Customer requests start OTP
  customerRequestOtp: (jobId: string) => {
    invalidateCache('/jobs');
    invalidateCache('/bookings');
    return api.post(`/jobs/${jobId}/customer-request-otp`);
  },

  // Transfer
  transferJob: (jobId: string, new_team_id: string, reason?: string) => {
    invalidateCache('/jobs');
    return api.post(`/jobs/${jobId}/transfer`, { new_team_id, reason });
  },

  // Route optimization (field team)
  optimizeRoute: (lat?: number, lng?: number) =>
    api.get('/jobs/route-optimize', { params: lat && lng ? { lat, lng } : {} }),

  // Available jobs (field team browses unassigned)
  getAvailableJobs: () =>
    cachedGet('/jobs/available'),

  // Request a job (field team)
  requestJob: (jobId: string) => {
    invalidateCache('/jobs');
    return api.post(`/jobs/${jobId}/request`);
  },

  // Field team — see own requests (pending/approved/rejected). Used to power
  // the "My Requests" tab so users don't re-request a job they've already
  // requested or to track status.
  getMyJobRequests: () => api.get('/jobs/my-requests'),

  // Conflict detection — check if a team member has a job at the given time
  checkConflict: (teamId: string, scheduledAt: string, excludeJobId?: string) =>
    api.get('/jobs/conflict-check', { params: { team_id: teamId, scheduled_at: scheduledAt, ...(excludeJobId ? { exclude_job_id: excludeJobId } : {}) } }),

  // Field team raises a scheduling concern
  raiseConcern: (jobId: string, message: string) => {
    invalidateCache('/jobs');
    return api.post(`/jobs/${jobId}/raise-concern`, { message });
  },

  // Admin: get all unresolved concerns
  getConcerns: () =>
    api.get('/jobs/concerns'),

  // Admin: resolve a concern
  resolveConcern: (jobId: string) => {
    invalidateCache('/jobs');
    return api.patch(`/jobs/${jobId}/resolve-concern`);
  },
};

// ── Compliance ────────────────────────────────────────────────────────────────
export const complianceAPI = {
  getChecklist: (jobId: string) =>
    cachedGet(`/compliance/${jobId}/checklist`),

  logStep: (data: any) => {
    invalidateCache(`/compliance/${data.job_id}`);
    return api.post('/compliance/step', data);
  },

  getStatus: (jobId: string) =>
    cachedGet(`/compliance/${jobId}/status`),

  completeCompliance: (jobId: string) => {
    invalidateCache(`/compliance/${jobId}`);
    return api.post(`/compliance/${jobId}/complete`);
  },
};

// ── EcoScore ──────────────────────────────────────────────────────────────────
export const ecoScoreAPI = {
  // Legacy per-job
  calculateScore: (job_id: string) => {
    invalidateCache(`/ecoscore/${job_id}`);
    return api.post('/ecoscore/calculate', { job_id });
  },

  getScore: (jobId: string) =>
    cachedGet(`/ecoscore/${jobId}`),

  // Legacy team leaderboard (kept for back-compat)
  getLeaderboard: () =>
    cachedGet('/ecoscore/leaderboard'),

  // ── New: rolling per-customer EcoScore ────────────────────────────────
  /** GET /ecoscore/me — { score, badge, rationale, streak_days, components, history } */
  getMyScore: () => cachedGet('/ecoscore/me'),

  /** GET /ecoscore/customer-leaderboard — public anonymised top 50 customers */
  getCustomerLeaderboard: () => cachedGet('/ecoscore/customer-leaderboard'),

  // ── Admin: weights + recalc + drill-downs ─────────────────────────────
  getWeights: () => cachedGet('/ecoscore/admin/weights'),

  updateWeights: (weights: Record<string, number>) => {
    invalidateCache('/ecoscore/admin/weights');
    invalidateCache('/ecoscore/me');
    return api.put('/ecoscore/admin/weights', weights);
  },

  recalcAll: () => {
    invalidateCache('/ecoscore');
    return api.post('/ecoscore/admin/recalc-all');
  },

  getTopCustomers: (limit = 20) =>
    cachedGet('/ecoscore/admin/top', { params: { limit } }),

  getBottomCustomers: (limit = 20) =>
    cachedGet('/ecoscore/admin/bottom', { params: { limit } }),
};

// ── Rewards / EcoPoints Wallet ───────────────────────────────────────────────
export const rewardsAPI = {
  /** GET /rewards — public catalog of all active rewards */
  getCatalog: () => cachedGet('/rewards'),

  /** GET /rewards/me — authenticated: { wallet, eco, rewards (with eligibility), history } */
  getMyRewards: () => cachedGet('/rewards/me'),

  /** POST /rewards/redeem — body { reward_slug }. Returns { redemption, wallet }. */
  redeem: (slug: string) => {
    invalidateCache('/rewards/me');
    invalidateCache('/ecoscore/me');
    return api.post('/rewards/redeem', { reward_slug: slug });
  },
};

// ── Ratings ───────────────────────────────────────────────────────────────────
export const ratingAPI = {
  submit: (job_id: string, rating: number, comment?: string) => {
    invalidateCache(`/ratings/job/${job_id}`);
    invalidateCache('/ecoscore/me');
    return api.post('/ratings', { job_id, rating, comment });
  },
  getForJob: (jobId: string) => cachedGet(`/ratings/job/${jobId}`),
};

// ── Certificates ──────────────────────────────────────────────────────────────
export const certificateAPI = {
  generate: (job_id: string) => {
    invalidateCache(`/certificates`);
    return api.post('/certificates/generate', { job_id });
  },

  getCertificate: (jobId: string) =>
    cachedGet(`/certificates/job/${jobId}`),

  verifyCertificate: (certId: string) =>
    cachedGet(`/certificates/verify/${certId}`),
};

// ── AMC ───────────────────────────────────────────────────────────────────────
export const amcAPI = {
  // When tank_size_litres is provided, returns the four matrix plans
  // (one_time + monthly + quarterly + half_yearly) with computed totals.
  // Otherwise returns the static legacy plan list.
  getPlans: (tank_size_litres?: number, tank_count?: number) =>
    cachedGet('/amc/plans', {
      params: tank_size_litres
        ? { tank_size_litres, tank_count: tank_count || 1 }
        : undefined,
    }),

  createContract: (data: any) => {
    invalidateCache('/amc/contracts');
    return api.post('/amc/contracts', data);
  },

  getMyContracts: () =>
    cachedGet('/amc/contracts/my'),

  getContract: (id: string) =>
    cachedGet(`/amc/contracts/${id}`),

  renewContract: (id: string) => {
    invalidateCache('/amc/contracts');
    return api.patch(`/amc/contracts/${id}/renew`);
  },
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  getAllBookings: (params?: { status?: string; date?: string; limit?: number; offset?: number }) =>
    cachedGet('/bookings', { params }),

  // Admin alerts (slot conflicts, no-team-available, technician overcommit).
  // The conflict detector queues these automatically after booking create /
  // job assignment. Admin sees them on the dashboard banner.
  getAlerts: (unackOnly = true) =>
    api.get('/admin/alerts', { params: { unack: unackOnly ? '1' : '0' } }),
  getAlertCount: () => api.get('/admin/alerts/count'),
  ackAlert: (id: string) => api.patch(`/admin/alerts/${id}/ack`),
  // Unified inbox — alerts + pending job requests + unassigned jobs in one call.
  // Used by the live admin notification panel on the dashboard.
  getInbox: () => api.get('/admin/alerts/inbox'),

  // ── Field teams (admin team management) ──────────────────────────────
  listFieldTeams: () => api.get('/teams'),
  getFieldTeam: (id: string) => api.get(`/teams/${id}`),
  createFieldTeam: (body: { name: string; leader_id: string; description?: string }) =>
    api.post('/teams', body),
  updateFieldTeam: (id: string, body: { name?: string; leader_id?: string; description?: string; is_active?: boolean }) =>
    api.patch(`/teams/${id}`, body),
  deleteFieldTeam: (id: string) => api.delete(`/teams/${id}`),
  addTeamMember: (teamId: string, body: { agent_id: string; share_pct?: number; transfer?: boolean }) =>
    api.post(`/teams/${teamId}/members`, body),
  removeTeamMember: (teamId: string, agentId: string) =>
    api.delete(`/teams/${teamId}/members/${agentId}`),
  updateTeamMemberShare: (teamId: string, agentId: string, share_pct: number) =>
    api.patch(`/teams/${teamId}/members/${agentId}/share`, { share_pct }),

  // Field-team-facing — agent sees their own team.
  getMyTeam: () => api.get('/teams/me'),

  // Customer drill-in dashboard — lifetime spend, services count, AMC, eco,
  // recent activity. Used by AdminCustomerDetailScreen.
  getCustomerStats: (customerId: string) =>
    api.get(`/admin/customers/${customerId}/stats`),

  // Top customers leaderboard with reason tags ("Top spender", "Repeat",
  // "GOLD AMC", etc). Powers the highlight strip on AdminCustomersScreen.
  getTopCustomers: (limit = 10) =>
    api.get('/admin/customers/top', { params: { limit } }),

  // Promote / demote a user between customer and field_team. Admin role itself
  // is managed via admin-auth.
  setUserRole: (userId: string, role: 'customer' | 'field_team') =>
    api.patch(`/admin/users/${userId}/role`, { role }),

  confirmBooking: (id: string) => {
    invalidateCache('/bookings');
    return api.patch(`/bookings/${id}/confirm`);
  },

  cancelBooking: (id: string) => {
    invalidateCache('/bookings');
    return api.patch(`/bookings/${id}/cancel`);
  },

  getAllJobs: (filters?: any) =>
    cachedGet('/jobs', { params: filters }),

  getTodayStats: () =>
    cachedGet('/jobs/stats'),

  getTeamList: () =>
    cachedGet('/jobs/teams'),

  assignTeam: (jobId: string, team_id: string) => {
    invalidateCache('/jobs');
    return api.patch(`/jobs/${jobId}/assign`, { team_id });
  },

  // Job requests
  getJobRequests: (params?: { status?: string }) =>
    cachedGet('/jobs/requests', { params }),

  getPendingRequestCount: () =>
    api.get('/jobs/requests/count'),

  approveJobRequest: (requestId: string) => {
    invalidateCache('/jobs');
    return api.patch(`/jobs/requests/${requestId}/approve`);
  },

  rejectJobRequest: (requestId: string) => {
    invalidateCache('/jobs');
    return api.patch(`/jobs/requests/${requestId}/reject`);
  },

  // Users
  getAllUsers: (params?: { role?: string; limit?: number; offset?: number }) =>
    cachedGet('/auth/users', { params }),

  // AMC
  getAllAmcContracts: (params?: { status?: string }) =>
    cachedGet('/amc/contracts', { params }),

  cancelAmcContract: (id: string) => {
    invalidateCache('/amc');
    return api.patch(`/amc/contracts/${id}/cancel`);
  },

  getExpiringAmc: (days?: number) =>
    cachedGet('/amc/expiring', { params: { days } }),

  // ── Pricing manager ────────────────────────────────────────────────
  getPricing: () =>
    cachedGet('/admin/pricing'),

  updatePricingRow: (
    matrixId: string,
    fields: { single_tank_paise?: number; per_tank_2_paise?: number; per_tank_2plus_paise?: number; notes?: string; active?: boolean },
  ) => {
    invalidateCache('/admin/pricing');
    invalidateCache('/bookings/price');
    invalidateCache('/amc/plans');
    return api.put(`/admin/pricing/${matrixId}`, fields);
  },

  freezePricing: () => {
    invalidateCache('/admin/pricing');
    return api.post('/admin/pricing/freeze');
  },
};

// ── Incidents ────────────────────────────────────────────────────────────────
export const incidentAPI = {
  create: (data: { job_id: string; description: string; severity?: string; photo_url?: string; audio_url?: string }) => {
    return api.post('/incidents', data);
  },

  getByJobId: (jobId: string) =>
    cachedGet(`/incidents/job/${jobId}`),

  getAll: (params?: { status?: string; severity?: string }) =>
    cachedGet('/incidents', { params }),

  resolve: (id: string) => {
    invalidateCache('/incidents');
    return api.patch(`/incidents/${id}/resolve`);
  },

  escalate: (id: string) => {
    invalidateCache('/incidents');
    return api.patch(`/incidents/${id}/escalate`);
  },
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentAPI = {
  createOrder: (booking_id: string) =>
    api.post('/payments/create-order', { booking_id }),

  verifyPayment: (data: any) =>
    api.post('/payments/verify', data),

  createAmcOrder: (contract_id: string) =>
    api.post('/payments/amc/create-order', { contract_id }),

  verifyAmcPayment: (data: any) =>
    api.post('/payments/amc/verify', data),
};

// ── Upload ────────────────────────────────────────────────────────────────────
export const uploadAPI = {
  uploadPhoto: async (uri: string, folder: string = 'compliance') => {
    const formData = new FormData();
    formData.append('file', { uri, type: 'image/jpeg', name: `photo_${Date.now()}.jpg` } as any);
    formData.append('folder', folder);
    const token = await AsyncStorage.getItem('token');
    // Use raw axios (not the api instance) so the interceptor doesn't double-unwrap
    const response = await axios.post(`${API_URL}/upload/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`,
      },
      timeout: 30000, // Uploads need more time
    });
    return response.data;
  },
};

// ── Livestream ────────────────────────────────────────────────────────────────
export const livestreamAPI = {
  getToken: (channel: string, role: 'publisher' | 'subscriber') =>
    api.get('/livestream/token', { params: { channel, role } }),
};

// ── Incentives (FA payouts) ─────────────────────────────────────────────────
// Field-team self endpoints + admin payout management. All amounts in paise.
export const incentiveAPI = {
  // Field-team self
  getMyLedger: () =>
    cachedGet('/incentives/me'),

  getMyHistory: (params?: { limit?: number; offset?: number }) =>
    cachedGet('/incentives/me/history', { params }),

  // Detailed earnings dashboard for the logged-in field agent.
  // Returns profile, lifetime totals, last-12-month series, breakdown by
  // reason + by team, last 30 ledger transactions, and the agent's current
  // team. Used by the field-team IncentiveScreen "Detailed stats" tab.
  getMyDetailedStats: () => api.get('/incentives/me/stats'),

  // Admin variant — drill into any agent's full earnings.
  getAgentDetailedStats: (agentId: string) =>
    api.get(`/incentives/agent/${agentId}/stats`),

  // ── New: PDF tier-based credit engine ────────────────────────────────
  /**
   * GET /incentives/me/credits — current month credit-based snapshot.
   * Returns { credits_total, breakdown: {turnover,avg_time,tat,transactions,
   *   checklist,ecoscore,feedback,addon,escalation}, tier, tier_thresholds,
   *   raw: {turnover_paise, jobs_30d, avg_minutes, tat_pct, checklist_avg_pct,
   *   ecoscore_avg, rating_avg, addon_pct, escalation_count} }
   */
  getMyCredits: () =>
    api.get('/incentives/me/credits'),

  /** Admin: GET /admin/incentives/credits/:month — all agents' credits for YYYY-MM */
  getAllAgentCreditsForMonth: (month: string) =>
    api.get('/admin/incentives/credits/' + month),

  // Admin
  adminListPayouts: (month?: string) =>
    cachedGet('/admin/incentives/payouts', { params: month ? { month } : {} }),

  adminFreezeBatch: (batchId: string) => {
    invalidateCache('/admin/incentives/payouts');
    invalidateCache('/incentives/me');
    return api.post(`/admin/incentives/payouts/${batchId}/freeze`);
  },

  adminMarkPaid: (batchId: string, payment_ref: string, notes?: string) => {
    invalidateCache('/admin/incentives/payouts');
    invalidateCache('/incentives/me');
    return api.post(`/admin/incentives/payouts/${batchId}/mark-paid`, { payment_ref, notes });
  },

  adminReverseBatch: (batchId: string, reason?: string) => {
    invalidateCache('/admin/incentives/payouts');
    invalidateCache('/incentives/me');
    return api.post(`/admin/incentives/payouts/${batchId}/reverse`, { reason });
  },

  adminGetRules: () =>
    cachedGet('/admin/incentives/rules'),

  adminUpdateRules: (fields: Record<string, number>) => {
    invalidateCache('/admin/incentives/rules');
    return api.put('/admin/incentives/rules', fields);
  },
};

// ── MIS (Management Information System) ──────────────────────────────────────
// All endpoints accept optional `?from=YYYY-MM-DD&to=YYYY-MM-DD` (default last
// 30 days). Admin-protected on the backend. Each function returns the parsed
// JSON for the corresponding contract in `src/types/mis.ts`.
export const misAPI = {
  getOperational: (params?: { from?: string; to?: string }) =>
    cachedGet('/mis/operational', { params }),

  getEcoScore: (params?: { from?: string; to?: string }) =>
    cachedGet('/mis/ecoscore', { params }),

  getRevenue: (params?: { from?: string; to?: string }) =>
    cachedGet('/mis/revenue', { params }),

  getEngagement: (params?: { from?: string; to?: string }) =>
    cachedGet('/mis/customer-engagement', { params }),

  getSales: (params?: { from?: string; to?: string }) =>
    cachedGet('/mis/sales', { params }),

  getReferrals: (params?: { from?: string; to?: string }) =>
    cachedGet('/mis/referrals', { params }),
};

// ── Auto Wash (Phase 3 — EV doorstep car hygiene) ────────────────────────────
// Spec: backend src/modules/auto-wash + Auto Wash Scope PDF Section 8.
// All amounts in paise (₹1 = 100).
export const autoWashAPI = {
  // Catalog (public)
  getPackages:           () => cachedGet('/auto-wash/packages'),
  getAddons:             () => cachedGet('/auto-wash/addons'),
  getSubscriptionPlans:  () => cachedGet('/auto-wash/subscription-plans'),

  // Pricing — never trusted client-side; always re-fetch before checkout
  quote: (body: {
    vehicle_type: 'hatchback' | 'sedan' | 'suv_muv' | 'luxury' | 'two_wheeler';
    package_code: 'ecorinse' | 'ecoshield' | 'ozonecomplete' | 'hygieneelite';
    addon_codes?: string[];
    subscription_code?: string | null;
  }) => api.post('/auto-wash/quote', body),

  // Vehicles
  listVehicles:    () => cachedGet('/auto-wash/vehicles'),
  addVehicle:      (body: any) => { invalidateCache('/auto-wash/vehicles'); return api.post('/auto-wash/vehicles', body); },
  updateVehicle:   (id: string, body: any) => { invalidateCache('/auto-wash/vehicles'); return api.put(`/auto-wash/vehicles/${id}`, body); },
  deleteVehicle:   (id: string) => { invalidateCache('/auto-wash/vehicles'); return api.delete(`/auto-wash/vehicles/${id}`); },

  // Bookings
  createBooking: (body: any) => {
    invalidateCache('/auto-wash/bookings');
    return api.post('/auto-wash/bookings', body);
  },
  getBooking:       (id: string) => cachedGet(`/auto-wash/bookings/${id}`),
  bookingHistory:   (params?: { limit?: number; offset?: number }) =>
                       cachedGet('/auto-wash/bookings/history', { params }),

  // Subscriptions
  createSubscription:  (body: { plan_type: string; vehicle_ids?: string[] }) => {
    invalidateCache('/auto-wash/subscriptions');
    return api.post('/auto-wash/subscriptions', body);
  },
  getActiveSubscription:  () => cachedGet('/auto-wash/subscriptions/active'),
  pauseSubscription:      (id: string, pause_until: string) => {
    invalidateCache('/auto-wash/subscriptions');
    return api.put(`/auto-wash/subscriptions/${id}/pause`, { pause_until });
  },
  cancelSubscription:     (id: string) => {
    invalidateCache('/auto-wash/subscriptions');
    return api.put(`/auto-wash/subscriptions/${id}/cancel`);
  },

  // Field crew
  getJobsToday:   () => cachedGet('/auto-wash/jobs/today'),
  uploadPreInspection: (jobId: string, photo_urls: string[]) =>
    api.post(`/auto-wash/jobs/${jobId}/pre-inspection`, { photo_urls }),
  startStep:      (jobId: string, stepNo: number) =>
    api.post(`/auto-wash/jobs/${jobId}/steps/${stepNo}/start`),
  endStep:        (jobId: string, stepNo: number, body: any) =>
    api.post(`/auto-wash/jobs/${jobId}/steps/${stepNo}/end`, body),
  completeJob:    (jobId: string, body: any) =>
    api.post(`/auto-wash/jobs/${jobId}/complete`, body),

  // Public verify (no auth)
  verifyCertificate: (qrToken: string) =>
    api.get(`/auto-wash/verify/${qrToken}`),
};

export default api;
