import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { bookingAPI, complianceAPI, certificateAPI, jobAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import {
  ArrowLeft, ArrowRight, Key, CheckCircle, Hourglass, Trophy,
  ThumbsUp, ThumbsDown,
} from '../../components/Icons';

const STATUS_STEPS = ['pending', 'confirmed', 'in_progress', 'completed'];

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  errorText: { fontSize: 16, color: C.muted, marginBottom: 12 },
  goBackRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  header: {
    backgroundColor: C.surface,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: C.foreground, flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: C.primaryFg, fontSize: 10, fontWeight: 'bold' },
  body: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.foreground, marginBottom: 10, marginTop: 16 },
  timelineCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 0 },
  timelineLeft: { alignItems: 'center', marginRight: 12, width: 20 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  dotActive: { backgroundColor: C.primary },
  dotInactive: { backgroundColor: C.border },
  line: { width: 2, height: 28, marginVertical: 2 },
  lineActive: { backgroundColor: C.primary },
  lineInactive: { backgroundColor: C.border },
  stepLabel: { fontSize: 14, paddingTop: 0, lineHeight: 14, marginBottom: 26 },
  stepLabelActive: { color: C.foreground, fontWeight: '700' },
  stepLabelInactive: { color: C.muted },
  infoCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoRow: { flexDirection: 'row', marginBottom: 10 },
  infoLabel: { width: 90, fontSize: 12, color: C.muted, fontWeight: '600' },
  infoValue: { flex: 1, fontSize: 13, color: C.foreground, fontWeight: '600' },
  complianceCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  complianceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  compliancePct: { fontSize: 32, fontWeight: 'bold', color: C.primary, marginRight: 10 },
  complianceSub: { fontSize: 13, color: C.muted },
  progressBarContainer: { height: 8, backgroundColor: C.surfaceHighlight, borderRadius: 4, marginBottom: 14 },
  progressBarFill: { height: 8, backgroundColor: C.primary, borderRadius: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  stepName: { fontSize: 14, color: C.muted },
  stepNameDone: { color: C.foreground, fontWeight: '600' },
  certCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 4,
    borderLeftColor: C.warning,
  },
  certIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: C.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  certInfo: { flex: 1 },
  certTitle: { fontSize: 15, fontWeight: 'bold', color: C.foreground },
  certSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  certLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  certLink: { fontSize: 13, color: C.primary, fontWeight: '600' },
  otpCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderLeftWidth: 4,
    borderLeftColor: C.primary,
  },
  otpIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: C.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  otpContent: { flex: 1 },
  otpCode: {
    fontSize: 36,
    fontWeight: 'bold',
    color: C.primary,
    letterSpacing: 8,
    fontVariant: ['tabular-nums'],
  },
  otpHint: { fontSize: 12, color: C.muted, marginTop: 4 },
  cancelBtn: {
    marginTop: 24,
    borderWidth: 2,
    borderColor: C.danger,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  cancelBtnDisabled: { borderColor: C.muted },
  cancelText: { color: C.danger, fontWeight: 'bold', fontSize: 16 },
  link: { color: C.primary, fontWeight: '600', marginTop: 8 },
});

