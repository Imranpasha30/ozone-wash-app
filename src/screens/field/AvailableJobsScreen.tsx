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

const AvailableJobsScreen = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requesting, setRequesting] = useState<string | null>(null);
  const userId = useAuthStore((s) => s.user?.id || '');

  const fetchJobs = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await jobAPI.getAvailableJobs() as any;
      setJobs(res.data?.jobs || []);
    } catch (_) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchJobs(); }, []));

  const doRequest = async (jobId: string) => {
    setRequesting(jobId);
    try {
      await jobAPI.requestJob(jobId);
      Alert.alert('Request Sent', 'Admin will review your request.');
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, requested: true } : j));
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || err.message || 'Failed to send request');
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
          Alert.alert(
            '⚠️ You Have a Job at This Time',
            `You already have a job scheduled at ${conflictTime} (${c.customer_name || 'another customer'}).\n\nYou can still request — if admin approves, make sure to coordinate with your client.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Request Anyway', onPress: () => doRequest(job.id) },
            ]
          );
          return;
        }
      } catch (_) {}
    }
    Alert.alert(
      'Request Job',
      'Send a request to the admin to assign this job to you?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send Request', onPress: () => doRequest(job.id) },
      ]
    );
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
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

      {item.requested ? (
        <View style={styles.requestedBadge}>
          <CheckCircle size={16} weight="fill" color={C.success} />
          <Text style={styles.requestedText}>Request Sent</Text>
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

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Jobs</Text>
        <Text style={styles.headerSub}>{jobs.length} unassigned job{jobs.length !== 1 ? 's' : ''}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(j) => j.id}
          renderItem={renderItem}
          contentContainerStyle={jobs.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            Platform.OS !== 'web'
              ? <RefreshControl refreshing={refreshing} onRefresh={() => fetchJobs(true)} tintColor={C.primary} />
              : undefined
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconWrap}>
                <MagnifyingGlass size={32} weight="regular" color={C.muted} />
              </View>
              <Text style={styles.emptyTitle}>No available jobs</Text>
              <Text style={styles.emptySub}>All jobs are currently assigned. Check back later.</Text>
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
