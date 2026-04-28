// API base URL
// Dev  (__DEV__ = true)  → uses EXPO_PUBLIC_LOCAL_API_URL from .env (your machine's LAN IP)
// Prod (__DEV__ = false) → uses EXPO_PUBLIC_API_URL from .env (Railway)
//
// To switch local IP: update EXPO_PUBLIC_LOCAL_API_URL in .env
export const API_URL = __DEV__
  ? (process.env.EXPO_PUBLIC_LOCAL_API_URL || 'http://192.168.31.22:5000/api/v1')
  : (process.env.EXPO_PUBLIC_API_URL       || 'https://service.ozonewash.in/api/v1');

console.log(`[API] __DEV__=${__DEV__} → ${API_URL}`);

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

// 9-phase service SOP from FA Check List PDF.
// Stage 0 is the pre-service PPE/safety gate. Steps 1-8 are the numbered
// process steps the brand markets as the "8-step" clean. Step 7 (UV) is
// optional - the agent can mark it Skipped if the booking didn't include UV.
//
// `customerMessage` is the WhatsApp/in-app text shown to the customer after
// each phase completes (auto-sent by backend via NotificationService).
// `mandatoryPhotoLabel` is what the agent sees on the photo upload tile.
export const COMPLIANCE_STEPS = [
  {
    step: 0,
    name: 'PPE & Safety Discipline',
    mandatoryPhotoLabel: 'PPE proof, ladder, fence + board',
    customerMessage: 'Technician arrived on time, GPS verified, PPE checked, and safety fence with "Danger: Ozone at Work" board placed before starting service.',
  },
  {
    step: 1,
    name: 'Pre-Check & Setup',
    mandatoryPhotoLabel: 'Tank before commencement',
    customerMessage: 'Initial water quality tested - clarity, balance, and hygiene baseline recorded.',
  },
  {
    step: 2,
    name: 'Drain & Inspect',
    mandatoryPhotoLabel: 'Drained tank',
    customerMessage: 'Tank drained safely, condition assessed.',
  },
  {
    step: 3,
    name: 'Mechanical Scrub & Rotary Jet',
    mandatoryPhotoLabel: 'Scrubbed walls/base',
    customerMessage: 'Biofilm and deposits removed from tank walls and base.',
  },
  {
    step: 4,
    name: 'High-Pressure Rinse',
    mandatoryPhotoLabel: 'Flushed tank',
    customerMessage: 'Tank walls flushed clean with high-pressure water.',
  },
  {
    step: 5,
    name: 'Sludge Removal',
    mandatoryPhotoLabel: 'Sludge extracted',
    customerMessage: 'Settled debris and sludge removed from the tank.',
  },
  {
    step: 6,
    name: 'Ozone Disinfection',
    mandatoryPhotoLabel: 'Ozone equipment in use',
    customerMessage: 'Ozone sterilization completed - residue-free hygiene ensured.',
  },
  {
    step: 7,
    name: 'UV Double Lock',
    optional: true,
    mandatoryPhotoLabel: 'UV lamp in operation',
    customerMessage: 'UV double sterilization applied - dose verified to ensure microbial inactivation.',
  },
  {
    step: 8,
    name: 'After-Wash Testing & Proof Delivery',
    mandatoryPhotoLabel: 'Final clean tank',
    customerMessage: 'Final water quality verified - clarity restored, balance maintained, hygiene confirmed. QR-signed hygiene certificate issued with EcoScore badge.',
  },
];

// Bucket options for water-quality tests (used in Steps 1 and 8).
export const WATER_TEST_BUCKETS = {
  turbidity:    ['<5 NTU', '5-10 NTU', '>10 NTU'],
  ph_level:     ['6.5-8.5 Safe', '<6.5 Acidic', '>8.5 Alkaline'],
  orp:          ['>650 mV Strong', '450-650 Moderate', '<450 Weak'],
  conductivity: ['<500 uS/cm', '500-1000', '>1000'],
  tds:          ['<=500 Safe', '500-1000 Marginal', '>1000 Unsafe'],
  atp:          ['<200 Low', '200-500 Moderate', '>500 High'],
};

