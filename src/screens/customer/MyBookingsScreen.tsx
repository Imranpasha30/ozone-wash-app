import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { bookingAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { Booking } from '../../types';
import { Drop, ClipboardText, ArrowRight, Key } from '../../components/Icons';

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  tankIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: { flex: 1 },
  bookingId: { fontSize: 11, color: C.primary, fontFamily: 'monospace', fontWeight: '600', marginBottom: 2 },
  tankType: { fontSize: 14, fontWeight: '700', color: C.foreground },
  date: { fontSize: 12, color: C.muted, marginTop: 2 },
  address: { fontSize: 11, color: C.muted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 8 },
  badgeText: { color: C.primaryFg, fontSize: 9, fontWeight: '700' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10 },
  amount: { fontSize: 16, fontWeight: '700', color: C.foreground, marginRight: 8 },
  payStatus: { flex: 1, fontSize: 12, color: C.muted },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },
  emptySub: { fontSize: 14, color: C.muted, textAlign: 'center' },
  bookBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  bookBtnText: { color: C.primaryFg, fontWeight: '700', fontSize: 15 },
  otpHint: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.primaryBg, paddingHorizontal: 14, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: C.primary,
  },
  otpLabel: { fontSize: 12, color: C.primary, fontWeight: '600' },
  otpCode: { fontSize: 18, fontWeight: '800', color: C.primary, letterSpacing: 4, fontVariant: ['tabular-nums'] as any },
  actionHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.primaryBg, paddingHorizontal: 14, paddingVertical: 10,
  },
  actionHintText: { fontSize: 12, color: C.primary, fontWeight: '600' },
});

const MyBookingsScreen = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const navigation = useNavigation<any>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const statusColor = (s: string) => {
    if (s === 'completed') return C.success;
    if (s === 'confirmed') return C.primary;
    if (s === 'cancelled') return C.danger;
    return C.warning;
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
      activeOpacity={0.7}
    >
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={styles.tankIconContainer}>
            <Drop size={22} weight="fill" color={C.primary} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.bookingId}>#{item.id?.slice(0, 8).toUpperCase()}</Text>
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
          <Text style={styles.amount}>{item.amount_paise === 0 ? 'FREE' : fmt(item.amount_paise)}</Text>
          <Text style={styles.payStatus}>{item.payment_method?.toUpperCase()} · {item.payment_status}</Text>
          <ArrowRight size={16} weight="bold" color={C.primary} />
        </View>
      </View>
      {item.start_otp && !item.start_otp_verified && (
        <View style={styles.otpHint}>
          <Key size={14} weight="fill" color={C.primary} />
          <Text style={styles.otpLabel}>Start OTP:</Text>
          <Text style={styles.otpCode}>{item.start_otp}</Text>
        </View>
      )}
      {item.end_otp && !item.end_otp_verified && (
        <View style={[styles.otpHint, { borderTopColor: C.success }]}>
          <Key size={14} weight="fill" color={C.success} />
          <Text style={[styles.otpLabel, { color: C.success }]}>End OTP:</Text>
          <Text style={[styles.otpCode, { color: C.success }]}>{item.end_otp}</Text>
        </View>
      )}
      {item.status === 'confirmed' && item.assigned_team_id && !item.start_otp && (
        <View style={styles.actionHint}>
          <Key size={14} weight="fill" color={C.primary} />
          <Text style={styles.actionHintText}>Technician assigned — tap to view details</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <Text style={styles.headerCount}>{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          renderItem={renderItem}
          contentContainerStyle={bookings.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            Platform.OS !== 'web'
              ? <RefreshControl refreshing={refreshing} onRefresh={() => fetchBookings(true)} tintColor={C.primary} />
              : undefined
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconContainer}>
                <ClipboardText size={40} weight="regular" color={C.muted} />
              </View>
              <Text style={styles.emptyTitle}>No bookings yet</Text>
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

export default MyBookingsScreen;
