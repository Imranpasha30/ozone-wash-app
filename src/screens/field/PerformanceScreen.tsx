import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Platform, StatusBar,
} from 'react-native';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { jobAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import {
  CheckCircle, ArrowsClockwise, Hourglass, ChartBar, Fire,
} from '../../components/Icons';

const PERIODS = ['This Week', 'This Month', 'All Time'] as const;

const PerformanceScreen = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>('This Week');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await jobAPI.getTodayStats() as any;
      setStats(res.data?.stats || res.stats || res.data);
    } catch (_) {}
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const total = parseInt(stats?.total_assigned || stats?.today_total || '0');
  const completed = parseInt(stats?.completed_today || stats?.today_completed || '0');
  const inProgress = parseInt(stats?.in_progress || stats?.today_inprogress || '0');
  const pending = parseInt(stats?.pending || '0');
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const streakDays = parseInt(stats?.streak_days || '0');
  const weekTotal = parseInt(stats?.completed_this_week || '0');
  const monthTotal = parseInt(stats?.completed_this_month || '0');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Performance</Text>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.body}>
        {/* Period Selector */}
        <View style={styles.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodChip, period === p && styles.periodActive]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.7}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Completion Ring */}
        <View style={styles.ringCard}>
          <View style={styles.ring}>
            <Text style={styles.ringPct}>{completionRate}%</Text>
            <Text style={styles.ringLabel}>Completion</Text>
          </View>
        </View>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconContainer}>
              <CheckCircle size={22} weight="fill" color={C.success} />
            </View>
            <Text style={[styles.kpiValue, { color: C.success }]}>{completed}</Text>
            <Text style={styles.kpiLabel}>Jobs Done</Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconContainer}>
              <ArrowsClockwise size={22} weight="regular" color={C.primary} />
            </View>
            <Text style={[styles.kpiValue, { color: C.primary }]}>{inProgress}</Text>
            <Text style={styles.kpiLabel}>In Progress</Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconContainer}>
              <Hourglass size={22} weight="regular" color={C.warning} />
            </View>
            <Text style={[styles.kpiValue, { color: C.warning }]}>{pending}</Text>
            <Text style={styles.kpiLabel}>Pending</Text>
          </View>
          <View style={styles.kpiCard}>
            <View style={styles.kpiIconContainer}>
              <ChartBar size={22} weight="fill" color={C.info} />
            </View>
            <Text style={[styles.kpiValue, { color: C.info }]}>{total}</Text>
            <Text style={styles.kpiLabel}>Total</Text>
          </View>
        </View>

        {/* Target vs Achievement */}
        <View style={styles.targetCard}>
          <Text style={styles.targetTitle}>Daily Target</Text>
          <View style={styles.targetRow}>
            <View style={styles.targetItem}>
              <Text style={styles.targetNum}>{completed}</Text>
              <Text style={styles.targetLabel}>Achieved</Text>
            </View>
            <View style={styles.targetVs}><Text style={styles.targetVsText}>vs</Text></View>
            <View style={styles.targetItem}>
              <Text style={[styles.targetNum, { color: C.muted }]}>5</Text>
              <Text style={styles.targetLabel}>Target</Text>
            </View>
          </View>
          <View style={styles.targetBarBg}>
            <View style={[styles.targetBarFill, { width: `${Math.min((completed / 5) * 100, 100)}%` }]} />
          </View>
          <Text style={styles.targetSub}>
            {completed >= 5 ? '🎯 Target achieved!' : `${5 - completed} more to hit today's target`}
          </Text>
        </View>

        {/* Weekly / Monthly Summary */}
        <View style={styles.targetCard}>
          <Text style={styles.targetTitle}>Period Summary</Text>
          <View style={styles.targetRow}>
            <View style={styles.targetItem}>
              <Text style={styles.targetNum}>{period === 'This Week' ? weekTotal : period === 'This Month' ? monthTotal : total}</Text>
              <Text style={styles.targetLabel}>Completed</Text>
            </View>
            <View style={styles.targetVs}><Text style={styles.targetVsText}>·</Text></View>
            <View style={styles.targetItem}>
              <Text style={[styles.targetNum, { color: C.muted, fontSize: 28 }]}>{pending}</Text>
              <Text style={styles.targetLabel}>Pending</Text>
            </View>
            <View style={styles.targetVs}><Text style={styles.targetVsText}>·</Text></View>
            <View style={styles.targetItem}>
              <Text style={[styles.targetNum, { color: C.primary, fontSize: 28 }]}>{inProgress}</Text>
              <Text style={styles.targetLabel}>Active</Text>
            </View>
          </View>
        </View>

        {/* Streak Card */}
        <View style={styles.streakCard}>
          <View style={styles.streakIconContainer}>
            <Fire size={24} weight="fill" color={C.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>
              {streakDays > 0 ? `${streakDays}-day streak! 🔥` : completed > 0 ? `${completed} job${completed > 1 ? 's' : ''} today` : 'No jobs yet today'}
            </Text>
            <Text style={styles.streakSub}>
              {streakDays > 1
                ? `${streakDays} consecutive days with completed jobs`
                : `${completionRate}% completion · ${weekTotal} this week · ${monthTotal} this month`}
            </Text>
          </View>
          {streakDays >= 5 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>🏆</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  header: {
    backgroundColor: C.surface, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.foreground },
  body: { padding: 20, paddingBottom: 40 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  periodChip: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    backgroundColor: C.surfaceElevated,
  },
  periodActive: { backgroundColor: C.primary },
  periodText: { fontSize: 13, fontWeight: '600', color: C.muted },
  periodTextActive: { color: C.primaryFg },
  ringCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 32, alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  ring: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 8, borderColor: C.primary,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: C.primaryBg,
  },
  ringPct: { fontSize: 32, fontWeight: '700', color: C.primary },
  ringLabel: { fontSize: 12, color: C.muted, marginTop: 2 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  kpiCard: {
    width: '47%', backgroundColor: C.surface, borderRadius: 16, padding: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  kpiIconContainer: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: C.surfaceElevated,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  kpiValue: { fontSize: 28, fontWeight: '700' },
  kpiLabel: { fontSize: 12, color: C.muted, marginTop: 4 },
  targetCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  targetTitle: { fontSize: 13, fontWeight: '700', color: C.muted, textTransform: 'uppercase', marginBottom: 12 },
  targetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  targetItem: { flex: 1, alignItems: 'center' },
  targetNum: { fontSize: 36, fontWeight: '700', color: C.primary },
  targetLabel: { fontSize: 12, color: C.muted, fontWeight: '600', marginTop: 2 },
  targetVs: { paddingHorizontal: 16 },
  targetVsText: { fontSize: 14, color: C.muted, fontWeight: '600' },
  targetBarBg: { height: 8, backgroundColor: C.surfaceElevated, borderRadius: 4, marginBottom: 8 },
  targetBarFill: { height: 8, backgroundColor: C.primary, borderRadius: 4 },
  targetSub: { fontSize: 12, color: C.muted, textAlign: 'center' },
  streakCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  streakIconContainer: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: C.warningBg,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  streakTitle: { fontSize: 16, fontWeight: '700', color: C.foreground },
  streakSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  streakBadge: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.warningBg,
    alignItems: 'center', justifyContent: 'center',
  },
  streakBadgeText: { fontSize: 20 },
});

export default PerformanceScreen;
