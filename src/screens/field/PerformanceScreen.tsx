import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  ScrollView, Platform, StatusBar,
} from 'react-native';
import { jobAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import {
  CheckCircle, ArrowsClockwise, Hourglass, ChartBar, Fire,
} from '../../components/Icons';

const PERIODS = ['This Week', 'This Month', 'All Time'] as const;

const PerformanceScreen = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
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

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Performance</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
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

        {/* Streak Card */}
        <View style={styles.streakCard}>
          <View style={styles.streakIconContainer}>
            <Fire size={24} weight="fill" color={C.warning} />
          </View>
          <View>
            <Text style={styles.streakTitle}>Keep it up!</Text>
            <Text style={styles.streakSub}>{completed} jobs completed today</Text>
          </View>
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
});

export default PerformanceScreen;
