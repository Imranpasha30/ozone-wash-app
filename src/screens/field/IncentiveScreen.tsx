/**
 * IncentiveScreen — field-team incentive ledger.
 *
 * Layout:
 *   • Tier badge + headline current-month earnings
 *   • Donut: breakdown by reason (base / addon / rating / referral / target / streak)
 *   • Tier KPIs (jobs done 30d, on-time%, rating, addon%)
 *   • "Next tier in" progress bar (₹X to next tier)
 *   • Streak indicator (if streak_months >= 1)
 *   • Recent ledger (last 30 lines) with reason chip + amount + status
 *   • Payout schedule footer
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
} from '../../components/Icons';

type Tier = 'platinum' | 'gold' | 'silver' | 'bronze';

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

const fmtDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const tierColor = (t: Tier, C: any) =>
  t === 'platinum' ? C.platinum : t === 'gold' ? C.gold : t === 'silver' ? C.silver : C.bronze;

const tierIcon = (t: Tier, color: string) => {
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

const IncentiveScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
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

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const tier: Tier = (data?.tier as Tier) || 'bronze';
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

  // Next tier ladder — show ₹X to silver/gold/platinum from current 30-day turnover
  const nextTier = useMemo(() => {
    const turnover = Number(stats?.total_turnover_30d_paise || 0);
    // Mirror backend defaults: silver 15k, gold 30k, platinum 50k (in ₹)
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
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={C.primary} />
          ) : undefined
        }
      >
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
              <Trophy size={22} color={C.gold} weight="fill" />
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
          onPress={() => fetchData(true)}
          style={[styles.refreshBtn, { borderColor: C.border }]}
        >
          <Text style={{ color: C.primary, fontWeight: '600', fontSize: 13 }}>Refresh</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { alignItems: 'center', justifyContent: 'center' },
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
