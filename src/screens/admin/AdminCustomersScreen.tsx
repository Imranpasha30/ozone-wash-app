import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl, Platform, StatusBar, Linking, TextInput,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { adminAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { UserCircle, Phone, ChatCircle, ArrowRight, Trophy, MagnifyingGlass, X } from '../../components/Icons';
import ScreenHeader from '../../components/ScreenHeader';
import { useResponsive } from '../../utils/responsive';

const AdminCustomersScreen = () => {
  const C = useTheme();
  const navigation = useNavigation<any>();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { isLarge } = useResponsive();
  const numColumns = isLarge ? 2 : 1;
  const webListStyle = isLarge
    ? { maxWidth: 1100, width: '100%' as const, alignSelf: 'center' as const, padding: 24 }
    : null;
  const [customers, setCustomers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  // Role filter — lets admin find field_team users to demote back to customer.
  // 'all' shows both roles so the demote workflow is reachable from one screen.
  const [roleFilter, setRoleFilter] = useState<'customer' | 'field_team' | 'all'>('customer');

  // Filter customers by name OR phone substring. Empty query = show all.
  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      (c.phone || '').toLowerCase().includes(q) ||
      (c.name || '').toLowerCase().includes(q)
    );
  }, [customers, search]);

  const fetchCustomers = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      // 'all' makes two calls and merges, so admin can find both customers
      // and field_team users in one list to switch roles between them.
      const userCalls = roleFilter === 'all'
        ? [
            adminAPI.getAllUsers({ role: 'customer',   limit: 100 }) as any,
            adminAPI.getAllUsers({ role: 'field_team', limit: 100 }) as any,
          ]
        : [adminAPI.getAllUsers({ role: roleFilter, limit: 100 }) as any];
      const [usersResults, topRes] = await Promise.all([
        Promise.all(userCalls),
        adminAPI.getTopCustomers(8) as any,
      ]);
      const merged: any[] = [];
      let totalSum = 0;
      usersResults.forEach((r: any) => {
        merged.push(...(r.data?.users || []));
        totalSum += r.data?.total || 0;
      });
      // Newest first when merged
      merged.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setCustomers(merged);
      setTotal(totalSum);
      setTopCustomers(topRes.data?.top || []);
    } catch (_) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchCustomers(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [roleFilter]));

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const callPhone = (phone: string) => Linking.openURL(`tel:${phone}`);
  const whatsApp = (phone: string) => Linking.openURL(`https://wa.me/91${phone}`);

  const renderItem = ({ item }: { item: any }) => {
    const isField = item.role === 'field_team';
    return (
    <TouchableOpacity
      style={[styles.card, isLarge && { flex: 1, marginBottom: 0, borderWidth: 1, borderColor: C.border }]}
      onPress={() => navigation.navigate('AdminCustomerDetail', { id: item.id })}
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <UserCircle size={36} weight="fill" color={isField ? C.warning : C.primary} />
        </View>
        <View style={styles.cardInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Text style={styles.name}>{item.name || (isField ? 'Field agent' : 'Customer')}</Text>
            {isField ? (
              <View style={[styles.rolePill, { backgroundColor: C.warningBg || '#FEF3C7', borderColor: C.warning }]}>
                <Text style={[styles.rolePillText, { color: C.warning }]}>FIELD AGENT</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.phone}>{item.phone}</Text>
          <Text style={styles.date}>Joined: {formatDate(item.created_at)}</Text>
        </View>
        <View style={styles.viewBadge}>
          <Text style={styles.viewBadgeText}>View</Text>
          <ArrowRight size={14} weight="bold" color={C.primary} />
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
    </TouchableOpacity>
    );
  };

  const titleByRole = {
    customer:   'Customers',
    field_team: 'Field agents',
    all:        'All users',
  } as const;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <ScreenHeader
        title={titleByRole[roleFilter]}
        subtitle={`${total} total`}
        fallbackRoute="AdminDashboard"
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          key={`cols-${numColumns}`}
          data={filteredCustomers}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? { gap: 16, marginBottom: 16 } : undefined}
          ListHeaderComponent={(
            <View>
              {/* Role filter — Customers / Field agents / All. Lets admin
                  surface field_team users to demote them back to customer. */}
              <View style={styles.roleTabs}>
                {([
                  { key: 'customer',   label: 'Customers' },
                  { key: 'field_team', label: 'Field agents' },
                  { key: 'all',        label: 'All' },
                ] as const).map((r) => {
                  const active = roleFilter === r.key;
                  return (
                    <TouchableOpacity
                      key={r.key}
                      style={[styles.roleTab, active && styles.roleTabActive]}
                      onPress={() => setRoleFilter(r.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.roleTabText, active && styles.roleTabTextActive]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Search bar — filters by phone or name as you type. */}
              <View style={styles.searchWrap}>
                <MagnifyingGlass size={16} weight="bold" color={C.muted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by phone or name"
                  placeholderTextColor={C.muted}
                  value={search}
                  onChangeText={setSearch}
                  keyboardType="default"
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {search.length > 0 ? (
                  <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                    <X size={14} weight="bold" color={C.muted} />
                  </TouchableOpacity>
                ) : null}
              </View>
              {topCustomers.length > 0 && search.trim().length === 0 ? (
            <View style={styles.topWrap}>
              <View style={styles.topHead}>
                <Trophy size={18} weight="fill" color={C.warning} />
                <Text style={styles.topTitle}>Top customers</Text>
                <Text style={styles.topSub}>by lifetime value</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingVertical: 4, gap: 12, paddingRight: 16 }}
              >
                {topCustomers.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.topCard}
                    onPress={() => navigation.navigate('AdminCustomerDetail', { id: t.id })}
                    activeOpacity={0.85}
                  >
                    <View style={styles.topAvatar}>
                      <UserCircle size={30} weight="fill" color={C.primary} />
                    </View>
                    <Text style={styles.topName} numberOfLines={1}>{t.name || t.phone}</Text>
                    <Text style={styles.topSpend}>
                      ₹{(Number(t.lifetime_paise) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </Text>
                    <Text style={styles.topMeta}>{t.total_completed} services</Text>
                    <View style={styles.tagRow}>
                      {(t.tags || []).slice(0, 3).map((tag: any, i: number) => (
                        <View key={i} style={[styles.tag, { backgroundColor: tag.color + '22', borderColor: tag.color }]}>
                          <Text style={[styles.tagText, { color: tag.color }]}>{tag.label}</Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={styles.allLabel}>ALL CUSTOMERS</Text>
            </View>
              ) : null}
            </View>
          )}
          contentContainerStyle={[
            customers.length === 0 ? styles.emptyContainer : styles.list,
            webListStyle,
          ]}
          refreshControl={
            Platform.OS !== 'web' ? <RefreshControl refreshing={refreshing} onRefresh={() => fetchCustomers(true)} tintColor={C.primary} /> : undefined
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
  viewBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: C.primaryBg, borderWidth: 1, borderColor: C.primary,
  },
  viewBadgeText: { fontSize: 11, fontWeight: '700', color: C.primary },
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

  // ── Role badge on each card ──────────────────────────────────────────
  rolePill: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    borderWidth: 1,
  },
  rolePillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  // ── Role filter tabs (Customers / Field agents / All) ───────────────
  roleTabs: {
    flexDirection: 'row', gap: 8, marginBottom: 12,
  },
  roleTab: {
    flex: 1, paddingVertical: 9, paddingHorizontal: 10,
    borderRadius: 10, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center',
  },
  roleTabActive: { backgroundColor: C.primary, borderColor: C.primary },
  roleTabText: { fontSize: 12, fontWeight: '600', color: C.muted },
  roleTabTextActive: { color: C.primaryFg },

  // ── Search bar ───────────────────────────────────────────────────────
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surface, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14,
    borderWidth: 1, borderColor: C.border,
  },
  searchInput: {
    flex: 1, fontSize: 14, color: C.foreground,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },

  // ── Top-customers strip ──────────────────────────────────────────────
  topWrap: { marginBottom: 12 },
  topHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  topTitle: { fontSize: 16, fontWeight: '700', color: C.foreground },
  topSub: { fontSize: 11, color: C.muted, marginTop: 1 },
  topCard: {
    width: 200, padding: 14, borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    gap: 4,
    ...Platform.select({
      default: { boxShadow: '0 4px 12px rgba(0,0,0,0.06)' } as any,
      android: { elevation: 2 },
    }),
  },
  topAvatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.primaryBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  topName: { fontSize: 13, fontWeight: '700', color: C.foreground },
  topSpend: { fontSize: 18, fontWeight: '800', color: C.foreground },
  topMeta: { fontSize: 11, color: C.muted },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  tag: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    borderWidth: 1,
  },
  tagText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  allLabel: {
    fontSize: 11, fontWeight: '800', letterSpacing: 1.4, color: C.muted,
    marginTop: 16, marginBottom: 4,
  },
});

export default AdminCustomersScreen;