const BookingDetailScreen = () => {
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const bookingId = route.params?.booking_id;

  const [booking, setBooking] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [requestingOtp, setRequestingOtp] = useState(false);

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  useEffect(() => {
    fetchAll();
    const unsubscribe = navigation.addListener('focus', fetchAll);
    return unsubscribe;
  }, []);

  // Auto-refresh every 10s when job is active (waiting for OTP or in progress)
  useEffect(() => {
    const shouldPoll =
      job && (
        job.status === 'in_progress' ||
        job.status === 'scheduled' ||
        (job.start_otp && !job.start_otp_verified) ||
        (job.end_otp && !job.end_otp_verified)
      );
    if (!shouldPoll) return;
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, [job?.status, job?.start_otp_verified, job?.end_otp_verified]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const bRes = await bookingAPI.getBooking(bookingId) as any;
      const b = bRes.data?.booking;
      setBooking(b);

      if (b?.job_id) {
        try {
          const [jobRes, cRes, certRes] = await Promise.all([
            jobAPI.getJob(b.job_id),
            complianceAPI.getStatus(b.job_id),
            certificateAPI.getCertificate(b.job_id),
          ]);
          setJob((jobRes as any).data?.job);
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

  const handleRequestOtp = async () => {
    if (!booking?.job_id) return;
    setRequestingOtp(true);
    try {
      const res = await jobAPI.customerRequestOtp(booking.job_id) as any;
      Alert.alert('OTP Generated', `Your start OTP is: ${res.data?.otp || 'Check below'}. Show this code to your technician.`);
      fetchAll();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not generate OTP');
    } finally {
      setRequestingOtp(false);
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
    if (s === 'completed') return C.success;
    if (s === 'confirmed' || s === 'in_progress') return C.primary;
    if (s === 'cancelled') return C.danger;
    return C.warning;
  };

  const fmt = (n: number) => `\u20B9${(n / 100).toLocaleString('en-IN')}`;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Booking not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.goBackRow}>
          <ArrowLeft size={18} weight="regular" color={C.primary} />
          <Text style={styles.link}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stepIdx = STATUS_STEPS.indexOf(booking.status);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={C.foreground} />
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
          <InfoRow label="Booking ID" value={`#${booking.id?.slice(0, 8).toUpperCase()}`} />
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

        {/* Service Verification Section — always visible for active bookings */}
        {(booking.status === 'confirmed' || booking.status === 'in_progress') && (() => {
          // Use booking-level data (from JOIN) as primary, job fetch as fallback
          const teamId = booking.assigned_team_id || job?.assigned_team_id;
          const teamName = booking.team_name || job?.team_name;
          const startOtp = booking.start_otp || job?.start_otp;
          const endOtp = booking.end_otp || job?.end_otp;
          const startVerified = booking.start_otp_verified || job?.start_otp_verified;
          const endVerified = booking.end_otp_verified || job?.end_otp_verified;
          const jobStatus = booking.job_status || job?.status;

          return (
          <>
            <Text style={styles.sectionTitle}>Service Verification</Text>

            {/* State 1: No team assigned yet */}
            {!teamId && (
              <View style={styles.otpCard}>
                <View style={[styles.otpIconContainer, { backgroundColor: C.warningBg }]}>
                  <Hourglass size={24} weight="fill" color={C.warning} />
                </View>
                <View style={styles.otpContent}>
                  <Text style={[styles.otpHint, { fontWeight: '700', color: C.foreground, fontSize: 14 }]}>
                    Awaiting Technician
                  </Text>
                  <Text style={styles.otpHint}>A technician will be assigned shortly. OTP will appear here once assigned.</Text>
                </View>
              </View>
            )}

            {/* State 2: Team assigned, no start OTP yet — customer can request */}
            {teamId && (jobStatus === 'scheduled') && !startOtp && (
              <TouchableOpacity
                style={styles.otpCard}
                onPress={handleRequestOtp}
                disabled={requestingOtp}
                activeOpacity={0.7}
              >
                <View style={styles.otpIconContainer}>
                  <Key size={24} weight="fill" color={C.primary} />
                </View>
                <View style={styles.otpContent}>
                  {requestingOtp ? (
                    <ActivityIndicator size="small" color={C.primary} />
                  ) : (
                    <>
                      <Text style={[styles.otpHint, { fontWeight: '700', color: C.foreground, fontSize: 14 }]}>
                        Technician Assigned{teamName ? ` — ${teamName}` : ''}
                      </Text>
                      <Text style={styles.otpHint}>Tap to generate Start OTP and share with your technician</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            )}

            {/* State 3: Start OTP exists, not yet verified */}
            {startOtp && !startVerified && (
              <View style={styles.otpCard}>
                <View style={styles.otpIconContainer}>
                  <Key size={24} weight="fill" color={C.primary} />
                </View>
                <View style={styles.otpContent}>
                  <Text style={styles.otpCode}>{startOtp}</Text>
                  <Text style={styles.otpHint}>Show this code to your technician to start the service</Text>
                </View>
              </View>
            )}

            {/* State 4: Start OTP verified (job in progress) */}
            {startVerified && !endOtp && (
              <View style={[styles.otpCard, { borderLeftColor: C.success }]}>
                <View style={[styles.otpIconContainer, { backgroundColor: C.successBg }]}>
                  <CheckCircle size={24} weight="fill" color={C.success} />
                </View>
                <View style={styles.otpContent}>
                  <Text style={[styles.otpHint, { fontWeight: '700', color: C.success, fontSize: 14 }]}>
                    Service Started
                  </Text>
                  <Text style={styles.otpHint}>Your technician has verified the start OTP. Service is in progress.</Text>
                </View>
              </View>
            )}

            {/* State 5: End OTPs exist (satisfied + unsatisfied), not yet verified */}
            {(() => {
              const satOtp = booking.end_otp_satisfied || job?.end_otp_satisfied;
              const unsatOtp = booking.end_otp_unsatisfied || job?.end_otp_unsatisfied;
              const anyEndOtp = satOtp || unsatOtp || endOtp;

              if (!anyEndOtp || endVerified) return null;

              // Dual OTP — satisfaction feedback
              if (satOtp && unsatOtp) {
                return (
                  <View>
                    <Text style={[styles.otpHint, { textAlign: 'center', marginBottom: 12, fontSize: 13, color: C.foreground, fontWeight: '700' }]}>
                      Share ONE code with your technician
                    </Text>

                    {/* Satisfied OTP — green */}
                    <View style={[styles.otpCard, { borderLeftColor: C.success, marginBottom: 10 }]}>
                      <View style={[styles.otpIconContainer, { backgroundColor: C.successBg }]}>
                        <ThumbsUp size={24} weight="fill" color={C.success} />
                      </View>
                      <View style={styles.otpContent}>
                        <Text style={[styles.otpHint, { fontWeight: '700', color: C.success, fontSize: 13, marginBottom: 4 }]}>
                          If SATISFIED with the service
                        </Text>
                        <Text style={[styles.otpCode, { color: C.success }]}>{satOtp}</Text>
                      </View>
                    </View>

                    {/* Unsatisfied OTP — red */}
                    <View style={[styles.otpCard, { borderLeftColor: C.danger }]}>
                      <View style={[styles.otpIconContainer, { backgroundColor: C.dangerBg }]}>
                        <ThumbsDown size={24} weight="fill" color={C.danger} />
                      </View>
                      <View style={styles.otpContent}>
                        <Text style={[styles.otpHint, { fontWeight: '700', color: C.danger, fontSize: 13, marginBottom: 4 }]}>
                          If NOT SATISFIED with the service
                        </Text>
                        <Text style={[styles.otpCode, { color: C.danger }]}>{unsatOtp}</Text>
                      </View>
                    </View>
                  </View>
                );
              }

              // Fallback: single end OTP (legacy)
              return (
                <View style={[styles.otpCard, { borderLeftColor: C.success }]}>
                  <View style={[styles.otpIconContainer, { backgroundColor: C.successBg }]}>
                    <Key size={24} weight="fill" color={C.success} />
                  </View>
                  <View style={styles.otpContent}>
                    <Text style={[styles.otpCode, { color: C.success }]}>{endOtp}</Text>
                    <Text style={styles.otpHint}>Show this code to your technician to confirm job completion</Text>
                  </View>
                </View>
              );
            })()}
          </>
          );
        })()}

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
                  {step.completed
                    ? <CheckCircle size={18} weight="fill" color={C.success} />
                    : <Hourglass size={18} weight="regular" color={C.warning} />
                  }
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
              <View style={styles.certIconContainer}>
                <Trophy size={24} weight="fill" color={C.warning} />
              </View>
              <View style={styles.certInfo}>
                <Text style={styles.certTitle}>Certificate Issued</Text>
                <Text style={styles.certSub}>EcoScore: {certificate.eco_score} / 100</Text>
                <View style={styles.certLinkRow}>
                  <Text style={styles.certLink}>View Certificate</Text>
                  <ArrowRight size={14} weight="bold" color={C.primary} />
                </View>
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
              ? <ActivityIndicator color={C.danger} size="small" />
              : <Text style={styles.cancelText}>Cancel Booking</Text>
            }
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

export default BookingDetailScreen;
