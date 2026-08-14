/**
 * AutoWashBookingDetailScreen — customer-side detail + live tracking for an
 * auto-wash job.
 * Spec: Master Prompt v2.0 PART 4 + Auto Wash Scope PDF Section 3.3.
 *
 * Behaviour:
 *   • Polls /auto-wash/bookings/:id every 8s while job is in_progress
 *   • Shows step progress bar, current step, ozone safety alert during step 6
 *   • Surfaces certificate when job is completed
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Linking, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { autoWashAPI, jobAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import {
  ArrowLeft, ArrowRight, CheckCircle, Warning, Drop, Sparkle, Flask,
  Lightning, Wrench, Eye, Car, Certificate, QrCode,
} from '../../components/Icons';
import WebContainer from '../../components/WebContainer';

const STEP_META = [
  { n: 1, name: 'Mist Pre-Rinse',     Icon: Drop },
  { n: 2, name: 'Eco-Foam',           Icon: Sparkle },
  { n: 3, name: 'Ozone Rinse',        Icon: Flask },
  { n: 4, name: 'Precision Drying',   Icon: Lightning },
  { n: 5, name: 'Interior Steam',     Icon: Wrench },
  { n: 6, name: 'Cabin Ozone Fogging', Icon: Eye },
];

function rupees(paise?: number | null): string {
  if (paise == null) return '—';
  return '₹' + (paise / 100).toLocaleString('en-IN');
}

function statusBadgeColor(status: string, leaf: string, primary: string, muted: string) {
  if (status === 'completed') return leaf;
  if (status === 'in_progress') return primary;
  if (status === 'cancelled') return '#EF4444';
  return muted;
}

export default function AutoWashBookingDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const scrollRef = useWebScrollFix();
  const jobId: string = route.params?.id;

  const [job, setJob] = useState<any>(null);
  const [steps, setSteps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<any>(null);
  // Start OTP the customer shares with the technician (spec G-2)
  const [startOtp, setStartOtp] = useState<string | null>(null);
  const [otpHint, setOtpHint] = useState<string | null>(null);

  const fetchStartOtp = async () => {
    try {
      const r: any = await jobAPI.customerRequestOtp(jobId);
      const otp = r.data?.otp || r.otp;
      if (otp) { setStartOtp(String(otp)); setOtpHint(null); }
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || '';
      // "No technician assigned yet" etc. — show the reason instead of digits
      setOtpHint(msg || null);
    }
  };

  const refresh = async () => {
    try {
      const r: any = await autoWashAPI.getBooking(jobId);
      setJob(r.data?.job);
      setSteps(r.data?.steps || []);
    } catch (e: any) {
      // silent during polling — only show alert on initial load failure
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobId]);

  // Surface the Start OTP while the job is awaiting the technician
  useEffect(() => {
    if (job?.status === 'scheduled') fetchStartOtp();
  }, [job?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll while job is active
  useEffect(() => {
    if (job?.status === 'in_progress') {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(refresh, 8000);
      return () => clearInterval(pollRef.current);
    }
    if (pollRef.current) clearInterval(pollRef.current);
  }, [job?.status]);

  const styles = makeStyles(C);

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.root}>
        <Text style={{ padding: 24, color: C.muted }}>Booking not found.</Text>
      </View>
    );
  }

  const stepDone = (n: number) => steps.find((s) => s.step_number === n)?.ended_at;
  const stepStarted = (n: number) => steps.find((s) => s.step_number === n)?.started_at;
  const completedCount = STEP_META.filter((s) => stepDone(s.n)).length;
  const currentStep = STEP_META.find((s) => stepStarted(s.n) && !stepDone(s.n))?.n
                    || STEP_META.find((s) => !stepDone(s.n))?.n
                    || 6;
  const isCompleted = job.status === 'completed';
  const isInProgress = job.status === 'in_progress';

  return (
    <View style={styles.root}>
      <LinearGradient colors={[C.primary, '#0369A1']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.85}>
            <ArrowLeft size={20} color="#fff" weight="bold" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Car Wash Booking</Text>
            <Text style={styles.headerSub}>
              {isCompleted ? 'Certified · QR-signed' : isInProgress ? 'In progress — live updates' : 'Scheduled'}
            </Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: statusBadgeColor(job.status, '#86EFAC', '#fff', 'rgba(255,255,255,0.3)') }]}>
            <Text style={styles.statusPillText}>{job.status?.toUpperCase().replace('_', ' ')}</Text>
          </View>
        </View>

        <View style={styles.headerMeta}>
          <Car size={14} weight="duotone" color="#fff" />
          <Text style={styles.headerMetaText}>
            {job.v_type?.replace('_', ' ').toUpperCase()} · {job.v_reg} · {job.service_package?.toUpperCase()}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.body}>
        <WebContainer variant="narrow">
        {/* Start OTP — shown while scheduled so the customer can hand it to
            the technician at the door (G-2). */}
        {job.status === 'scheduled' && (
          <View style={[styles.card, { marginTop: 12, borderWidth: 1.5, borderColor: C.primary }]}>
            <Text style={styles.cardLabel}>START OTP</Text>
            {startOtp ? (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 10 }}>
                  {startOtp.split('').map((d, i) => (
                    <View key={i} style={{
                      width: 40, height: 48, borderRadius: 10,
                      backgroundColor: C.primaryBg, borderWidth: 1.5, borderColor: C.primary,
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ fontSize: 22, fontWeight: '800', color: C.primary }}>{d}</Text>
                    </View>
                  ))}
                </View>
                <Text style={{ fontSize: 12, color: C.muted, textAlign: 'center' }}>
                  Share this OTP with the technician when they arrive — the wash starts only after they verify it.
                </Text>
              </>
            ) : (
              <TouchableOpacity onPress={fetchStartOtp} style={{ paddingVertical: 10 }}>
                <Text style={{ fontSize: 13, color: C.muted, textAlign: 'center' }}>
                  {otpHint || 'Tap to load your Start OTP'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Ozone safety alert during step 6 */}
        {isInProgress && stepStarted(6) && !stepDone(6) && (
          <View style={styles.warningBox}>
            <Warning size={18} weight="fill" color="#F59E0B" />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>Cabin ozone fogging in progress</Text>
              <Text style={styles.warningText}>
                Please do not enter the vehicle for 15 min after fogging completes.
                Ozone will auto-dissipate. This is normal and safe.
              </Text>
            </View>
          </View>
        )}

        {/* Progress card */}
        <View style={[styles.card, { marginTop: 12 }]}>
          <View style={styles.progressHeader}>
            <Text style={styles.cardLabel}>WASH PROGRESS</Text>
            <Text style={styles.progressCount}>{completedCount}/6</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(completedCount / 6) * 100}%`, backgroundColor: C.primary }]} />
          </View>
          <View style={styles.stepList}>
            {STEP_META.map((s) => {
              const done = !!stepDone(s.n);
              const active = stepStarted(s.n) && !done;
              return (
                <View key={s.n} style={styles.stepRow}>
                  <View style={[
                    styles.stepDot,
                    done && { backgroundColor: C.success || '#22C55E' },
                    active && { backgroundColor: C.primary, borderColor: C.primary },
                  ]}>
                    {done ? <CheckCircle size={12} weight="fill" color="#fff" /> :
                     active ? <ActivityIndicator size="small" color="#fff" /> :
                     <Text style={styles.stepDotN}>{s.n}</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.stepName, (done || active) && { color: C.foreground }]}>{s.name}</Text>
                    {active && <Text style={[styles.stepSub, { color: C.primary }]}>In progress…</Text>}
                    {done && (
                      <Text style={[styles.stepSub, { color: C.success || '#22C55E' }]}>
                        ✓ Complete
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Booking detail */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>SCHEDULED</Text>
          <Text style={styles.cardValue}>{new Date(job.scheduled_at).toLocaleString()}</Text>
          {job.gated_community && <Text style={[styles.cardSub, { color: C.primary, fontWeight: '700' }]}>Gated community access</Text>}
        </View>

        {/* Price summary */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>PRICE</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Package</Text>
            <Text style={styles.priceValue}>{rupees(job.base_price_paise)}</Text>
          </View>
          {(job.addons_booked?.length || 0) > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Add-ons ({job.addons_booked.length})</Text>
              <Text style={styles.priceValue}>{rupees(job.addons_price_paise)}</Text>
            </View>
          )}
          <View style={[styles.priceRow, styles.priceTotal]}>
            <Text style={styles.priceTotalLabel}>Total (GST included)</Text>
            <Text style={styles.priceTotalValue}>{rupees(job.total_price_paise)}</Text>
          </View>
        </View>

        {/* Certificate (when complete) */}
        {isCompleted && (
          <TouchableOpacity
            onPress={() => navigation.navigate('AutoWashCertificate', { id: jobId })}
            activeOpacity={0.85}
            style={[styles.card, { backgroundColor: '#0B1F33', borderColor: 'transparent' }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.certIconBox}>
                <Certificate size={22} weight="fill" color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.certTitle}>Hygiene Certificate Ready</Text>
                <Text style={styles.certSub}>QR-signed proof · tap to view & share</Text>
              </View>
              <ArrowRight size={20} weight="bold" color="#fff" />
            </View>
            {job.water_saved_litres != null && (
              <View style={styles.savingNote}>
                <Drop size={14} weight="fill" color="#86EFAC" />
                <Text style={styles.savingText}>
                  You saved {job.water_saved_litres}L of water vs traditional wash.
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        </WebContainer>
      </ScrollView>
    </View>
  );
}

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: { paddingHorizontal: 18, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontWeight: '800', fontSize: 18 },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusPillText: { color: C.foreground, fontWeight: '800', fontSize: 9.5, letterSpacing: 0.8 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  headerMetaText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  body: { padding: 16, paddingBottom: 32, gap: 12 },

  warningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 14, borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderLeftWidth: 3, borderLeftColor: '#F59E0B',
  },
  warningTitle: { color: C.foreground, fontWeight: '800', fontSize: 14, marginBottom: 4 },
  warningText: { color: C.muted, fontSize: 13, lineHeight: 19 },

  card: {
    backgroundColor: C.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  cardLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color: C.muted, marginBottom: 6 },
  cardValue: { fontSize: 15, fontWeight: '700', color: C.foreground },
  cardSub: { fontSize: 12, color: C.muted, marginTop: 4 },

  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  progressCount: { fontSize: 13, fontWeight: '800', color: C.foreground },
  progressTrack: {
    height: 6, borderRadius: 999, backgroundColor: C.border,
    marginTop: 8, marginBottom: 12, overflow: 'hidden',
  },
  progressFill: { height: '100%' },

  stepList: { gap: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: C.border, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotN: { fontSize: 11, fontWeight: '800', color: C.muted },
  stepName: { fontSize: 13, color: C.muted, fontWeight: '600' },
  stepSub: { fontSize: 11, marginTop: 2, fontWeight: '700' },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  priceLabel: { fontSize: 13, color: C.muted },
  priceValue: { fontSize: 13, color: C.foreground, fontWeight: '600' },
  priceTotal: { borderTopWidth: 1, borderTopColor: C.border, marginTop: 6, paddingTop: 12 },
  priceTotalLabel: { fontSize: 14, fontWeight: '800', color: C.foreground },
  priceTotalValue: { fontSize: 18, fontWeight: '800', color: C.primary },

  certIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(34,197,94,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  certTitle: { color: '#fff', fontWeight: '800', fontSize: 15 },
  certSub:   { color: 'rgba(255,255,255,0.72)', fontSize: 12, marginTop: 2 },
  savingNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
  },
  savingText: { color: '#86EFAC', fontSize: 12, fontWeight: '700' },
});
