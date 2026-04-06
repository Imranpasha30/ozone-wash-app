import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { certificateAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';
import { Certificate } from '../../types';

const BADGE_COLORS: Record<string, string> = {
  platinum: COLORS.platinum,
  gold: COLORS.gold,
  silver: COLORS.silver,
  bronze: COLORS.bronze,
};

const BADGE_ICONS: Record<string, string> = {
  platinum: '💎',
  gold: '🥇',
  silver: '🥈',
  bronze: '🥉',
};

const CertificateScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const jobId = route.params?.job_id;

  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCert();
  }, []);

  const fetchCert = async () => {
    setLoading(true);
    try {
      const res = await certificateAPI.getCertificate(jobId) as any;
      setCert(res.data?.certificate || null);
    } catch (_) {
      Alert.alert('Error', 'Certificate not found');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!cert) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>Certificate not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const badge = cert.eco_score >= 86 ? 'platinum' : cert.eco_score >= 66 ? 'gold' : cert.eco_score >= 41 ? 'silver' : 'bronze';

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hygiene Certificate</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Certificate Card */}
        <View style={[styles.certCard, { borderColor: BADGE_COLORS[badge] }]}>
          {/* Header */}
          <View style={[styles.certHeader, { backgroundColor: BADGE_COLORS[badge] }]}>
            <Text style={styles.certHeaderText}>OZONE WASH</Text>
            <Text style={styles.certSubHeader}>Hygiene Certification</Text>
          </View>

          {/* Badge */}
          <View style={styles.badgeSection}>
            <Text style={styles.badgeIcon}>{BADGE_ICONS[badge]}</Text>
            <Text style={[styles.badgeLevel, { color: BADGE_COLORS[badge] }]}>
              {badge.toUpperCase()} BADGE
            </Text>
          </View>

          {/* EcoScore */}
          <View style={styles.scoreSection}>
            <Text style={styles.scoreLabel}>EcoScore</Text>
            <Text style={[styles.scoreValue, { color: BADGE_COLORS[badge] }]}>{cert.eco_score}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Details */}
          <CertRow label="Customer" value={cert.customer_name || '—'} />
          <CertRow label="Address" value={cert.address || '—'} />
          <CertRow label="Tank Type" value={cert.tank_type?.replace('_', ' ').toUpperCase() || '—'} />
          <CertRow label="Issued On" value={formatDate(cert.issued_at)} />
          <CertRow label="Valid Until" value={formatDate(cert.valid_until)} />
          <CertRow label="Status" value={cert.status.toUpperCase()} highlight={cert.status === 'active'} />

          <View style={styles.divider} />

          {/* Certificate ID */}
          <View style={styles.certIdBox}>
            <Text style={styles.certIdLabel}>Certificate ID</Text>
            <Text style={styles.certId}>{cert.id}</Text>
          </View>

          {/* QR placeholder */}
          <View style={styles.qrBox}>
            <Text style={styles.qrIcon}>◼◻◼{'\n'}◻◼◻{'\n'}◼◻◼</Text>
            <Text style={styles.qrLabel}>Scan to verify authenticity</Text>
          </View>

          {/* Signature */}
          <View style={styles.sigSection}>
            <View style={styles.sigLine} />
            <Text style={styles.sigName}>VijRam Health Sense Pvt. Ltd.</Text>
            <Text style={styles.sigTitle}>Authorised Signatory</Text>
          </View>
        </View>

        {/* Actions */}
        {cert.certificate_url && (
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={() => Linking.openURL(cert.certificate_url)}
          >
            <Text style={styles.downloadText}>⬇️  Download PDF Certificate</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.verifyBtn}
          onPress={() => Alert.alert('Verify', `Certificate ID: ${cert.id}\nStatus: ${cert.status}`)}
        >
          <Text style={styles.verifyText}>🔍  Verify Certificate</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const CertRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <View style={styles.certRow}>
    <Text style={styles.certRowLabel}>{label}</Text>
    <Text style={[styles.certRowValue, highlight && styles.certRowHighlight]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  notFoundText: { fontSize: 16, color: COLORS.muted, marginBottom: 12 },
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.foreground },
  body: { padding: 16, paddingBottom: 40 },
  certCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  certHeader: { padding: 20, alignItems: 'center' },
  certHeaderText: { fontSize: 22, fontWeight: 'bold', color: COLORS.foreground, letterSpacing: 3 },
  certSubHeader: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  badgeSection: { alignItems: 'center', paddingVertical: 20 },
  badgeIcon: { fontSize: 52, marginBottom: 6 },
  badgeLevel: { fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },
  scoreSection: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 16 },
  scoreLabel: { fontSize: 14, color: COLORS.muted, marginRight: 8, marginBottom: 4 },
  scoreValue: { fontSize: 52, fontWeight: 'bold', lineHeight: 56 },
  scoreMax: { fontSize: 16, color: COLORS.muted, marginBottom: 6, marginLeft: 2 },
  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 20, marginVertical: 12 },
  certRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  certRowLabel: { width: 90, fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  certRowValue: { flex: 1, fontSize: 13, color: COLORS.foreground, fontWeight: '600' },
  certRowHighlight: { color: COLORS.primary },
  certIdBox: { alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  certIdLabel: { fontSize: 11, color: COLORS.muted, textTransform: 'uppercase', marginBottom: 4 },
  certId: { fontSize: 11, color: COLORS.primary, fontFamily: 'monospace' },
  qrBox: { alignItems: 'center', paddingVertical: 16, backgroundColor: COLORS.surfaceElevated, marginHorizontal: 20, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border },
  qrIcon: { fontSize: 40, textAlign: 'center', lineHeight: 44, letterSpacing: 4, color: COLORS.foreground },
  qrLabel: { fontSize: 11, color: COLORS.muted, marginTop: 8 },
  sigSection: { alignItems: 'center', padding: 20 },
  sigLine: { width: 120, height: 1, backgroundColor: COLORS.border, marginBottom: 8 },
  sigName: { fontSize: 12, fontWeight: 'bold', color: COLORS.foreground },
  sigTitle: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  downloadBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  downloadText: { color: COLORS.primaryFg, fontWeight: 'bold', fontSize: 15 },
  verifyBtn: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  verifyText: { color: COLORS.primary, fontWeight: 'bold', fontSize: 15 },
  link: { color: COLORS.primary, fontWeight: '600', marginTop: 8 },
});

export default CertificateScreen;
