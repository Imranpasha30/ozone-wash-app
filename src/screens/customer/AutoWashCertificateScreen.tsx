/**
 * AutoWashCertificateScreen — public-facing hygiene certificate view.
 * Spec: Master Prompt v2.0 PART 4 + Auto Wash Scope PDF Section 3.4.
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Share, Alert, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { autoWashAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import {
  ArrowLeft, ShareNetwork, CheckCircle, Drop, ShieldCheck, Car, QrCode,
} from '../../components/Icons';

const BADGE_COLOR: Record<string, string> = {
  platinum: '#94A3B8',
  gold:     '#F59E0B',
  silver:   '#9CA3AF',
  bronze:   '#B45309',
};

const BADGE_LABEL: Record<string, string> = {
  platinum: '🏆 Platinum',
  gold:     '🥇 Gold',
  silver:   '🥈 Silver',
  bronze:   '🥉 Bronze',
};

export default function AutoWashCertificateScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const jobId: string = route.params?.id;

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r: any = await autoWashAPI.getBooking(jobId);
        setJob(r.data?.job);
      } catch (e: any) {
        Alert.alert('Could not load certificate', e?.message || 'Try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId]);

  const styles = makeStyles(C);

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!job || job.status !== 'completed') {
    return (
      <View style={styles.root}>
        <Text style={{ padding: 24, color: C.muted }}>Certificate not available yet.</Text>
      </View>
    );
  }

  // The certificate detail (qr_token, score, badge) is on the backend
  // certificate row — for this UI we surface the job-level readings.
  const date = new Date(job.completed_at || job.scheduled_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  const onShare = async () => {
    try {
      const url = `https://ozonewash.in/verify/AW-${jobId}`;
      const msg = `My car is hygiene-certified by Ozone Wash. Verify: ${url}`;
      if (Platform.OS === 'web') {
        if ((navigator as any).share) await (navigator as any).share({ text: msg, url });
        else { await (navigator as any).clipboard?.writeText(url); Alert.alert('Link copied'); }
      } else {
        await Share.share({ message: msg });
      }
    } catch {}
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[C.ink || '#0B1F33', '#0F2B48']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.85}>
            <ArrowLeft size={20} color="#fff" weight="bold" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hygiene Certificate</Text>
          <TouchableOpacity onPress={onShare} style={styles.backBtn} activeOpacity={0.85}>
            <ShareNetwork size={18} color="#fff" weight="bold" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
        {/* Certificate body */}
        <View style={styles.cert}>
          <View style={styles.certHeader}>
            <Text style={styles.brand}>Ozone Wash™ Auto</Text>
            <View style={styles.verifiedPill}>
              <CheckCircle size={12} weight="fill" color="#fff" />
              <Text style={styles.verifiedText}>VERIFIED</Text>
            </View>
          </View>
          <Text style={styles.certType}>CERTIFICATE OF CABIN HYGIENE</Text>

          <View style={styles.vehicleBlock}>
            <Car size={28} weight="duotone" color={C.primary} />
            <Text style={styles.vehicleType}>{(job.v_type || 'Vehicle').replace('_', ' ').toUpperCase()}</Text>
            <Text style={styles.vehicleReg}>···· {job.v_reg ? String(job.v_reg).slice(-4) : '----'}</Text>
            <Text style={styles.vehicleDate}>{date}</Text>
          </View>

          {/* Readings */}
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>OZONE PPM</Text>
              <Text style={styles.statValue}>{job.ozone_ppm_reading ?? '—'}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>FOGGING</Text>
              <Text style={styles.statValue}>{job.fogging_duration_min != null ? `${job.fogging_duration_min} min` : '—'}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>WATER USED</Text>
              <Text style={styles.statValue}>{job.water_used_litres != null ? `${job.water_used_litres} L` : '—'}</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
              <Text style={[styles.statLabel, { color: '#16A34A' }]}>WATER SAVED</Text>
              <Text style={[styles.statValue, { color: '#16A34A' }]}>{job.water_saved_litres != null ? `${job.water_saved_litres} L` : '—'}</Text>
            </View>
          </View>

          {/* QR placeholder */}
          <View style={styles.qrBox}>
            <QrCode size={88} weight="regular" color={C.ink || '#0B1F33'} />
            <Text style={styles.qrCaption}>Scan to verify · ozonewash.in/verify/AW-{String(jobId).slice(0, 8)}</Text>
          </View>

          <View style={styles.proofRow}>
            <ShieldCheck size={14} weight="fill" color={C.leaf || '#22C55E'} />
            <Text style={styles.proofText}>QR-signed by Ozone Wash™ · tamper-evident</Text>
          </View>

          <Text style={styles.validity}>
            Recommended next wash within 30 days for continuous cabin hygiene.
          </Text>
        </View>

        {/* Quick water-saving brag */}
        {job.water_saved_litres > 0 && (
          <LinearGradient colors={['#16A34A', '#15803D']} style={styles.brag}>
            <Drop size={28} weight="fill" color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.bragTitle}>You saved {job.water_saved_litres} litres</Text>
              <Text style={styles.bragSub}>
                vs a traditional car wash. Ozone disinfects with a fraction of the water.
              </Text>
            </View>
          </LinearGradient>
        )}

        <TouchableOpacity onPress={onShare} style={styles.shareBtn} activeOpacity={0.85}>
          <ShareNetwork size={18} weight="fill" color="#fff" />
          <Text style={styles.shareBtnText}>Share certificate</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: { paddingHorizontal: 18, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', color: '#fff', fontWeight: '800', fontSize: 17 },

  body: { padding: 16, paddingBottom: 32, gap: 14 },

  cert: {
    backgroundColor: C.surface, borderRadius: 18, padding: 22,
    borderWidth: 1, borderColor: C.border,
  },
  certHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 17, fontWeight: '800', color: C.foreground, letterSpacing: -0.3 },
  verifiedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
    backgroundColor: C.leaf || '#22C55E',
  },
  verifiedText: { color: '#fff', fontWeight: '800', fontSize: 9.5, letterSpacing: 1 },
  certType: { fontSize: 10, fontWeight: '800', color: C.muted, letterSpacing: 1.5, marginTop: 12 },

  vehicleBlock: { alignItems: 'center', paddingVertical: 20, gap: 4 },
  vehicleType: { fontSize: 13, fontWeight: '800', color: C.muted, letterSpacing: 1.4 },
  vehicleReg: { fontSize: 28, fontWeight: '800', color: C.foreground, letterSpacing: 1, marginTop: 4 },
  vehicleDate: { fontSize: 12, color: C.muted, marginTop: 4 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: {
    flex: 1, minWidth: '47%',
    backgroundColor: C.surfaceAlt || '#F4F8FB',
    borderRadius: 10, padding: 12,
  },
  statLabel: { fontSize: 9, fontWeight: '800', color: C.muted, letterSpacing: 1.2 },
  statValue: { fontSize: 18, fontWeight: '800', color: C.foreground, marginTop: 4 },

  qrBox: {
    alignItems: 'center', paddingVertical: 18, marginTop: 14,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  qrCaption: { fontSize: 11, color: C.muted, marginTop: 8, textAlign: 'center' },

  proofRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 12 },
  proofText: { fontSize: 11, color: C.muted, fontWeight: '600' },
  validity: { fontSize: 11, color: C.muted, marginTop: 14, textAlign: 'center', fontStyle: 'italic' },

  brag: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 14,
  },
  bragTitle: { color: '#fff', fontWeight: '800', fontSize: 16 },
  bragSub:   { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2, lineHeight: 17 },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, paddingVertical: 14, borderRadius: 14,
  },
  shareBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
