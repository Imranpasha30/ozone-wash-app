import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { bookingAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';

const BADGE_COLORS: Record<string, string> = {
  platinum: COLORS.platinum,
  gold: COLORS.gold,
  silver: COLORS.silver,
  bronze: COLORS.bronze,
};

const CertificatesScreen = () => {
  const navigation = useNavigation<any>();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch completed bookings that could have certs
  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await bookingAPI.getMyBookings() as any;
      const all = res.data?.bookings || [];
      setBookings(all.filter((b: any) => b.status === 'completed'));
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
        <Text style={styles.certIcon}>🏆</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.tankType}>
          {item.tank_type?.replace('_', ' ').toUpperCase()} TANK
        </Text>
        <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
        <Text style={styles.date}>Completed: {formatDate(item.slot_time)}</Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.viewText}>View →</Text>
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
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          renderItem={renderItem}
          contentContainerStyle={bookings.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={COLORS.primary} />
          }
          ListHeaderComponent={
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                Certificates are issued after each completed cleaning service. Share them with your housing society or authorities.
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🏆</Text>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.foreground },
  headerSub: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  list: { padding: 16 },
  emptyContainer: { flex: 1 },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.successBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  infoIcon: { fontSize: 16, marginRight: 8 },
  infoText: { flex: 1, fontSize: 12, color: COLORS.success, lineHeight: 18 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  cardLeft: { marginRight: 14 },
  certIcon: { fontSize: 32 },
  cardInfo: { flex: 1 },
  tankType: { fontSize: 13, fontWeight: 'bold', color: COLORS.foreground },
  address: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  date: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  cardRight: {},
  viewText: { fontSize: 14, color: COLORS.primary, fontWeight: 'bold' },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.foreground, marginBottom: 6 },
  emptySub: { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  bookBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  bookBtnText: { color: COLORS.primaryFg, fontWeight: 'bold', fontSize: 15 },
});

export default CertificatesScreen;
