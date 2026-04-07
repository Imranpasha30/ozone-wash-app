import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, Platform, StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { jobAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { Job } from '../../types';
import useAuthStore from '../../store/auth.store';
import { Clock, Wrench, ArrowRight, HandPalm } from '../../components/Icons';

const FILTERS = ['All', 'Scheduled', 'In Progress', 'Completed'];

const JobListScreen = () => {
  const navigation = useNavigation<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');

  const fetchJobs = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [jobRes, statRes] = await Promise.all([
        jobAPI.getMyJobs(),
        jobAPI.getTodayStats(),
      ]);
      setJobs((jobRes as any).data?.jobs || []);
      setStats((statRes as any).data?.stats);
    } catch (_) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [])
  );

  const filtered = filter === 'All'
    ? jobs
    : jobs.filter((j) => {
        if (filter === 'In Progress') return j.status === 'in_progress';
        return j.status === filter.toLowerCase();
      });

  const statusColor = (s: string) => {
    if (s === 'completed') return C.success;
    if (s === 'in_progress') return C.primary;
    if (s === 'cancelled') return C.danger;
    return C.warning;
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', {
      day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

  const renderItem = ({ item }: { item: Job }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('JobDetail', { job_id: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardTop}>
        <View style={[styles.statusDot, { backgroundColor: statusColor(item.status) }]} />
        <View style={styles.cardInfo}>
          <Text style={styles.jobId}>Job #{item.id?.slice(0, 8).toUpperCase()}</Text>
          {item.booking_id && (
            <Text style={styles.jobId}>Booking #{item.booking_id?.slice(0, 8).toUpperCase()}</Text>
          )}
          <Text style={styles.jobType}>
            {item.tank_type?.replace('_', ' ').toUpperCase() || 'CLEANING JOB'} · {item.tank_size_litres}L
          </Text>
          <Text style={styles.customer}>{item.customer_name || 'Customer'} · {item.customer_phone}</Text>
          <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
          <View style={styles.timeRow}>
            <Clock size={14} weight="regular" color={C.primary} />
            <Text style={styles.time}>{formatDate(item.scheduled_at)}</Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor(item.status) }]}>
          <Text style={styles.badgeText}>{item.status === 'in_progress' ? 'ACTIVE' : item.status?.toUpperCase()}</Text>
        </View>
      </View>

      {item.status === 'scheduled' && (
        <View style={styles.actionHint}>
          <Text style={styles.actionHintText}>Tap to start checklist</Text>
          <ArrowRight size={14} weight="bold" color={C.success} />
        </View>
      )}
      {item.status === 'in_progress' && (
        <View style={[styles.actionHint, { backgroundColor: C.primaryBg }]}>
          <Text style={[styles.actionHintText, { color: C.primary }]}>In progress — tap to continue checklist</Text>
          <ArrowRight size={14} weight="bold" color={C.primary} />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.greetingRow}>
            <Text style={styles.greeting}>Good day, {user?.name || 'Team'}</Text>
            <HandPalm size={20} weight="fill" color={C.warning} />
          </View>
          <Text style={styles.headerSub}>Your assigned jobs</Text>
        </View>
        {stats && (
          <View style={styles.statsBox}>
            <Text style={styles.statNum}>{stats.completed_today ?? 0}</Text>
            <Text style={styles.statLabel}>Done today</Text>
          </View>
        )}
      </View>

      {/* Stats Bar */}
      {stats && (
        <View style={styles.statsBar}>
          <StatChip label="Total" value={stats.total_assigned ?? 0} color={C.primary} C={C} />
          <StatChip label="Pending" value={stats.pending ?? 0} color={C.accent} C={C} />
          <StatChip label="Active" value={stats.in_progress ?? 0} color={C.primary} C={C} />
          <StatChip label="Done" value={stats.completed_today ?? 0} color={C.secondary} C={C} />
        </View>
      )}

      {/* Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]} numberOfLines={1}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(j) => j.id}
          renderItem={renderItem}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchJobs(true)} tintColor={C.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconContainer}>
                <Wrench size={32} weight="regular" color={C.muted} />
              </View>
              <Text style={styles.emptyTitle}>No jobs assigned</Text>
              <Text style={styles.emptySub}>Your upcoming jobs will appear here</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const StatChip = ({ label, value, color, C }: { label: string; value: number; color: string; C: any }) => (
  <View style={{ flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: C.border }}>
    <Text style={{ fontSize: 20, fontWeight: '700' as const, color }}>{value}</Text>
    <Text style={{ fontSize: 10, color: C.muted, fontWeight: '600' as const }}>{label}</Text>
  </View>
);

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  header: {
    backgroundColor: C.surface,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greeting: { fontSize: 18, fontWeight: '700', color: C.foreground },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  statsBox: {
    alignItems: 'center',
    backgroundColor: C.primaryBg,
    borderRadius: 12,
    padding: 10,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  statNum: { fontSize: 24, fontWeight: '700', color: C.primary },
  statLabel: { fontSize: 11, color: C.muted },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.surface,
  },
  filterRow: { backgroundColor: C.background, flexShrink: 0, flexGrow: 0 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.surfaceElevated,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: C.muted,
    flexShrink: 0,
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 13, color: C.foreground, fontWeight: '600', flexShrink: 0 },
  chipTextActive: { color: C.primaryFg, fontWeight: '700' },
  list: { padding: 16 },
  emptyContainer: { flex: 1 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 16 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5, marginRight: 12 },
  cardInfo: { flex: 1 },
  jobId: { fontSize: 11, color: C.primary, fontFamily: 'monospace', fontWeight: '600', marginBottom: 2 },
  jobType: { fontSize: 13, fontWeight: '700', color: C.foreground },
  customer: { fontSize: 12, color: C.muted, marginTop: 2 },
  address: { fontSize: 11, color: C.muted, marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  time: { fontSize: 12, color: C.primary, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  badgeText: { color: C.primaryFg, fontSize: 9, fontWeight: '700' },
  actionHint: {
    backgroundColor: C.successBg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionHintText: { fontSize: 12, color: C.success, fontWeight: '600' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: C.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.foreground, marginBottom: 6 },
  emptySub: { fontSize: 14, color: C.muted, textAlign: 'center' },
});

export default JobListScreen;
