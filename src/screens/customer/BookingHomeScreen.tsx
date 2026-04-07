import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import useAuthStore from '../../store/auth.store';
import usePremiumStore from '../../store/premium.store';
import { bookingAPI, amcAPI, ecoScoreAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { GOLD_GRADIENT, GOLD_GRADIENT_HORIZONTAL } from '../../utils/constants';
import { Booking, AmcContract } from '../../types';
import {
  Bell, Drop, ArrowRight, ClipboardText, Trophy, UserCircle,
  ShieldCheck, FileText, Calendar, Crown, Star,
} from '../../components/Icons';

const makeStyles = (C: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },

  // ── Header ──────────────────────────────────────
  header: {
    backgroundColor: C.surface,
    paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  greeting: { fontSize: 22, fontWeight: '700', color: C.foreground },
  subGreeting: { fontSize: 13, color: C.muted, marginTop: 2 },
  bellBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Hero CTA ────────────────────────────────────
  heroCta: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: C.primary, borderRadius: 20,
    padding: 20, flexDirection: 'row', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },
  heroIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  heroTitle: { fontSize: 18, fontWeight: '700', color: C.primaryFg },
  heroSub: { fontSize: 13, color: C.primaryFg, opacity: 0.75, marginTop: 3 },
  heroArrow: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Quick Actions ───────────────────────────────
  quickRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 20, gap: 10,
  },
  quickCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 16,
    padding: 16, alignItems: 'center', gap: 8,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  quickIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  quickLabel: { fontSize: 12, color: C.foreground, fontWeight: '600' },

  // ── Section ─────────────────────────────────────
  section: { marginHorizontal: 16, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: C.foreground },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText: { fontSize: 13, color: C.primary, fontWeight: '600' },

  // ── EcoScore ────────────────────────────────────
  ecoCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 20,
    flexDirection: 'row', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  ecoScoreWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.primaryBg, borderWidth: 3, borderColor: C.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  ecoScoreNum: { fontSize: 22, fontWeight: '700', color: C.primary },
  ecoLabel: { fontSize: 15, fontWeight: '700', color: C.foreground },
  ecoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.goldBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    marginTop: 4,
  },
  ecoBadgeText: { fontSize: 11, fontWeight: '700', color: C.gold },
  ecoSub: { fontSize: 12, color: C.muted, marginTop: 4 },

  // ── Premium AMC Card ────────────────────────────
  premiumCard: {
    backgroundColor: C.premiumBg, borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: C.premiumGoldLight,
    ...Platform.select({
      ios: { shadowColor: C.premiumGold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 16 },
      android: { elevation: 6 },
    }),
  },
  premiumGradientStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  premiumGradientTag: { fontSize: 12, fontWeight: '800', color: '#0B0B0B', letterSpacing: 2 },
  premiumHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  premiumIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.premiumGoldLight,
    alignItems: 'center', justifyContent: 'center',
  },
  premiumTag: { fontSize: 11, fontWeight: '700', color: C.premiumMuted, letterSpacing: 1.5 },
  premiumPlan: { fontSize: 22, fontWeight: '700', color: C.premiumGold, marginBottom: 8 },
  premiumRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  premiumActiveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.premiumGoldLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  premiumActiveText: { fontSize: 11, fontWeight: '700', color: C.premiumGold },
  premiumExpiry: { fontSize: 12, color: C.premiumMuted },
  premiumDivider: { height: 1, backgroundColor: C.premiumSurface, marginVertical: 14 },
  premiumLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  premiumLinkText: { fontSize: 14, fontWeight: '600', color: C.premiumGold },

  // ── AMC Upsell ──────────────────────────────────
  upsellCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  upsellTitle: { fontSize: 16, fontWeight: '700', color: C.foreground, marginBottom: 4 },
  upsellSub: { fontSize: 13, color: C.muted, marginBottom: 12 },
  upsellBtn: {
    backgroundColor: C.primaryBg, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    alignSelf: 'flex-start',
  },
  upsellBtnText: { fontSize: 13, fontWeight: '700', color: C.primary },

  // ── Booking Cards ───────────────────────────────
  bookingCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 14, marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  bookingRow: { flexDirection: 'row', alignItems: 'center' },
  bookingIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.primaryBg,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  bookingInfo: { flex: 1 },
  bookingType: { fontSize: 14, fontWeight: '700', color: C.foreground },
  bookingDate: { fontSize: 12, color: C.muted, marginTop: 2 },
  bookingAddr: { fontSize: 11, color: C.muted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: C.primaryFg, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

  emptyCard: {
    backgroundColor: C.surface, borderRadius: 20, padding: 32,
    alignItems: 'center', gap: 8,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  emptyText: { fontSize: 15, fontWeight: '600', color: C.foreground },
  emptySub: { fontSize: 13, color: C.muted },
});

