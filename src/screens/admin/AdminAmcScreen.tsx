import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Alert, Platform, StatusBar,
} from 'react-native';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { useFocusEffect } from '@react-navigation/native';
import { adminAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { ArrowsClockwise, CheckCircle, XCircle, Crown, Warning } from '../../components/Icons';

const FILTERS = ['All', 'Active', 'Pending', 'Expired', 'Cancelled'];

const AdminAmcScreen = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();
  const [contracts, setContracts] = useState<any[]>([]);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [contractsRes, expiringRes] = await Promise.allSettled([
        adminAPI.getAllAmcContracts() as any,
        adminAPI.getExpiringAmc(30) as any,
      ]);
      if (contractsRes.status === 'fulfilled') setContracts(contractsRes.value?.data?.contracts || []);
      if (expiringRes.status === 'fulfilled') setExpiring(expiringRes.value?.data?.contracts || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const filtered = filter === 'All'
    ? contracts
    : contracts.filter((c) => c.status === filter.toLowerCase());

  const statusColor = (s: string) => {
    if (s === 'active') return C.success;
    if (s === 'expired') return C.danger;
    if (s === 'cancelled') return C.muted;
    return C.warning;
  };

  const handleCancel = (id: string) => {
    Alert.alert('Cancel Contract', 'Are you sure you want to cancel this AMC contract?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Contract', style: 'destructive',
        onPress: async () => {
          setActionLoading(id);
          try {
            await adminAPI.cancelAmcContract(id);
            setContracts((prev) => prev.map((c) => c.id === id ? { ...c, status: 'cancelled' } : c));
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to cancel');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.iconBox}>
          <Crown size={22} weight="fill" color={C.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.planType}>{(item.plan_type || '').replace('_', ' ').toUpperCase()}</Text>
          <Text style={styles.customerName}>{item.customer_name || item.customer_phone || '\u2014'}</Text>
          <Text style={styles.dates}>
            {formatDate(item.start_date)} → {formatDate(item.end_date)}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor(item.status) + '22', borderColor: statusColor(item.status) }]}>
          <Text style={[styles.badgeText, { color: statusColor(item.status) }]}>
            {(item.status || 'pending').toUpperCase()}
          </Text>
        </View>
      </View>

      {(item.status === 'active' || item.status === 'pending') && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => handleCancel(item.id)}
            disabled={actionLoading === item.id}
            activeOpacity={0.7}
          >
            {actionLoading === item.id
              ? <ActivityIndicator size="small" color={C.danger} />
              : <>
                  <XCircle size={16} weight="bold" color={C.danger} />
                  <Text style={styles.cancelText}>Cancel Contract</Text>
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
        <Text style={styles.headerTitle}>AMC Contracts</Text>
        <Text style={styles.headerCount}>{filtered.length} contract{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Expiring Soon Alert */}
      {expiring.length > 0 && (
        <View style={styles.alertBanner}>
          <Warning size={16} weight="fill" color={C.warning} />
          <Text style={styles.alertText}>
            {expiring.length} contract{expiring.length !== 1 ? 's' : ''} expiring within 30 days
          </Text>
        </View>
      )}

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
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={C.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Crown size={48} weight="regular" color={C.muted} />
              <Text style={styles.emptyTitle}>No {filter !== 'All' ? filter.toLowerCase() : ''} contracts</Text>
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
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.warningBg, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.warning + '33',
  },
  alertText: { fontSize: 13, color: C.warning, fontWeight: '600' },
  filterRow: { backgroundColor: C.surface, flexShrink: 0, flexGrow: 0 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: C.surfaceElevated, marginRight: 8, borderWidth: 1.5, borderColor: C.muted + '44', flexShrink: 0 },
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
  iconBox: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: C.primaryBg,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  cardInfo: { flex: 1, marginRight: 8 },
  planType: { fontSize: 14, fontWeight: '700', color: C.primary },
  customerName: { fontSize: 15, fontWeight: '600', color: C.foreground, marginTop: 2 },
  dates: { fontSize: 12, color: C.muted, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  actions: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: C.dangerBg,
  },
  cancelText: { color: C.danger, fontWeight: '700', fontSize: 13 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },
});

export default AdminAmcScreen;
