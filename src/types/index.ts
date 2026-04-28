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
  // Joined from jobs table (returned by getMyBookings, getBooking, getAllBookings)
  job_id?: string;
  job_status?: string;
  assigned_team_id?: string;
  team_name?: string;
  start_otp?: string;
  end_otp?: string;
  start_otp_verified?: boolean;
  end_otp_verified?: boolean;
}

// ── Job ───────────────────────────────────────────────────────────────────
export interface Job {
  id: string;
  booking_id: string;  // Same ID shown as "Booking #XXXX" in customer view
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
  start_otp?: string;
  end_otp?: string;
  start_otp_verified?: boolean;
  end_otp_verified?: boolean;
  amc_plan?: string;
}

// ── Compliance ────────────────────────────────────────────────────────────
// Aligned with FA Check List PDF: 9 phases (Stage 0 + Steps 1-8). All
// PDF-specific fields are optional so the same shape persists rows for
// whichever phase the agent is logging.
export interface ComplianceStep {
  id?: string;
  job_id: string;
  step_number: number; // 0..8 (0 = Stage 0 PPE/Safety pre-flight)
  step_name: string;

  // Photos (mandatory_photo varies per step; see COMPLIANCE_STEPS labels)
  photo_before_url?: string;
  photo_after_url?: string;

  // GPS auto-capture (Stage 0 + every step)
  gps_lat: number;
  gps_lng: number;

  // Stage 0 - PPE & safety pre-flight
  ppe_list?: string[]; // mask, gloves, boots, coverall, face_shield, o3_sensor
  ladder_check?: 'Secured' | 'Needs adjustment';
  electrical_check?: 'Safe' | 'Needs attention';
  emergency_kit?: boolean;
  spare_tank_water?: boolean;
  fence_placed?: boolean;
  danger_board?: boolean;
  arrival_at?: string;

  // Steps 1 + 8 - Water-test buckets (label text, not numeric)
  turbidity?: string;
  ph_level?: string;
  orp?: string;
  conductivity?: string;
  tds?: string;
  atp?: string;

  // Step 2 - Drain & inspect
  water_level_pct?: string;
  tank_condition?: 'Good' | 'Attention needed' | 'Immediate attention';

  // Step 3 - Mechanical scrub
  scrub_completed?: boolean;

  // Step 4 - High-pressure rinse
  rinse_duration?: string;

  // Step 5 - Sludge removal
  disposal_status?: 'Proper disposal' | 'Needs verification';

  // Step 6 - Ozone disinfection
  ozone_cycle_duration?: string;
  ozone_ppm_dosed?: string;
  ozone_exposure_mins?: number; // legacy

  // Step 7 - UV double lock (optional add-on)
  uv_cycle_duration?: string;
  uv_dose?: string;
  uv_lumines_status?: 'Safe' | 'Needs adjustment';
  uv_skipped?: boolean;

  // Step 8 - After-wash testing & proof delivery
  client_signature_url?: string;
  technician_remarks?: string;

  // Legacy fields (kept for backward compatibility with old rows)
  microbial_test_url?: string;
  microbial_result?: 'pass' | 'fail';
  microbial_notes?: string;
  chemical_type?: string;
  chemical_qty_ml?: number;

  completed: boolean;
  logged_at?: string;
}

export interface ComplianceChecklist {
  job_id: string;
  total_steps: number; // now 9
  completed_steps: number;
  completion_percentage: number;
  checklist: {
    step_number: number;
    step_name: string;
    optional?: boolean;
    required_fields: string[];
    completed: boolean;
    skipped?: boolean;
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
  services_availed?: number;
  services_remaining?: number;
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