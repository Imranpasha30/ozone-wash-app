import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Alert, Platform, StatusBar,
  Modal, Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { adminAPI, jobAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { Wrench, Users, Check, X, Phone, Warning, ArrowsClockwise } from '../../components/Icons';

const FILTERS = ['All', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'];

const AdminJobsScreen = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [concerns, setConcerns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [assignLoading, setAssignLoading] = useState<string | null>(null);
  const [showRequests, setShowRequests] = useState(false);
  const [showConcerns, setShowConcerns] = useState(false);
  const [requestActionLoading, setRequestActionLoading] = useState<string | null>(null);
  const [assignJobId, setAssignJobId] = useState<string | null>(null);
  // Per-team conflict results for the open assign modal
  const [teamConflicts, setTeamConflicts] = useState<Record<string, any[]>>({});
  const [conflictsLoading, setConflictsLoading] = useState(false);
  // Warning modal when admin tries to assign a conflicting team
  const [conflictWarning, setConflictWarning] = useState<{
    teamId: string; teamName: string; jobId: string; conflicts: any[];
  } | null>(null);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [jobsRes, teamsRes, reqRes, concernsRes] = await Promise.allSettled([
        adminAPI.getAllJobs() as any,
        adminAPI.getTeamList() as any,
        adminAPI.getJobRequests({ status: 'pending' }) as any,
        jobAPI.getConcerns() as any,
      ]);
      if (jobsRes.status === 'fulfilled') setJobs(jobsRes.value?.data?.jobs || []);
      if (teamsRes.status === 'fulfilled') setTeams(teamsRes.value?.data?.teams || []);
      if (reqRes.status === 'fulfilled') setRequests(reqRes.value?.data?.requests || []);
      if (concernsRes.status === 'fulfilled') setConcerns(concernsRes.value?.data?.concerns || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const filterKey = (f: string) => f.toLowerCase().replace(' ', '_');
  const filtered = filter === 'All' ? jobs : jobs.filter((j) => j.status === filterKey(filter));

  // ── Assign Modal ────────────────────────────────────────────────────────────

  const openAssignModal = async (jobId: string) => {
    if (teams.length === 0) {
      Alert.alert('No Teams', 'No field teams available to assign.');
      return;
    }
    setAssignJobId(jobId);
    setTeamConflicts({});

    // Check conflicts for every team in parallel
    const job = jobs.find((j) => j.id === jobId);
    if (!job?.scheduled_at) return;
    setConflictsLoading(true);
    try {
      const results = await Promise.allSettled(
        teams.map((t: any) =>
          jobAPI.checkConflict(t.id, job.scheduled_at, jobId) as any
        )
      );
      const map: Record<string, any[]> = {};
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value?.data?.has_conflict) {
          map[teams[i].id] = r.value.data.conflicts;
        }
      });
      setTeamConflicts(map);
    } catch (_) {}
    finally { setConflictsLoading(false); }
  };

  const handleAssignTeam = (teamId: string, teamName: string) => {
    if (!assignJobId) return;
    const conflicts = teamConflicts[teamId];
    if (conflicts?.length > 0) {
      // Show warning — don't block, let admin decide
      setConflictWarning({ teamId, teamName, jobId: assignJobId, conflicts });
      return;
    }
    doAssign(assignJobId, teamId, teamName);
  };

  const doAssign = async (jobId: string, teamId: string, teamName: string) => {
    setAssignJobId(null);
    setConflictWarning(null);
    setAssignLoading(jobId);
    try {
      await adminAPI.assignTeam(jobId, teamId);
      setJobs((prev) => prev.map((j) =>
        j.id === jobId ? { ...j, assigned_team_id: teamId, team_name: teamName } : j
      ));
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to assign team');
    } finally {
      setAssignLoading(null);
    }
  };

  // ── Request Actions ─────────────────────────────────────────────────────────

  const handleApproveRequest = async (request: any) => {
    // Check conflict before approving
    try {
      const res = await jobAPI.checkConflict(request.team_id, request.scheduled_at, request.job_id) as any;
      if (res?.data?.has_conflict && res.data.conflicts?.length > 0) {
        const conflicting = res.data.conflicts[0];
        const conflictTime = new Date(conflicting.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        Alert.alert(
          '⚠️ Schedule Conflict',
          `${request.team_name} already has a job at ${conflictTime} (${conflicting.customer_name || 'another customer'}).\n\nApprove this request anyway?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Approve Anyway', style: 'destructive', onPress: () => confirmApprove(request.id) },
          ]
        );
        return;
      }
    } catch (_) {}
    confirmApprove(request.id);
  };

  const confirmApprove = async (requestId: string) => {
    setRequestActionLoading(requestId);
    try {
      await adminAPI.approveJobRequest(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      fetchData(true);
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

  // ── Concerns ────────────────────────────────────────────────────────────────

  const handleResolveConcern = async (jobId: string) => {
    try {
      await jobAPI.resolveConcern(jobId);
      setConcerns((prev) => prev.filter((c) => c.id !== jobId));
      Alert.alert('Resolved', 'Concern marked as resolved. Team member has been notified.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to resolve');
    }
  };

  const handleReassignFromConcern = (jobId: string) => {
    setShowConcerns(false);
    openAssignModal(jobId);
  };

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const statusColor = (s: string) => {
    if (s === 'completed') return C.success;
    if (s === 'in_progress') return C.warning;
    if (s === 'cancelled') return C.danger;
    return C.primary;
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });

  const assigningJob = assignJobId ? jobs.find((j) => j.id === assignJobId) : null;
  const activeTab = showConcerns ? 'concerns' : showRequests ? 'requests' : 'jobs';

  // ── Render ───────────────────────────────────────────────────────────────────

  const renderJob = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <Text style={styles.jobId}>Job #{item.id?.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.customerName}>{item.customer_name || item.customer_phone || '—'}</Text>
          <Text style={styles.cardDetail}>{item.tank_type?.toUpperCase()} · {item.tank_size_litres}L</Text>
          <Text style={styles.cardDate}>{formatDate(item.scheduled_at)}</Text>
          <Text style={styles.teamText}>{item.team_name ? `Team: ${item.team_name}` : 'Unassigned'}</Text>
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
                <Text style={styles.assignText}>{item.assigned_team_id ? 'Reassign Team' : 'Assign Team'}</Text>
              </View>
            )}
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {activeTab === 'concerns' ? 'Concerns' : activeTab === 'requests' ? 'Job Requests' : 'All Jobs'}
        </Text>
        <View style={styles.tabBtns}>
          <TouchableOpacity
            style={[styles.tabBtn, showConcerns && styles.tabBtnActive]}
            onPress={() => { setShowConcerns(true); setShowRequests(false); }}
          >
            <Warning size={14} weight="bold" color={showConcerns ? C.primaryFg : C.warning} />
            <Text style={[styles.tabBtnText, showConcerns && styles.tabBtnTextActive]}>
              {concerns.length > 0 ? `${concerns.length}` : 'Issues'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, showRequests && !showConcerns && styles.tabBtnActive]}
            onPress={() => { setShowRequests(true); setShowConcerns(false); }}
          >
            <Users size={14} weight="bold" color={(showRequests && !showConcerns) ? C.primaryFg : C.primary} />
            <Text style={[styles.tabBtnText, (showRequests && !showConcerns) && styles.tabBtnTextActive]}>
              {requests.length > 0 ? `Req (${requests.length})` : 'Requests'}
            </Text>
          </TouchableOpacity>
          {(showRequests || showConcerns) && (
            <TouchableOpacity
              style={styles.tabBtn}
              onPress={() => { setShowRequests(false); setShowConcerns(false); }}
            >
              <Text style={styles.tabBtnText}>Jobs</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter chips — only on jobs tab */}
      {activeTab === 'jobs' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {FILTERS.map((f) => (
            <TouchableOpacity key={f} style={[styles.chip, filter === f && styles.chipActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : activeTab === 'concerns' ? (
        /* ── Concerns Tab ── */
        <FlatList
          data={concerns}
          keyExtractor={(c) => c.id}
          contentContainerStyle={concerns.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={C.primary} />}
          renderItem={({ item: c }) => (
            <View style={[styles.card, styles.concernCard]}>
              <View style={styles.concernBanner}>
                <Warning size={14} weight="fill" color={C.warning} />
                <Text style={styles.concernBannerText}>Schedule Conflict Raised</Text>
                <Text style={styles.concernTime}>
                  {new Date(c.concern_raised_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                </Text>
              </View>
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.customerName}>{c.team_name} · {c.team_phone}</Text>
                  <Text style={styles.cardDetail}>{c.tank_type?.toUpperCase()} · {c.tank_size_litres}L · {c.customer_name}</Text>
                  <Text style={styles.cardDate}>{formatDate(c.scheduled_at)}</Text>
                  {c.address && <Text style={styles.cardDetail} numberOfLines={1}>{c.address}</Text>}
                  <View style={styles.concernMsgBox}>
                    <Text style={styles.concernMsg}>"{c.concern_message}"</Text>
                  </View>
                </View>
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleReassignFromConcern(c.id)} activeOpacity={0.7}>
                  <ArrowsClockwise size={15} weight="bold" color={C.primaryFg} />
                  <Text style={styles.approveBtnText}>Reassign</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.resolveBtn} onPress={() => handleResolveConcern(c.id)} activeOpacity={0.7}>
                  <Check size={15} weight="bold" color={C.success} />
                  <Text style={styles.resolveBtnText}>Resolve</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Check size={48} weight="regular" color={C.success} />
              <Text style={styles.emptyTitle}>No open concerns</Text>
              <Text style={styles.emptySub}>All scheduling conflicts have been resolved.</Text>
            </View>
          }
        />
      ) : activeTab === 'requests' ? (
        /* ── Requests Tab ── */
        <FlatList
          data={requests}
          keyExtractor={(r) => r.id}
          contentContainerStyle={requests.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={C.primary} />}
          renderItem={({ item: r }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.cardInfo}>
                  <Text style={styles.customerName}>{r.team_name || r.team_phone}</Text>
                  <Text style={[styles.cardDetail, { color: C.primary, fontWeight: '700' }]}>wants to do this job:</Text>
                  <Text style={styles.cardDetail}>{r.customer_name} · {r.tank_type?.toUpperCase()} · {r.tank_size_litres}L</Text>
                  <Text style={styles.cardDate}>{formatDate(r.scheduled_at)}</Text>
                  {r.address && <Text style={styles.cardDetail} numberOfLines={1}>{r.address}</Text>}
                </View>
              </View>
              <View style={styles.requestActions}>
                {requestActionLoading === r.id ? (
                  <ActivityIndicator size="small" color={C.primary} />
                ) : (
                  <>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleApproveRequest(r)} activeOpacity={0.7}>
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
        /* ── Jobs Tab ── */
        <FlatList
          data={filtered}
          keyExtractor={(j) => j.id}
          renderItem={renderJob}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={C.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Wrench size={48} weight="regular" color={C.muted} />
              <Text style={styles.emptyTitle}>No {filter !== 'All' ? filter.toLowerCase() : ''} jobs</Text>
            </View>
          }
        />
      )}

      {/* ── Assign Team Modal ─────────────────────────────────────────────────── */}
      <Modal visible={!!assignJobId} transparent animationType="slide" onRequestClose={() => setAssignJobId(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAssignJobId(null)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Assign Team</Text>
            {assigningJob && (
              <Text style={styles.modalSub}>
                Job #{assigningJob.id?.slice(0, 8).toUpperCase()} · {assigningJob.customer_name || assigningJob.customer_phone} · {formatDate(assigningJob.scheduled_at)}
              </Text>
            )}

            {conflictsLoading && (
              <View style={styles.conflictLoadingRow}>
                <ActivityIndicator size="small" color={C.primary} />
                <Text style={styles.conflictLoadingText}>Checking schedules...</Text>
              </View>
            )}

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {teams.map((t: any) => {
                const conflicts = teamConflicts[t.id] || [];
                const hasConflict = conflicts.length > 0;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.teamCard, assigningJob?.assigned_team_id === t.id && styles.teamCardActive, hasConflict && styles.teamCardConflict]}
                    onPress={() => handleAssignTeam(t.id, t.name)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.teamAvatar, assigningJob?.assigned_team_id === t.id && styles.teamAvatarActive]}>
                      <Text style={[styles.teamAvatarText, assigningJob?.assigned_team_id === t.id && styles.teamAvatarTextActive]}>
                        {getInitials(t.name || t.phone)}
                      </Text>
                    </View>
                    <View style={styles.teamInfo}>
                      <Text style={styles.teamName}>{t.name || 'Unnamed'}</Text>
                      <View style={styles.teamPhoneRow}>
                        <Phone size={12} weight="regular" color={C.muted} />
                        <Text style={styles.teamPhone}>{t.phone}</Text>
                      </View>
                      {hasConflict && (
                        <View style={styles.conflictChip}>
                          <Warning size={11} weight="fill" color={C.warning} />
                          <Text style={styles.conflictChipText}>
                            Has job at {new Date(conflicts[0].scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </Text>
                        </View>
                      )}
                    </View>
                    {assigningJob?.assigned_team_id === t.id ? (
                      <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>Current</Text></View>
                    ) : (
                      <View style={[styles.assignTeamBtn, hasConflict && styles.assignTeamBtnWarn]}>
                        <Text style={[styles.assignTeamBtnText, hasConflict && styles.assignTeamBtnTextWarn]}>
                          {hasConflict ? 'Assign ⚠️' : 'Assign'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setAssignJobId(null)} activeOpacity={0.7}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Conflict Warning Modal ────────────────────────────────────────────── */}
      <Modal visible={!!conflictWarning} transparent animationType="fade" onRequestClose={() => setConflictWarning(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setConflictWarning(null)}>
          <Pressable style={styles.warnSheet} onPress={() => {}}>
            <View style={styles.warnIconRow}>
              <Warning size={32} weight="fill" color={C.warning} />
            </View>
            <Text style={styles.warnTitle}>Schedule Conflict</Text>
            {conflictWarning && (
              <>
                <Text style={styles.warnBody}>
                  <Text style={{ fontWeight: '700' }}>{conflictWarning.teamName}</Text> already has{' '}
                  {conflictWarning.conflicts.length} job{conflictWarning.conflicts.length > 1 ? 's' : ''} within 1 hour of this slot:
                </Text>
                {conflictWarning.conflicts.map((c: any) => (
                  <View key={c.id} style={styles.warnConflictRow}>
                    <Text style={styles.warnConflictTime}>
                      {new Date(c.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </Text>
                    <Text style={styles.warnConflictDetail} numberOfLines={1}>
                      {c.customer_name || 'Customer'} · {c.tank_type?.toUpperCase()}
                    </Text>
                  </View>
                ))}
                <Text style={styles.warnNote}>
                  You can still assign — sometimes clients agree to a time adjustment over a call.
                </Text>
              </>
            )}
            <View style={styles.warnActions}>
              <TouchableOpacity style={styles.warnCancelBtn} onPress={() => setConflictWarning(null)}>
                <Text style={styles.warnCancelText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.warnProceedBtn}
                onPress={() => conflictWarning && doAssign(conflictWarning.jobId, conflictWarning.teamId, conflictWarning.teamName)}
              >
                <Text style={styles.warnProceedText}>Assign Anyway</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: C.surface, paddingTop: 56, paddingBottom: 18, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: C.foreground },
  tabBtns: { flexDirection: 'row', gap: 8 },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surfaceElevated,
  },
  tabBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabBtnText: { fontSize: 11, fontWeight: '700', color: C.muted },
  tabBtnTextActive: { color: C.primaryFg },
  filterRow: { backgroundColor: C.surface, flexShrink: 0, flexGrow: 0, borderBottomWidth: 1, borderBottomColor: C.border },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: C.surfaceElevated, marginRight: 8, borderWidth: 1.5, borderColor: C.border, flexShrink: 0 },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 13, color: C.muted, fontWeight: '600', flexShrink: 0 },
  chipTextActive: { color: C.primaryFg, fontWeight: '700' },
  list: { padding: 16 },
  emptyContainer: { flex: 1 },
  card: {
    backgroundColor: C.surface, borderRadius: 18, marginBottom: 14,
    overflow: 'hidden', borderWidth: 1, borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  concernCard: { borderColor: C.warning },
  concernBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.warningBg, paddingHorizontal: 14, paddingVertical: 8,
  },
  concernBannerText: { flex: 1, fontSize: 12, fontWeight: '800', color: C.warning },
  concernTime: { fontSize: 10, color: C.warning, fontWeight: '600' },
  concernMsgBox: { backgroundColor: C.surfaceElevated, borderRadius: 10, padding: 10, marginTop: 8, borderLeftWidth: 3, borderLeftColor: C.warning },
  concernMsg: { fontSize: 12, color: C.foreground, fontStyle: 'italic', lineHeight: 18 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', padding: 16 },
  cardInfo: { flex: 1, marginRight: 8 },
  jobId: { fontSize: 10, color: C.muted, fontFamily: 'monospace', fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },
  customerName: { fontSize: 16, fontWeight: '800', color: C.foreground, marginBottom: 3 },
  cardDetail: { fontSize: 13, color: C.muted, marginBottom: 2 },
  cardDate: { fontSize: 12, color: C.primary, fontWeight: '600', marginBottom: 3 },
  teamText: { fontSize: 12, color: C.success, fontWeight: '700' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  assignBtn: {
    marginHorizontal: 16, marginBottom: 14, borderRadius: 14,
    alignItems: 'center', paddingVertical: 12, backgroundColor: C.primaryBg,
    borderWidth: 1.5, borderColor: C.borderActive,
  },
  assignBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  assignText: { color: C.primary, fontWeight: '800', fontSize: 14 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },
  emptySub: { fontSize: 14, color: C.muted, textAlign: 'center' },
  requestActions: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingBottom: 14, paddingTop: 0,
  },
  approveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 12,
  },
  approveBtnText: { color: C.primaryFg, fontWeight: '800', fontSize: 13 },
  resolveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.successBg, borderRadius: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: C.success,
  },
  resolveBtnText: { color: C.success, fontWeight: '800', fontSize: 13 },
  rejectBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.dangerBg, borderWidth: 1.5, borderColor: C.danger },

  // ── Assign Modal ──────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 24, maxHeight: '78%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginTop: 14, marginBottom: 18 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.foreground, marginBottom: 4 },
  modalSub: { fontSize: 12, color: C.muted, marginBottom: 14 },
  conflictLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  conflictLoadingText: { fontSize: 12, color: C.muted },
  modalList: { maxHeight: 380 },
  teamCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, backgroundColor: C.surfaceElevated, marginBottom: 10, borderWidth: 1.5, borderColor: 'transparent' },
  teamCardActive: { borderColor: C.primary, backgroundColor: C.primaryBg },
  teamCardConflict: { borderColor: C.warning, backgroundColor: C.warningBg },
  teamAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  teamAvatarActive: { backgroundColor: C.primary },
  teamAvatarText: { fontSize: 16, fontWeight: '800', color: C.foreground },
  teamAvatarTextActive: { color: C.primaryFg },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 15, fontWeight: '700', color: C.foreground, marginBottom: 2 },
  teamPhoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  teamPhone: { fontSize: 12, color: C.muted },
  conflictChip: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5, backgroundColor: C.warningBg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, alignSelf: 'flex-start' },
  conflictChipText: { fontSize: 10, color: C.warning, fontWeight: '700' },
  currentBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5, borderColor: C.primary },
  currentBadgeText: { fontSize: 11, fontWeight: '700', color: C.primary },
  assignTeamBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12, backgroundColor: C.primary },
  assignTeamBtnWarn: { backgroundColor: C.warningBg, borderWidth: 1.5, borderColor: C.warning },
  assignTeamBtnText: { fontSize: 13, fontWeight: '700', color: C.primaryFg },
  assignTeamBtnTextWarn: { color: C.warning },
  modalCancel: { marginTop: 12, paddingVertical: 15, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: C.muted },

  // ── Conflict Warning Modal ────────────────────────────────────────────────
  warnSheet: { backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  warnIconRow: { alignItems: 'center', marginBottom: 14, backgroundColor: C.warningBg, width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignSelf: 'center' },
  warnTitle: { fontSize: 20, fontWeight: '800', color: C.foreground, textAlign: 'center', marginBottom: 12 },
  warnBody: { fontSize: 14, color: C.foreground, lineHeight: 22, marginBottom: 12 },
  warnConflictRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.warningBg, borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: C.warning },
  warnConflictTime: { fontSize: 14, fontWeight: '800', color: C.warning },
  warnConflictDetail: { flex: 1, fontSize: 12, color: C.foreground },
  warnNote: { fontSize: 12, color: C.muted, fontStyle: 'italic', marginTop: 12, lineHeight: 18, textAlign: 'center' },
  warnActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  warnCancelBtn: { flex: 1, paddingVertical: 15, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  warnCancelText: { fontSize: 15, fontWeight: '700', color: C.muted },
  warnProceedBtn: { flex: 1, paddingVertical: 15, borderRadius: 14, backgroundColor: C.warning, alignItems: 'center' },
  warnProceedText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default AdminJobsScreen;
