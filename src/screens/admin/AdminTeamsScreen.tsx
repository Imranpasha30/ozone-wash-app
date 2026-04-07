import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, StatusBar, Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { adminAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { Users, Phone, ChatCircle, MapPin } from '../../components/Icons';

const AdminTeamsScreen = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTeams = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await adminAPI.getTeamList() as any;
      setTeams(res.data?.teams || []);
    } catch (_) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchTeams(); }, []));

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const callPhone = (phone: string) => Linking.openURL(`tel:${phone}`);
  const whatsApp = (phone: string) => Linking.openURL(`https://wa.me/91${phone}`);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(item.name || item.phone)}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.name}>{item.name || 'Unnamed Agent'}</Text>
          <Text style={styles.phone}>{item.phone}</Text>
          {item.zone && (
            <View style={styles.zoneRow}>
              <MapPin size={12} weight="fill" color={C.muted} />
              <Text style={styles.zoneText}>{item.zone}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: C.primary }]}>{item.total_jobs || 0}</Text>
          <Text style={styles.statLabel}>Jobs</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: C.success }]}>{item.completed_jobs || 0}</Text>
          <Text style={styles.statLabel}>Done</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: C.warning }]}>{item.avg_rating ? Number(item.avg_rating).toFixed(1) : '—'}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.callBtn} onPress={() => callPhone(item.phone)} activeOpacity={0.7}>
          <Phone size={18} weight="fill" color={C.primary} />
          <Text style={styles.callText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.waBtn} onPress={() => whatsApp(item.phone)} activeOpacity={0.7}>
          <ChatCircle size={18} weight="fill" color={C.success} />
          <Text style={styles.waText}>WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Field Agents</Text>
        <Text style={styles.headerCount}>{teams.length} agent{teams.length !== 1 ? 's' : ''}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={teams}
          keyExtractor={(t) => t.id}
          renderItem={renderItem}
          contentContainerStyle={teams.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchTeams(true)} tintColor={C.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Users size={48} weight="regular" color={C.muted} />
              <Text style={styles.emptyTitle}>No field agents</Text>
              <Text style={styles.emptySub}>Field team members will appear here after registration</Text>
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
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: C.primaryBg,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: C.primary },
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: C.foreground },
  phone: { fontSize: 13, color: C.muted, marginTop: 2 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  zoneText: { fontSize: 12, color: C.muted },
  statsRow: {
    flexDirection: 'row', backgroundColor: C.surfaceElevated, borderRadius: 12,
    padding: 12, marginBottom: 14, justifyContent: 'space-around',
  },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 2 },
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
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },
  emptySub: { fontSize: 14, color: C.muted, textAlign: 'center' },
});

export default AdminTeamsScreen;
