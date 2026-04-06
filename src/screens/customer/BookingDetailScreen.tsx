import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { bookingAPI, complianceAPI, certificateAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';

const STATUS_STEPS = ['pending', 'confirmed', 'in_progress', 'completed'];

const BookingDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const bookingId = route.params?.booking_id;

  const [booking, setBooking] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const bRes = await bookingAPI.getBooking(bookingId) as any;
      const b = bRes.data?.booking;
      setBooking(b);

      if (b?.job_id) {
        try {
          const [cRes, certRes] = await Promise.all([
            complianceAPI.getStatus(b.job_id),
            certificateAPI.getCertificate(b.job_id),
          ]);
          setCompliance((cRes as any).data);
          setCertificate((certRes as any).data?.certificate);
        } catch (_) {}
      }
    } catch (_) {
      Alert.alert('Error', 'Could not load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            await bookingAPI.cancelBooking(bookingId);
            fetchAll();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not cancel');
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  };

  const statusColor = (s: string) => {
    if (s === 'completed') return COLORS.success;
    if (s === 'confirmed' || s === 'in_progress') return COLORS.primary;
    if (s === 'cancelled') return COLORS.danger;
    return COLORS.warning;
  };

  const fmt = (n: number) => `₹${(n / 100).toLocaleString('en-IN')}`;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Booking not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stepIdx = STATUS_STEPS.indexOf(booking.status);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor(booking.status) }]}>
          <Text style={styles.statusText}>{booking.status?.toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Status Timeline */}
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.timelineCard}>
          {STATUS_STEPS.map((s, i) => (
            <View key={s} style={styles.timelineRow}>
              <View style={styles.timelineLeft}>
                <View style={[styles.dot, i <= stepIdx ? styles.dotActive : styles.dotInactive]} />
                {i < STATUS_STEPS.length - 1 && (
                  <View style={[styles.line, i < stepIdx ? styles.lineActive : styles.lineInactive]} />
                )}
              </View>
              <Text style={[styles.stepLabel, i <= stepIdx ? styles.stepLabelActive : styles.stepLabelInactive]}>
                {s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </View>
          ))}
        </View>

        {/* Booking Info */}
        <Text style={styles.sectionTitle}>Booking Info</Text>
        <View style={styles.infoCard}>
          <InfoRow label="Tank Type" value={booking.tank_type?.replace('_', ' ').toUpperCase()} />
          <InfoRow label="Size" value={`${booking.tank_size_litres} Litres`} />
          <InfoRow label="Date & Time" value={formatDate(booking.slot_time)} />
          <InfoRow label="Address" value={booking.address} />
          {booking.addons?.length > 0 && (
            <InfoRow label="Add-ons" value={booking.addons.map((a: string) => a.replace(/_/g, ' ')).join(', ')} />
          )}
          {booking.amc_plan && <InfoRow label="AMC Plan" value={booking.amc_plan.toUpperCase()} />}
          <InfoRow label="Payment" value={`${booking.payment_method?.toUpperCase()} — ${booking.payment_status}`} />
          <InfoRow label="Amount" value={fmt(booking.amount_paise)} />
        </View>

        {/* Compliance Progress */}
        {compliance && (
          <>
            <Text style={styles.sectionTitle}>Service Progress</Text>
            <View style={styles.complianceCard}>
              <View style={styles.complianceHeader}>
                <Text style={styles.compliancePct}>{compliance.completion_percentage}%</Text>
                <Text style={styles.complianceSub}>
                  {compliance.completed_steps} / {compliance.total_steps} steps done
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${compliance.completion_percentage}%` }]} />
              </View>
              {compliance.checklist?.map((step: any) => (
                <View key={step.step_number} style={styles.stepRow}>
                  <Text style={styles.stepIcon}>{step.completed ? '✅' : '⏳'}</Text>
                  <Text style={[styles.stepName, step.completed && styles.stepNameDone]}>
                    {step.step_name}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Certificate */}
        {certificate && (
          <>
            <Text style={styles.sectionTitle}>Hygiene Certificate</Text>
            <TouchableOpacity
              style={styles.certCard}
              onPress={() => navigation.navigate('CertificateView', { job_id: booking.job_id })}
            >
              <Text style={styles.certIcon}>🏆</Text>
              <View style={styles.certInfo}>
                <Text style={styles.certTitle}>Certificate Issued</Text>
                <Text style={styles.certSub}>EcoScore: {certificate.eco_score} / 100</Text>
                <Text style={styles.certLink}>View Certificate →</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* Cancel Button */}
        {(booking.status === 'pending' || booking.status === 'confirmed') && (
          <TouchableOpacity
            style={[styles.cancelBtn, cancelling && styles.cancelBtnDisabled]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling
              ? <ActivityIndicator color={COLORS.danger} size="small" />
              : <Text style={styles.cancelText}>Cancel Booking</Text>
            }
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  errorText: { fontSize: 16, color: COLORS.muted, marginBottom: 12 },
  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { marginRight: 12 },
  backText: { fontSize: 24, color: COLORS.primary },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.foreground, flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: COLORS.primaryFg, fontSize: 10, fontWeight: 'bold' },
  body: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.foreground, marginBottom: 10, marginTop: 16 },
  timelineCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  timelineLeft: { alignItems: 'center', marginRight: 12, width: 20 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  dotActive: { backgroundColor: COLORS.primary },
  dotInactive: { backgroundColor: COLORS.border },
  line: { width: 2, height: 28, marginVertical: 2 },
  lineActive: { backgroundColor: COLORS.primary },
  lineInactive: { backgroundColor: COLORS.border },
  stepLabel: { fontSize: 14, paddingTop: 0, lineHeight: 14, marginBottom: 26 },
  stepLabelActive: { color: COLORS.foreground, fontWeight: '700' },
  stepLabelInactive: { color: COLORS.muted },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: { flexDirection: 'row', marginBottom: 10 },
  infoLabel: { width: 90, fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  infoValue: { flex: 1, fontSize: 13, color: COLORS.foreground, fontWeight: '600' },
  complianceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  complianceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  compliancePct: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary, marginRight: 10 },
  complianceSub: { fontSize: 13, color: COLORS.muted },
  progressBarContainer: { height: 8, backgroundColor: COLORS.surfaceHighlight, borderRadius: 4, marginBottom: 14 },
  progressBarFill: { height: 8, backgroundColor: COLORS.primary, borderRadius: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepIcon: { fontSize: 16, marginRight: 10 },
  stepName: { fontSize: 14, color: COLORS.muted },
  stepNameDone: { color: COLORS.foreground, fontWeight: '600' },
  certCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  certIcon: { fontSize: 32, marginRight: 14 },
  certInfo: { flex: 1 },
  certTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.foreground },
  certSub: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  certLink: { fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 4 },
  cancelBtn: {
    marginTop: 24,
    borderWidth: 2,
    borderColor: COLORS.danger,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  cancelBtnDisabled: { borderColor: COLORS.muted },
  cancelText: { color: COLORS.danger, fontWeight: 'bold', fontSize: 16 },
  link: { color: COLORS.primary, fontWeight: '600', marginTop: 8 },
});

export default BookingDetailScreen;
