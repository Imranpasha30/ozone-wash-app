import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import useAuthStore from '../../store/auth.store';
import { bookingAPI, amcAPI, ecoScoreAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';
import { Booking, AmcContract } from '../../types';
import {
  Bell, Drop, ArrowRight, ClipboardText, Trophy, UserCircle,
  ShieldCheck, FileText, MapPin, Calendar,
} from '../../components/Icons';

const BADGE_COLORS: Record<string, string> = {
  platinum: COLORS.platinum,
  gold: COLORS.gold,
  silver: COLORS.silver,
  bronze: COLORS.bronze,
};

const BookingHomeScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [amc, setAmc] = useState<AmcContract | null>(null);
  const [ecoScore, setEcoScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [bRes, amcRes] = await Promise.all([
        bookingAPI.getMyBookings(),
        amcAPI.getMyContracts(),
      ]);
      const allBookings: Booking[] = (bRes as any).data?.bookings || [];
      setBookings(allBookings.slice(0, 3));
      const contracts: AmcContract[] = (amcRes as any).data?.contracts || [];
      const active = contracts.find((c) => c.status === 'active') || null;
      setAmc(active);
    } catch (_) {}
  };

  const loadEco = async () => {
    try {
      const res = await ecoScoreAPI.getLeaderboard() as any;
      const entries = res.data?.leaderboard || [];
      const mine = entries.find((e: any) => e.team_name === user?.name) || entries[0];
      if (mine) setEcoScore(mine);
    } catch (_) {}
  };

  const fetchAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    await Promise.all([load(), loadEco()]);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [])
  );

  const statusColor = (s: string) => {
    if (s === 'completed') return COLORS.success;
    if (s === 'confirmed') return COLORS.primary;
    if (s === 'cancelled') return COLORS.danger;
    return COLORS.warning;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name || 'Customer'}</Text>
          <Text style={styles.subGreeting}>Keep your water safe & clean</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
          <Bell size={24} weight="regular" color={COLORS.foreground} />
        </TouchableOpacity>
      </View>

      {/* Book Now CTA */}
      <TouchableOpacity style={styles.bookBtn} onPress={() => navigation.navigate('TankDetails')}>
        <View style={styles.bookBtnIconWrap}>
          <Drop size={28} weight="fill" color={COLORS.primaryFg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bookBtnTitle}>Book a Cleaning</Text>
          <Text style={styles.bookBtnSub}>Schedule tank & sump hygiene service</Text>
        </View>
        <ArrowRight size={22} weight="bold" color={COLORS.primaryFg} />
      </TouchableOpacity>

      {/* EcoScore Card */}
      {ecoScore && (
        <View style={[styles.card, { borderLeftColor: BADGE_COLORS[ecoScore.badge_level] || COLORS.secondary }]}>
          <Text style={styles.cardLabel}>Your EcoScore</Text>
          <View style={styles.ecoRow}>
            <Text style={styles.ecoScore}>{ecoScore.avg_score ?? '--'}</Text>
            <View style={[styles.ecoBadge, { backgroundColor: BADGE_COLORS[ecoScore.badge_level] || COLORS.secondary }]}>
              <Text style={styles.ecoBadgeText}>{ecoScore.badge_level?.toUpperCase() || '--'}</Text>
            </View>
          </View>
          <Text style={styles.cardSub}>Based on your last cleaning service</Text>
        </View>
      )}

      {/* AMC Status */}
      <View style={[styles.card, { borderLeftColor: amc ? COLORS.secondary : COLORS.accent }]}>
        <Text style={styles.cardLabel}>AMC Contract</Text>
        {amc ? (
          <>
            <Text style={styles.amcPlan}>{amc.plan_type?.toUpperCase()} Plan -- Active</Text>
            <Text style={styles.cardSub}>Valid till {formatDate(amc.end_date)}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AmcPlans')} style={styles.linkRow}>
              <Text style={styles.link}>Manage AMC</Text>
              <ArrowRight size={14} weight="bold" color={COLORS.primary} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.amcPlan}>No active AMC</Text>
            <Text style={styles.cardSub}>Get up to 25% off with an annual plan</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AmcPlans')} style={styles.linkRow}>
              <Text style={styles.link}>View Plans</Text>
              <ArrowRight size={14} weight="bold" color={COLORS.primary} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Recent Bookings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Bookings</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MyBookings')} style={styles.linkRow}>
            <Text style={styles.link}>See all</Text>
            <ArrowRight size={14} weight="bold" color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        {bookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <ClipboardText size={40} weight="light" color={COLORS.muted} />
            <Text style={styles.emptyText}>No bookings yet</Text>
            <Text style={styles.emptySub}>Your cleaning history will appear here</Text>
          </View>
        ) : (
          bookings.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={styles.bookingCard}
              onPress={() => navigation.navigate('BookingDetail', { booking_id: b.id })}
            >
              <View style={styles.bookingRow}>
                <View style={styles.bookingIconWrap}>
                  <Drop size={22} weight="fill" color={COLORS.primary} />
                </View>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingType}>{b.tank_type?.replace('_', ' ').toUpperCase()} TANK</Text>
                  <Text style={styles.bookingDate}>{formatDate(b.slot_time)}</Text>
                  <Text style={styles.bookingAddr} numberOfLines={1}>{b.address}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(b.status) }]}>
                  <Text style={styles.statusText}>{b.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Quick Links */}
      <View style={styles.quickLinks}>
        <TouchableOpacity style={styles.quickLink} onPress={() => navigation.navigate('Certificates')}>
          <Trophy size={26} weight="regular" color={COLORS.primary} />
          <Text style={styles.quickLabel}>Certificates</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickLink} onPress={() => navigation.navigate('AmcPlans')}>
          <FileText size={26} weight="regular" color={COLORS.primary} />
          <Text style={styles.quickLabel}>AMC Plans</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickLink} onPress={() => navigation.navigate('Profile')}>
          <UserCircle size={26} weight="regular" color={COLORS.primary} />
          <Text style={styles.quickLabel}>Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  greeting: { fontSize: 20, fontWeight: 'bold', color: COLORS.foreground },
  subGreeting: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  bellBtn: { padding: 8 },
  bookBtn: {
    margin: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookBtnIconWrap: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  bookBtnTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.primaryFg },
  bookBtnSub: { fontSize: 12, color: COLORS.primaryFg, opacity: 0.8, marginTop: 2 },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
  },
  cardLabel: { fontSize: 11, color: COLORS.muted, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },
  cardSub: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  ecoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ecoScore: { fontSize: 36, fontWeight: 'bold', color: COLORS.primary },
  ecoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  ecoBadgeText: { color: COLORS.primaryFg, fontWeight: 'bold', fontSize: 12 },
  amcPlan: { fontSize: 16, fontWeight: 'bold', color: COLORS.foreground, marginBottom: 2 },
  link: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  section: { marginHorizontal: 16, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.foreground },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  emptyText: { fontSize: 15, fontWeight: '600', color: COLORS.foreground },
  emptySub: { fontSize: 12, color: COLORS.muted },
  bookingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bookingRow: { flexDirection: 'row', alignItems: 'center' },
  bookingIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.primaryBg,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  bookingInfo: { flex: 1 },
  bookingType: { fontSize: 13, fontWeight: 'bold', color: COLORS.foreground },
  bookingDate: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  bookingAddr: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { color: COLORS.primaryFg, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  quickLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  quickLink: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  quickLabel: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
});

export default BookingHomeScreen;
