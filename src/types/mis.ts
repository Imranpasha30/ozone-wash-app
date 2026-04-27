/**
 * MIS (Management Information System) response types.
 * Mirror the backend `/api/v1/mis/*` endpoint contracts verbatim so screens
 * get full intellisense.
 */

// ── 1. Operational ────────────────────────────────────────────────────────────
export interface MisOperational {
  jobs: { completed: number; pending: number; overdue: number; total: number };
  sla: {
    compliancePct: number;
    breachCount: number;
    breaches: { job_id: string; customer: string; hours_late: number }[];
  };
  avgMinutesPerJob: number;
  benchmarkMinutes: number;
  firstTimeFixRate: number;
  checklistCompliancePct: number;
  digitalCompliancePct: number;
  gaps: {
    missingChecklistJobs: string[];
    incompleteLogs: string[];
    delayedUploads: string[];
  };
}

// ── 2. EcoScore ──────────────────────────────────────────────────────────────
export interface MisEcoScore {
  avgScoreBySegment: { domestic: number; society: number; industrial: number };
  badgeDistribution: {
    platinum: number;
    gold: number;
    silver: number;
    bronze: number;
    unrated: number;
  };
  trend: { month: string; avg: number }[];
  feedbackImpact: { avgRating: number; ratingsCount: number };
  streaks: { topPlatinumStreak: number; topAgentStreak: number };
  gaps: {
    lowScoreJobs: string[];
    repeatBronzeCustomers: string[];
    missingReviews: string[];
  };
}

// ── 3. Revenue ───────────────────────────────────────────────────────────────
export type AgentTier = 'platinum' | 'gold' | 'silver' | 'bronze';

export interface MisRevenue {
  byAgent: {
    agent_id: string;
    name: string;
    turnover_ex_gst: number;
    transactions: number;
    addon_conversion_pct: number;
    incentive_credits: number;
    tier: AgentTier;
  }[];
  tierDistribution: { platinum: number; gold: number; silver: number; bronze: number };
  incentivePayoutTotal: number;
  revenueUplift: number;
  gaps: {
    lowTurnoverAgents: string[];
    poorUpsellAgents: string[];
    stuckBronze: string[];
  };
}

// ── 4. Customer Engagement ───────────────────────────────────────────────────
export interface MisEngagement {
  wallet: { avgBalance: number; totalOutstanding: number };
  redemption: { pointsAccrued: number; pointsRedeemed: number; redemptionPct: number };
  topRewards: { name: string; redeemed_count: number }[];
  referrals: { pointsEarned: number; newCustomersAcquired: number };
  amcRenewalRate: number;
  gaps: {
    highBalanceLowRedemption: string[];
    lowAmcRenewals: string[];
  };
}

// ── 5. Sales ─────────────────────────────────────────────────────────────────
export interface MisSales {
  funnel: { leads: number; converted: number; lost: number };
  revenueSegments: {
    amcRenewals: number;
    newContracts: number;
    addons: number;
    partner: number;
  };
  cacVsLtv: { cac: number; ltv: number; ratio: number };
  segmentProfitability: { domestic: number; society: number; industrial: number };
  growthTrend: { month: string; revenue: number }[];
  salesTeam: { name: string; target: number; achieved: number; pct: number }[];
  crossSell: { rate: number };
  gaps: {
    decliningRenewals: string[];
    highCacSegments: string[];
    weakUpsell: string[];
  };
}

// ── 6. Referrals ─────────────────────────────────────────────────────────────
export type ReferralSourceType =
  | 'facilities_manager'
  | 'watchman'
  | 'apartment_manager'
  | 'society_secretary'
  | 'other';

export interface MisReferrals {
  sources: {
    type: ReferralSourceType;
    name: string;
    phone: string;
    jobs_acquired: number;
    amcs_acquired: number;
    points_earned: number;
  }[];
  tierBreakdown: { tier1_3: number; tier4_6: number; tier7plus: number };
  totalReferrals: number;
  conversionPct: number;
  incentivesDisbursed: number;
  roiUplift: number;
  topSources: { name: string; phone: string; score: number }[];
  gaps: {
    inactiveSocieties: string[];
    unengagedManagers: string[];
  };
}

// ── Shared filter type ───────────────────────────────────────────────────────
export interface MisDateRange {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}
