import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { jobAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';
import { Job } from '../../types';
import useAuthStore from '../../store/auth.store';
import { Clock, Wrench, ArrowRight, HandPalm } from '../../components/Icons';

const FILTERS = ['All', 'Scheduled', 'In Progress', 'Completed'];

const JobListScreen = () => {
  const navigation = useNavigation<any>();
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
    if (s === 'completed') return COLORS.success;
    if (s === 'in_progress') return COLORS.primary;
    if (s === 'cancelled') return COLORS.danger;
    return COLORS.warning;
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
    >
      <View style={styles.cardTop}>
        <View style={[styles.statusDot, { backgroundColor: statusColor(item.status) }]} />
        <View style={styles.cardInfo}>
          <Text style={styles.jobType}>
            {item.tank_type?.replace('_', ' ').toUpperCase() || 'CLEANING JOB'} · {item.tank_size_litres}L
          </Text>
          <Text style={styles.customer}>{item.customer_name || 'Customer'} · {item.customer_phone}</Text>
          <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
          <View style={styles.timeRow}>
            <Clock size={14} weight="regular" color={COLORS.primary} />
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
          <ArrowRight size={14} weight="bold" color={COLORS.success} />
        </View>
      )}
      {item.status === 'in_progress' && (
        <View style={[styles.actionHint, { backgroundColor: COLORS.primaryBg }]}>
          <Text style={[styles.actionHintText, { color: COLORS.primary }]}>In progress — tap to continue checklist</Text>
          <ArrowRight size={14} weight="bold" color={COLORS.primary} />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.greetingRow}>
            <Text style={styles.greeting}>Good day, {user?.name || 'Team'}</Text>
            <HandPalm size={20} weight="fill" color={COLORS.warning} />
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
          <StatChip label="Total" value={stats.total_assigned ?? 0} color={COLORS.primary} />
          <StatChip label="Pending" value={stats.pending ?? 0} color={COLORS.accent} />
          <StatChip label="Active" value={stats.in_progress ?? 0} color={COLORS.primary} />
          <StatChip label="Done" value={stats.completed_today ?? 0} color={COLORS.secondary} />
        </View>
      )}

      {/* Filter */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(j) => j.id}
          renderItem={renderItem}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchJobs(true)} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconContainer}>
                <Wrench size={32} weight="regular" color={COLORS.muted} />
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

const StatChip = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <View style={[styles.statChip, { borderColor: color }]}>
    <Text style={[styles.statChipNum, { color }]}>{value}</Text>
    <Text style={styles.statChipLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greeting: { fontSize: 18, fontWeight: 'bold', color: COLORS.foreground },
  headerSub: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  statsBox: { alignItems: 'center', backgroundColor: COLORS.primaryBg, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: COLORS.borderActive },
  statNum: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.muted },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statChip: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: COLORS.border },
  statChipNum: { fontSize: 20, fontWeight: 'bold' },
  statChipLabel: { fontSize: 10, color: COLORS.muted, fontWeight: '600' },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceElevated,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primaryBg, borderColor: COLORS.borderActive },
  chipText: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  chipTextActive: { color: COLORS.primary },
  list: { padding: 16 },
  emptyContainer: { flex: 1 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5, marginRight: 12 },
  cardInfo: { flex: 1 },
  jobType: { fontSize: 13, fontWeight: 'bold', color: COLORS.foreground },
  customer: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  address: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  time: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8 },
  badgeText: { color: COLORS.primaryFg, fontSize: 9, fontWeight: 'bold' },
  actionHint: {
    backgroundColor: COLORS.successBg,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionHintText: { fontSize: 12, color: COLORS.success, fontWeight: '600' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.foreground, marginBottom: 6 },
  emptySub: { fontSize: 14, color: COLORS.muted, textAlign: 'center' },
});

export default JobListScreen;
