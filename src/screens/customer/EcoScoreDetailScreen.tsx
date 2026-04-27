/**
 * EcoScoreDetailScreen — drill-down for a customer's rolling EcoScore.
 *
 * Sections:
 *   1. Big circular gauge (current score) + badge label + rationale + streak
 *   2. Components breakdown — horizontal bars (re-uses charts/Bars.tsx)
 *   3. History timeline — last ~30 days from /ecoscore/me history payload
 *   4. "How to improve" — picks the 2 lowest components and shows tips
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, RefreshControl, Platform, StatusBar,
  TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { ecoScoreAPI } from '../../services/api';
import Bars, { Bar } from '../../components/charts/Bars';
import {
  ArrowLeft, Trophy, Star, Crown, Medal, ShieldCheck,
  LightbulbFilament, Sparkle, ArrowRight,
} from '../../components/Icons';

type ComponentKey =
  | 'c_amc_plan' | 'c_compliance' | 'c_timeliness'
  | 'c_addons'   | 'c_ratings'    | 'c_water_tests' | 'c_referrals';

interface Components { [k: string]: number }

interface HistoryRow {
  id: string;
  score: number;
  badge: string;
  delta: number | null;
  trigger: string | null;
  rationale: string | null;
  components?: Components;
  created_at: string;
}

interface MyEcoScore {
  score: number;
  badge: 'platinum' | 'gold' | 'silver' | 'bronze' | 'unrated';
  rationale: string;
  streak_days: number;
  last_recalc_at?: string;
  components: Components;
  history: HistoryRow[];
}

const COMPONENT_LABELS: Record<ComponentKey, string> = {
  c_amc_plan:    'AMC Plan',
  c_compliance:  'Compliance',
  c_timeliness:  'On-time Streak',
  c_addons:      'Add-on Upgrades',
  c_ratings:     'Service Ratings',
  c_water_tests: 'Lab Tests',
  c_referrals:   'Referrals',
};

const TIPS: Record<ComponentKey, string> = {
  c_amc_plan:    'Subscribe to a Monthly AMC plan — adds the highest single boost (+30 pts max).',
  c_compliance:  'Make sure each service completes all 8 hygiene steps with photos.',
  c_timeliness:  'Stick to your AMC schedule — services within ±7 days count as on-time.',
  c_addons:      'Add UV Double-Lock or a lab test on your next clean (+10 pts max).',
  c_ratings:     'Rate your technician after every service — engagement gives a baseline boost.',
  c_water_tests: 'Opt into pre & post lab tests on every clean (+5 pts max).',
  c_referrals:   'Refer 3 friends to Ozone Wash — each conversion adds to your score.',
};

const EcoScoreDetailScreen: React.FC = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const navigation = useNavigation<any>();
  const scrollRef = useWebScrollFix();

  const [data, setData] = useState<MyEcoScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res: any = await ecoScoreAPI.getMyScore();
      setData(res?.data || null);
    } catch (_) { /* swallow — show fallback empty state */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const badgeColor = (b?: string): string => {
    if (b === 'platinum') return C.platinum || C.foreground;
    if (b === 'gold')     return C.gold;
    if (b === 'silver')   return C.silver;
    if (b === 'bronze')   return C.bronze;
    return C.muted;
  };

  const badgeIcon = (b?: string) => {
    const size = 18;
    const color = '#0B0B0B';
    if (b === 'platinum') return <Crown size={size} weight="fill" color={color} />;
    if (b === 'gold')     return <Trophy size={size} weight="fill" color={color} />;
    if (b === 'silver')   return <Medal size={size} weight="fill" color={color} />;
    if (b === 'bronze')   return <ShieldCheck size={size} weight="fill" color={color} />;
    return <Star size={size} weight="regular" color={C.muted} />;
  };

  if (loading) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const score = data?.score ?? 0;
  const badge = data?.badge ?? 'unrated';
  const rationale = data?.rationale || 'No service history yet';
  const streak = data?.streak_days ?? 0;
  const components = data?.components || {};
  const history: HistoryRow[] = data?.history || [];

  // Bars input — components as 0..100
  const bars: Bar[] = (Object.keys(COMPONENT_LABELS) as ComponentKey[]).map((k) => ({
    label: COMPONENT_LABELS[k],
    value: Math.round((components[k] || 0) * 100),
    max: 100,
    color: barColor(k, C),
  }));

  // "How to improve" — pick the 2 lowest components
  const tips = (Object.keys(COMPONENT_LABELS) as ComponentKey[])
    .map((k) => ({ key: k, value: components[k] || 0 }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 2);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <ArrowLeft size={22} color={C.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>EcoScore</Text>
          <Text style={styles.headerSub}>Your hygiene + loyalty rating</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          Platform.OS !== 'web'
            ? <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.primary} />
            : undefined
        }
      >
        {/* Gauge */}
        <View style={styles.gaugeCard}>
          <ScoreGauge score={score} color={badgeColor(badge)} foreground={C.foreground} muted={C.muted} surfaceHighlight={C.surfaceHighlight} />
          <View style={[styles.badgePill, { backgroundColor: badgeColor(badge) + '22' }]}>
            {badgeIcon(badge)}
            <Text style={[styles.badgePillText, { color: badgeColor(badge) }]}>
              {badge.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.rationale}>{rationale}</Text>
          {streak > 0 ? (
            <View style={styles.streakRow}>
              <Sparkle size={14} weight="fill" color={C.gold} />
              <Text style={styles.streakText}>
                {streak}-day {streak === 1 ? 'day' : 'days'} at gold or better
              </Text>
            </View>
          ) : null}
        </View>

        {/* Components */}
        <Text style={styles.sectionTitle}>How your score breaks down</Text>
        <View style={styles.card}>
          <Bars bars={bars} formatValue={(n) => `${n}%`} />
        </View>

        {/* History */}
        <Text style={styles.sectionTitle}>Recent activity</Text>
        <View style={styles.card}>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>No history yet — your score will start logging changes from your next service.</Text>
          ) : history.map((h) => {
            const d = new Date(h.created_at);
            const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            const sign = (h.delta ?? 0) > 0 ? '+' : '';
            const deltaColor = (h.delta ?? 0) > 0 ? C.success : (h.delta ?? 0) < 0 ? C.danger : C.muted;
            return (
              <View key={h.id} style={styles.historyRow}>
                <Text style={styles.historyDate}>{dateStr}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle} numberOfLines={1}>
                    {h.rationale || prettyTrigger(h.trigger)}
                  </Text>
                  <Text style={styles.historyMeta}>
                    Score {h.score} · {h.badge}
                  </Text>
                </View>
                <Text style={[styles.historyDelta, { color: deltaColor }]}>
                  {h.delta == null ? '' : `${sign}${h.delta}`}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Tips */}
        <Text style={styles.sectionTitle}>How to improve</Text>
        <View style={styles.card}>
          {tips.map((t) => (
            <View key={t.key} style={styles.tipRow}>
              <View style={[styles.tipIconWrap, { backgroundColor: C.primaryBg }]}>
                <LightbulbFilament size={18} color={C.primary} weight="fill" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.tipLabel}>{COMPONENT_LABELS[t.key as ComponentKey]}</Text>
                <Text style={styles.tipText}>{TIPS[t.key as ComponentKey]}</Text>
              </View>
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

/* ── Score gauge — pure SVG circular progress ───────────────────────── */
const ScoreGauge: React.FC<{ score: number; color: string; foreground: string; muted: string; surfaceHighlight: string }>
= ({ score, color, foreground, muted, surfaceHighlight }) => {
  const size = 180;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * c;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <SvgCircle cx={size/2} cy={size/2} r={r} stroke={surfaceHighlight} strokeWidth={stroke} fill="none" />
        <SvgCircle
          cx={size/2} cy={size/2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ fontSize: 48, fontWeight: '800', color: foreground }}>{score}</Text>
        <Text style={{ fontSize: 11, color: muted, marginTop: -4 }}>out of 100</Text>
      </View>
    </View>
  );
};

const prettyTrigger = (t?: string | null) => {
  switch (t) {
    case 'job_complete':    return 'Service completed';
    case 'rating_received': return 'Rating recorded';
    case 'amc_renewal':     return 'AMC plan updated';
    case 'booking_created': return 'New booking';
    case 'cron_nightly':    return 'Daily refresh';
    case 'admin_adjust':    return 'Score recalculated';
    case 'first_view':      return 'Score initialised';
    default: return t || 'Score updated';
  }
};

const barColor = (k: ComponentKey, C: any): string => {
  switch (k) {
    case 'c_amc_plan':    return C.primary;
    case 'c_compliance':  return C.success;
    case 'c_timeliness':  return C.info;
    case 'c_addons':      return C.warning;
    case 'c_ratings':     return C.gold;
    case 'c_water_tests': return C.secondary || C.primary;
    case 'c_referrals':   return C.danger;
    default: return C.primary;
  }
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: {
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: C.foreground },
  headerSub: { fontSize: 12, color: C.muted, marginTop: 2 },

  gaugeCard: {
    backgroundColor: C.surface,
    borderRadius: 20, padding: 24, marginBottom: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  badgePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    marginTop: 12,
  },
  badgePillText: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  rationale: { marginTop: 10, fontSize: 14, color: C.foreground, textAlign: 'center', fontWeight: '600' },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  streakText: { fontSize: 12, color: C.muted, fontWeight: '600' },

  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: C.foreground,
    marginBottom: 10, marginTop: 6,
  },
  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 18,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },

  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  historyDate: { width: 56, fontSize: 12, color: C.muted, fontWeight: '600' },
  historyTitle: { fontSize: 13, color: C.foreground, fontWeight: '600' },
  historyMeta: { fontSize: 11, color: C.muted, marginTop: 2 },
  historyDelta: { fontSize: 14, fontWeight: '700' },
  emptyText: { fontSize: 13, color: C.muted, textAlign: 'center', paddingVertical: 12 },

  tipRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingVertical: 10,
  },
  tipIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  tipLabel: { fontSize: 13, fontWeight: '700', color: C.foreground },
  tipText: { fontSize: 12, color: C.muted, lineHeight: 17, marginTop: 2 },

  ctaBtn: {
    marginTop: 12,
    backgroundColor: C.primary, paddingVertical: 12, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  ctaBtnText: { color: C.primaryFg, fontWeight: '700', fontSize: 14 },
});

export default EcoScoreDetailScreen;