export const WATER_LEVEL_BUCKETS  = ['0-10%', '11-20%', '21-30%', '>31%'];
export const TANK_CONDITION_OPTIONS = ['Good', 'Attention needed', 'Immediate attention'];
export const DURATION_BUCKETS     = ['<10 min', '10-20 min', '>20 min'];
export const DISPOSAL_OPTIONS     = ['Proper disposal', 'Needs verification'];
export const SAFETY_OPTIONS = {
  ladder:     ['Secured', 'Needs adjustment'],
  electrical: ['Safe', 'Needs attention'],
};
export const UV_DOSE_BUCKETS      = ['<20 mJ/cm2', '20-60', '>60'];
export const UV_LUMINES_OPTIONS   = ['Safe', 'Needs adjustment'];
export const PPE_ITEMS = [
  { value: 'mask',        label: 'Mask' },
  { value: 'gloves',      label: 'Gloves' },
  { value: 'boots',       label: 'Boots' },
  { value: 'coverall',    label: 'Coverall' },
  { value: 'face_shield', label: 'Face shield' },
  { value: 'o3_sensor',   label: 'O3 Sensor' },
];

// ═══════════════════════════════════════════════════════════════════════
//  DESIGN SYSTEM — Ozone Wash
//  Architecture: Zomato/Rapido-grade, production-ready
//
//  SPACING GRID: 8pt (4, 8, 12, 16, 20, 24, 32, 40, 48, 64)
//  RADIUS:       sm=12, md=16, lg=24, pill=999
//  TYPOGRAPHY:   System — Regular(400), SemiBold(600), Bold(700)
//  ELEVATION:    Shadows (light) / Glow (premium)
//
//  NORMAL = White + Blue   → Clean, fast, trustworthy
//  PREMIUM = Black + Gold  → Luxury, exclusive, elite
// ═══════════════════════════════════════════════════════════════════════

export const COLORS = {
  // ── Backgrounds ─────────────────────────────────────────────
  background: '#FFFFFF',             // Pure white — Rapido-clean
  surface: '#FFFFFF',                // Card surfaces
  surfaceElevated: '#F7F8FA',        // Recessed inputs, chips
  surfaceHighlight: '#EEF2F6',       // Skeleton, dividers

  // ── Brand — Ozone Blue ──────────────────────────────────────
  // HSL 217° — trustworthy, clean, modern (like Rapido blue)
  primary: '#2563EB',                // Strong blue — #2563EB
  primaryBg: 'rgba(37,99,235,0.06)', // Subtle tinted backgrounds
  primaryDim: 'rgba(37,99,235,0.12)',// Selected state bg
  primaryFg: '#FFFFFF',              // Text on primary buttons

  // ── Foreground ──────────────────────────────────────────────
  foreground: '#111827',             // Almost-black text (not pure black)
  muted: '#6B7280',                  // Secondary text
  border: '#F0F0F5',                 // Hairline card borders
  borderActive: 'rgba(37,99,235,0.25)',

  // ── Status — high contrast on white ─────────────────────────
  success: '#16A34A',                // Green 600
  successBg: 'rgba(22,163,74,0.08)',
  warning: '#EA580C',               // Orange 600
  warningBg: 'rgba(234,88,12,0.08)',
  danger: '#DC2626',                 // Red 600
  dangerBg: 'rgba(220,38,38,0.06)',
  info: '#2563EB',
  infoBg: 'rgba(37,99,235,0.06)',

  // ── Badge levels ────────────────────────────────────────────
  gold: '#CA8A04',
  goldBg: 'rgba(202,138,4,0.08)',
  silver: '#6B7280',
  silverBg: 'rgba(107,114,128,0.08)',
  bronze: '#B45309',
  bronzeBg: 'rgba(180,83,9,0.08)',
  platinum: '#475569',
  platinumBg: 'rgba(71,85,105,0.08)',

  // ── Premium card tokens (shown inside normal theme) ─────────
  premiumBg: '#0B0B0B',
  premiumSurface: '#1A1A1A',
  premiumGold: '#C49A2D',
  premiumGoldLight: 'rgba(196,154,45,0.15)',
  premiumText: '#E8D5A3',
  premiumMuted: '#A0A0A0',

  // ── Aliases ─────────────────────────────────────────────────
  secondary: '#0EA5E9',              // Sky blue accent
  accent: '#16A34A',                 // Green CTA accent
  gray: '#6B7280',
  lightGray: '#F7F8FA',
  white: '#FFFFFF',
  black: '#111827',

  // ── Elevation (shadow configs) ──────────────────────────────
  // Used via Platform.select in components:
  //   shadowColor: C.shadow, shadowOffset:{width:0,height:2}, shadowOpacity:1, shadowRadius:8
  shadow: 'rgba(0,0,0,0.05)',        // Very subtle on white
  shadowMedium: 'rgba(0,0,0,0.08)',
  shadowStrong: 'rgba(0,0,0,0.12)',
};

