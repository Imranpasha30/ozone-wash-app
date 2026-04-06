import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { bookingAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';
import { Booking } from '../../types';
import { Drop, ClipboardText, ArrowRight, Calendar, MapPin } from '../../components/Icons';

const FILTERS = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'];

const MyBookingsScreen = () => {
  const navigation = useNavigation<any>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');

  const fetchBookings = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await bookingAPI.getMyBookings() as any;
      setBookings(res.data?.bookings || []);
    } catch (_) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [])
  );

  const filtered = filter === 'All'
    ? bookings
    : bookings.filter((b) => b.status === filter.toLowerCase());

  const statusColor = (s: string) => {
    if (s === 'completed') return COLORS.success;
    if (s === 'confirmed') return COLORS.primary;
    if (s === 'cancelled') return COLORS.danger;
    return COLORS.warning;
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const fmt = (n: number) => `₹${(n / 100).toLocaleString('en-IN')}`;

  const renderItem = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('BookingDetail', { booking_id: item.id })}
    >
      <View style={styles.cardTop}>
        <View style={styles.tankIconContainer}>
          <Drop size={22} weight="fill" color={COLORS.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.tankType}>
            {item.tank_type?.replace('_', ' ').toUpperCase()} — {item.tank_size_litres}L
          </Text>
          <Text style={styles.date}>{formatDate(item.slot_time)} at {formatTime(item.slot_time)}</Text>
          <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor(item.status) }]}>
          <Text style={styles.badgeText}>{item.status?.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.cardBottom}>
        <Text style={styles.amount}>{fmt(item.amount_paise)}</Text>
        <Text style={styles.payStatus}>{item.payment_method?.toUpperCase()} · {item.payment_status}</Text>
        <ArrowRight size={16} weight="bold" color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerCount}>{filtered.length} booking{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Filter Chips */}
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
              <View style={styles.emptyIconContainer}>
                <ClipboardText size={40} weight="regular" color={COLORS.muted} />
              </View>
              <Text style={styles.emptyTitle}>No {filter !== 'All' ? filter.toLowerCase() : ''} bookings</Text>
              <Text style={styles.emptySub}>Book a service to see it here</Text>
              <TouchableOpacity
                style={styles.bookBtn}
                onPress={() => navigation.navigate('TankDetails')}
              >
                <Text style={styles.bookBtnText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
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
  filterRow: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceElevated,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  chipTextActive: { color: COLORS.primaryFg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  tankIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: { flex: 1 },
  tankType: { fontSize: 13, fontWeight: 'bold', color: COLORS.foreground },
  date: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  address: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8 },
  badgeText: { color: COLORS.primaryFg, fontSize: 9, fontWeight: 'bold' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  amount: { fontSize: 16, fontWeight: 'bold', color: COLORS.foreground, marginRight: 8 },
  payStatus: { flex: 1, fontSize: 12, color: COLORS.muted },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.foreground, marginBottom: 6 },
  emptySub: { fontSize: 14, color: COLORS.muted, marginBottom: 20, textAlign: 'center' },
  bookBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bookBtnText: { color: COLORS.primaryFg, fontWeight: 'bold', fontSize: 15 },
});

export default MyBookingsScreen;
