import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Platform, StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { jobAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import useAuthStore from '../../store/auth.store';
import { Clock, MapPin, MagnifyingGlass, ArrowRight, CheckCircle, Warning, ShieldCheck, FirstAid } from '../../components/Icons';
import { useResponsive } from '../../utils/responsive';
import { confirm as showConfirm, alert as showAlert } from '../../services/dialog';

// Derive PPE / safety flags from job data (no extra API call needed)
const getComplianceFlags = (job: any): { label: string; color: string; bg: string }[] => {
  const flags: { label: string; color: string; bg: string }[] = [];
  const addons: string[] = typeof job.addons === 'string'
    ? (() => { try { return JSON.parse(job.addons); } catch { return []; } })()
    : (job.addons || []);
  const tankType: string = job.tank_type || '';
  const sizeLitres: number = parseInt(job.tank_size_litres || '0');

  if (addons.some((a: string) => a.includes('chemical') || a.includes('disinfect')))
    flags.push({ label: 'Chemical PPE', color: '#92400E', bg: '#FEF3C7' });
  if (tankType === 'underground' || tankType === 'sump')
    flags.push({ label: 'Confined Space', color: '#7C3AED', bg: '#EDE9FE' });
  if (addons.some((a: string) => a.includes('bio') || a.includes('bacteria')))
    flags.push({ label: 'Biohazard Protocol', color: '#065F46', bg: '#D1FAE5' });
  if (addons.some((a: string) => a.includes('deep') || a.includes('scrub')))
    flags.push({ label: 'Heavy Equipment', color: '#1D4ED8', bg: '#DBEAFE' });
  if (sizeLitres >= 3000)
    flags.push({ label: '2-Person Job', color: '#BE185D', bg: '#FCE7F3' });

  return flags;
};

type Tab = 'available' | 'requests';

const AvailableJobsScreen = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { isLarge } = useResponsive();
  // Web layout: 2-column grid with capped width, single column on mobile.
  const numColumns = isLarge ? 2 : 1;
  const webListStyle = isLarge
    ? { maxWidth: 1200, width: '100%' as const, alignSelf: 'center' as const, padding: 24 }
    : null;
  const [tab, setTab] = useState<Tab>('available');
  const [jobs, setJobs] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);
  const userId = useAuthStore((s) => s.user?.id || '');

  // Set of job_ids the current user has a pending/approved request for.
  // Used to hide them from the Available tab so we don't try to re-request.
  const requestedJobIds = useMemo(
    () => new Set(requests.filter((r) => r.request_status === 'pending' || r.request_status === 'approved').map((r) => r.id)),
    [requests]
  );

  const fetchAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [jobsRes, reqRes] = await Promise.all([
        jobAPI.getAvailableJobs() as any,
        jobAPI.getMyJobRequests() as any,
      ]);
      setJobs(jobsRes.data?.jobs || []);
      setRequests(reqRes.data?.requests || []);
    } catch (_) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  const doRequest = async (jobId: string) => {
    setRequesting(jobId);
    try {
      await jobAPI.requestJob(jobId);
      // Refetch the user's requests so the My Requests tab + the requestedJobIds
      // hide-set are up to date. The Available tab will visually drop this job.
      try {
        const reqRes = await jobAPI.getMyJobRequests() as any;
        setRequests(reqRes.data?.requests || []);
      } catch (_) {}
      await showAlert({
        title: 'Request Sent',
        message: 'Admin will review your request. Track it in the My Requests tab.',
      });
    } catch (err: any) {
      await showAlert({
        title: 'Error',
        message: err?.response?.data?.message || err.message || 'Failed to send request',
      });
    } finally {
      setRequesting(null);
    }
  };

  const handleRequest = async (job: any) => {
    // Check if this member already has a job at this time
    if (userId) {
      try {
        const res = await jobAPI.checkConflict(userId, job.scheduled_at) as any;
        if (res?.data?.has_conflict && res.data.conflicts?.length > 0) {
          const c = res.data.conflicts[0];
          const conflictTime = new Date(c.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
          const ok = await showConfirm({
            title: 'You Have a Job at This Time',
            message: `You already have a job scheduled at ${conflictTime} (${c.customer_name || 'another customer'}). You can still request — if admin approves, make sure to coordinate with your client.`,
            confirmText: 'Request Anyway',
            destructive: true,
          });
          if (ok) doRequest(job.id);
          return;
        }
      } catch (_) {}
    }
    const ok = await showConfirm({
      title: 'Request Job',
      message: 'Send a request to the admin to assign this job to you?',
      confirmText: 'Send Request',
    });
    if (ok) doRequest(job.id);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

  // Renders a card for either tab. `mode` controls the footer (action button
  // vs status badge). Shared header/body so the visual layout stays consistent.
  const renderCard = (item: any, mode: 'available' | 'request') => {
    const status: string | undefined = item.request_status;
    const statusMeta = (() => {
      switch (status) {
        case 'approved': return { bg: C.successBg, fg: C.success, label: 'Approved' };
        case 'rejected': return { bg: '#FEE2E2',   fg: C.danger,  label: 'Rejected' };
        default:         return { bg: C.warningBg, fg: C.warning, label: 'Pending Review' };
      }
    })();
    return (
      <View style={[
        styles.card,
        isLarge && { flex: 1, marginBottom: 0 },
      ]}>
        <View style={styles.cardBody}>
          <Text style={styles.tankType}>
            {item.tank_type?.replace('_', ' ').toUpperCase() || 'CLEANING JOB'} · {item.tank_size_litres}L
          </Text>
          <Text style={styles.customer}>{item.customer_name || 'Customer'} · {item.customer_phone}</Text>
          {item.address && (
            <View style={styles.infoRow}>
              <MapPin size={13} weight="fill" color={C.muted} />
              <Text style={styles.address} numberOfLines={2}>{item.address}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Clock size={13} weight="regular" color={C.primary} />
            <Text style={styles.time}>{formatDate(item.scheduled_at)}</Text>
          </View>
          {item.addons && item.addons.length > 0 && (
            <Text style={styles.addons}>
              Add-ons: {(typeof item.addons === 'string' ? JSON.parse(item.addons) : item.addons).map((a: string) => a.replace(/_/g, ' ')).join(', ')}
            </Text>
          )}
          {(() => {
            const flags = getComplianceFlags(item);
            if (flags.length === 0) return null;
            return (
              <View style={styles.flagRow}>
                {flags.map((f, i) => (
                  <View key={i} style={[styles.flagChip, { backgroundColor: f.bg, borderColor: f.color }]}>
                    <Warning size={10} weight="fill" color={f.color} />
                    <Text style={[styles.flagText, { color: f.color }]}>{f.label}</Text>
                  </View>
                ))}
              </View>
            );
          })()}
        </View>

        {mode === 'request' ? (
          <View style={[styles.requestedBadge, { backgroundColor: statusMeta.bg }]}>
            {status === 'approved' ? (
              <CheckCircle size={16} weight="fill" color={statusMeta.fg} />
            ) : status === 'rejected' ? (
              <Warning size={16} weight="fill" color={statusMeta.fg} />
            ) : (
              <ShieldCheck size={16} weight="fill" color={statusMeta.fg} />
            )}
            <Text style={[styles.requestedText, { color: statusMeta.fg }]}>{statusMeta.label}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.requestBtn}
            onPress={() => handleRequest(item)}
            disabled={requesting === item.id}
            activeOpacity={0.8}
          >
            {requesting === item.id ? (
              <ActivityIndicator size="small" color={C.primaryFg} />
            ) : (
              <View style={styles.requestBtnInner}>
                <ArrowRight size={16} weight="bold" color={C.primaryFg} />
                <Text style={styles.requestBtnText}>Request This Job</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Available tab: drop jobs the user has already requested (pending/approved)
  // so the list mirrors what's actually actionable.
  const visibleAvailable = useMemo(
    () => jobs.filter((j) => !requestedJobIds.has(j.id)),
    [jobs, requestedJobIds]
  );

  const listData = tab === 'available' ? visibleAvailable : requests;
  const renderItem = ({ item }: { item: any }) =>
    renderCard(item, tab === 'available' ? 'available' : 'request');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {tab === 'available' ? 'Available Jobs' : 'My Requests'}
        </Text>
        <Text style={styles.headerSub}>
          {tab === 'available'
            ? `${visibleAvailable.length} unassigned job${visibleAvailable.length !== 1 ? 's' : ''}`
            : `${requests.length} request${requests.length !== 1 ? 's' : ''}`}
        </Text>
      </View>

      {/* Tab switcher — segmented control, responsive on web + native */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'available' && styles.tabBtnActive]}
          onPress={() => setTab('available')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, tab === 'available' && styles.tabTextActive]}>
            Available
          </Text>
          <View style={[styles.tabCount, tab === 'available' && styles.tabCountActive]}>
            <Text style={[styles.tabCountText, tab === 'available' && styles.tabCountTextActive]}>
              {visibleAvailable.length}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'requests' && styles.tabBtnActive]}
          onPress={() => setTab('requests')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, tab === 'requests' && styles.tabTextActive]}>
            My Requests
          </Text>
          <View style={[styles.tabCount, tab === 'requests' && styles.tabCountActive]}>
            <Text style={[styles.tabCountText, tab === 'requests' && styles.tabCountTextActive]}>
              {requests.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          // `key` forces FlatList to remount when column count changes OR when
          // tab switches — RN throws if numColumns changes on a mounted list.
          key={`cols-${numColumns}-${tab}`}
          data={listData}
          keyExtractor={(j) => j.id || j.request_id}
          renderItem={renderItem}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? { gap: 16, marginBottom: 16 } : undefined}
          contentContainerStyle={[
            listData.length === 0 ? styles.emptyContainer : styles.list,
            webListStyle,
          ]}
          refreshControl={
            Platform.OS !== 'web'
              ? <RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} tintColor={C.primary} />
              : undefined
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconWrap}>
                <MagnifyingGlass size={32} weight="regular" color={C.muted} />
              </View>
              <Text style={styles.emptyTitle}>
                {tab === 'available' ? 'No available jobs' : 'No requests yet'}
              </Text>
              <Text style={styles.emptySub}>
                {tab === 'available'
                  ? 'All jobs are currently assigned. Check back later.'
                  : 'Tap a job on the Available tab and request it — your requests will show up here.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  header: {
    backgroundColor: C.surface,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    // Cap on web so the two buttons don't span the entire viewport. ~560 keeps
    // them looking like compact segmented buttons rather than stretched bars.
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  tabText: { fontSize: 14, fontWeight: '600', color: C.muted },
  tabTextActive: { color: C.primaryFg },
  tabCount: {
    minWidth: 24,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  tabCountText: { fontSize: 11, fontWeight: '700', color: C.muted },
  tabCountTextActive: { color: C.primaryFg },
  list: { padding: 16 },
  emptyContainer: { flex: 1 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardBody: { padding: 16 },
  tankType: { fontSize: 14, fontWeight: '700', color: C.foreground },
  customer: { fontSize: 12, color: C.muted, marginTop: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  address: { fontSize: 12, color: C.muted, flex: 1 },
  time: { fontSize: 12, color: C.primary, fontWeight: '600' },
  addons: { fontSize: 11, color: C.accent, marginTop: 6, fontWeight: '600' },
  flagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  flagChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  flagText: { fontSize: 10, fontWeight: '700' },
  requestBtn: {
    backgroundColor: C.primary,
    paddingVertical: 12,
    alignItems: 'center',
  },
  requestBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  requestBtnText: { color: C.primaryFg, fontWeight: '700', fontSize: 14 },
  requestedBadge: {
    backgroundColor: C.successBg,
    paddingVertical: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  requestedText: { color: C.success, fontWeight: '700', fontSize: 13 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: C.surfaceElevated,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.foreground, marginBottom: 6 },
  emptySub: { fontSize: 14, color: C.muted, textAlign: 'center' },
});

export default AvailableJobsScreen;