const BookingHomeScreen = () => {
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);

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
      usePremiumStore.getState().setPremium(!!active);
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

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  const statusColor = (s: string) => {
    if (s === 'completed') return C.success;
    if (s === 'confirmed') return C.primary;
    if (s === 'cancelled') return C.danger;
    return C.warning;
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} tintColor={C.primary} />}
    >
      <StatusBar barStyle={usePremiumStore.getState().isPremium ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name || 'there'}</Text>
          <Text style={styles.subGreeting}>Keep your water safe & clean</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
          <Bell size={22} weight="regular" color={C.foreground} />
        </TouchableOpacity>
      </View>

      {/* EcoScore — Top */}
      {ecoScore && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your EcoScore</Text>
          <View style={{ height: 12 }} />
          <View style={styles.ecoCard}>
            <View style={styles.ecoScoreWrap}>
              <Text style={styles.ecoScoreNum}>{ecoScore.avg_score ?? '--'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ecoLabel}>Hygiene Rating</Text>
              <View style={styles.ecoBadge}>
                <Star size={12} weight="fill" color={C.gold} />
                <Text style={styles.ecoBadgeText}>{ecoScore.badge_level?.toUpperCase() || 'UNRATED'}</Text>
              </View>
              <Text style={styles.ecoSub}>Based on your last service</Text>
            </View>
          </View>
        </View>
      )}

      {/* Hero CTA — Book a Cleaning */}
      <TouchableOpacity onPress={() => navigation.navigate('TankDetails')} activeOpacity={0.85}>
        {usePremiumStore.getState().isPremium ? (
          <LinearGradient
            colors={[...GOLD_GRADIENT]}
            {...GOLD_GRADIENT_HORIZONTAL}
            style={styles.heroCta}
          >
            <View style={[styles.heroIconWrap, { backgroundColor: 'rgba(0,0,0,0.15)' }]}>
              <Drop size={28} weight="fill" color="#0B0B0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: '#0B0B0B' }]}>Book a Cleaning</Text>
              <Text style={[styles.heroSub, { color: 'rgba(0,0,0,0.6)' }]}>Tank & sump hygiene service</Text>
            </View>
            <View style={[styles.heroArrow, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
              <ArrowRight size={20} weight="bold" color="#0B0B0B" />
            </View>
          </LinearGradient>
        ) : (
          <View style={styles.heroCta}>
            <View style={styles.heroIconWrap}>
              <Drop size={28} weight="fill" color={C.primaryFg} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Book a Cleaning</Text>
              <Text style={styles.heroSub}>Tank & sump hygiene service</Text>
            </View>
            <View style={styles.heroArrow}>
              <ArrowRight size={20} weight="bold" color={C.primaryFg} />
            </View>
          </View>
        )}
      </TouchableOpacity>

      {/* AMC Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AMC Contract</Text>
        <View style={{ height: 12 }} />
        {amc ? (
          <View style={styles.premiumCard}>
            {/* Gold gradient header strip */}
            <LinearGradient
              colors={[...GOLD_GRADIENT]}
              {...GOLD_GRADIENT_HORIZONTAL}
              style={styles.premiumGradientStrip}
            >
              <Crown size={20} weight="fill" color="#0B0B0B" />
              <Text style={styles.premiumGradientTag}>AMC MEMBER</Text>
            </LinearGradient>

            <View style={{ padding: 20, paddingTop: 16 }}>
              <Text style={styles.premiumPlan}>{amc.plan_type?.toUpperCase()} PLAN</Text>
              <View style={styles.premiumRow}>
                <LinearGradient
                  colors={[...GOLD_GRADIENT]}
                  {...GOLD_GRADIENT_HORIZONTAL}
                  style={styles.premiumActiveBadge}
                >
                  <ShieldCheck size={14} weight="fill" color="#0B0B0B" />
                  <Text style={[styles.premiumActiveText, { color: '#0B0B0B' }]}>Active</Text>
                </LinearGradient>
                <Text style={styles.premiumExpiry}>Valid till {formatDate(amc.end_date)}</Text>
              </View>
              <View style={styles.premiumDivider} />
              <TouchableOpacity onPress={() => navigation.navigate('AmcPlans')} style={styles.premiumLink}>
                <Text style={styles.premiumLinkText}>Manage Contract</Text>
                <ArrowRight size={14} weight="bold" color={C.premiumGold} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.upsellCard}>
            <Text style={styles.upsellTitle}>No active AMC plan</Text>
            <Text style={styles.upsellSub}>Save up to 25% on every cleaning with an annual plan. Base service included free.</Text>
            <TouchableOpacity style={styles.upsellBtn} onPress={() => navigation.navigate('AmcPlans')}>
              <Text style={styles.upsellBtnText}>View Plans</Text>
              <ArrowRight size={14} weight="bold" color={C.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Recent Bookings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Bookings</Text>
          {bookings.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('MyBookings')} style={styles.seeAll}>
              <Text style={styles.seeAllText}>See all</Text>
              <ArrowRight size={14} weight="bold" color={C.primary} />
            </TouchableOpacity>
          )}
        </View>
        {bookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <ClipboardText size={36} weight="light" color={C.muted} />
            <Text style={styles.emptyText}>No bookings yet</Text>
            <Text style={styles.emptySub}>Your cleaning history will appear here</Text>
          </View>
        ) : (
          bookings.map((b) => (
            <TouchableOpacity
              key={b.id}
              style={styles.bookingCard}
              onPress={() => navigation.navigate('BookingDetail', { booking_id: b.id })}
              activeOpacity={0.7}
            >
              <View style={styles.bookingRow}>
                <View style={styles.bookingIconWrap}>
                  <Drop size={22} weight="fill" color={C.primary} />
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
    </ScrollView>
  );
};

export default BookingHomeScreen;
