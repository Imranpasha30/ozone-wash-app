import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView,
} from 'react-native';
import { jobAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';

const PERIODS = ['This Week', 'This Month', 'All Time'] as const;

const PerformanceScreen = () => {
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
        <ActivityIndicator size="large" color={COLORS.primary} />
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
          <KPICard icon="✅" label="Jobs Done" value={String(completed)} color={COLORS.success} />
          <KPICard icon="🔄" label="In Progress" value={String(inProgress)} color={COLORS.primary} />
          <KPICard icon="⏳" label="Pending" value={String(pending)} color={COLORS.warning} />
          <KPICard icon="📊" label="Total" value={String(total)} color={COLORS.info} />
        </View>

        {/* Quick Stats */}
        <View style={styles.streakCard}>
          <Text style={styles.streakIcon}>🔥</Text>
          <View>
            <Text style={styles.streakTitle}>Keep it up!</Text>
            <Text style={styles.streakSub}>{completed} jobs completed today</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const KPICard = ({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) => (
  <View style={styles.kpiCard}>
    <Text style={styles.kpiIcon}>{icon}</Text>
    <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    <Text style={styles.kpiLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.foreground },
  body: { padding: 20, paddingBottom: 40 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  periodChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  periodActive: { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary },
  periodText: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  periodTextActive: { color: COLORS.primary },
  ringCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 16,
  },
  ring: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 8, borderColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: COLORS.primaryBg,
  },
  ringPct: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary },
  ringLabel: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  kpiCard: {
    width: '47%', backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  kpiIcon: { fontSize: 24, marginBottom: 8 },
  kpiValue: { fontSize: 28, fontWeight: 'bold' },
  kpiLabel: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  streakCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  streakIcon: { fontSize: 36, marginRight: 14 },
  streakTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.foreground },
  streakSub: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
});

export default PerformanceScreen;
