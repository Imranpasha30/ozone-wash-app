import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { ArrowLeft, Bell } from '../../components/Icons';

const STORAGE_KEY = 'ozone_notifications';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
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
    backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: C.primary, backgroundColor: C.surfaceElevated },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary, marginRight: 8,
  },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: C.foreground },
  cardTitleUnread: { fontWeight: 'bold' },
  cardTime: { fontSize: 11, color: C.muted, marginLeft: 8 },
  cardBody: { fontSize: 13, color: C.muted, lineHeight: 18 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: C.foreground },
  emptySub: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20 },
});

const NotificationsScreen = () => {
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);

  const navigation = useNavigation<any>();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setNotifications(JSON.parse(stored));
      }
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadNotifications();
    const unsubscribe = navigation.addListener('focus', loadNotifications);
    return unsubscribe;
  }, []);

  const markAllRead = async () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearAll = async () => {
    setNotifications([]);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const handleTap = (item: NotificationItem) => {
    // Mark as read
    const updated = notifications.map(n =>
      n.id === item.id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Navigate if the notification has routing data
    if (item.data?.booking_id) {
      navigation.navigate('BookingDetail', { booking_id: item.data.booking_id });
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

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
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {notifications.length > 0 && (
        <View style={styles.actions}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead}>
              <Text style={styles.actionText}>Mark all read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={clearAll}>
            <Text style={[styles.actionText, { color: C.danger }]}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Bell size={48} weight="regular" color={C.muted} />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySub}>
            You'll receive updates about your bookings, service progress, and certificates here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.read && styles.cardUnread]}
              onPress={() => handleTap(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                {!item.read && <View style={styles.dot} />}
                <Text style={[styles.cardTitle, !item.read && styles.cardTitleUnread]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.cardTime}>{formatTime(item.timestamp)}</Text>
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
