import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Alert, Platform, StatusBar,
} from 'react-native';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { useFocusEffect } from '@react-navigation/native';
import { incidentAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { Siren, CheckCircle, Warning, ArrowRight } from '../../components/Icons';

const FILTERS = ['All', 'Open', 'Resolved', 'Escalated'];

const AdminIncidentsScreen = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchIncidents = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await incidentAPI.getAll() as any;
      setIncidents(res.data?.incidents || []);
    } catch (_) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchIncidents(); }, []));

  const filtered = filter === 'All'
    ? incidents
    : incidents.filter((i) => i.status === filter.toLowerCase());

  const severityColor = (s: string) => {
    if (s === 'critical') return C.danger;
    if (s === 'high') return '#F97316';
    if (s === 'medium') return C.warning;
    return C.info;
  };

  const statusColor = (s: string) => {
    if (s === 'resolved') return C.success;
    if (s === 'escalated') return C.danger;
    return C.warning;
  };

  const handleResolve = async (id: string) => {
    setActionLoading(id + '_resolve');
    try {
      await incidentAPI.resolve(id);
      setIncidents((prev) => prev.map((i) => i.id === id ? { ...i, status: 'resolved' } : i));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resolve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEscalate = async (id: string) => {
    Alert.alert('Escalate Incident', 'Are you sure you want to escalate this incident?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Escalate', style: 'destructive',
        onPress: async () => {
          setActionLoading(id + '_escalate');
          try {
            await incidentAPI.escalate(id);
            setIncidents((prev) => prev.map((i) => i.id === id ? { ...i, status: 'escalated' } : i));
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to escalate');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { borderLeftColor: severityColor(item.severity) }]}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <View style={styles.severityRow}>
            <View style={[styles.severityChip, { backgroundColor: severityColor(item.severity) + '22', borderColor: severityColor(item.severity) }]}>
              <Text style={[styles.severityText, { color: severityColor(item.severity) }]}>
                {(item.severity || 'medium').toUpperCase()}
              </Text>
            </View>
            <View style={[styles.statusChip, { backgroundColor: statusColor(item.status) + '22', borderColor: statusColor(item.status) }]}>
              <Text style={[styles.statusText, { color: statusColor(item.status) }]}>
                {(item.status || 'open').toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
          <Text style={styles.meta}>
            Job #{item.job_id?.slice(0, 8).toUpperCase()} {'\u00B7'} {formatDate(item.created_at)}
          </Text>
          {item.reporter_name && <Text style={styles.reporter}>Reported by: {item.reporter_name}</Text>}
        </View>
      </View>

      {item.status === 'open' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.resolveBtn}
            onPress={() => handleResolve(item.id)}
            disabled={!!actionLoading}
            activeOpacity={0.7}
          >
            {actionLoading === item.id + '_resolve'
              ? <ActivityIndicator size="small" color={C.success} />
              : <>
                  <CheckCircle size={16} weight="bold" color={C.success} />
                  <Text style={styles.resolveText}>Resolve</Text>
                </>
            }
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.escalateBtn}
            onPress={() => handleEscalate(item.id)}
            disabled={!!actionLoading}
            activeOpacity={0.7}
          >
            {actionLoading === item.id + '_escalate'
              ? <ActivityIndicator size="small" color={C.danger} />
              : <>
                  <ArrowRight size={16} weight="bold" color={C.danger} />
                  <Text style={styles.escalateText}>Escalate</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Incidents</Text>
        <Text style={styles.headerCount}>{filtered.length} incident{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterRow} contentContainerStyle={styles.filterContent}
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
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchIncidents(true)} tintColor={C.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Siren size={48} weight="regular" color={C.muted} />
              <Text style={styles.emptyTitle}>No {filter !== 'All' ? filter.toLowerCase() : ''} incidents</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: C.surface, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.foreground },
  headerCount: { fontSize: 13, color: C.muted },
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
    borderLeftWidth: 4,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardTop: { marginBottom: 8 },
  cardInfo: { flex: 1 },
  severityRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  severityChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  severityText: { fontSize: 10, fontWeight: '700' },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700' },
  description: { fontSize: 14, color: C.foreground, lineHeight: 20, marginBottom: 6 },
  meta: { fontSize: 11, color: C.muted, fontFamily: 'monospace' },
  reporter: { fontSize: 12, color: C.muted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  resolveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: C.successBg,
  },
  resolveText: { color: C.success, fontWeight: '700', fontSize: 13 },
  escalateBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: C.dangerBg,
  },
  escalateText: { color: C.danger, fontWeight: '700', fontSize: 13 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },
});

export default AdminIncidentsScreen;
