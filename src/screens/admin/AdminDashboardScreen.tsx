import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl, Platform, StatusBar,
} from 'react-native';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { adminAPI } from '../../services/api';
import useAuthStore from '../../store/auth.store';
import { useTheme } from '../../hooks/useTheme';
import {
  CalendarBlank, CheckCircle, Wrench, Warning,
  ClipboardText, Receipt, Users, QrCode,
  CurrencyInr, Siren, Crown, UserCircle,
  ChartPie, ArrowRight, ShieldCheck, Car, Hourglass, Clock,
} from '../../components/Icons';
import WebContainer from '../../components/WebContainer';
import AdminInboxPanel from '../../components/AdminInboxPanel';

const AdminDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const me = useAuthStore((s) => s.user);
  const isSuperAdmin = me?.admin_role === 'super_admin';
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();
  const [stats, setStats] = useState<any>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [statsRes, bookingsRes, reqRes] = await Promise.allSettled([
        adminAPI.getTodayStats() as any,
        adminAPI.getAllBookings({ limit: 5 }) as any,
        adminAPI.getPendingRequestCount() as any,
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value?.data);
      if (bookingsRes.status === 'fulfilled') setRecentBookings(bookingsRes.value?.data?.bookings || []);
      if (reqRes.status === 'fulfilled') setPendingRequests(reqRes.value?.data?.pending_requests || 0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const statusColor = (s: string) => {
    if (s === 'completed') return C.success;
    if (s === 'confirmed') return C.primary;
    if (s === 'cancelled') return C.danger;
    return C.warning;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.root}
      contentContainerStyle={styles.body}
      refreshControl={Platform.OS !== 'web' ? <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={C.primary} /> : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <WebContainer>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSub}>Today's overview</Text>
      </View>

      {/* Live admin inbox — three primary buckets (alerts, requests,
          unassigned) plus all sub-categories (slot conflicts, SLA breach,
          incidents, payment pending, AMC expiring, new bookings, etc).
          Polls /admin/alerts/inbox every 30 s. */}
      <AdminInboxPanel />

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard C={C} label="Today's Jobs" value={stats?.today_total || '0'} icon={<CalendarBlank size={28} weight="regular" color={C.primary} />} color={C.primary} />
        <StatCard C={C} label="Completed" value={stats?.today_completed || '0'} icon={<CheckCircle size={28} weight="regular" color={C.success} />} color={C.success} />
        <StatCard C={C} label="In Progress" value={stats?.today_inprogress || '0'} icon={<Wrench size={28} weight="regular" color={C.warning} />} color={C.warning} />
        <StatCard C={C} label="Overdue" value={stats?.overdue || '0'} icon={<Warning size={28} weight="regular" color={C.danger} />} color={C.danger} />
        {pendingRequests > 0 && (
          <TouchableOpacity onPress={() => navigation.navigate('AdminJobs')} style={{ width: '97%' }}>
            <StatCard C={C} label="Pending Job Requests" value={String(pendingRequests)} icon={<Users size={28} weight="regular" color={C.accent} />} color={C.accent} />
          </TouchableOpacity>
        )}
      </View>

      {/* MIS Dashboards CTA */}
      <TouchableOpacity
        style={styles.misCta}
        onPress={() => navigation.navigate('MisHub')}
        activeOpacity={0.85}
      >
        <View style={styles.misCtaIcon}>
          <ChartPie size={26} weight="fill" color={C.primaryFg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.misCtaTitle}>Open Full MIS Dashboard</Text>
          <Text style={styles.misCtaSub}>Operational, EcoScore, Revenue, Sales, Referrals</Text>
        </View>
        <ArrowRight size={20} color={C.primaryFg} />
      </TouchableOpacity>

      {/* Quick Actions — flat grid (one container with flexWrap) so the layout
          is consistent regardless of item count. */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {([
          { label: 'Bookings',  icon: ClipboardText, route: 'AdminBookings' },
          { label: 'Jobs',      icon: Wrench,        route: 'AdminJobs' },
          { label: 'Scan Cert', icon: QrCode,        route: 'QrScanner' },
          { label: 'Agents',    icon: Users,         route: 'AdminTeams' },
          { label: 'Customers', icon: UserCircle,    route: 'AdminCustomers' },
          { label: 'Revenue',   icon: CurrencyInr,   route: 'AdminRevenue' },
          { label: 'Incidents', icon: Siren,         route: 'AdminIncidents' },
          { label: 'AMC',       icon: Crown,         route: 'AdminAmc' },
          { label: 'Auto Wash', icon: Car,           route: 'AdminAutoWash' },
          { label: 'Teams',     icon: Users,         route: 'AdminFieldTeams' },
          { label: 'Lost Leads', icon: Hourglass,    route: 'AdminAbandoned' },
          { label: 'Scheduling', icon: Clock,        route: 'AdminScheduling' },
          ...(isSuperAdmin
            ? [{ label: 'Admins', icon: ShieldCheck, route: 'AdminCreateAccount' }]
            : []),
        ] as const).map((a) => {
          const Icon = a.icon;
          return (
            <TouchableOpacity
              key={a.label}
              style={styles.actionBtn}
              onPress={() => navigation.navigate(a.route)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconWrap}>
                <Icon size={22} weight="regular" color={C.primary} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Recent Bookings */}
      <Text style={styles.sectionTitle}>Recent Bookings</Text>
      {recentBookings.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No bookings yet</Text>
        </View>
      ) : (
        <View style={styles.recentBookingsList}>
        {recentBookings.map((b) => (
          <TouchableOpacity
            key={b.id}
            style={styles.bookingCard}
            onPress={() => navigation.navigate('AdminBookings')}
            activeOpacity={0.7}
          >
            <View style={styles.bookingTop}>
              <Text style={styles.bookingPhone}>{b.customer_phone || b.customer_name || '\u2014'}</Text>
              <View style={[styles.badge, { backgroundColor: statusColor(b.status) + '22', borderColor: statusColor(b.status) }]}>
                <Text style={[styles.badgeText, { color: statusColor(b.status) }]}>{b.status?.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.bookingDetail}>
              {b.tank_type?.toUpperCase()} · {b.tank_size_litres}L · {'\u20B9'}{((b.amount_paise || 0) / 100).toLocaleString('en-IN')}
            </Text>
          </TouchableOpacity>
        ))}
        </View>
      )}
      </WebContainer>
    </ScrollView>
  );
};

const StatCard = ({ C, label, value, icon, color }: { C: any; label: string; value: string; icon: React.ReactNode; color: string }) => (
  <View style={{
    width: '47%', backgroundColor: C.surface, borderRadius: 16, padding: 16, alignItems: 'center' as const,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  }}>
    <View style={{ marginBottom: 6 }}>{icon}</View>
    <Text style={{ fontSize: 28, fontWeight: '700' as const, color }}>{value}</Text>
    <Text style={{ fontSize: 12, color: C.muted, marginTop: 2, textAlign: 'center' as const }}>{label}</Text>
  </View>
);

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  body: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  header: {
    backgroundColor: C.surface,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: C.foreground },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.muted, textTransform: 'uppercase', paddingHorizontal: 16, marginBottom: 10, marginTop: 4 },
  misCta: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 18,
    backgroundColor: C.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
      android: { elevation: 4 },
    }),
  },
  misCtaIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  misCtaTitle: { color: C.primaryFg, fontSize: 15, fontWeight: '700' },
  misCtaSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  actionBtn: {
    // Fixed-width tiles so the grid looks consistent regardless of item count.
    // calc keeps 5 per row on web (gap-aware); on mobile it falls back to ~30% (3 per row).
    width: Platform.OS === 'web' ? ('calc(20% - 10px)' as any) : '30%',
    minWidth: 120,
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  actionIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontSize: 13, color: C.foreground, fontWeight: '600', textAlign: 'center' },
  // Cap the list at ~5 cards' worth of height with internal scroll.
  // Prevents an ever-growing dashboard as more bookings come in.
  recentBookingsList: Platform.OS === 'web'
    ? ({ maxHeight: 360, overflow: 'auto', paddingRight: 4 } as any)
    : { maxHeight: 360 },
  bookingCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  bookingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  bookingPhone: { fontSize: 14, fontWeight: '600', color: C.foreground },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  bookingDetail: { fontSize: 12, color: C.muted },
  emptyBox: {
    marginHorizontal: 16, padding: 24, backgroundColor: C.surface, borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  emptyText: { color: C.muted, fontSize: 14 },
});

export default AdminDashboardScreen;
