/**
 * IncentiveScreen — field-team incentive dashboard.
 *
 * TOP SECTION (NEW — PDF-based credit engine):
 *   • Tier hero card (Platinum / Gold / Silver / Bronze / Unrated)
 *   • Progress to next tier (200 / 400 / 600 / 800 ladder)
 *   • 9-parameter credit breakdown with progress bars
 *   • Tier benefits card (cash bonus, leave days, recognition, training, career)
 *   • Refresh button
 *
 * BOTTOM SECTION (LEGACY — kept intact, per-job pay accrual ledger):
 *   • Tier badge + headline current-month earnings (paise)
 *   • Donut: breakdown by reason
 *   • Tier KPIs (jobs done 30d, on-time%, rating, addon%)
 *   • "Next tier in" progress bar
 *   • Streak indicator
 *   • Recent ledger
 *   • Payout schedule footer
 *
 * The credit engine and the paise ledger are SEPARATE concepts —
 * credits drive monthly tier benefits; the ledger is per-job pay.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, RefreshControl, Platform, StatusBar,
  StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { useTheme } from '../../hooks/useTheme';
import { incentiveAPI } from '../../services/api';
import {
  MisHeader, Card, SectionTitle,
} from '../../components/charts/MisScaffold';
import KpiTile from '../../components/charts/KpiTile';
import Donut from '../../components/charts/Donut';
import {
  Crown, Medal, Trophy, Star, CurrencyInr, Lightning, TrendUp, Wallet,
  Sparkle, Leaf, Confetti, ArrowsClockwise, Diamond,
} from '../../components/Icons';

type LegacyTier = 'platinum' | 'gold' | 'silver' | 'bronze';
type CreditTier = 'platinum' | 'gold' | 'silver' | 'bronze' | 'unrated';

const REASON_LABEL: Record<string, string> = {
  base_completion: 'Base',
  addon_upsell:    'Add-ons',
  rating_bonus:    'Rating',
  referral_bonus:  'Referral',
  monthly_target:  'Target',
  streak_bonus:    'Streak',
  high_ecoscore:   'EcoScore',
};

const fmtRupees = (paise: number) =>
  '₹' + Math.round((paise || 0) / 100).toLocaleString('en-IN');

const fmtRupeesFull = (paise: number) =>
  '₹' + Math.round((paise || 0) / 100).toLocaleString('en-IN');

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const tierColor = (t: LegacyTier, C: any) =>
  t === 'platinum' ? C.platinum : t === 'gold' ? C.gold : t === 'silver' ? C.silver : C.bronze;

const tierIcon = (t: LegacyTier, color: string) => {
  if (t === 'platinum') return <Crown size={28} color={color} weight="fill" />;
  if (t === 'gold')     return <Trophy size={28} color={color} weight="fill" />;
  if (t === 'silver')   return <Medal size={28} color={color} weight="fill" />;
  return <Star size={28} color={color} weight="fill" />;
};

const REASON_COLORS = (C: any): Record<string, string> => ({
  base_completion: C.primary,
  addon_upsell:    C.warning,
  rating_bonus:    C.gold,
  referral_bonus:  C.info,
  monthly_target:  C.success,
  streak_bonus:    C.secondary,
  high_ecoscore:   C.success,
});

// ── Credit-engine constants (PDF) ───────────────────────────────────────
// Fixed colours per spec. We use these directly (rather than theme tokens)
// so the tier hero looks the same across light/dark & premium themes.
const CREDIT_TIER_COLORS: Record<CreditTier, string> = {
  platinum: '#0EA5E9',
  gold:     '#F59E0B',
  silver:   '#94A3B8',
  bronze:   '#A16207',
  unrated:  '#94A3B8',
};

const CREDIT_TIER_LABEL: Record<CreditTier, string> = {
  platinum: 'Platinum Agent',
  gold:     'Gold Agent',
  silver:   'Silver Agent',
  bronze:   'Bronze Agent',
  unrated:  'Unrated',
};

const creditTierIcon = (t: CreditTier, color: string) => {
  if (t === 'platinum') return <Diamond size={32} color={color} weight="fill" />;
  if (t === 'gold')     return <Crown size={32} color={color} weight="fill" />;
  if (t === 'silver')   return <Trophy size={32} color={color} weight="fill" />;
  if (t === 'bronze')   return <Medal size={32} color={color} weight="fill" />;
  return <Star size={32} color={color} weight="fill" />;
};

// PDF parameter ordering (9 rows)
type CreditParamKey =
  | 'turnover' | 'avg_time' | 'tat' | 'transactions'
  | 'checklist' | 'ecoscore' | 'feedback' | 'addon' | 'escalation';

interface CreditParam {
  key: CreditParamKey;
  label: string;
  weight: number;     // PDF default weight, used as max-credits hint when no rule loaded
  max: number;        // weight × 1000
  group: 'output' | 'speed' | 'quality' | 'experience' | 'risk';
}

const CREDIT_PARAMS: CreditParam[] = [
  { key: 'turnover',     label: 'Turnover (net of GST)', weight: 0.25, max: 250, group: 'output' },
  { key: 'avg_time',     label: 'Avg Time Taken',        weight: 0.10, max: 100, group: 'speed' },
  { key: 'tat',          label: 'TAT Compliance',        weight: 0.15, max: 150, group: 'speed' },
  { key: 'transactions', label: 'Transactions',          weight: 0.10, max: 100, group: 'output' },
  { key: 'checklist',    label: '8-Step Checklist',      weight: 0.10, max: 100, group: 'quality' },
  { key: 'ecoscore',     label: 'EcoScore Data Upload',  weight: 0.15, max: 150, group: 'quality' },
  { key: 'feedback',     label: 'Customer Feedback',     weight: 0.10, max: 100, group: 'experience' },
  { key: 'addon',        label: 'Add-on Conversion',     weight: 0.05, max:  50, group: 'experience' },
  { key: 'escalation',   label: 'Zero Escalation',       weight: 0.05, max:  50, group: 'risk' },
];

const GROUP_LABEL: Record<CreditParam['group'], string> = {
  output:     'Output',
  speed:      'Speed & Reliability',
  quality:    'Quality & Compliance',
  experience: 'Customer Experience',
  risk:       'Risk',
};

const TIER_THRESHOLDS_DEFAULT = { platinum: 800, gold: 600, silver: 400, bronze: 200 };

const tierFromCredits = (credits: number, t = TIER_THRESHOLDS_DEFAULT): CreditTier => {
  if (credits >= t.platinum) return 'platinum';
  if (credits >= t.gold)     return 'gold';
  if (credits >= t.silver)   return 'silver';
  if (credits >= t.bronze)   return 'bronze';
  return 'unrated';
};

const formatRawFootnote = (key: CreditParamKey, raw: any): string => {
  if (!raw) return '';
  switch (key) {
    case 'turnover':     return `${fmtRupeesFull(Number(raw.turnover_paise || 0))} net this month`;
    case 'avg_time': {
      const m = Number(raw.avg_minutes || 0);
      return m > 0 ? `${Math.round(m)} min avg vs 60 benchmark` : 'No completed jobs yet';
    }
    case 'tat':          return `${Math.round(Number(raw.tat_pct || 0))}% on-time`;
    case 'transactions': return `${raw.jobs_30d || 0} jobs`;
    case 'checklist':    return `${(Number(raw.checklist_avg_pct || 0) / 100 * 9).toFixed(1)}/9 phases avg`;
    case 'ecoscore':     return `EcoScore avg ${Number(raw.ecoscore_avg || 0).toFixed(0)}`;
    case 'feedback':     return `${Number(raw.rating_avg || 0).toFixed(1)} stars avg`;
    case 'addon':        return `${Math.round(Number(raw.addon_pct || 0))}% jobs with addon`;
    case 'escalation':   return `${raw.escalation_count || 0} complaints`;
    default:             return '';
  }
};

interface TierBenefitDef {
  cashBonus: string;
  leaveDays: string;
  recognition: string;
  training?: string;
  career?: string;
}

const tierBenefits = (t: CreditTier): TierBenefitDef => {
  switch (t) {
    case 'platinum':
      return {
        cashBonus:   '15% on turnover',
        leaveDays:   '2 extra leave days this month',
        recognition: 'Star Performer badge',
        training:    'Skill-up training perks',
        career:      'Eligible for promotion / lead role',
      };
    case 'gold':
      return {
        cashBonus:   '10% on turnover',
        leaveDays:   '1 extra leave day this month',
        recognition: 'Recognition badge',
      };
    case 'silver':
      return {
        cashBonus:   '5% on turnover',
        leaveDays:   '—',
        recognition: 'Performance certificate',
      };
    case 'bronze':
      return {
        cashBonus:   '—',
        leaveDays:   '—',
        recognition: 'Performance certificate',
      };
    default:
      return {
        cashBonus:   '—',
        leaveDays:   '—',
        recognition: '—',
      };
  }
};

const IncentiveScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();

  // Legacy ledger state
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Credit-engine state
  const [credits, setCredits] = useState<any>(null);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [creditsError, setCreditsError] = useState<string | null>(null);

  const fetchLedger = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = (await incentiveAPI.getMyLedger()) as any;
      setData(res?.data || res);
    } catch (e: any) {
      setError(e?.message || 'Failed to load incentives');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchCredits = useCallback(async () => {
    setCreditsLoading(true);
    setCreditsError(null);
    try {
      const res = (await incentiveAPI.getMyCredits()) as any;
      setCredits(res?.data || res);
    } catch (e: any) {
      setCreditsError(e?.message || 'Failed to load credit summary');
    } finally {
      setCreditsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchLedger(true), fetchCredits()]);
  }, [fetchLedger, fetchCredits]);

  useFocusEffect(useCallback(() => {
    fetchLedger();
    fetchCredits();
  }, [fetchLedger, fetchCredits]));

  // ── Legacy ledger view-model ────────────────────────────────────────
  const tier: LegacyTier = (data?.tier as LegacyTier) || 'bronze';
  const tierC = tierColor(tier, C);
  const breakdown: { reason: string; count: number; total_paise: number }[] = data?.current_month_breakdown || [];
  const totalPaise: number = data?.current_month_total_paise || 0;
  const stats = data?.stats || {};
  const streakMonths: number = data?.streak_months || 0;
  const lines: any[] = data?.last_30_lines || [];

  const slices = useMemo(() => {
    const colors = REASON_COLORS(C);
    return breakdown
      .filter(b => b.total_paise > 0)
      .map(b => ({
        label: REASON_LABEL[b.reason] || b.reason,
        value: b.total_paise,
        color: colors[b.reason] || C.muted,
      }));
  }, [breakdown, C]);

  const nextTier = useMemo(() => {
    const turnover = Number(stats?.total_turnover_30d_paise || 0);
    const SILVER   = 1500000;
    const GOLD     = 3000000;
    const PLATINUM = 5000000;
    if (turnover < SILVER)   return { name: 'Silver',   need: SILVER   - turnover, color: C.silver };
    if (turnover < GOLD)     return { name: 'Gold',     need: GOLD     - turnover, color: C.gold };
    if (turnover < PLATINUM) return { name: 'Platinum', need: PLATINUM - turnover, color: C.platinum };
    return null;
  }, [stats, C]);

  const tierProgress = useMemo(() => {
    const turnover = Number(stats?.total_turnover_30d_paise || 0);
    const SILVER = 1500000, GOLD = 3000000, PLATINUM = 5000000;
    let lo = 0, hi = SILVER;
    if (turnover >= PLATINUM) return 1;
    if (turnover >= GOLD)     { lo = GOLD;     hi = PLATINUM; }
    else if (turnover >= SILVER) { lo = SILVER; hi = GOLD; }
    const frac = (turnover - lo) / Math.max(1, (hi - lo));
    return Math.max(0, Math.min(1, frac));
  }, [stats]);

  // ── Credit-engine view-model ────────────────────────────────────────
  const creditsTotal: number = Math.round(Number(credits?.credits_total || 0));
  const creditTier: CreditTier = (credits?.tier as CreditTier) || tierFromCredits(creditsTotal);
  const creditTierC = CREDIT_TIER_COLORS[creditTier];
  const tierThresholds = credits?.tier_thresholds || TIER_THRESHOLDS_DEFAULT;
  const creditBreakdown: Record<string, number> = credits?.breakdown || {};
  const rawStats = credits?.raw || {};
  const benefits = tierBenefits(creditTier);

  // Next-tier ladder for credits
  const creditNext = useMemo(() => {
    const t = tierThresholds;
    if (creditsTotal < t.bronze)   return { name: 'Bronze',   threshold: t.bronze   };
    if (creditsTotal < t.silver)   return { name: 'Silver',   threshold: t.silver   };
    if (creditsTotal < t.gold)     return { name: 'Gold',     threshold: t.gold     };
    if (creditsTotal < t.platinum) return { name: 'Platinum', threshold: t.platinum };
    return null;
  }, [creditsTotal, tierThresholds]);

  const creditBarPct = useMemo(() => {
    // 0 → 1000 bar (max possible credits is 1000)
    return Math.max(0, Math.min(1, creditsTotal / 1000));
  }, [creditsTotal]);

  // Group params for visual grouping
  const groupedParams = useMemo(() => {
    const out: Record<string, CreditParam[]> = {};
    CREDIT_PARAMS.forEach(p => {
      if (!out[p.group]) out[p.group] = [];
      out[p.group].push(p);
    });
    return out;
  }, []);

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <MisHeader
        title="My Incentives"
        subtitle={`Current month earnings · ${data?.current_month || ''}`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          Platform.OS !== 'web' ? (
            <RefreshControl refreshing={refreshing} onRefresh={refreshAll} tintColor={C.primary} />
          ) : undefined
        }
      >
        {/* ═══════════════════════════════════════════════════════════════
            NEW: Credit-based dashboard (PDF tier system)
            ═══════════════════════════════════════════════════════════════ */}

        {creditsError ? (
          <Card style={{ marginBottom: 12 }}>
            <Text style={{ color: C.danger, fontSize: 13 }}>{creditsError}</Text>
          </Card>
        ) : null}

        {/* a) Tier Hero Card */}
        <Card style={[styles.heroCard, { borderColor: creditTierC + '55' }]}>
          <View style={styles.heroTopRow}>
            <View style={[styles.heroBadge, { backgroundColor: creditTierC + '22', borderColor: creditTierC }]}>
              {creditTierIcon(creditTier, creditTierC)}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTier, { color: creditTierC }]} numberOfLines={1}>
                {CREDIT_TIER_LABEL[creditTier]}
              </Text>
              <Text style={styles.heroCredits}>
                {creditsLoading ? '—' : `${creditsTotal} credits`}
              </Text>
              <Text style={styles.heroSubtitle}>earned this month</Text>
            </View>
          </View>
          <View style={[styles.heroDivider, { backgroundColor: creditTierC + '30' }]} />
          <Text style={styles.heroBenefitLine}>
            {creditTier === 'platinum' && '15% cash bonus on turnover · 2 leave days · Star Performer badge'}
            {creditTier === 'gold'     && '10% cash bonus on turnover · 1 leave day · Recognition badge'}
            {creditTier === 'silver'   && '5% cash bonus on turnover · Performance certificate'}
            {creditTier === 'bronze'   && 'Performance certificate'}
            {creditTier === 'unrated'  && 'Earn 200+ credits this month to unlock Bronze tier benefits'}
          </Text>
        </Card>

        {/* b) Progress to next tier */}
        <Card style={{ marginTop: 12 }}>
          <SectionTitle title="Progress to next tier" />
          <View style={styles.creditTrack}>
            <View
              style={[
                styles.creditFill,
                { width: `${Math.round(creditBarPct * 100)}%`, backgroundColor: creditTierC },
              ]}
            />
            {/* Tick marks at 200/400/600/800 (out of 1000) */}
            {[tierThresholds.bronze, tierThresholds.silver, tierThresholds.gold, tierThresholds.platinum].map((t, i) => (
              <View
                key={i}
                style={[
                  styles.creditTick,
                  { left: `${(t / 1000) * 100}%`, backgroundColor: C.foreground + '60' },
                ]}
              />
            ))}
          </View>
          <View style={styles.creditTickLabels}>
            <Text style={styles.creditTickLabel}>{tierThresholds.bronze}</Text>
            <Text style={styles.creditTickLabel}>{tierThresholds.silver}</Text>
            <Text style={styles.creditTickLabel}>{tierThresholds.gold}</Text>
            <Text style={styles.creditTickLabel}>{tierThresholds.platinum}</Text>
          </View>
          <Text style={styles.progressCaption}>
            {creditNext
              ? `${Math.max(0, creditNext.threshold - creditsTotal)} credits to ${creditNext.name}`
              : 'Platinum tier achieved'}
          </Text>
        </Card>

        {/* c) 9-parameter credit breakdown, grouped */}
        <Card style={{ marginTop: 12 }}>
          <SectionTitle title="Credit breakdown · 9 parameters" />
          {(['output','speed','quality','experience','risk'] as const).map(group => (
            <View key={group} style={styles.creditGroup}>
              <Text style={styles.creditGroupLabel}>{GROUP_LABEL[group]}</Text>
              {(groupedParams[group] || []).map(p => {
                const earned = Math.round(Number(creditBreakdown[p.key] || 0));
                const max = p.max;
                const pct = Math.max(0, Math.min(1, earned / Math.max(1, max)));
                const footnote = formatRawFootnote(p.key, rawStats);
                return (
                  <View key={p.key} style={styles.paramRow}>
                    <View style={styles.paramHeader}>
                      <Text style={styles.paramLabel} numberOfLines={1}>{p.label}</Text>
                      <Text style={styles.paramCredits}>
                        <Text style={[styles.paramCreditsEarned, { color: creditTierC }]}>{earned}</Text>
                        <Text style={styles.paramCreditsMax}> / {max}</Text>
                      </Text>
                    </View>
                    <View style={styles.paramTrack}>
                      <View
                        style={[
                          styles.paramFill,
                          { width: `${Math.round(pct * 100)}%`, backgroundColor: creditTierC },
                        ]}
                      />
                    </View>
                    {footnote ? (
                      <Text style={styles.paramFootnote}>{footnote}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}
        </Card>

        {/* d) Tier Benefits Card */}
        <Card style={{ marginTop: 12 }}>
          <SectionTitle title="Your tier benefits" />
          <View style={styles.benefitRow}>
            <CurrencyInr size={18} color={C.success} weight="fill" />
            <View style={{ flex: 1 }}>
              <Text style={styles.benefitLabel}>Cash bonus</Text>
              <Text style={styles.benefitValue}>{benefits.cashBonus}</Text>
            </View>
          </View>
          <View style={styles.benefitRow}>
            <Leaf size={18} color={C.success} weight="fill" />
            <View style={{ flex: 1 }}>
              <Text style={styles.benefitLabel}>Leave days</Text>
              <Text style={styles.benefitValue}>{benefits.leaveDays}</Text>
            </View>
          </View>
          <View style={styles.benefitRow}>
            <Trophy size={18} color={C.gold} weight="fill" />
            <View style={{ flex: 1 }}>
              <Text style={styles.benefitLabel}>Recognition</Text>
              <Text style={styles.benefitValue}>{benefits.recognition}</Text>
            </View>
          </View>
          {benefits.training ? (
            <View style={styles.benefitRow}>
              <Sparkle size={18} color={creditTierC} weight="fill" />
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitLabel}>Training perks</Text>
                <Text style={styles.benefitValue}>{benefits.training}</Text>
              </View>
            </View>
          ) : null}
          {benefits.career ? (
            <View style={styles.benefitRow}>
              <TrendUp size={18} color={creditTierC} weight="fill" />
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitLabel}>Career</Text>
                <Text style={styles.benefitValue}>{benefits.career}</Text>
              </View>
            </View>
          ) : null}
        </Card>

        {/* Refresh button for credits */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={refreshAll}
          disabled={creditsLoading || refreshing}
          style={[styles.creditRefreshBtn, { borderColor: creditTierC, backgroundColor: creditTierC + '12' }]}
        >
          <ArrowsClockwise size={16} color={creditTierC} weight="bold" />
          <Text style={{ color: creditTierC, fontWeight: '700', fontSize: 13, marginLeft: 8 }}>
            {creditsLoading ? 'Refreshing…' : 'Refresh credits'}
          </Text>
        </TouchableOpacity>

        {/* ═══════════════════════════════════════════════════════════════
            LEGACY: per-job pay accrual ledger (kept intact)
            ═══════════════════════════════════════════════════════════════ */}

        <View style={styles.legacyDivider} />
        <Text style={styles.legacyHeading}>Per-job pay (legacy ledger)</Text>
        <Text style={styles.legacySubheading}>
          The credit dashboard above tracks tier benefits. Below is your per-job pay accrual.
        </Text>

        {error ? (
          <Card style={{ marginBottom: 14 }}>
            <Text style={{ color: C.danger, fontSize: 13 }}>{error}</Text>
          </Card>
        ) : null}

        {/* Tier badge + headline */}
        <Card style={styles.headlineCard}>
          <View style={[styles.tierRing, { borderColor: tierC, backgroundColor: tierC + '15' }]}>
            {tierIcon(tier, tierC)}
          </View>
          <Text style={[styles.tierLabel, { color: tierC }]}>
            {tier.toUpperCase()}
          </Text>
          <Text style={styles.headlineAmount}>{fmtRupees(totalPaise)}</Text>
          <Text style={styles.headlineCaption}>
            earned this month · {breakdown.reduce((s, b) => s + (b.count || 0), 0)} entries
          </Text>
        </Card>

        {/* Breakdown donut */}
        {slices.length > 0 ? (
          <Card style={{ marginTop: 12 }}>
            <SectionTitle title="Where it came from" />
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Donut
                slices={slices}
                size={180}
                thickness={24}
                centerLabel="this month"
                centerValue={fmtRupees(totalPaise)}
              />
            </View>
            <View style={styles.legendWrap}>
              {slices.map((s, i) => (
                <View key={i} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: s.color }]} />
                  <Text style={styles.legendLabel}>{s.label}</Text>
                  <Text style={styles.legendValue}>{fmtRupees(s.value)}</Text>
                </View>
              ))}
            </View>
          </Card>
        ) : (
          <Card style={{ marginTop: 12 }}>
            <Text style={{ color: C.muted, fontSize: 13 }}>
              No incentives accrued yet this month. Complete jobs to start earning.
            </Text>
          </Card>
        )}

        {/* 30-day stats KPIs */}
        <View style={styles.kpiRow}>
          <KpiTile
            label="Jobs (30d)"
            value={stats.jobs_completed_30d || 0}
            color={C.primary}
            icon={<Lightning size={14} color={C.primary} weight="fill" />}
          />
          <KpiTile
            label="Avg rating"
            value={Number(stats.avg_rating_30d || 0).toFixed(2)}
            color={C.gold}
            icon={<Star size={14} color={C.gold} weight="fill" />}
          />
        </View>
        <View style={styles.kpiRow}>
          <KpiTile
            label="On-time %"
            value={Math.round(Number(stats.on_time_pct_30d || 0) * 100) + '%'}
            color={C.success}
            icon={<TrendUp size={14} color={C.success} weight="fill" />}
          />
          <KpiTile
            label="Add-on conv."
            value={Math.round(Number(stats.addon_conversion_30d || 0) * 100) + '%'}
            color={C.warning}
            icon={<CurrencyInr size={14} color={C.warning} weight="fill" />}
          />
        </View>

        {/* Next tier progress */}
        {nextTier ? (
          <Card style={{ marginTop: 12 }}>
            <SectionTitle title={`Next tier: ${nextTier.name}`} />
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(tierProgress * 100)}%`, backgroundColor: nextTier.color },
                ]}
              />
            </View>
            <Text style={styles.progressCaption}>
              {fmtRupees(nextTier.need)} more turnover (last 30d) to unlock {nextTier.name}.
            </Text>
          </Card>
        ) : (
          <Card style={{ marginTop: 12 }}>
            <SectionTitle title="Top tier reached" />
            <Text style={{ color: C.muted, fontSize: 13 }}>
              You're at Platinum. Maintain ₹50,000+ turnover (30d) to keep your 1.5x multiplier.
            </Text>
          </Card>
        )}

        {/* Streak */}
        {streakMonths >= 1 ? (
          <Card style={[styles.streakCard, { borderColor: C.gold + '55' }]}>
            <View style={styles.streakRow}>
              <Confetti size={22} color={C.gold} weight="fill" />
              <View style={{ flex: 1 }}>
                <Text style={styles.streakTitle}>{streakMonths}-month gold streak</Text>
                <Text style={styles.streakCaption}>
                  Keep it going — every 3 months at gold or better unlocks a ₹2,000 bonus.
                </Text>
              </View>
            </View>
          </Card>
        ) : null}

        {/* Recent ledger */}
        <Card style={{ marginTop: 12 }}>
          <SectionTitle title="Recent ledger" />
          {lines.length === 0 ? (
            <Text style={{ color: C.muted, fontSize: 13 }}>
              No entries yet. Your first completed job will show here.
            </Text>
          ) : (
            lines.map((l, idx) => {
              const colors = REASON_COLORS(C);
              const color = colors[l.reason] || C.muted;
              const labelText = REASON_LABEL[l.reason] || l.reason;
              return (
                <View key={l.id || idx} style={styles.ledgerRow}>
                  <View style={[styles.reasonChip, { backgroundColor: color + '18' }]}>
                    <Text style={[styles.reasonChipText, { color }]}>{labelText}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.ledgerCustomer} numberOfLines={1}>
                      {l.customer_name || (l.job_id ? 'Job ' + String(l.job_id).slice(0, 6).toUpperCase() : 'System')}
                    </Text>
                    <Text style={styles.ledgerDate}>
                      {fmtDate(l.created_at)} · {l.status}
                    </Text>
                  </View>
                  <Text style={[styles.ledgerAmount, { color: l.status === 'reversed' ? C.danger : C.foreground }]}>
                    {l.status === 'reversed' ? '-' : '+'}{fmtRupees(l.amount_paise)}
                  </Text>
                </View>
              );
            })
          )}
        </Card>

        {/* Payout footer */}
        <Card style={{ marginTop: 12 }}>
          <SectionTitle title="Payouts" />
          <View style={styles.payoutRow}>
            <Wallet size={18} color={C.muted} />
            <Text style={styles.payoutText}>
              {data?.last_paid_batch
                ? `Last paid: ${fmtDate(data.last_paid_batch.paid_at)} · ${fmtRupees(data.last_paid_batch.total_paise)}`
                : 'No payouts yet'}
            </Text>
          </View>
          <View style={styles.payoutRow}>
            <Lightning size={18} color={C.muted} />
            <Text style={styles.payoutText}>
              Next freeze: {fmtDate(data?.next_payout_eta)}
            </Text>
          </View>
        </Card>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => fetchLedger(true)}
          style={[styles.refreshBtn, { borderColor: C.border }]}
        >
          <Text style={{ color: C.primary, fontWeight: '600', fontSize: 13 }}>Refresh ledger</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { alignItems: 'center', justifyContent: 'center' },

  // ── Credit hero card ────────────────────────────────────────────────
  heroCard: { borderWidth: 1.5, padding: 18 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroBadge: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTier: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  heroCredits: { fontSize: 28, fontWeight: '800', color: C.foreground, marginTop: 2 },
  heroSubtitle: { fontSize: 12, color: C.muted, marginTop: 2 },
  heroDivider: { height: 1, marginTop: 14, marginBottom: 12 },
  heroBenefitLine: { fontSize: 12, color: C.foreground, lineHeight: 18 },

  // ── Credit progress bar ─────────────────────────────────────────────
  creditTrack: {
    height: 14, backgroundColor: C.surfaceHighlight,
    borderRadius: 7, overflow: 'hidden', marginTop: 8,
    position: 'relative',
  },
  creditFill: { height: '100%', borderRadius: 7 },
  creditTick: {
    position: 'absolute', top: 0, bottom: 0, width: 1.5,
  },
  creditTickLabels: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 4, paddingHorizontal: 0,
  },
  creditTickLabel: { fontSize: 10, color: C.muted, fontWeight: '600' },

  // ── 9-parameter rows ────────────────────────────────────────────────
  creditGroup: { marginTop: 12 },
  creditGroupLabel: {
    fontSize: 11, fontWeight: '700', color: C.muted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 6,
  },
  paramRow: {
    paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  paramHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  paramLabel: { flex: 1, fontSize: 13, color: C.foreground, fontWeight: '600' },
  paramCredits: { fontSize: 12 },
  paramCreditsEarned: { fontSize: 13, fontWeight: '800' },
  paramCreditsMax: { fontSize: 12, color: C.muted, fontWeight: '600' },
  paramTrack: {
    height: 6, backgroundColor: C.surfaceHighlight,
    borderRadius: 3, overflow: 'hidden',
  },
  paramFill: { height: '100%', borderRadius: 3 },
  paramFootnote: { fontSize: 11, color: C.muted, marginTop: 4 },

  // ── Tier benefits ───────────────────────────────────────────────────
  benefitRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingVertical: 8,
  },
  benefitLabel: { fontSize: 11, color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  benefitValue: { fontSize: 13, color: C.foreground, fontWeight: '600', marginTop: 2 },

  creditRefreshBtn: {
    marginTop: 14, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', paddingVertical: 12,
    borderWidth: 1.5, borderRadius: 12,
  },

  // ── Legacy section divider ─────────────────────────────────────────
  legacyDivider: {
    height: 1, backgroundColor: C.border,
    marginTop: 28, marginBottom: 16,
  },
  legacyHeading: {
    fontSize: 18, fontWeight: '700', color: C.foreground, marginBottom: 4,
  },
  legacySubheading: {
    fontSize: 12, color: C.muted, marginBottom: 12,
  },

  // ── Legacy ledger styles ────────────────────────────────────────────
  headlineCard: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  tierRing: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  tierLabel: {
    fontSize: 12, fontWeight: '700', letterSpacing: 1.4, marginBottom: 4,
  },
  headlineAmount: {
    fontSize: 36, fontWeight: '800', color: C.foreground, letterSpacing: -1,
  },
  headlineCaption: { fontSize: 12, color: C.muted, marginTop: 4 },
  legendWrap: { marginTop: 10, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, color: C.foreground, fontSize: 13 },
  legendValue: { color: C.foreground, fontSize: 13, fontWeight: '700' },
  kpiRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  progressTrack: {
    height: 10, backgroundColor: C.surfaceHighlight,
    borderRadius: 5, overflow: 'hidden', marginTop: 8,
  },
  progressFill: { height: '100%', borderRadius: 5 },
  progressCaption: { fontSize: 12, color: C.muted, marginTop: 8 },
  streakCard: { marginTop: 12, borderWidth: 1 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakTitle: { fontSize: 14, fontWeight: '700', color: C.foreground },
  streakCaption: { fontSize: 12, color: C.muted, marginTop: 2 },
  ledgerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  reasonChip: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, minWidth: 64, alignItems: 'center',
  },
  reasonChipText: { fontSize: 11, fontWeight: '700' },
  ledgerCustomer: { fontSize: 13, fontWeight: '600', color: C.foreground },
  ledgerDate: { fontSize: 11, color: C.muted, marginTop: 2 },
  ledgerAmount: { fontSize: 14, fontWeight: '700' },
  payoutRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  payoutText: { fontSize: 13, color: C.foreground },
  refreshBtn: {
    marginTop: 14, alignItems: 'center', paddingVertical: 12,
    borderWidth: 1, borderRadius: 12,
  },
});

export default IncentiveScreen;
