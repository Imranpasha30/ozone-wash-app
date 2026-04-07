import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { CheckCircle, Crown, ClipboardText, House } from '../../components/Icons';

const AmcConfirmedScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const { plan_label, plan_type } = route.params || {};

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <CheckCircle size={48} weight="fill" color={C.success} />
        </View>

        <Text style={styles.title}>AMC Enrolled!</Text>
        <Text style={styles.subtitle}>
          Your {plan_label} Plan is now active. You'll enjoy priority scheduling, discounts, and scheduled cleanings.
        </Text>

        <View style={styles.planBadge}>
          <Crown size={16} weight="fill" color={C.primary} />
          <Text style={styles.planBadgeText}>{plan_label?.toUpperCase()} PLAN</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Your first cleaning will be scheduled automatically. You'll receive a notification when it's time.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'CustomerTabs' }] })}
          activeOpacity={0.8}
        >
          <House size={18} weight="regular" color={C.primaryFg} />
          <Text style={styles.primaryBtnText}>Go Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => {
            navigation.reset({ index: 0, routes: [{ name: 'CustomerTabs' }] });
            setTimeout(() => navigation.navigate('MyBookings'), 100);
          }}
          activeOpacity={0.7}
        >
          <ClipboardText size={18} weight="regular" color={C.primary} />
          <Text style={styles.secondaryBtnText}>View My Bookings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: C.surface, borderRadius: 24, padding: 28, alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 16 },
      android: { elevation: 4 },
    }),
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.successBg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '700', color: C.foreground, marginBottom: 8 },
  subtitle: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  planBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.primaryBg, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 999, marginBottom: 20,
  },
  planBadgeText: { fontSize: 13, fontWeight: '700', color: C.primary },
  infoCard: {
    backgroundColor: C.surfaceElevated, borderRadius: 12, padding: 14,
    marginBottom: 24, width: '100%',
  },
  infoText: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: 16, paddingVertical: 16,
    width: '100%', justifyContent: 'center', marginBottom: 12,
  },
  primaryBtnText: { color: C.primaryFg, fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.primaryBg, borderRadius: 16, paddingVertical: 14,
    width: '100%', justifyContent: 'center',
  },
  secondaryBtnText: { color: C.primary, fontWeight: '700', fontSize: 14 },
});

export default AmcConfirmedScreen;
