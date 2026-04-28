/**
 * EcoScoreDetailScreen — customer-facing EcoScore + EcoPoints Wallet dashboard.
 *
 * Sections (per "Ecoscore Dashboard - Revised & Updated" PDF, pages 3-6):
 *   a) Hero — circular EcoScore ring with badge tier + rationale
 *   b) Progress tracker — distance to next tier with a thin horizontal bar
 *   c) Streak indicator — flame pill when on a gold-or-better streak
 *   d) EcoPoints Wallet card — eco_points balance + lifetime earned/redeemed
 *   e) Redeem catalog — grouped by category with eligibility-aware buttons
 *   f) Wallet history — last 10 transactions
 *   g) Improvement tips — rule-based suggestions from the latest components
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, RefreshControl, Platform, StatusBar,
  TouchableOpacity, ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { ecoScoreAPI, rewardsAPI } from '../../services/api';
import EcoScoreRing from '../../components/eco/EcoScoreRing';
import RewardCard, { RewardForCard } from '../../components/eco/RewardCard';
import {
  ArrowLeft, Trophy, Star, Crown, Medal, ShieldCheck,
  LightbulbFilament, ArrowRight, Wallet,
  CheckCircle, Hourglass, Warning, Lightning,
} from '../../components/Icons';

// ── Types ──────────────────────────────────────────────────────────────────
type Badge = 'platinum' | 'gold' | 'silver' | 'bronze' | 'unrated';

interface Components { [k: string]: number }

interface EcoHistoryRow {
  id: string;
  score: number;
  badge: string;
  delta: number | null;
  trigger: string | null;
  rationale: string | null;
  components?: Components;
  created_at: string;
}

interface EcoMe {
  score: number;
  badge: Badge;
  rationale: string;
  streak_days: number;
  components?: Components;
  history?: EcoHistoryRow[];
}

interface Wallet {
  eco_points: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
}

interface WalletTx {
  id: string;
  delta: number;
  reason: string | null;
  reason_type?: string | null; // job_complete | redeem | expiry | cap_truncate
  created_at: string;
}

interface RewardItem extends RewardForCard {
  category?: string | null;
}

interface MyRewardsResponse {
  wallet: Wallet;
  eco: EcoMe;
  rewards: RewardItem[];
  history: WalletTx[];
}

// ── Tier helpers ───────────────────────────────────────────────────────────
const TIER_ORDER: Badge[] = ['unrated', 'bronze', 'silver', 'gold', 'platinum'];
const TIER_THRESHOLDS: Record<Exclude<Badge, 'unrated'>, number> = {
  bronze: 25,
  silver: 50,
  gold: 75,
  platinum: 90,
};

const tierColor = (badge: Badge | string, C: any): string => {
  switch (badge) {
    case 'platinum': return '#0EA5E9';
    case 'gold':     return '#F59E0B';
    case 'silver':   return '#94A3B8';
    case 'bronze':   return '#A16207';
    default:         return C.muted;
  }
};

const nextTier = (badge: Badge): { name: string; threshold: number } | null => {
  const i = TIER_ORDER.indexOf(badge);
  if (i < 0 || i >= TIER_ORDER.length - 1) return null;
  const next = TIER_ORDER[i + 1] as Exclude<Badge, 'unrated'>;
  return { name: next, threshold: TIER_THRESHOLDS[next] };
};

const CATEGORY_LABELS: Record<string, string> = {
  amc_renewal:       'AMC Renewal Discounts',
  hygiene_upgrade:   'Hygiene Upgrades',
  partner_benefit:   'Partner Benefits',
  streak_reward:     'Streak Rewards',
};

const prettyCategory = (cat?: string | null): string => {
  if (!cat) return 'Other';
  return CATEGORY_LABELS[cat] || cat
    .split('_').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
};

// ── Tx icon helper ─────────────────────────────────────────────────────────
const txIcon = (t: WalletTx, C: any) => {
  const reasonType = t.reason_type || inferReasonType(t);
  switch (reasonType) {
    case 'job_complete':  return <CheckCircle size={16} weight="fill" color={C.success} />;
    case 'redeem':        return <Lightning size={16} weight="fill" color={C.primary} />;
    case 'expiry':        return <Hourglass size={16} weight="regular" color={C.muted} />;
    case 'cap_truncate':  return <Warning size={16} weight="fill" color={C.warning} />;
    default:              return <Wallet size={16} weight="regular" color={C.muted} />;
  }
};

const inferReasonType = (t: WalletTx): string => {
  const r = (t.reason || '').toLowerCase();
  if (r.includes('redeem') || (t.delta < 0 && r.includes('reward'))) return 'redeem';
  if (r.includes('expir')) return 'expiry';
  if (r.includes('cap'))   return 'cap_truncate';
  if (t.delta > 0)         return 'job_complete';
  return '';
};

// ── Main screen ─────────────────────────────────────────────────────────────
const EcoScoreDetailScreen: React.FC = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const navigation = useNavigation<any>();
  const scrollRef = useWebScrollFix();

  const [eco, setEco] = useState<EcoMe | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [history, setHistory] = useState<WalletTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      // /rewards/me already includes wallet + eco + rewards + history.
      const resp: any = await rewardsAPI.getMyRewards();
      const data = (resp?.data || resp) as MyRewardsResponse;

      setWallet(data?.wallet || null);
      setEco(data?.eco || null);
      setRewards(Array.isArray(data?.rewards) ? data.rewards : []);
      setHistory(Array.isArray(data?.history) ? data.history : []);

      // /ecoscore/me has the latest components for the tip engine.
      try {
        const ecoResp: any = await ecoScoreAPI.getMyScore();
        const ecoData = ecoResp?.data || ecoResp;
        if (ecoData) {
          setEco((prev) => ({
            score: ecoData.score ?? prev?.score ?? 0,
            badge: ecoData.badge ?? prev?.badge ?? 'unrated',
            rationale: ecoData.rationale ?? prev?.rationale ?? '',
            streak_days: ecoData.streak_days ?? prev?.streak_days ?? 0,
            components: ecoData.components ?? prev?.components,
            history: ecoData.history ?? prev?.history,
          }));
        }
      } catch (_) { /* fallback to whatever /rewards/me gave us */ }
    } catch (_) {
      // swallow — show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRedeem = useCallback((reward: RewardForCard) => {
    const doRedeem = async () => {
      setRedeeming(reward.slug);
      try {
        await rewardsAPI.redeem(reward.slug);
        await load(true);
        if (Platform.OS === 'web') {
          // alert is sync on web
          // eslint-disable-next-line no-alert
          window.alert(`Redeemed: ${reward.name}`);
        } else {
          Alert.alert('Redeemed!', `${reward.name} has been added to your account.`);
        }
      } catch (e: any) {
        const msg = e?.message || 'Could not redeem reward. Please try again.';
        if (Platform.OS === 'web') {
          // eslint-disable-next-line no-alert
          window.alert(msg);
        } else {
          Alert.alert('Redemption failed', msg);
        }
      } finally {
        setRedeeming(null);
      }
    };

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      const ok = window.confirm(`Redeem "${reward.name}" for ${reward.points_cost} pts?`);
      if (ok) doRedeem();
      return;
    }

    Alert.alert(
      'Confirm Redemption',
      `Redeem "${reward.name}" for ${reward.points_cost} pts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Redeem', style: 'default', onPress: doRedeem },
      ],
    );
  }, [load]);

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const score = eco?.score ?? 0;
  const badge = (eco?.badge ?? 'unrated') as Badge;
  const rationale = eco?.rationale || 'Complete your first service to unlock your EcoScore.';
  const streak = eco?.streak_days ?? 0;
  const tier = tierColor(badge, C);
  const next = nextTier(badge);

  // Group rewards by category
  const grouped = rewards.reduce<Record<string, RewardItem[]>>((acc, r) => {
    const key = r.category || 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});
  const categoryOrder = ['amc_renewal', 'hygiene_upgrade', 'partner_benefit', 'streak_reward', 'other'];
  const sortedCategoryKeys = Object.keys(grouped).sort(
    (a, b) => (categoryOrder.indexOf(a) >= 0 ? categoryOrder.indexOf(a) : 99)
            - (categoryOrder.indexOf(b) >= 0 ? categoryOrder.indexOf(b) : 99),
  );

  // Tips engine — uses the latest components from eco.history[0] if available
  const latestComponents: Components | undefined =
    eco?.components || (eco?.history && eco.history[0]?.components) || undefined;
  const tips = computeTips(badge, streak, latestComponents);

  // Wallet usage
  const points = wallet?.eco_points ?? 0;
  const lifetimeEarned = wallet?.lifetime_earned ?? 0;
  const lifetimeRedeemed = wallet?.lifetime_redeemed ?? 0;
  const cap = 1000;
  const pointsPct = Math.min(100, Math.round((points / cap) * 100));

  // Progress to next tier
  const distanceToNext = next ? Math.max(0, next.threshold - score) : 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle={C.background === '#0B0B0B' ? 'light-content' : 'dark-content'} backgroundColor={C.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <ArrowLeft size={22} color={C.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>EcoScore & Rewards</Text>
          <Text style={styles.headerSub}>Your hygiene rating · EcoPoints wallet</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        refreshControl={
          Platform.OS !== 'web'
            ? <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.primary} />
            : undefined
        }
      >
        {/* a) Hero — Circular EcoScore Ring */}
        <View style={styles.heroCard}>
          <EcoScoreRing
            score={score}
            badge={badge}
            color={tier}
            trackColor={C.surfaceHighlight}
            foreground={C.foreground}
            muted={C.muted}
            size={210}
            stroke={16}
          />
          <Text style={styles.rationale}>{rationale}</Text>

          {/* b) Progress Tracker */}
          {next ? (
            <View style={styles.progressBlock}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>
                  {distanceToNext === 0
                    ? `You qualify for ${next.name.toUpperCase()}!`
                    : `You're ${distanceToNext} pts away from ${next.name.toUpperCase()}`}
                </Text>
                <View style={[styles.nextTierIcon, { backgroundColor: tierColor(next.name, C) + '22' }]}>
                  {tierBadgeIcon(next.name, 14, tierColor(next.name, C))}
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, (score / next.threshold) * 100)}%`, backgroundColor: tier },
                  ]}
                />
              </View>
            </View>
          ) : null}

          {/* c) Streak Indicator — flame pill, gold-or-better only */}
          {streak > 0 && (badge === 'gold' || badge === 'platinum') ? (
            <View style={styles.streakPillWrap}>
              <View style={[styles.streakPill, {
                backgroundColor: C.goldBg,
                borderColor: C.gold + '55',
                ...Platform.select({
                  ios: { shadowColor: C.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12 },
                  web: { shadowColor: C.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12 } as any,
                  android: { elevation: 4 },
                }),
              }]}>
                <Text style={styles.flameEmoji}>🔥</Text>
                <Text style={[styles.streakText, { color: C.gold }]}>
                  EcoScore Streak: {streak} {streak === 1 ? 'job' : 'jobs'}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* d) EcoPoints Wallet Card */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <View style={styles.walletIconWrap}>
              <Wallet size={20} weight="fill" color={C.primary} />
            </View>
            <Text style={styles.walletTitle}>EcoPoints Wallet</Text>
          </View>

          <View style={styles.walletBalanceRow}>
            <Text style={styles.walletBalance}>{points.toLocaleString()}</Text>
            <Text style={styles.walletCap}> / {cap.toLocaleString()}</Text>
          </View>

          <View style={styles.walletBar}>
            <View style={[styles.walletBarFill, { width: `${pointsPct}%`, backgroundColor: C.primary }]} />
          </View>

          <Text style={styles.walletSubtitle}>
            Lifetime earned: <Text style={{ color: C.foreground, fontWeight: '700' }}>{lifetimeEarned}</Text>
            {'  ·  '}Redeemed: <Text style={{ color: C.foreground, fontWeight: '700' }}>{lifetimeRedeemed}</Text>
          </Text>

          <View style={styles.walletMetaRow}>
            <Text style={styles.walletMeta}>Per-job: EcoScore % + tier bonus</Text>
            <Text style={styles.walletMeta}>Cap: 1,000 pts · Expires in 24 months</Text>
          </View>
        </View>

        {/* e) Redeem Catalog — grouped by category */}
        <Text style={styles.sectionTitle}>Redeem your points</Text>
        {sortedCategoryKeys.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No rewards available right now. Check back soon!</Text>
          </View>
        ) : sortedCategoryKeys.map((cat) => (
          <View key={cat} style={{ marginBottom: 8 }}>
            <Text style={styles.categoryTitle}>{prettyCategory(cat)}</Text>
            {grouped[cat].map((r) => (
              <View key={r.slug} style={{ opacity: redeeming === r.slug ? 0.5 : 1 }}>
                <RewardCard reward={r} onRedeem={onRedeem} C={C} />
              </View>
            ))}
          </View>
        ))}

        {/* f) Wallet History */}
        <Text style={styles.sectionTitle}>Recent wallet activity</Text>
        <View style={styles.card}>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>No EcoPoints transactions yet.</Text>
          ) : history.slice(0, 10).map((t) => {
            const d = new Date(t.created_at);
            const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            const sign = t.delta > 0 ? '+' : '';
            const deltaColor = t.delta > 0 ? C.success : t.delta < 0 ? C.danger : C.muted;
            return (
              <View key={t.id} style={styles.txRow}>
                <View style={styles.txIcon}>{txIcon(t, C)}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txReason} numberOfLines={1}>
                    {t.reason || prettyReasonType(t.reason_type)}
                  </Text>
                  <Text style={styles.txDate}>{dateStr}</Text>
                </View>
                <Text style={[styles.txDelta, { color: deltaColor }]}>
                  {sign}{t.delta}
                </Text>
              </View>
            );
          })}
        </View>

        {/* g) Improvement Tips */}
        <Text style={styles.sectionTitle}>How to boost your score</Text>
        <View style={styles.card}>
          {tips.map((tip, idx) => (
            <View key={idx} style={styles.tipRow}>
              <View style={[styles.tipIconWrap, { backgroundColor: C.primaryBg }]}>
                <LightbulbFilament size={18} color={C.primary} weight="fill" />
              </View>
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('AmcPlans')}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaBtnText}>Explore AMC Plans</Text>
            <ArrowRight size={14} weight="bold" color={C.primaryFg} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const tierBadgeIcon = (tier: string, size = 14, color = '#000') => {
  switch (tier) {
    case 'platinum': return <Crown size={size} weight="fill" color={color} />;
    case 'gold':     return <Trophy size={size} weight="fill" color={color} />;
    case 'silver':   return <Medal size={size} weight="fill" color={color} />;
    case 'bronze':   return <ShieldCheck size={size} weight="fill" color={color} />;
    default:         return <Star size={size} weight="regular" color={color} />;
  }
};

const prettyReasonType = (rt?: string | null): string => {
  switch (rt) {
    case 'job_complete':  return 'Service completed';
    case 'redeem':        return 'Reward redeemed';
    case 'expiry':        return 'Points expired';
    case 'cap_truncate':  return 'Cap reached';
    default:              return 'Wallet update';
  }
};

const computeTips = (badge: Badge, streak: number, components?: Components): string[] => {
  const tips: string[] = [];

  // Rule 1: badge < platinum and components show low add-ons (proxy for missing UV)
  if (badge !== 'platinum') {
    const addonScore = components?.c_addons ?? 1;
    if (addonScore < 0.5) {
      tips.push('Add UV double-lock on your next service for +10 EcoScore.');
    }
  }

  // Rule 2: water tests below threshold
  const waterScore = components?.c_water_tests ?? 1;
  if (waterScore < 0.5) {
    tips.push('Pre & post-service lab testing can boost your score next time.');
  }

  // Rule 3: streak is 0
  if (streak === 0) {
    tips.push('Stay on schedule for 2 more jobs to unlock streak rewards.');
  }

  // Fallbacks if no rules matched
  if (tips.length === 0) {
    if (badge === 'platinum') {
      tips.push("You're at Platinum — keep services on schedule to maintain your streak.");
    } else {
      tips.push('Stick to your AMC schedule to climb to the next tier.');
    }
    tips.push('Rate your technician after every service to keep your score active.');
  }

  return tips.slice(0, 3);
};

// ── Styles ──────────────────────────────────────────────────────────────────
const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },

  header: {
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.foreground },
  headerSub: { fontSize: 12, color: C.muted, marginTop: 2 },

  // Hero
  heroCard: {
    backgroundColor: C.surface,
    borderRadius: 24, padding: 24, marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  rationale: {
    marginTop: 18, fontSize: 14, color: C.foreground, textAlign: 'center', fontWeight: '600',
    lineHeight: 20,
  },

  // Progress Tracker
  progressBlock: { width: '100%', marginTop: 18 },
  progressLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 12, color: C.muted, fontWeight: '600', flex: 1 },
  nextTierIcon: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  progressTrack: {
    width: '100%', height: 6, backgroundColor: C.surfaceHighlight, borderRadius: 999, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 999 },

  // Streak pill
  streakPillWrap: { marginTop: 14, alignItems: 'center' },
  streakPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1,
  },
  flameEmoji: { fontSize: 14 },
  streakText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },

  // Wallet card
  walletCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 20, marginBottom: 18,
    borderWidth: 1, borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  walletHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  walletIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: C.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  walletTitle: { fontSize: 15, fontWeight: '700', color: C.foreground },
  walletBalanceRow: { flexDirection: 'row', alignItems: 'baseline' },
  walletBalance: { fontSize: 38, fontWeight: '800', color: C.foreground, lineHeight: 42 },
  walletCap: { fontSize: 16, color: C.muted, fontWeight: '600' },
  walletBar: {
    height: 6, backgroundColor: C.surfaceHighlight, borderRadius: 999,
    overflow: 'hidden', marginTop: 12,
  },
  walletBarFill: { height: '100%', borderRadius: 999 },
  walletSubtitle: { fontSize: 12, color: C.muted, marginTop: 12 },
  walletMetaRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border, gap: 4 },
  walletMeta: { fontSize: 11, color: C.muted },

  // Catalog
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.foreground, marginBottom: 10, marginTop: 6 },
  categoryTitle: {
    fontSize: 12, fontWeight: '700', color: C.muted, letterSpacing: 0.5,
    textTransform: 'uppercase', marginBottom: 8, marginTop: 6,
  },

  // Generic card
  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 18,
    borderWidth: 1, borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },

  // Wallet history rows
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  txIcon: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: C.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  txReason: { fontSize: 13, color: C.foreground, fontWeight: '600' },
  txDate: { fontSize: 11, color: C.muted, marginTop: 2 },
  txDelta: { fontSize: 14, fontWeight: '700' },

  emptyText: { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 12 },

  // Tips
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8 },
  tipIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  tipText: { flex: 1, fontSize: 13, color: C.foreground, lineHeight: 18 },

  ctaBtn: {
    marginTop: 12,
    backgroundColor: C.primary, paddingVertical: 12, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  ctaBtnText: { color: C.primaryFg, fontWeight: '700', fontSize: 14 },
});

export default EcoScoreDetailScreen;
