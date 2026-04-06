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

// ── Response interceptor — unwrap data, handle auth errors ───────────────────
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
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
};

// ── Bookings ──────────────────────────────────────────────────────────────────
export const bookingAPI = {
  getSlots: (date: string) =>
    cachedGet('/bookings/slots', { params: { date } }),

  getPrice: (tank_type: string, tank_size_litres: number, addons: string[], amc_plan?: string) =>
    cachedGet('/bookings/price', { params: { tank_type, tank_size_litres, addons: addons.join(','), amc_plan: amc_plan || '' } }),

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

  // Transfer
  transferJob: (jobId: string, new_team_id: string, reason?: string) => {
    invalidateCache('/jobs');
    return api.post(`/jobs/${jobId}/transfer`, { new_team_id, reason });
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
  calculateScore: (job_id: string) => {
    invalidateCache(`/ecoscore/${job_id}`);
    return api.post('/ecoscore/calculate', { job_id });
  },

  getScore: (jobId: string) =>
    cachedGet(`/ecoscore/${jobId}`),

  getLeaderboard: () =>
    cachedGet('/ecoscore/leaderboard'),
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
  getPlans: () =>
    cachedGet('/amc/plans'),

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

export default api;
