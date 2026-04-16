import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, Platform, StatusBar,
  Modal, Pressable, TextInput, Alert as RNAlert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { jobAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { Job } from '../../types';
import useAuthStore from '../../store/auth.store';
import { Clock, Wrench, ArrowRight, HandPalm, Warning, Fire, Siren, NavigationArrow, ArrowsClockwise } from '../../components/Icons';
import * as Location from 'expo-location';

const formatCountdown = (scheduledAt: string, nowMs: number) => {
  const slot = new Date(scheduledAt).getTime();
  const diffMs = slot - nowMs;
  const absMs = Math.abs(diffMs);
  const hrs = Math.floor(absMs / (1000 * 60 * 60));
  const mins = Math.floor((absMs % (1000 * 60 * 60)) / (1000 * 60));
  if (diffMs < 0) return `${hrs}h ${mins}m overdue`;
  if (hrs === 0) return `${mins}m left`;
  return `${hrs}h ${mins}m left`;
};

const getSlaUrgency = (scheduledAt: string, status: string, nowMs: number) => {
  if (status === 'completed' || status === 'cancelled') return null;
  const slot = new Date(scheduledAt).getTime();
  const hoursUntil = (slot - nowMs) / (1000 * 60 * 60);
  const countdown = formatCountdown(scheduledAt, nowMs);
  if (hoursUntil < 0) return { label: 'OVERDUE', countdown, color: '#DC2626', icon: 'fire' };
  if (hoursUntil < 2) return { label: 'DUE SOON', countdown, color: '#EA580C', icon: 'warning' };
  if (hoursUntil < 4) return { label: 'TODAY', countdown, color: '#CA8A04', icon: null };
  return null;
};

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
  const [nowMs, setNowMs] = useState(Date.now());
  const [routeOptimized, setRouteOptimized] = useState(false);
  const [optimizedJobs, setOptimizedJobs] = useState<Job[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [routeMethod, setRouteMethod] = useState<string>('');
  const [concernJobId, setConcernJobId] = useState<string | null>(null);
  const [concernText, setConcernText] = useState('');
  const [submittingConcern, setSubmittingConcern] = useState(false);

  // Tick every 60s to keep countdown live
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

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
      setRouteOptimized(false);
    }, [])
  );

  const handleOptimizeRoute = async () => {
    setOptimizing(true);
    try {
      let lat: number | undefined;
      let lng: number | undefined;
      if (Platform.OS !== 'web') {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            lat = pos.coords.latitude;
            lng = pos.coords.longitude;
          }
        } catch (_) {}
      } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => { lat = pos.coords.latitude; lng = pos.coords.longitude; resolve(); },
            () => resolve(),
            { enableHighAccuracy: false, timeout: 5000 },
          );
        });
      }
      const res = await jobAPI.optimizeRoute(lat, lng) as any;
      const result = res.data;
      if (result?.optimized?.length > 0) {
        setOptimizedJobs(result.optimized);
        setRouteMethod(result.method || 'optimized');
        setRouteOptimized(true);
      }
    } catch (_) {} finally {
      setOptimizing(false);
    }
  };

  const baseJobs = routeOptimized ? optimizedJobs : jobs;

  // Jobs that have a scheduling conflict (another job within ±60 min)
  const conflictJobIds = useMemo(() => {
    const conflicting = new Set<string>();
    const active = baseJobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress');
    for (let i = 0; i < active.length; i++) {
      for (let k = i + 1; k < active.length; k++) {
        const diff = Math.abs(
          new Date(active[i].scheduled_at).getTime() - new Date(active[k].scheduled_at).getTime()
        );
        if (diff <= 60 * 60 * 1000) {
          conflicting.add(active[i].id);
          conflicting.add(active[k].id);
        }
      }
    }
    return conflicting;
  }, [baseJobs]);

  const handleRaiseConcern = async () => {
    if (!concernJobId || !concernText.trim()) return;
    setSubmittingConcern(true);
    try {
      const { jobAPI } = require('../../services/api');
      await jobAPI.raiseConcern(concernJobId, concernText.trim());
      setConcernJobId(null);
      setConcernText('');
      RNAlert.alert('Concern Raised', 'Admin has been notified. They will review and reassign if needed.');
    } catch (err: any) {
      RNAlert.alert('Error', err?.message || 'Failed to raise concern');
    } finally {
      setSubmittingConcern(false);
    }
  };

  const filtered = filter === 'All'
    ? baseJobs
    : baseJobs.filter((j) => {
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

  const overdueJobs = filtered.filter(j => getSlaUrgency(j.scheduled_at, j.status, nowMs)?.icon === 'fire');

  const renderItem = ({ item }: { item: Job }) => {
    const sla = getSlaUrgency(item.scheduled_at, item.status, nowMs);
    const hasConflict = conflictJobIds.has(item.id);
    return (
    <TouchableOpacity
      style={[styles.card, sla?.icon === 'fire' && styles.cardOverdue, hasConflict && styles.cardConflict]}
      onPress={() => navigation.navigate('JobDetail', { job_id: item.id })}
      activeOpacity={0.7}
    >
      {hasConflict && (
        <View style={styles.conflictBanner}>
          <Warning size={12} weight="fill" color="#fff" />
          <Text style={styles.conflictBannerText}>SCHEDULE CONFLICT — another job at this time</Text>
          <TouchableOpacity
            style={styles.raiseConcernBtn}
            onPress={(e) => { e.stopPropagation?.(); setConcernJobId(item.id); setConcernText(''); }}
          >
            <Text style={styles.raiseConcernText}>Raise Concern</Text>
          </TouchableOpacity>
        </View>
      )}
      {sla && (
        <View style={[styles.slaBanner, { backgroundColor: sla.color }]}>
          {sla.icon === 'fire' && <Fire size={12} weight="fill" color="#fff" />}
          {sla.icon === 'warning' && <Warning size={12} weight="fill" color="#fff" />}
          <Text style={styles.slaBannerText}>{sla.label}</Text>
          <Text style={styles.slaBannerCountdown}> · {sla.countdown}</Text>
        </View>
      )}
      {/* Left accent bar */}
      <View style={[styles.cardAccent, { backgroundColor: statusColor(item.status) }]} />

      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <Text style={styles.jobId}>JOB #{item.id?.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.jobType}>
            {item.tank_type?.replace('_', ' ').toUpperCase() || 'CLEANING JOB'} · {item.tank_size_litres}L
          </Text>
          <Text style={styles.customer}>{item.customer_name || 'Customer'} · {item.customer_phone}</Text>
          <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
          <View style={styles.timeRow}>
            <Clock size={13} weight="fill" color={C.primary} />
            <Text style={styles.time}>{formatDate(item.scheduled_at)}</Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor(item.status) }]}>
          <Text style={styles.badgeText}>{item.status === 'in_progress' ? 'ACTIVE' : item.status?.toUpperCase()}</Text>
        </View>
      </View>

      {item.status === 'scheduled' && (
        <View style={[styles.actionHint, { backgroundColor: C.successBg, marginHorizontal: 16, marginBottom: 14 }]}>
          <Text style={[styles.actionHintText, { color: C.success }]}>Tap to start checklist</Text>
          <ArrowRight size={14} weight="bold" color={C.success} />
        </View>
      )}
      {item.status === 'in_progress' && (
        <View style={[styles.actionHint, { backgroundColor: C.primaryBg, marginHorizontal: 16, marginBottom: 14 }]}>
          <Text style={[styles.actionHintText, { color: C.primary }]}>In progress — tap to continue</Text>
          <ArrowRight size={14} weight="bold" color={C.primary} />
        </View>
      )}
    </TouchableOpacity>
  );
  };

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

      {/* Route Optimize Button */}
      {!loading && jobs.length > 1 && (
        <View style={styles.routeRow}>
          <TouchableOpacity
            style={[styles.routeBtn, routeOptimized && styles.routeBtnActive]}
            onPress={routeOptimized ? () => setRouteOptimized(false) : handleOptimizeRoute}
            disabled={optimizing}
          >
            {optimizing
              ? <ActivityIndicator size="small" color={routeOptimized ? C.primaryFg : C.primary} />
              : <NavigationArrow size={15} weight="fill" color={routeOptimized ? C.primaryFg : C.primary} />}
            <Text style={[styles.routeBtnText, routeOptimized && styles.routeBtnTextActive]}>
              {routeOptimized ? 'Optimized Route ✓' : 'Optimize Route'}
            </Text>
          </TouchableOpacity>
          {routeOptimized && (
            <Text style={styles.routeMethod}>
              {routeMethod === 'google_distance_matrix' ? '📍 Google Maps' : '📐 Estimated'}
            </Text>
          )}
        </View>
      )}

      {/* Escalation Banner */}
      {!loading && overdueJobs.length > 0 && (
        <View style={styles.escalationBanner}>
          <Siren size={16} weight="fill" color="#fff" />
          <Text style={styles.escalationText}>
            {overdueJobs.length} overdue job{overdueJobs.length > 1 ? 's' : ''} — contact supervisor immediately
          </Text>
        </View>
      )}

      {/* Raise Concern Modal */}
      <Modal visible={!!concernJobId} transparent animationType="slide" onRequestClose={() => setConcernJobId(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setConcernJobId(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <Warning size={20} weight="fill" color={C.warning} />
              <Text style={styles.modalTitle}>Raise Schedule Concern</Text>
            </View>
            <Text style={styles.modalSub}>
              Describe the conflict — admin will be notified and can reassign one of the jobs.
            </Text>
            <TextInput
              style={styles.concernInput}
              placeholder="e.g. I have 2 jobs at 10 AM, please reassign one to another team member"
              placeholderTextColor={C.muted}
              multiline
              numberOfLines={4}
              value={concernText}
              onChangeText={setConcernText}
              textAlignVertical="top"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setConcernJobId(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, (!concernText.trim() || submittingConcern) && { opacity: 0.5 }]}
                onPress={handleRaiseConcern}
                disabled={!concernText.trim() || submittingConcern}
              >
                {submittingConcern
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.modalSubmitText}>Send to Admin</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
            Platform.OS !== 'web'
              ? <RefreshControl refreshing={refreshing} onRefresh={() => fetchJobs(true)} tintColor={C.primary} />
              : undefined
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
  <View style={{
    flex: 1, alignItems: 'center', paddingVertical: 10,
    backgroundColor: color + '12', borderRadius: 12, marginHorizontal: 4,
  }}>
    <Text style={{ fontSize: 22, fontWeight: '800' as const, color }}>{value}</Text>
    <Text style={{ fontSize: 10, color: C.muted, fontWeight: '600' as const, marginTop: 2 }}>{label}</Text>
  </View>
);

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  header: {
    backgroundColor: C.surface,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  greeting: { fontSize: 20, fontWeight: '800', color: C.foreground },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 3 },
  statsBox: {
    alignItems: 'center',
    backgroundColor: C.primaryBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.borderActive,
  },
  statNum: { fontSize: 26, fontWeight: '800', color: C.primary },
  statLabel: { fontSize: 10, color: C.primary, fontWeight: '600', marginTop: 1 },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: C.surface,
    gap: 0,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  filterRow: { backgroundColor: C.background, flexShrink: 0, flexGrow: 0 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.surfaceElevated,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: C.border,
    flexShrink: 0,
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 13, color: C.muted, fontWeight: '600', flexShrink: 0 },
  chipTextActive: { color: C.primaryFg, fontWeight: '700' },
  list: { padding: 16 },
  emptyContainer: { flex: 1 },
  slaBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  slaBannerText: { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.8 },
  slaBannerCountdown: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  routeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  routeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: C.primary, backgroundColor: C.primaryBg,
  },
  routeBtnActive: { backgroundColor: C.primary },
  routeBtnText: { fontSize: 13, fontWeight: '700', color: C.primary },
  routeBtnTextActive: { color: C.primaryFg },
  routeMethod: { fontSize: 11, color: C.muted, fontWeight: '600' },
  escalationBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#DC2626', paddingHorizontal: 16, paddingVertical: 12,
  },
  escalationText: { fontSize: 13, fontWeight: '700', color: '#fff', flex: 1 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  cardOverdue: { borderColor: '#DC2626', borderWidth: 1.5 },
  cardConflict: { borderColor: '#EA580C', borderWidth: 1.5 },
  conflictBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EA580C', paddingHorizontal: 14, paddingVertical: 8,
  },
  conflictBannerText: { flex: 1, fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  raiseConcernBtn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  raiseConcernText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 20 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.foreground },
  modalSub: { fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 20 },
  concernInput: {
    backgroundColor: C.surfaceElevated, borderRadius: 14, padding: 16,
    fontSize: 14, color: C.foreground, borderWidth: 1.5, borderColor: C.border,
    minHeight: 110, marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 15, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: C.muted },
  modalSubmitBtn: { flex: 2, paddingVertical: 15, borderRadius: 14, backgroundColor: C.warning, alignItems: 'center' },
  modalSubmitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  // Card layout
  cardAccent: { width: 4, position: 'absolute', left: 0, top: 0, bottom: 0, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, paddingLeft: 20 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5, marginRight: 12 },
  cardInfo: { flex: 1 },
  jobId: { fontSize: 10, color: C.muted, fontFamily: 'monospace', fontWeight: '700', marginBottom: 3, letterSpacing: 0.5 },
  jobType: { fontSize: 15, fontWeight: '800', color: C.foreground, marginBottom: 2 },
  customer: { fontSize: 13, color: C.foreground, fontWeight: '600', marginTop: 1 },
  address: { fontSize: 12, color: C.muted, marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  time: { fontSize: 12, color: C.primary, fontWeight: '700' },
  badge: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, marginLeft: 8, alignSelf: 'flex-start',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  actionHint: {
    marginHorizontal: 16, marginBottom: 14, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  actionHintText: { fontSize: 12, fontWeight: '700' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIconContainer: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: C.surfaceElevated,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.foreground, marginBottom: 6 },
  emptySub: { fontSize: 14, color: C.muted, textAlign: 'center' },
});

export default JobListScreen;
