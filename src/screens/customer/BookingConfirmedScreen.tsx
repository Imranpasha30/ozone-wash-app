import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import { CheckCircle, Phone, Wrench, Trophy } from '../../components/Icons';

const makeStyles = (C: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.successBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: C.foreground,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  idBox: {
    backgroundColor: C.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  idLabel: { fontSize: 11, color: C.muted, textTransform: 'uppercase', fontWeight: '600' },
  idValue: { fontSize: 13, color: C.primary, fontWeight: 'bold', marginTop: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, width: '100%' },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  infoText: { flex: 1, fontSize: 13, color: C.muted, lineHeight: 20, paddingTop: 6 },
  primaryBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: C.primaryFg, fontWeight: 'bold', fontSize: 16 },
  secondaryBtn: { padding: 14, width: '100%', alignItems: 'center', marginTop: 4 },
  secondaryBtnText: { color: C.primary, fontWeight: '600', fontSize: 15 },
});

const BookingConfirmedScreen = () => {
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const bookingId = route.params?.booking_id || '';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Success Icon */}
        <View style={styles.iconCircle}>
          <CheckCircle size={40} weight="fill" color={C.success} />
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
          <View style={styles.infoIconContainer}>
            <Phone size={18} weight="regular" color={C.primary} />
          </View>
          <Text style={styles.infoText}>You will receive an SMS & WhatsApp confirmation shortly</Text>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Wrench size={18} weight="regular" color={C.primary} />
          </View>
          <Text style={styles.infoText}>Our field team will be assigned within 2 hours</Text>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoIconContainer}>
            <Trophy size={18} weight="fill" color={C.warning} />
          </View>
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

export default BookingConfirmedScreen;
