import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { adminAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';
import {
  CalendarBlank, CheckCircle, Wrench, Warning,
  ClipboardText, Receipt,
} from '../../components/Icons';

const AdminDashboardScreen = () => {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<any>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [statsRes, bookingsRes] = await Promise.allSettled([
        adminAPI.getTodayStats() as any,
        adminAPI.getAllBookings({ limit: 5 }) as any,
      ]);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value?.data);
      if (bookingsRes.status === 'fulfilled') setRecentBookings(bookingsRes.value?.data?.bookings || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const statusColor = (s: string) => {
    if (s === 'completed') return COLORS.success;
    if (s === 'confirmed') return COLORS.primary;
    if (s === 'cancelled') return COLORS.danger;
    return COLORS.warning;
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
      style={styles.root}
      contentContainerStyle={styles.body}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={COLORS.primary} />}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSub}>Today's overview</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard label="Today's Jobs" value={stats?.today_total || '0'} icon={<CalendarBlank size={28} weight="regular" color={COLORS.primary} />} color={COLORS.primary} />
        <StatCard label="Completed" value={stats?.today_completed || '0'} icon={<CheckCircle size={28} weight="regular" color={COLORS.success} />} color={COLORS.success} />
        <StatCard label="In Progress" value={stats?.today_inprogress || '0'} icon={<Wrench size={28} weight="regular" color={COLORS.warning} />} color={COLORS.warning} />
        <StatCard label="Overdue" value={stats?.overdue || '0'} icon={<Warning size={28} weight="regular" color={COLORS.danger} />} color={COLORS.danger} />
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AdminBookings')}>
          <ClipboardText size={32} weight="regular" color={COLORS.primary} />
          <Text style={styles.actionLabel}>All Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AdminJobs')}>
          <Wrench size={32} weight="regular" color={COLORS.primary} />
          <Text style={styles.actionLabel}>All Jobs</Text>
        </TouchableOpacity>
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
          >
            <View style={styles.bookingTop}>
              <Text style={styles.bookingPhone}>{b.customer_phone || b.customer_name || '—'}</Text>
              <View style={[styles.badge, { backgroundColor: statusColor(b.status) + '22', borderColor: statusColor(b.status) }]}>
                <Text style={[styles.badgeText, { color: statusColor(b.status) }]}>{b.status?.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.bookingDetail}>
              {b.tank_type?.toUpperCase()} · {b.tank_size_litres}L · ₹{((b.amount_paise || 0) / 100).toLocaleString('en-IN')}
            </Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
};

const StatCard = ({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) => (
  <View style={[styles.statCard, { borderColor: color + '40' }]}>
    <View style={styles.statIconWrap}>{icon}</View>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  body: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.foreground },
  headerSub: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 10,
  },
  statCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  statIconWrap: { marginBottom: 6 },
  statValue: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: COLORS.muted, marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', paddingHorizontal: 16, marginBottom: 10, marginTop: 4 },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 20 },
  actionBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  actionLabel: { fontSize: 13, color: COLORS.foreground, fontWeight: '600' },
  bookingCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bookingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  bookingPhone: { fontSize: 14, fontWeight: '600', color: COLORS.foreground },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  bookingDetail: { fontSize: 12, color: COLORS.muted },
  emptyBox: { marginHorizontal: 16, padding: 24, backgroundColor: COLORS.surface, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  emptyText: { color: COLORS.muted, fontSize: 14 },
});

export default AdminDashboardScreen;
