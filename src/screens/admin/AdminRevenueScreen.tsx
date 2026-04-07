import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { adminAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import {
  CurrencyInr, TrendUp, CheckCircle, ClipboardText, Receipt,
} from '../../components/Icons';

const AdminRevenueScreen = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await adminAPI.getAllBookings({ limit: 100 }) as any;
      setBookings(res.data?.bookings || []);
    } catch (_) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  // Compute revenue stats
  const totalRevenue = bookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + (b.amount_paise || 0), 0);
  const completedRevenue = bookings
    .filter(b => b.status === 'completed' || b.job_status === 'completed')
    .reduce((sum, b) => sum + (b.amount_paise || 0), 0);
  const pendingRevenue = bookings
    .filter(b => b.status === 'pending' || b.status === 'confirmed')
    .reduce((sum, b) => sum + (b.amount_paise || 0), 0);
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter(b => b.status === 'completed' || b.job_status === 'completed').length;
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;

  const formatCurrency = (paise: number) =>
    '\u20B9' + (paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });

  // Recent completed bookings for the list
  const recentCompleted = bookings
    .filter(b => b.status === 'completed' || b.job_status === 'completed')
    .slice(0, 10);

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
        <Text style={styles.headerTitle}>Revenue</Text>
        <Text style={styles.headerSub}>Overview</Text>
      </View>

      {/* Total Revenue Card */}
      <View style={styles.totalCard}>
        <View style={styles.totalIconBox}>
          <CurrencyInr size={28} weight="bold" color={C.primaryFg} />
        </View>
        <Text style={styles.totalLabel}>Total Revenue</Text>
        <Text style={styles.totalValue}>{formatCurrency(totalRevenue)}</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <TrendUp size={22} weight="regular" color={C.success} />
          <Text style={[styles.statValue, { color: C.success }]}>{formatCurrency(completedRevenue)}</Text>
          <Text style={styles.statLabel}>Collected</Text>
        </View>
        <View style={styles.statCard}>
          <Receipt size={22} weight="regular" color={C.warning} />
          <Text style={[styles.statValue, { color: C.warning }]}>{formatCurrency(pendingRevenue)}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <ClipboardText size={22} weight="regular" color={C.primary} />
          <Text style={[styles.statValue, { color: C.primary }]}>{totalBookings}</Text>
          <Text style={styles.statLabel}>Bookings</Text>
        </View>
        <View style={styles.statCard}>
          <CheckCircle size={22} weight="regular" color={C.success} />
          <Text style={[styles.statValue, { color: C.success }]}>{completedBookings}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Conversion Stats */}
      <View style={styles.conversionCard}>
        <Text style={styles.conversionTitle}>Conversion</Text>
        <View style={styles.conversionRow}>
          <View style={styles.conversionItem}>
            <Text style={[styles.conversionValue, { color: C.success }]}>
              {totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0}%
            </Text>
            <Text style={styles.conversionLabel}>Completion Rate</Text>
          </View>
          <View style={styles.conversionDivider} />
          <View style={styles.conversionItem}>
            <Text style={[styles.conversionValue, { color: C.danger }]}>
              {cancelledBookings}
            </Text>
            <Text style={styles.conversionLabel}>Cancelled</Text>
          </View>
          <View style={styles.conversionDivider} />
          <View style={styles.conversionItem}>
            <Text style={[styles.conversionValue, { color: C.primary }]}>
              {totalBookings > 0 ? formatCurrency(Math.round(totalRevenue / totalBookings)) : '\u20B90'}
            </Text>
            <Text style={styles.conversionLabel}>Avg. Value</Text>
          </View>
        </View>
      </View>

      {/* Recent Transactions */}
      {recentCompleted.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          {recentCompleted.map((b) => (
            <View key={b.id} style={styles.txCard}>
              <View style={styles.txInfo}>
                <Text style={styles.txName}>{b.customer_name || b.customer_phone || '\u2014'}</Text>
                <Text style={styles.txDetail}>
                  {b.tank_type?.toUpperCase()} {'\u00B7'} {b.tank_size_litres}L
                </Text>
              </View>
              <Text style={styles.txAmount}>{formatCurrency(b.amount_paise || 0)}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  body: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  header: {
    backgroundColor: C.surface, paddingTop: 56, paddingBottom: 20, paddingHorizontal: 20,
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: C.foreground },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  totalCard: {
    margin: 16, backgroundColor: C.primary, borderRadius: 20, padding: 24, alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  totalIconBox: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  totalLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  totalValue: { fontSize: 36, fontWeight: '700', color: '#FFF', marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 10 },
  statCard: {
    width: '47%', backgroundColor: C.surface, borderRadius: 16, padding: 16, alignItems: 'center', gap: 6,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12, color: C.muted },
  conversionCard: {
    margin: 16, backgroundColor: C.surface, borderRadius: 16, padding: 16,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  conversionTitle: { fontSize: 14, fontWeight: '700', color: C.foreground, marginBottom: 14 },
  conversionRow: { flexDirection: 'row', alignItems: 'center' },
  conversionItem: { flex: 1, alignItems: 'center' },
  conversionValue: { fontSize: 20, fontWeight: '700' },
  conversionLabel: { fontSize: 11, color: C.muted, marginTop: 4 },
  conversionDivider: { width: 1, height: 40, backgroundColor: C.border },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: C.muted, textTransform: 'uppercase', paddingHorizontal: 16, marginBottom: 10 },
  txCard: {
    marginHorizontal: 16, marginBottom: 8, backgroundColor: C.surface, borderRadius: 14,
    padding: 14, flexDirection: 'row', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  txInfo: { flex: 1 },
  txName: { fontSize: 14, fontWeight: '600', color: C.foreground },
  txDetail: { fontSize: 12, color: C.muted, marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: '700', color: C.success },
});

export default AdminRevenueScreen;
