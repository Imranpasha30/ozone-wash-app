/**
 * Server-backed notification inbox (web + app).
 *
 * Backed by GET /notifications — every customer-facing event (OTP, crew
 * departed, step progress, certificate ready, reminders) lands there
 * server-side, so this works on web where FCM push is unavailable.
 * Only UNREAD items are shown: tapping an item marks it read on the server
 * and removes it from the list; "Clear all" marks everything read.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { jobAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../utils/responsive';
import { ArrowLeft, Bell } from '../../components/Icons';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  created_at: string;
  data?: Record<string, any>;
}

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  header: {
    backgroundColor: C.surface, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: C.foreground, flex: 1 },
  unreadBadge: {
    backgroundColor: C.danger, borderRadius: 12, minWidth: 24, height: 24,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  unreadText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  actions: {
    flexDirection: 'row', justifyContent: 'flex-end', gap: 16,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  actionText: { fontSize: 13, color: C.primary, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: C.surfaceElevated, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
    borderLeftWidth: 3, borderLeftColor: C.primary,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary, marginRight: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: 'bold', color: C.foreground },
  cardTime: { fontSize: 11, color: C.muted, marginLeft: 8 },
  cardBody: { fontSize: 13, color: C.muted, lineHeight: 18 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: C.foreground },
  emptySub: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20 },
});

const NotificationsScreen = () => {
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);
  const { isLarge } = useResponsive();
  const webListStyle = isLarge
    ? { maxWidth: 720, width: '100%' as const, alignSelf: 'center' as const }
    : null;

  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<any>(null);

  const load = useCallback(async () => {
    try {
      const res: any = await jobAPI.notifications();
      setNotifications(res.data?.notifications || []);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 25000);
    const unsubscribe = navigation.addListener('focus', load);
    return () => {
      clearInterval(pollRef.current);
      unsubscribe();
    };
  }, []);

  const clearAll = async () => {
    setNotifications([]);
    try { await jobAPI.markAllNotificationsRead(); } catch (_) {}
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const handleTap = (item: NotificationItem) => {
    // Read = removed: optimistically drop it, persist on the server.
    setNotifications((list) => list.filter((n) => n.id !== item.id));
    jobAPI.markNotificationRead(item.id).catch(() => {});

    // Route to the relevant screen when the payload carries one.
    const d = item.data || {};
    if (d.type === 'wash_step' && d.job_id) {
      navigation.navigate('AutoWashBookingDetail', { id: d.job_id });
    } else if (d.booking_id) {
      navigation.navigate('BookingDetail', { booking_id: d.booking_id });
    } else if (d.cert_id) {
      navigation.navigate('CustomerTabs', { screen: 'Certificates' });
    } else if (d.job_id) {
      // Job-only payload (no booking id) — land on the bookings list.
      navigation.navigate('CustomerTabs', { screen: 'MyBookings' });
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={C.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.length > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{notifications.length}</Text>
          </View>
        )}
      </View>

      {notifications.length > 0 && (
        <View style={[styles.actions, webListStyle]}>
          <TouchableOpacity onPress={clearAll}>
            <Text style={[styles.actionText, { color: C.danger }]}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Bell size={48} weight="regular" color={C.muted} />
          <Text style={styles.emptyTitle}>No new notifications</Text>
          <Text style={styles.emptySub}>
            Updates about your bookings, service progress, and certificates appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, webListStyle]}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => handleTap(item)} activeOpacity={0.7}>
              <View style={styles.cardHeader}>
                <View style={styles.dot} />
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.cardTime}>{formatTime(item.created_at)}</Text>
              </View>
              <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

export default NotificationsScreen;
