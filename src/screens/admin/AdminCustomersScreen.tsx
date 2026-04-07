import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, StatusBar, Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { adminAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { UserCircle, Phone, ChatCircle } from '../../components/Icons';

const AdminCustomersScreen = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCustomers = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await adminAPI.getAllUsers({ role: 'customer', limit: 100 }) as any;
      setCustomers(res.data?.users || []);
      setTotal(res.data?.total || 0);
    } catch (_) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchCustomers(); }, []));

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const callPhone = (phone: string) => Linking.openURL(`tel:${phone}`);
  const whatsApp = (phone: string) => Linking.openURL(`https://wa.me/91${phone}`);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <UserCircle size={36} weight="fill" color={C.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.name}>{item.name || 'Customer'}</Text>
          <Text style={styles.phone}>{item.phone}</Text>
          <Text style={styles.date}>Joined: {formatDate(item.created_at)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.callBtn} onPress={() => callPhone(item.phone)} activeOpacity={0.7}>
          <Phone size={16} weight="fill" color={C.primary} />
          <Text style={styles.callText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.waBtn} onPress={() => whatsApp(item.phone)} activeOpacity={0.7}>
          <ChatCircle size={16} weight="fill" color={C.success} />
          <Text style={styles.waText}>WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Customers</Text>
        <Text style={styles.headerCount}>{total} total</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={customers.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchCustomers(true)} tintColor={C.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <UserCircle size={48} weight="regular" color={C.muted} />
              <Text style={styles.emptyTitle}>No customers yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: C.surface, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: C.foreground },
  headerCount: { fontSize: 13, color: C.muted },
  list: { padding: 16 },
  emptyContainer: { flex: 1 },
  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { marginRight: 12 },
  cardInfo: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: C.foreground },
  phone: { fontSize: 13, color: C.muted, marginTop: 2 },
  date: { fontSize: 11, color: C.muted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10 },
  callBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: C.primaryBg,
  },
  callText: { fontSize: 13, fontWeight: '700', color: C.primary },
  waBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: C.successBg,
  },
  waText: { fontSize: 13, fontWeight: '700', color: C.success },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },
});

export default AdminCustomersScreen;
