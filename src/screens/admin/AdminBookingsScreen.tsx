import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Alert, Platform, StatusBar,
} from 'react-native';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { useFocusEffect } from '@react-navigation/native';
import { adminAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { ClipboardText, Check, X } from '../../components/Icons';

const FILTERS = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'];

const AdminBookingsScreen = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBookings = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await adminAPI.getAllBookings({ limit: 50 }) as any;
      setBookings(res.data?.bookings || []);
    } catch (_) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchBookings(); }, []));

  const filtered = filter === 'All'
    ? bookings
    : bookings.filter((b) => b.status === filter.toLowerCase());

  const handleConfirm = async (id: string) => {
    setActionLoading(id + '_confirm');
    try {
      await adminAPI.confirmBooking(id);
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: 'confirmed' } : b));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to confirm booking');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Booking', style: 'destructive',
        onPress: async () => {
          setActionLoading(id + '_cancel');
          try {
            await adminAPI.cancelBooking(id);
            setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: 'cancelled' } : b));
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to cancel booking');
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  const statusColor = (s: string) => {
    if (s === 'completed') return C.success;
    if (s === 'confirmed') return C.primary;
    if (s === 'cancelled') return C.danger;
    return C.warning;
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <Text style={styles.bookingId}>Booking #{item.id?.slice(0, 8).toUpperCase()}</Text>
          {item.job_id && (
            <Text style={styles.bookingId}>Job #{item.job_id?.slice(0, 8).toUpperCase()}</Text>
          )}
          <Text style={styles.customerName}>{item.customer_name || item.customer_phone || '\u2014'}</Text>
          <Text style={styles.cardDetail}>
            {item.tank_type?.toUpperCase()} · {item.tank_size_litres}L · {'\u20B9'}{((item.amount_paise || 0) / 100).toLocaleString('en-IN')}
          </Text>
          <Text style={styles.cardDate}>
            {new Date(item.slot_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
          </Text>
          <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
          <Text style={styles.cardDetail}>
            {item.team_name ? `Team: ${item.team_name}` : 'Unassigned'}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor(item.status) + '22', borderColor: statusColor(item.status) }]}>
          <Text style={[styles.badgeText, { color: statusColor(item.status) }]}>{item.status?.toUpperCase()}</Text>
        </View>
      </View>

      {item.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.confirmBtn]}
            onPress={() => handleConfirm(item.id)}
            disabled={!!actionLoading}
            activeOpacity={0.7}
          >
            {actionLoading === item.id + '_confirm'
              ? <ActivityIndicator size="small" color={C.primary} />
              : (
                <View style={styles.actionBtnInner}>
                  <Check size={16} weight="bold" color={C.primary} />
                  <Text style={styles.confirmText}> Confirm</Text>
                </View>
              )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.cancelBtn]}
            onPress={() => handleCancel(item.id)}
            disabled={!!actionLoading}
            activeOpacity={0.7}
          >
            {actionLoading === item.id + '_cancel'
              ? <ActivityIndicator size="small" color={C.danger} />
              : (
                <View style={styles.actionBtnInner}>
                  <X size={16} weight="bold" color={C.danger} />
                  <Text style={styles.cancelText}> Cancel</Text>
                </View>
              )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Bookings</Text>
        <Text style={styles.headerCount}>{filtered.length} booking{filtered.length !== 1 ? 's' : ''}</Text>
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
          keyExtractor={(b) => b.id}
          renderItem={renderItem}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchBookings(true)} tintColor={C.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <ClipboardText size={48} weight="regular" color={C.muted} />
              <Text style={styles.emptyTitle}>No {filter !== 'All' ? filter.toLowerCase() : ''} bookings</Text>
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
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardInfo: { flex: 1, marginRight: 8 },
  bookingId: { fontSize: 11, color: C.primary, fontFamily: 'monospace', fontWeight: '600', marginBottom: 2 },
  customerName: { fontSize: 15, fontWeight: '700', color: C.foreground, marginBottom: 2 },
  cardDetail: { fontSize: 13, color: C.muted, marginBottom: 2 },
  cardDate: { fontSize: 12, color: C.muted, marginBottom: 2 },
  cardAddress: { fontSize: 11, color: C.muted },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  actionBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  confirmBtn: { backgroundColor: C.primaryBg },
  cancelBtn: { backgroundColor: C.dangerBg },
  confirmText: { color: C.primary, fontWeight: '700', fontSize: 13 },
  cancelText: { color: C.danger, fontWeight: '700', fontSize: 13 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },
});

export default AdminBookingsScreen;
