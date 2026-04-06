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

  // Premium AMC — gold & black
  premiumBg: '#0F172A',
  premiumSurface: '#1E293B',
  premiumGold: '#D4A017',
  premiumGoldLight: 'rgba(212,160,23,0.15)',
  premiumText: '#FEFCE8',
  premiumMuted: '#94A3B8',

  // Aliases
  secondary: '#0EA5E9',
  accent: '#059669',
  gray: '#64748B',
  lightGray: '#F1F5F9',
  white: '#FFFFFF',
  black: '#0F172A',
};

export type AppColors = typeof COLORS;

export const PREMIUM_COLORS: AppColors = {
  // Backgrounds — dark premium
  background: '#0F172A',
  surface: '#1E293B',
  surfaceElevated: '#334155',
  surfaceHighlight: '#475569',

  // Brand — Gold
  primary: '#D4A017',
  primaryBg: 'rgba(212,160,23,0.12)',
  primaryDim: 'rgba(212,160,23,0.20)',
  primaryFg: '#0F172A',

  // Foreground
  foreground: '#FEFCE8',
  muted: '#94A3B8',
  border: 'rgba(212,160,23,0.15)',
  borderActive: 'rgba(212,160,23,0.40)',

  // Status
  success: '#34D399',
  successBg: 'rgba(52,211,153,0.12)',
  warning: '#FBBF24',
  warningBg: 'rgba(251,191,36,0.12)',
  danger: '#F87171',
  dangerBg: 'rgba(248,113,113,0.12)',
  info: '#60A5FA',
  infoBg: 'rgba(96,165,250,0.12)',

  // Badge levels
  gold: '#D4A017',
  goldBg: 'rgba(212,160,23,0.12)',
  silver: '#94A3B8',
  silverBg: 'rgba(148,163,184,0.12)',
  bronze: '#D97706',
  bronzeBg: 'rgba(217,119,6,0.12)',
  platinum: '#94A3B8',
  platinumBg: 'rgba(148,163,184,0.12)',

  // Premium AMC — same in premium mode
  premiumBg: '#0F172A',
  premiumSurface: '#1E293B',
  premiumGold: '#D4A017',
  premiumGoldLight: 'rgba(212,160,23,0.15)',
  premiumText: '#FEFCE8',
  premiumMuted: '#94A3B8',

  // Aliases
  secondary: '#D4A017',
  accent: '#D4A017',
  gray: '#94A3B8',
  lightGray: '#334155',
  white: '#FEFCE8',
  black: '#0F172A',
};