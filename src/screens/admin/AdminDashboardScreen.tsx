import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl, Platform, StatusBar,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { adminAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import {
  CalendarBlank, CheckCircle, Wrench, Warning,
  ClipboardText, Receipt, Users, QrCode,
  CurrencyInr, Siren, Crown, UserCircle,
} from '../../components/Icons';

const AdminDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
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
      style={styles.root}
      contentContainerStyle={styles.body}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={C.primary} />}
    >
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSub}>Today's overview</Text>
      </View>

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

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AdminBookings')} activeOpacity={0.7}>
          <ClipboardText size={32} weight="regular" color={C.primary} />
          <Text style={styles.actionLabel}>Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AdminJobs')} activeOpacity={0.7}>
          <Wrench size={32} weight="regular" color={C.primary} />
          <Text style={styles.actionLabel}>Jobs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('QrScanner')} activeOpacity={0.7}>
          <QrCode size={32} weight="regular" color={C.primary} />
          <Text style={styles.actionLabel}>Scan Cert</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AdminTeams')} activeOpacity={0.7}>
          <Users size={32} weight="regular" color={C.primary} />
          <Text style={styles.actionLabel}>Agents</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AdminCustomers')} activeOpacity={0.7}>
          <UserCircle size={32} weight="regular" color={C.primary} />
          <Text style={styles.actionLabel}>Customers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AdminRevenue')} activeOpacity={0.7}>
          <CurrencyInr size={32} weight="regular" color={C.primary} />
          <Text style={styles.actionLabel}>Revenue</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AdminIncidents')} activeOpacity={0.7}>
          <Siren size={32} weight="regular" color={C.primary} />
          <Text style={styles.actionLabel}>Incidents</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AdminAmc')} activeOpacity={0.7}>
          <Crown size={32} weight="regular" color={C.primary} />
          <Text style={styles.actionLabel}>AMC</Text>
        </TouchableOpacity>
        <View style={styles.actionBtn}>
          <View style={{ opacity: 0 }}><QrCode size={32} weight="regular" color={C.primary} /></View>
          <Text style={[styles.actionLabel, { opacity: 0 }]}>Spacer</Text>
        </View>
      </View>

      {/* Recent Bookings */}
      <Text style={styles.sectionTitle}>Recent Bookings</Text>
      {recentBookings.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No bookings yet</Text>
        </View>
      ) : (
        recentBookings.map((b) => (
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
        ))
      )}
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
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 20 },
  actionBtn: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  actionLabel: { fontSize: 13, color: C.foreground, fontWeight: '600' },
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
