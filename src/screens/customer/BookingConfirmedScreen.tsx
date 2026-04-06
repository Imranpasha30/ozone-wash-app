import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../../utils/constants';

const BookingConfirmedScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const bookingId = route.params?.booking_id || '';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Success Icon */}
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>✅</Text>
        </View>

        <Text style={styles.title}>Booking Confirmed!</Text>
        <Text style={styles.subtitle}>
          Your tank cleaning has been scheduled. Our team will reach you at the selected time.
        </Text>

        <View style={styles.idBox}>
          <Text style={styles.idLabel}>Booking ID</Text>
          <Text style={styles.idValue} numberOfLines={1}>{bookingId}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📱</Text>
          <Text style={styles.infoText}>You will receive an SMS & WhatsApp confirmation shortly</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🧑‍🔧</Text>
          <Text style={styles.infoText}>Our field team will be assigned within 2 hours</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🏆</Text>
          <Text style={styles.infoText}>Your hygiene certificate will be ready after service</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('BookingDetail', { booking_id: bookingId })}
        >
          <Text style={styles.primaryBtnText}>View Booking Details</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('CustomerTabs')}
        >
          <Text style={styles.secondaryBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: { fontSize: 40 },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.foreground,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  idBox: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  idLabel: { fontSize: 11, color: COLORS.muted, textTransform: 'uppercase', fontWeight: '600' },
  idValue: { fontSize: 13, color: COLORS.primary, fontWeight: 'bold', marginTop: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, width: '100%' },
  infoIcon: { fontSize: 18, marginRight: 10, marginTop: 2 },
  infoText: { flex: 1, fontSize: 13, color: COLORS.muted, lineHeight: 20 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryBtnText: { color: COLORS.primaryFg, fontWeight: 'bold', fontSize: 16 },
  secondaryBtn: { padding: 14, width: '100%', alignItems: 'center', marginTop: 4 },
  secondaryBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
});

export default BookingConfirmedScreen;
