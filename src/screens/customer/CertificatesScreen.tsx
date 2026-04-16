import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { bookingAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { Trophy, Info, ArrowRight } from '../../components/Icons';

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: C.surface,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: C.foreground },
  headerSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  list: { padding: 16 },
  emptyContainer: { flex: 1 },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: C.successBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: C.success,
  },
  infoIconContainer: {
    marginRight: 8,
    marginTop: 1,
  },
  infoText: { flex: 1, fontSize: 12, color: C.success, lineHeight: 18 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 4,
    borderLeftColor: C.warning,
  },
  cardLeft: { marginRight: 14 },
  certIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: C.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  tankType: { fontSize: 13, fontWeight: 'bold', color: C.foreground },
  address: { fontSize: 12, color: C.muted, marginTop: 2 },
  date: { fontSize: 11, color: C.muted, marginTop: 2 },
  cardRight: {},
  viewRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewText: { fontSize: 14, color: C.primary, fontWeight: 'bold' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: C.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: C.foreground, marginBottom: 6 },
  emptySub: { fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  bookBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bookBtnText: { color: C.primaryFg, fontWeight: 'bold', fontSize: 15 },
});

const CertificatesScreen = () => {
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);

  const navigation = useNavigation<any>();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const BADGE_COLORS: Record<string, string> = {
    platinum: C.platinum,
    gold: C.gold,
    silver: C.silver,
    bronze: C.bronze,
  };

  // Fetch completed bookings that could have certs
  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await bookingAPI.getMyBookings() as any;
      const all = res.data?.bookings || [];
      setBookings(all.filter((b: any) => b.status === 'completed' || b.job_status === 'completed'));
    } catch (_) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('CertificateView', { job_id: item.job_id })}
    >
      <View style={styles.cardLeft}>
        <View style={styles.certIconContainer}>
          <Trophy size={24} weight="fill" color={C.warning} />
        </View>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.tankType}>
          {item.tank_type?.replace('_', ' ').toUpperCase()} TANK
        </Text>
        <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
        <Text style={styles.date}>Completed: {formatDate(item.slot_time)}</Text>
      </View>
      <View style={styles.cardRight}>
        <View style={styles.viewRow}>
          <Text style={styles.viewText}>View</Text>
          <ArrowRight size={14} weight="bold" color={C.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Certificates</Text>
        <Text style={styles.headerSub}>{bookings.length} completed service{bookings.length !== 1 ? 's' : ''}</Text>
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
              ? <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={C.primary} />
              : undefined
          }
          ListHeaderComponent={
            <View style={styles.infoBox}>
              <View style={styles.infoIconContainer}>
                <Info size={16} weight="fill" color={C.success} />
              </View>
              <Text style={styles.infoText}>
                Certificates are issued after each completed cleaning service. Share them with your housing society or authorities.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconContainer}>
                <Trophy size={40} weight="fill" color={C.warning} />
              </View>
              <Text style={styles.emptyTitle}>No certificates yet</Text>
              <Text style={styles.emptySub}>
                Certificates are generated after each completed cleaning service
              </Text>
              <TouchableOpacity
                style={styles.bookBtn}
                onPress={() => navigation.navigate('TankDetails')}
              >
                <Text style={styles.bookBtnText}>Book a Service</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
};

export default CertificatesScreen;
