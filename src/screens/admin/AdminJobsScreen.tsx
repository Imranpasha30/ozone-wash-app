import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { adminAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';

const FILTERS = ['All', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'];

const AdminJobsScreen = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [assignLoading, setAssignLoading] = useState<string | null>(null);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [jobsRes, teamsRes] = await Promise.allSettled([
        adminAPI.getAllJobs() as any,
        adminAPI.getTeamList() as any,
      ]);
      if (jobsRes.status === 'fulfilled') setJobs(jobsRes.value?.data?.jobs || []);
      if (teamsRes.status === 'fulfilled') setTeams(teamsRes.value?.data?.teams || []);
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

  const handleAssign = (jobId: string) => {
    if (teams.length === 0) {
      Alert.alert('No Teams', 'No field teams available to assign.');
      return;
    }
    Alert.alert(
      'Assign Team',
      'Select a team:',
      [
        ...teams.map((t: any) => ({
          text: t.name || t.phone || t.id,
          onPress: async () => {
            setAssignLoading(jobId);
            try {
              await adminAPI.assignTeam(jobId, t.id);
              setJobs((prev) => prev.map((j) => j.id === jobId ? { ...j, assigned_team_id: t.id, team_name: t.name } : j));
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to assign team');
            } finally {
              setAssignLoading(null);
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const statusColor = (s: string) => {
    if (s === 'completed') return COLORS.success;
    if (s === 'in_progress') return COLORS.warning;
    if (s === 'cancelled') return COLORS.danger;
    return COLORS.primary;
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <Text style={styles.customerName}>{item.customer_name || item.customer_phone || '—'}</Text>
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
          onPress={() => handleAssign(item.id)}
          disabled={assignLoading === item.id}
        >
          {assignLoading === item.id
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Text style={styles.assignText}>👤 {item.assigned_team_id ? 'Reassign Team' : 'Assign Team'}</Text>}
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Jobs</Text>
        <Text style={styles.headerCount}>{filtered.length} job{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

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
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

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
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🔧</Text>
              <Text style={styles.emptyTitle}>No {filter !== 'All' ? filter.toLowerCase() : ''} jobs</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.foreground },
  headerCount: { fontSize: 13, color: COLORS.muted },
  filterRow: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterContent: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row' },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.surfaceElevated, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  chipTextActive: { color: COLORS.primaryFg },
  list: { padding: 16 },
  emptyContainer: { flex: 1 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardInfo: { flex: 1, marginRight: 8 },
  customerName: { fontSize: 15, fontWeight: 'bold', color: COLORS.foreground, marginBottom: 2 },
  cardDetail: { fontSize: 13, color: COLORS.muted, marginBottom: 2 },
  cardDate: { fontSize: 12, color: COLORS.muted, marginBottom: 2 },
  teamText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  assignBtn: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, alignItems: 'center', paddingVertical: 8, backgroundColor: COLORS.primaryBg, borderRadius: 10 },
  assignText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 13 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.foreground },
});

export default AdminJobsScreen;
