import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Alert, Platform, StatusBar,
  Modal, Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { adminAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { Wrench, Users, Check, X, Phone } from '../../components/Icons';

const FILTERS = ['All', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'];

const AdminJobsScreen = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [assignLoading, setAssignLoading] = useState<string | null>(null);
  const [showRequests, setShowRequests] = useState(false);
  const [requestActionLoading, setRequestActionLoading] = useState<string | null>(null);
  const [assignJobId, setAssignJobId] = useState<string | null>(null);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [jobsRes, teamsRes, reqRes] = await Promise.allSettled([
        adminAPI.getAllJobs() as any,
        adminAPI.getTeamList() as any,
        adminAPI.getJobRequests({ status: 'pending' }) as any,
      ]);
      if (jobsRes.status === 'fulfilled') setJobs(jobsRes.value?.data?.jobs || []);
      if (teamsRes.status === 'fulfilled') setTeams(teamsRes.value?.data?.teams || []);
      if (reqRes.status === 'fulfilled') setRequests(reqRes.value?.data?.requests || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const filterKey = (f: string) => f.toLowerCase().replace(' ', '_');

  const filtered = filter === 'All'
    ? jobs
    : jobs.filter((j) => j.status === filterKey(filter));

  const handleApproveRequest = async (requestId: string) => {
    setRequestActionLoading(requestId);
    try {
      await adminAPI.approveJobRequest(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      fetchData(true);
      Alert.alert('Approved', 'Team has been assigned to the job.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to approve');
    } finally {
      setRequestActionLoading(null);
    }
  };

  const handleRejectRequest = (requestId: string) => {
    Alert.alert('Reject Request', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive',
        onPress: async () => {
          setRequestActionLoading(requestId);
          try {
            await adminAPI.rejectJobRequest(requestId);
            setRequests((prev) => prev.filter((r) => r.id !== requestId));
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to reject');
          } finally {
            setRequestActionLoading(null);
          }
        },
      },
    ]);
  };

  const openAssignModal = (jobId: string) => {
    if (teams.length === 0) {
      Alert.alert('No Teams', 'No field teams available to assign.');
      return;
    }
    setAssignJobId(jobId);
  };

  const handleAssignTeam = async (teamId: string, teamName: string) => {
    if (!assignJobId) return;
    const jobId = assignJobId;
    setAssignJobId(null);
    setAssignLoading(jobId);
    try {
      await adminAPI.assignTeam(jobId, teamId);
      setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, assigned_team_id: teamId, team_name: teamName } : j));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to assign team');
    } finally {
      setAssignLoading(null);
    }
  };

  const statusColor = (s: string) => {
    if (s === 'completed') return C.success;
    if (s === 'in_progress') return C.warning;
    if (s === 'cancelled') return C.danger;
    return C.primary;
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const assigningJob = assignJobId ? jobs.find((j) => j.id === assignJobId) : null;

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <Text style={styles.jobId}>Job #{item.id?.slice(0, 8).toUpperCase()}</Text>
          {item.booking_id && (
            <Text style={styles.jobId}>Booking #{item.booking_id?.slice(0, 8).toUpperCase()}</Text>
          )}
          <Text style={styles.customerName}>{item.customer_name || item.customer_phone || '\u2014'}</Text>
          <Text style={styles.cardDetail}>
            {item.tank_type?.toUpperCase()} · {item.tank_size_litres}L
          </Text>
          <Text style={styles.cardDate}>
            {new Date(item.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
          </Text>
          <Text style={styles.teamText}>
            {item.team_name ? `Team: ${item.team_name}` : 'Unassigned'}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor(item.status) + '22', borderColor: statusColor(item.status) }]}>
          <Text style={[styles.badgeText, { color: statusColor(item.status) }]}>
            {item.status?.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      {item.status === 'scheduled' && (
        <TouchableOpacity
          style={styles.assignBtn}
          onPress={() => openAssignModal(item.id)}
          disabled={assignLoading === item.id}
          activeOpacity={0.7}
        >
          {assignLoading === item.id
            ? <ActivityIndicator size="small" color={C.primary} />
            : (
              <View style={styles.assignBtnInner}>
                <Users size={16} weight="bold" color={C.primary} />
                <Text style={styles.assignText}> {item.assigned_team_id ? 'Reassign Team' : 'Assign Team'}</Text>
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
        <Text style={styles.headerTitle}>{showRequests ? 'Job Requests' : 'All Jobs'}</Text>
        <TouchableOpacity
          style={[styles.requestsToggle, showRequests && styles.requestsToggleActive]}
          onPress={() => setShowRequests(!showRequests)}
          activeOpacity={0.7}
        >
          <Users size={16} weight="bold" color={showRequests ? C.primaryFg : C.primary} />
          <Text style={[styles.requestsToggleText, showRequests && styles.requestsToggleTextActive]}>
            Requests{requests.length > 0 ? ` (${requests.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {!showRequests && (
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
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : showRequests ? (
        <FlatList
          data={requests}
          keyExtractor={(r) => r.id}
          contentContainerStyle={requests.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={C.primary} />
          }
          renderItem={({ item: r }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.customerName}>{r.team_name || r.team_phone}</Text>
                  <Text style={[styles.cardDetail, { color: C.primary, fontWeight: '700' }]}>
                    wants to do this job:
                  </Text>
                  <Text style={styles.cardDetail}>
                    {r.customer_name} · {r.tank_type?.toUpperCase()} · {r.tank_size_litres}L
                  </Text>
                  <Text style={styles.cardDate}>
                    {new Date(r.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                  </Text>
                  {r.address && <Text style={styles.cardDetail} numberOfLines={1}>{r.address}</Text>}
                </View>
              </View>
              <View style={styles.requestActions}>
                {requestActionLoading === r.id ? (
                  <ActivityIndicator size="small" color={C.primary} />
                ) : (
                  <>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleApproveRequest(r.id)} activeOpacity={0.7}>
                      <Check size={16} weight="bold" color={C.primaryFg} />
                      <Text style={styles.approveBtnText}>Approve & Assign</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectRequest(r.id)} activeOpacity={0.7}>
                      <X size={16} weight="bold" color={C.danger} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Users size={48} weight="regular" color={C.muted} />
              <Text style={styles.emptyTitle}>No pending requests</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(j) => j.id}
          renderItem={renderItem}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={C.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Wrench size={48} weight="regular" color={C.muted} />
              <Text style={styles.emptyTitle}>No {filter !== 'All' ? filter.toLowerCase() : ''} jobs</Text>
            </View>
          }
        />
      )}

      {/* ── Assign Team Modal ──────────────────────────────────────────── */}
      <Modal
        visible={!!assignJobId}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignJobId(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setAssignJobId(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            {/* Handle */}
            <View style={styles.modalHandle} />

            {/* Header */}
            <Text style={styles.modalTitle}>Assign Team</Text>
            {assigningJob && (
              <Text style={styles.modalSub}>
                Job #{assigningJob.id?.slice(0, 8).toUpperCase()} · {assigningJob.customer_name || assigningJob.customer_phone}
              </Text>
            )}

            {/* Team List */}
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {teams.map((t: any) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.teamCard,
                    assigningJob?.assigned_team_id === t.id && styles.teamCardActive,
                  ]}
                  onPress={() => handleAssignTeam(t.id, t.name)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.teamAvatar,
                    assigningJob?.assigned_team_id === t.id && styles.teamAvatarActive,
                  ]}>
                    <Text style={[
                      styles.teamAvatarText,
                      assigningJob?.assigned_team_id === t.id && styles.teamAvatarTextActive,
                    ]}>
                      {getInitials(t.name || t.phone)}
                    </Text>
                  </View>
                  <View style={styles.teamInfo}>
                    <Text style={styles.teamName}>{t.name || 'Unnamed'}</Text>
                    <View style={styles.teamPhoneRow}>
                      <Phone size={12} weight="regular" color={C.muted} />
                      <Text style={styles.teamPhone}>{t.phone}</Text>
                    </View>
                  </View>
                  {assigningJob?.assigned_team_id === t.id ? (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Current</Text>
                    </View>
                  ) : (
                    <View style={styles.assignTeamBtn}>
                      <Text style={styles.assignTeamBtnText}>Assign</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Cancel */}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setAssignJobId(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: C.surface,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.foreground },
  filterRow: { backgroundColor: C.surface, flexShrink: 0, flexGrow: 0 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: C.surfaceElevated, marginRight: 8, borderWidth: 1.5, borderColor: C.muted, flexShrink: 0 },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 13, color: C.foreground, fontWeight: '600', flexShrink: 0 },
  chipTextActive: { color: C.primaryFg, fontWeight: '700' },
  list: { padding: 16 },
  emptyContainer: { flex: 1 },
  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardInfo: { flex: 1, marginRight: 8 },
  jobId: { fontSize: 11, color: C.primary, fontFamily: 'monospace', fontWeight: '600', marginBottom: 2 },
  customerName: { fontSize: 15, fontWeight: '700', color: C.foreground, marginBottom: 2 },
  cardDetail: { fontSize: 13, color: C.muted, marginBottom: 2 },
  cardDate: { fontSize: 12, color: C.muted, marginBottom: 2 },
  teamText: { fontSize: 12, color: C.primary, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  assignBtn: {
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border,
    alignItems: 'center', paddingVertical: 10, backgroundColor: C.primaryBg, borderRadius: 12,
  },
  assignBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  assignText: { color: C.primary, fontWeight: '700', fontSize: 13 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },
  requestsToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 999, borderWidth: 1.5, borderColor: C.primary,
    backgroundColor: C.surface,
  },
  requestsToggleActive: { backgroundColor: C.primary },
  requestsToggleText: { fontSize: 12, fontWeight: '700', color: C.primary },
  requestsToggleTextActive: { color: C.primaryFg },
  requestActions: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: C.border,
  },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.primary, borderRadius: 12, paddingVertical: 10,
  },
  approveBtnText: { color: C.primaryFg, fontWeight: '700', fontSize: 13 },
  rejectBtn: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.dangerBg,
  },

  // ── Modal ──────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.foreground,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: C.muted,
    marginBottom: 16,
  },
  modalList: {
    maxHeight: 340,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: C.surfaceElevated,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  teamCardActive: {
    borderColor: C.primary,
    backgroundColor: C.primaryBg,
  },
  teamAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  teamAvatarActive: {
    backgroundColor: C.primary,
  },
  teamAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.foreground,
  },
  teamAvatarTextActive: {
    color: C.primaryFg,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.foreground,
    marginBottom: 2,
  },
  teamPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  teamPhone: {
    fontSize: 13,
    color: C.muted,
  },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.primary,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.primary,
  },
  assignTeamBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: C.primary,
  },
  assignTeamBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primaryFg,
  },
  modalCancel: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.muted,
  },
});

export default AdminJobsScreen;
