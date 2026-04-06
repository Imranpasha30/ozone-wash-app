// ── User ──────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  phone: string;
  email?: string;
  role: 'customer' | 'field_team' | 'admin';
  name?: string;
  lang: 'en' | 'te';
  fcm_token?: string;
  created_at: string;
}

// ── Booking ───────────────────────────────────────────────────────────────
export interface Booking {
  id: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  tank_type: 'overhead' | 'underground' | 'sump';
  tank_size_litres: number;
  address: string;
  lat?: number;
  lng?: number;
  slot_time: string;
  addons: string[];
  amc_plan?: string;
  payment_method: 'upi' | 'card' | 'wallet' | 'cod';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  amount_paise: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
}

// ── Job ───────────────────────────────────────────────────────────────────
export interface Job {
  id: string;
  booking_id: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  assigned_team_id?: string;
  team_name?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  job_type: string;
  scheduled_at: string;
  started_at?: string;
  completed_at?: string;
  location_lat?: number;
  location_lng?: number;
  address?: string;
  tank_type?: string;
  tank_size_litres?: number;
  notes?: string;
}

// ── Compliance ────────────────────────────────────────────────────────────
export interface ComplianceStep {
  id?: string;
  job_id: string;
  step_number: number;
  step_name: string;
  photo_before_url?: string;
  photo_after_url?: string;
  ozone_exposure_mins?: number;
  microbial_test_url?: string;
  chemical_type?: string;
  chemical_qty_ml?: number;
  ppe_list: string[];
  gps_lat: number;
  gps_lng: number;
  completed: boolean;
  logged_at?: string;
}

export interface ComplianceChecklist {
  job_id: string;
  total_steps: number;
  completed_steps: number;
  completion_percentage: number;
  checklist: {
    step_number: number;
    step_name: string;
    required_fields: string[];
    completed: boolean;
    logged: boolean;
    data: ComplianceStep | null;
  }[];
}

// ── EcoScore ──────────────────────────────────────────────────────────────
export interface EcoScore {
  job_id: string;
  eco_score: number;
  badge_level: 'bronze' | 'silver' | 'gold' | 'platinum';
  score_breakdown: {
    water_score: number;
    chemical_score: number;
    ppe_score: number;
    time_score: number;
    residual_score: number;
  };
}

// ── Certificate ───────────────────────────────────────────────────────────
export interface Certificate {
  id: string;
  job_id: string;
  eco_score: number;
  certificate_url: string;
  qr_code_url: string;
  digital_signature: string;
  valid_until: string;
  status: 'active' | 'revoked' | 'expired';
  customer_name?: string;
  address?: string;
  tank_type?: string;
  issued_at: string;
}

// ── AMC ───────────────────────────────────────────────────────────────────
export interface AmcContract {
  id: string;
  customer_id: string;
  customer_name?: string;
  tank_ids: string[];
  plan_type: 'monthly' | 'bimonthly' | 'quarterly' | '4month' | 'halfyearly' | 'yearly';
  sla_terms: {
    response_hrs: number;
    cleaning_freq: number;
    incident_resolution_hrs: number;
  };
  start_date: string;
  end_date: string;
  renewal_pending: boolean;
  status: 'active' | 'paused' | 'cancelled' | 'expired';
  customer_esign?: string;
  admin_esign?: string;
  amount_paise: number;
}

// ── Navigation ────────────────────────────────────────────────────────────
export type RootStackParamList = {
  // Auth
  PhoneInput: undefined;
  OTPVerify: { phone: string };

  // Customer
  CustomerTabs: undefined;
  BookingHome: undefined;
  TankDetails: undefined;
  DateTimeSelect: undefined;
  AddonsSelect: undefined;
  PaymentScreen: { booking_id: string };
  BookingConfirmed: { booking_id: string };
  BookingDetail: { booking_id: string };
  CertificateView: { job_id: string };
  AmcPlans: undefined;

  // Field Team
  FieldTabs: undefined;
  JobList: undefined;
  JobDetail: { job_id: string };
  Checklist: { job_id: string };
  ComplianceStep: { job_id: string; step_number: number };
  PhotoCapture: { job_id: string; step_number: number; type: 'before' | 'after' };
};

// ── API Response ──────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ── Pricing ───────────────────────────────────────────────────────────────
export interface Pricing {
  base_price: number;
  addon_total: number;
  subtotal: number;
  gst: number;
  grand_total: number;
  amount_paise: number;
}