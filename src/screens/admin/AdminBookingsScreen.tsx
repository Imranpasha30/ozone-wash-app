import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { adminAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';

const FILTERS = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'];

const AdminBookingsScreen = () => {
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
    if (s === 'completed') return COLORS.success;
    if (s === 'confirmed') return COLORS.primary;
    if (s === 'cancelled') return COLORS.danger;
    return COLORS.warning;
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardInfo}>
          <Text style={styles.customerName}>{item.customer_name || item.customer_phone || '—'}</Text>
          <Text style={styles.cardDetail}>
            {item.tank_type?.toUpperCase()} · {item.tank_size_litres}L · ₹{((item.amount_paise || 0) / 100).toLocaleString('en-IN')}
          </Text>
          <Text style={styles.cardDate}>
            {new Date(item.slot_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
          </Text>
          <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor(item.status) + '22', borderColor: statusColor(item.status) }]}>
          <Text style={[styles.badgeText, { color: statusColor(item.status) }]}>{item.status?.toUpperCase()}</Text>
        </View>
      </View>

      {/* Action buttons for pending bookings */}
      {item.status === 'pending' && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.confirmBtn]}
            onPress={() => handleConfirm(item.id)}
            disabled={!!actionLoading}
          >
            {actionLoading === item.id + '_confirm'
              ? <ActivityIndicator size="small" color={COLORS.primaryFg} />
              : <Text style={styles.confirmText}>✓ Confirm</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.cancelBtn]}
            onPress={() => handleCancel(item.id)}
            disabled={!!actionLoading}
          >
            {actionLoading === item.id + '_cancel'
              ? <ActivityIndicator size="small" color={COLORS.danger} />
              : <Text style={styles.cancelText}>✕ Cancel</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.root}>
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
          keyExtractor={(b) => b.id}
          renderItem={renderItem}
          contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchBookings(true)} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>No {filter !== 'All' ? filter.toLowerCase() : ''} bookings</Text>
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
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cardInfo: { flex: 1, marginRight: 8 },
  customerName: { fontSize: 15, fontWeight: 'bold', color: COLORS.foreground, marginBottom: 2 },
  cardDetail: { fontSize: 13, color: COLORS.muted, marginBottom: 2 },
  cardDate: { fontSize: 12, color: COLORS.muted, marginBottom: 2 },
  cardAddress: { fontSize: 11, color: COLORS.muted },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  confirmBtn: { backgroundColor: COLORS.primaryBg, borderColor: COLORS.primary },
  cancelBtn: { backgroundColor: COLORS.dangerBg, borderColor: COLORS.danger },
  confirmText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 13 },
  cancelText: { color: COLORS.danger, fontWeight: 'bold', fontSize: 13 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.foreground },
});

export default AdminBookingsScreen;
