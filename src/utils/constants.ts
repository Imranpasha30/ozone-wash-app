// API base URL — reads from EXPO_PUBLIC_API_URL env var.
// Dev: set in .env   → EXPO_PUBLIC_API_URL=http://192.168.31.22:3000/api/v1
// Prod: set in .env.production → EXPO_PUBLIC_API_URL=https://api.ozonewash.in/api/v1
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.31.22:3000/api/v1';

export const ROLES = {
  CUSTOMER: 'customer',
  FIELD_TEAM: 'field_team',
  ADMIN: 'admin',
} as const;

export const JOB_STATUS = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const TANK_TYPES = [
  { label: 'Overhead Tank', value: 'overhead' },
  { label: 'Underground Tank', value: 'underground' },
  { label: 'Sump', value: 'sump' },
];

export const PAYMENT_METHODS = [
  { label: 'UPI', value: 'upi' },
  { label: 'Card', value: 'card' },
  { label: 'Wallet', value: 'wallet' },
  { label: 'Cash on Delivery', value: 'cod' },
];

export const AMC_PLANS = [
  { label: 'Monthly', value: 'monthly', price: 1200 },
  { label: 'Bi-Monthly', value: 'bimonthly', price: 2200 },
  { label: 'Quarterly', value: 'quarterly', price: 3200 },
  { label: '4 Months', value: '4month', price: 4200 },
  { label: 'Half Yearly', value: 'halfyearly', price: 6000 },
  { label: 'Yearly', value: 'yearly', price: 11000 },
];

export const ADDONS = [
  { label: 'Lime Treatment', value: 'lime_treatment', price: 500 },
  { label: 'Structure Health Check', value: 'structure_health_check', price: 800 },
  { label: 'Advanced Testing', value: 'advanced_testing', price: 1200 },
];

export const COMPLIANCE_STEPS = [
  { step: 1, name: 'Site Inspection' },
  { step: 2, name: 'PPE Check' },
  { step: 3, name: 'Tank Drainage' },
  { step: 4, name: 'Pre-Clean Photos' },
  { step: 5, name: 'Ozone Treatment' },
  { step: 6, name: 'Microbial Test' },
  { step: 7, name: 'Post-Clean Photos' },
  { step: 8, name: 'Customer Sign-off' },
];

export const COLORS = {
  // Backgrounds — clean light palette
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F5F9',
  surfaceHighlight: '#E2E8F0',

  // Brand — Professional Cyan (water/clean/trust)
  primary: '#0891B2',
  primaryBg: 'rgba(8,145,178,0.08)',
  primaryDim: 'rgba(8,145,178,0.15)',
  primaryFg: '#FFFFFF',

  // Foreground
  foreground: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  borderActive: 'rgba(8,145,178,0.30)',

  // Status
  success: '#059669',
  successBg: 'rgba(5,150,105,0.08)',
  warning: '#D97706',
  warningBg: 'rgba(217,119,6,0.08)',
  danger: '#DC2626',
  dangerBg: 'rgba(220,38,38,0.08)',
  info: '#2563EB',
  infoBg: 'rgba(37,99,235,0.08)',

  // Badge levels
  gold: '#D97706',
  goldBg: 'rgba(217,119,6,0.08)',
  silver: '#64748B',
  silverBg: 'rgba(100,116,139,0.08)',
  bronze: '#B45309',
  bronzeBg: 'rgba(180,83,9,0.08)',
  platinum: '#475569',
  platinumBg: 'rgba(71,85,105,0.08)',

  // Aliases
  secondary: '#0EA5E9',
  accent: '#059669',
  gray: '#64748B',
  lightGray: '#F1F5F9',
  white: '#FFFFFF',
  black: '#0F172A',
};