export type AppColors = typeof COLORS;

export const PREMIUM_COLORS: AppColors = {
  // ── Backgrounds — true black luxury ─────────────────────────
  background: '#0B0B0B',             // Near-black — OLED-friendly
  surface: '#161616',                // Elevated card surfaces
  surfaceElevated: '#1F1F1F',        // Inputs, chips
  surfaceHighlight: '#2A2A2A',       // Skeleton, dividers

  // ── Brand — Real Gold Leaf ───────────────────────────────────
  // Sampled from brushed gold texture — warm, deep, metallic
  // Gradient: #8B6914 (shadow) → #C49A2D (mid) → #E0C060 (shimmer)
  primary: '#C49A2D',                // Rich warm gold — the real deal
  primaryBg: 'rgba(196,154,45,0.10)',
  primaryDim: 'rgba(196,154,45,0.18)',
  primaryFg: '#0B0B0B',             // Dark text on gold buttons

  // ── Foreground ──────────────────────────────────────────────
  foreground: '#F5F5F5',             // Off-white text (not pure white)
  muted: '#8A8A8A',                  // Subdued secondary text
  border: 'rgba(196,154,45,0.14)',   // Subtle gold-tinted borders
  borderActive: 'rgba(196,154,45,0.35)',

  // ── Status — brighter for dark backgrounds ──────────────────
  success: '#4ADE80',                // Green 400
  successBg: 'rgba(74,222,128,0.12)',
  warning: '#FBBF24',               // Amber 400
  warningBg: 'rgba(251,191,36,0.12)',
  danger: '#F87171',                 // Red 400
  dangerBg: 'rgba(248,113,113,0.10)',
  info: '#60A5FA',                   // Blue 400
  infoBg: 'rgba(96,165,250,0.10)',

  // ── Badge levels ────────────────────────────────────────────
  gold: '#C49A2D',
  goldBg: 'rgba(196,154,45,0.12)',
  silver: '#A0A0A0',
  silverBg: 'rgba(160,160,160,0.12)',
  bronze: '#CD7F32',
  bronzeBg: 'rgba(205,127,50,0.12)',
  platinum: '#C0C0C0',
  platinumBg: 'rgba(192,192,192,0.12)',

  // ── Premium tokens — Real Gold Leaf metallic ─────────────────
  premiumBg: '#0B0B0B',
  premiumSurface: '#161616',
  premiumGold: '#C49A2D',            // Rich warm gold
  premiumGoldLight: 'rgba(196,154,45,0.15)',
  premiumText: '#E8D5A3',            // Warm cream shimmer for text
  premiumMuted: '#8A8A8A',

  // ── Aliases ─────────────────────────────────────────────────
  secondary: '#C49A2D',
  accent: '#C49A2D',
  gray: '#8A8A8A',
  lightGray: '#1F1F1F',
  white: '#E8D5A3',                  // Warm cream for premium
  black: '#0B0B0B',

  // ── Elevation (glow configs) ────────────────────────────────
  shadow: 'rgba(139,105,20,0.10)',   // Deep gold shadow
  shadowMedium: 'rgba(196,154,45,0.14)',
  shadowStrong: 'rgba(224,192,96,0.22)',
};

// ── Premium Gold Gradient Stops ────────────────────────────────
// Real gold leaf metallic: burnished shadow → rich gold → shimmer highlight
// Use with expo-linear-gradient: <LinearGradient colors={GOLD_GRADIENT} ...>
export const GOLD_GRADIENT = ['#8B6914', '#C49A2D', '#E0C060'] as const;
export const GOLD_GRADIENT_HORIZONTAL = { start: { x: 0, y: 0.5 }, end: { x: 1, y: 0.5 } };
export const GOLD_GRADIENT_DIAGONAL = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };