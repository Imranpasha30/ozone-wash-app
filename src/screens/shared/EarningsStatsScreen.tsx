/**
 * EarningsStatsScreen — detailed incentive dashboard.
 *
 * Two modes (decided by the route's `agentId` param):
 *   - SELF mode  → field-team agent viewing their own earnings (GET /me/stats)
 *   - ADMIN mode → admin drilling into any agent     (GET /agent/:id/stats)
 *
 * Sections:
 *   1. Profile + current team chip (with role + share %)
 *   2. Lifetime totals: total earned, paid, pending, jobs counted
 *   3. This-month vs last-month comparison
 *   4. Monthly trend — last 12 months
 *   5. Breakdown by reason (base / addons / rating)
 *   6. Breakdown by team (current + historical teams that contributed)
 *   7. Recent transactions — last 30 ledger lines with full context
 */
import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../utils/responsive';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { incentiveAPI } from '../../services/api';
import ScreenHeader from '../../components/ScreenHeader';
import WebContainer from '../../components/WebContainer';
import {
  CurrencyInr, TrendUp, CheckCircle, Hourglass, Crown, Users,
  Wrench, Sparkle, Star,
} from '../../components/Icons';

const rupees = (paise: number) => '₹' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const REASON_META: Record<string, { label: string; icon: any; color: string }> = {
  base_completion: { label: 'Base completion', icon: Wrench,   color: '#3B82F6' },
  addon_upsell:    { label: 'Add-on upsell',   icon: Sparkle,  color: '#F59E0B' },
  rating_bonus:    { label: 'Rating bonus',    icon: Star,     color: '#16A34A' },
  monthly_target:  { label: 'Monthly target',  icon: TrendUp,  color: '#7C3AED' },
  streak_bonus:    { label: 'Streak bonus',    icon: TrendUp,  color: '#EC4899' },
  referral_bonus:  { label: 'Referral bonus',  icon: Users,    color: '#0EA5E9' },
};

const EarningsStatsScreen: React.FC = () => {
  const C = useTheme();
  const route = useRoute<any>();
  const agentId: string | undefined = route.params?.agentId;
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();
  const { isLarge } = useResponsive();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = agentId
          ? await incentiveAPI.getAgentDetailedStats(agentId) as any
          : await incentiveAPI.getMyDetailedStats() as any;
        setData(res.data || null);
      } catch (_) {}
      finally { setLoading(false); }
    })();
  }, [agentId]);

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenHeader
          title="Earnings"
          subtitle="Detailed stats"
          fallbackRoute={agentId ? 'AdminTeams' : 'Incentives'}
        />
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      </View>
    );
  }

  if (!data?.profile) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Earnings" fallbackRoute="AdminDashboard" />
        <View style={styles.center}><Text style={{ color: C.muted }}>No data.</Text></View>
      </View>
    );
  }

  const { profile, lifetime, monthly, by_reason, by_team, transactions, current_team } = data;

  // Compare this-month vs last-month using the monthly series.
  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthKey = lastMonthDate.toISOString().slice(0, 7);
  const thisMonth = monthly.find((m: any) => m.month === thisMonthKey)?.total || 0;
  const lastMonth = monthly.find((m: any) => m.month === lastMonthKey)?.total || 0;
  const delta = thisMonth - lastMonth;
  const deltaPct = lastMonth > 0 ? Math.round((delta / lastMonth) * 100) : null;

  // Compute the max value for the monthly trend so we can normalize bar heights.
  const maxMonthly = Math.max(1, ...monthly.map((m: any) => Number(m.total) || 0));

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={profile.name || 'Field agent'}
        subtitle={`${profile.phone || ''}${profile.current_tier ? ' · ' + profile.current_tier.toUpperCase() + ' tier' : ''}`}
        fallbackRoute={agentId ? 'AdminTeams' : 'Incentives'}
      />
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 40 }}>
        <WebContainer>

        {/* Current team chip */}
        {current_team ? (
          <View style={styles.teamChip}>
            <View style={[styles.teamIcon, current_team.role === 'leader' ? styles.teamIconLeader : null]}>
              {current_team.role === 'leader'
                ? <Crown size={16} weight="fill" color="#fff" />
                : <Users size={16} weight="fill" color="#fff" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.teamLabel}>CURRENT TEAM</Text>
              <Text style={styles.teamName}>
                {current_team.name} · {current_team.role === 'leader' ? 'Leader' : 'Member'}
              </Text>
              <Text style={styles.teamMeta}>
                Share weight {current_team.share_pct} pts · Led by {current_team.leader_name}
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.teamChip, { backgroundColor: C.surfaceElevated }]}>
            <View style={[styles.teamIcon, { backgroundColor: C.muted }]}>
              <Users size={16} weight="fill" color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.teamLabel}>NO TEAM</Text>
              <Text style={styles.teamMeta}>
                Earning solo. Admin can group you into a team to share incentives.
              </Text>
            </View>
          </View>
        )}

        {/* Lifetime totals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lifetime earnings</Text>
          <View style={[styles.grid, isLarge && { flexDirection: 'row', flexWrap: 'wrap' }]}>
            <Stat C={C} styles={styles} label="Total earned"   value={rupees(Number(lifetime.total))}    color={C.primary} icon={<CurrencyInr size={20} weight="bold" color={C.primary} />} />
            <Stat C={C} styles={styles} label="Paid out"       value={rupees(Number(lifetime.paid))}     color="#16A34A"   icon={<CheckCircle  size={20} weight="bold" color="#16A34A" />} />
            <Stat C={C} styles={styles} label="Pending"        value={rupees(Number(lifetime.pending))}  color="#D97706"   icon={<Hourglass    size={20} weight="bold" color="#D97706" />} />
            <Stat C={C} styles={styles} label="Jobs counted"   value={String(lifetime.jobs_count)}        color="#7C3AED"   icon={<Wrench       size={20} weight="bold" color="#7C3AED" />} />
          </View>
        </View>

        {/* This month vs last */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This month vs last</Text>
          <View style={styles.compareRow}>
            <View style={styles.compareCol}>
              <Text style={styles.compareLabel}>THIS MONTH</Text>
              <Text style={styles.compareValue}>{rupees(Number(thisMonth))}</Text>
            </View>
            <View style={[styles.compareCol, { alignItems: 'center' }]}>
              {deltaPct == null ? (
                <Text style={styles.compareDelta}>—</Text>
              ) : (
                <Text style={[styles.compareDelta, { color: delta >= 0 ? '#16A34A' : C.danger }]}>
                  {delta >= 0 ? '▲' : '▼'} {Math.abs(deltaPct)}%
                </Text>
              )}
              <Text style={styles.compareLabel}>vs LAST</Text>
            </View>
            <View style={[styles.compareCol, { alignItems: 'flex-end' }]}>
              <Text style={styles.compareLabel}>LAST MONTH</Text>
              <Text style={[styles.compareValue, { color: C.muted }]}>{rupees(Number(lastMonth))}</Text>
            </View>
          </View>
        </View>

        {/* Monthly trend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly trend</Text>
          {monthly.length === 0 ? (
            <Text style={styles.empty}>No earnings recorded yet.</Text>
          ) : (
            <View style={styles.chartCard}>
              <View style={styles.bars}>
                {monthly.map((m: any) => {
                  const h = Math.max(4, Math.round((Number(m.total) / maxMonthly) * 100));
                  const isCurrent = m.month === thisMonthKey;
                  return (
                    <View key={m.month} style={styles.barCol}>
                      <View style={[styles.bar, { height: h, backgroundColor: isCurrent ? C.primary : C.primary + '55' }]} />
                      <Text style={styles.barLabel}>{m.month.slice(5)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Breakdown by reason */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By incentive type</Text>
          {by_reason.length === 0 ? (
            <Text style={styles.empty}>No accruals yet.</Text>
          ) : by_reason.map((r: any) => {
            const meta = REASON_META[r.reason] || { label: r.reason, icon: CurrencyInr, color: C.primary };
            const Icon = meta.icon;
            const pct = lifetime.total > 0 ? Math.round((Number(r.total) / Number(lifetime.total)) * 100) : 0;
            return (
              <View key={r.reason} style={styles.reasonRow}>
                <View style={[styles.reasonIcon, { backgroundColor: meta.color + '22' }]}>
                  <Icon size={16} weight="fill" color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.reasonHead}>
                    <Text style={styles.reasonLabel}>{meta.label}</Text>
                    <Text style={styles.reasonValue}>{rupees(Number(r.total))}</Text>
                  </View>
                  <View style={styles.reasonBarTrack}>
                    <View style={[styles.reasonBarFill, { width: `${pct}%`, backgroundColor: meta.color }]} />
                  </View>
                  <Text style={styles.reasonMeta}>{r.lines} line{r.lines !== 1 ? 's' : ''} · {pct}% of total</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Breakdown by team */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By team</Text>
          {by_team.length === 0 ? (
            <Text style={styles.empty}>No team-attributed earnings yet.</Text>
          ) : by_team.map((t: any, idx: number) => (
            <View key={(t.team_id || 'solo-' + idx)} style={styles.teamRow}>
              <View style={[styles.teamRowIcon, !t.team_id && { backgroundColor: C.muted + '22' }]}>
                {t.team_id
                  ? <Users size={16} weight="fill" color={C.primary} />
                  : <Wrench size={16} weight="fill" color={C.muted} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.teamRowLabel}>{t.team_name || 'Solo / pre-team'}</Text>
                <Text style={styles.teamRowMeta}>{t.lines} accruals · {t.jobs} job{t.jobs !== 1 ? 's' : ''}</Text>
              </View>
              <Text style={styles.teamRowValue}>{rupees(Number(t.total))}</Text>
            </View>
          ))}
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent transactions</Text>
          <Text style={styles.helper}>Last 30 ledger entries.</Text>
          <View style={{ marginTop: 8 }}>
            {transactions.length === 0 ? (
              <Text style={styles.empty}>No transactions yet.</Text>
            ) : transactions.map((tx: any) => {
              const meta = REASON_META[tx.reason] || { label: tx.reason, icon: CurrencyInr, color: C.primary };
              const Icon = meta.icon;
              return (
                <View key={tx.id} style={styles.txRow}>
                  <View style={[styles.txIcon, { backgroundColor: meta.color + '18' }]}>
                    <Icon size={14} weight="fill" color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.txTopRow}>
                      <Text style={styles.txLabel}>{meta.label}</Text>
                      <Text style={[styles.txAmount, tx.status === 'paid' && { color: '#16A34A' }]}>
                        {rupees(Number(tx.amount_paise))}
                      </Text>
                    </View>
                    <Text style={styles.txMeta} numberOfLines={1}>
                      {[
                        tx.team_name && `Team ${tx.team_name}`,
                        tx.customer_label && `for ${tx.customer_label}`,
                        tx.tier && tx.tier.toUpperCase(),
                        tx.status === 'paid' ? 'PAID' : 'PENDING',
                      ].filter(Boolean).join(' · ')}
                    </Text>
                    <Text style={styles.txDate}>
                      {new Date(tx.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        </WebContainer>
      </ScrollView>
    </View>
  );
};

const Stat = ({ C, styles, label, value, color, icon }: any) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>{icon}</View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  teamChip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.primaryBg, borderRadius: 14,
    padding: 14, marginHorizontal: 16, marginTop: 12,
    borderWidth: 1, borderColor: C.primary + '33',
  },
  teamIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
  },
  teamIconLeader: { backgroundColor: '#F59E0B' },
  teamLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: C.muted, marginBottom: 2 },
  teamName: { fontSize: 14, fontWeight: '700', color: C.foreground },
  teamMeta: { fontSize: 11, color: C.muted, marginTop: 2 },

  section: { paddingHorizontal: 16, marginTop: 18 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.foreground, marginBottom: 10 },
  helper: { fontSize: 11, color: C.muted, fontStyle: 'italic' },
  empty: { fontSize: 12, color: C.muted, fontStyle: 'italic', paddingVertical: 12 },

  grid: { gap: 10 },
  statCard: {
    backgroundColor: C.surface, borderRadius: 14,
    padding: 14, gap: 6,
    borderWidth: 1, borderColor: C.border,
    flexGrow: 1, minWidth: 140,
  },
  statIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800', color: C.foreground },
  statLabel: { fontSize: 11, color: C.muted, fontWeight: '600' },

  compareRow: {
    flexDirection: 'row', backgroundColor: C.surface, borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: C.border,
    alignItems: 'center',
  },
  compareCol: { flex: 1 },
  compareLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: C.muted, marginBottom: 6 },
  compareValue: { fontSize: 22, fontWeight: '800', color: C.foreground },
  compareDelta: { fontSize: 18, fontWeight: '700', marginBottom: 2 },

  chartCard: {
    backgroundColor: C.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  bars: {
    flexDirection: 'row', alignItems: 'flex-end',
    gap: 6, height: 120, paddingBottom: 4,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  bar: { width: '100%', borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 9, color: C.muted, fontWeight: '600' },

  reasonRow: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'flex-start' },
  reasonIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  reasonHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reasonLabel: { fontSize: 13, fontWeight: '600', color: C.foreground },
  reasonValue: { fontSize: 13, fontWeight: '700', color: C.foreground },
  reasonBarTrack: { height: 6, backgroundColor: C.surfaceElevated, borderRadius: 3, overflow: 'hidden' },
  reasonBarFill: { height: 6, borderRadius: 3 },
  reasonMeta: { fontSize: 10, color: C.muted, marginTop: 4 },

  teamRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface, borderRadius: 12,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: C.border,
  },
  teamRowIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: C.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  teamRowLabel: { fontSize: 13, fontWeight: '600', color: C.foreground },
  teamRowMeta: { fontSize: 11, color: C.muted, marginTop: 2 },
  teamRowValue: { fontSize: 14, fontWeight: '800', color: C.foreground },

  txRow: {
    flexDirection: 'row', gap: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  txIcon: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  txTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  txLabel: { fontSize: 13, fontWeight: '700', color: C.foreground },
  txAmount: { fontSize: 13, fontWeight: '700', color: C.foreground },
  txMeta: { fontSize: 11, color: C.muted, marginTop: 2 },
  txDate: { fontSize: 10, color: C.muted, marginTop: 2, fontStyle: 'italic' },
});

export default EarningsStatsScreen;
