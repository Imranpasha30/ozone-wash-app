/**
 * CustomerAlertsBanner — live top-of-screen banners for the customer.
 *
 *   • "Technician requested your Start OTP" (tap → the booking, where the
 *     OTP is displayed)
 *   • "Your crew has departed and is on the way"
 *
 * Polls /jobs/customer-alerts every 20 s while mounted and refreshes on
 * screen focus, so the banner appears within seconds of the crew action —
 * alongside the FCM push the backend fires for the same events.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { jobAPI } from '../services/api';
import { useTheme } from '../hooks/useTheme';
import { Key, NavigationArrow, ArrowRight } from './Icons';

interface CustomerAlert {
  type: 'otp_requested' | 'crew_departed';
  job_id: string;
  booking_id: string | null;
  job_type?: string;      // tank_cleaning | auto_wash — routes to the right detail screen
  context?: string;       // which job: "Overhead tank · 15,000 L · 7 Aug · RM Road"
  message: string;
}

const POLL_MS = 20_000;

const CustomerAlertsBanner: React.FC = () => {
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);
  const navigation = useNavigation<any>();
  const [alerts, setAlerts] = useState<CustomerAlert[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const res: any = await jobAPI.customerAlerts();
      setAlerts(res.data?.alerts || []);
    } catch { /* keep last state — banner is best-effort */ }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAlerts();
      timer.current = setInterval(fetchAlerts, POLL_MS);
      return () => { if (timer.current) clearInterval(timer.current); };
    }, [fetchAlerts])
  );

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  if (!alerts.length) return null;

  return (
    <View style={styles.wrap}>
      {alerts.map((a) => {
        const isOtp = a.type === 'otp_requested';
        return (
          <TouchableOpacity
            key={`${a.type}:${a.job_id}`}
            style={[styles.banner, isOtp ? styles.bannerOtp : styles.bannerDepart]}
            onPress={() => {
              // Auto-wash jobs have no bookings row — the job IS the booking.
              if (a.job_type === 'auto_wash' || !a.booking_id) {
                navigation.navigate('AutoWashBookingDetail', { id: a.job_id });
              } else {
                navigation.navigate('BookingDetail', { id: a.booking_id });
              }
            }}
            activeOpacity={0.85}
          >
            <View style={[styles.iconWrap, { backgroundColor: isOtp ? C.primary : C.success }]}>
              {isOtp
                ? <Key size={16} weight="fill" color={C.primaryFg} />
                : <NavigationArrow size={16} weight="fill" color={C.primaryFg} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: isOtp ? C.primary : C.success }]}>
                {isOtp ? 'Start OTP requested' : 'Crew on the way'}
              </Text>
              {a.context ? <Text style={styles.context} numberOfLines={1}>{a.context}</Text> : null}
              <Text style={styles.msg} numberOfLines={2}>{a.message}</Text>
            </View>
            <ArrowRight size={16} weight="bold" color={isOtp ? C.primary : C.success} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 12, borderWidth: 1.5,
  },
  bannerOtp: { backgroundColor: C.primaryBg, borderColor: C.primary },
  bannerDepart: { backgroundColor: C.successBg, borderColor: C.success },
  iconWrap: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 13.5, fontWeight: '800' },
  context: { fontSize: 12, fontWeight: '700', color: C.foreground, marginTop: 2 },
  msg: { fontSize: 12, color: C.foreground, marginTop: 1, lineHeight: 16 },
});

export default CustomerAlertsBanner;
