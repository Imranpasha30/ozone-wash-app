/**
 * Bell icon with a live unread-count badge.
 *
 * Polls GET /notifications (the server-backed inbox) every 30s and on screen
 * focus, so the badge tracks the same list the Notifications screen shows —
 * items disappear from both when read. Tap → Notifications screen.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { jobAPI } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { Bell } from './Icons';

const NotificationBell = () => {
  const C = useTheme();
  const navigation = useNavigation<any>();
  const [count, setCount] = useState(0);
  const pollRef = useRef<any>(null);

  const load = useCallback(async () => {
    try {
      const res: any = await jobAPI.notifications();
      setCount(res.data?.unread ?? (res.data?.notifications?.length || 0));
    } catch (_) {}
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 30000);
    const unsubscribe = navigation.addListener('focus', load);
    return () => {
      clearInterval(pollRef.current);
      unsubscribe();
    };
  }, []);

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: C.surfaceElevated }]}
      onPress={() => navigation.navigate('Notifications')}
      activeOpacity={0.7}
    >
      <Bell size={22} weight="regular" color={C.foreground} />
      {count > 0 && (
        <View style={[styles.badge, { backgroundColor: C.danger, borderColor: C.surfaceElevated }]}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 20, height: 20, borderRadius: 10,
    paddingHorizontal: 5, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
});

export default NotificationBell;
