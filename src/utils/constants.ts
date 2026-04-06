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
  // Backgrounds
  background: '#0B0C18',          // Deep space dark
  surface: '#12131E',             // Card/surface
  surfaceElevated: '#181926',     // Elevated card
  surfaceHighlight: '#1F2033',    // Hover/highlight state

  // Brand — Electric Cyan
  primary: '#2DD4BF',             // Electric teal-cyan
  primaryBg: 'rgba(45,212,191,0.12)',
  primaryDim: 'rgba(45,212,191,0.20)',
  primaryFg: '#0B0C18',           // Text on primary bg

  // Foreground
  foreground: '#F1F2F8',          // Primary text
  muted: '#8A8FA8',               // Secondary text
  border: 'rgba(255,255,255,0.10)',
  borderActive: 'rgba(45,212,191,0.35)',

  // Status
  success: '#4ADE80',
  successBg: 'rgba(74,222,128,0.12)',
  warning: '#FBBF24',
  warningBg: 'rgba(251,191,36,0.12)',
  danger: '#F87171',
  dangerBg: 'rgba(248,113,113,0.12)',
  info: '#60A5FA',
  infoBg: 'rgba(96,165,250,0.12)',

  // Badge levels
  gold: '#F59E0B',
  goldBg: 'rgba(245,158,11,0.12)',
  silver: '#94A3B8',
  silverBg: 'rgba(148,163,184,0.12)',
  bronze: '#C2773A',
  bronzeBg: 'rgba(194,119,58,0.12)',
  platinum: '#E2E8F0',
  platinumBg: 'rgba(226,232,240,0.12)',

  // Legacy aliases — keep for backward compatibility
  secondary: '#2DD4BF',
  accent: '#FBBF24',
  gray: '#8A8FA8',
  lightGray: 'rgba(255,255,255,0.08)',
  white: '#F1F2F8',
  black: '#0B0C18',
};