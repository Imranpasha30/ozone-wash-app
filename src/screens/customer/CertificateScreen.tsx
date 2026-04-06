import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { certificateAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { Certificate } from '../../types';
import {
  ArrowLeft, Trophy, Medal, Star, Shield,
  DownloadSimple, MagnifyingGlass, QrCode, ShieldCheck,
} from '../../components/Icons';

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  notFoundText: { fontSize: 16, color: C.muted, marginBottom: 12 },
  goBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: C.foreground },
  body: { padding: 16, paddingBottom: 40 },
  certCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  certHeader: { padding: 20, alignItems: 'center' },
  certHeaderText: { fontSize: 22, fontWeight: 'bold', color: C.white, letterSpacing: 3 },
  certSubHeader: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  badgeSection: { alignItems: 'center', paddingVertical: 20 },
  badgeIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  badgeLevel: { fontSize: 16, fontWeight: 'bold', letterSpacing: 2 },
  scoreSection: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 16 },
  scoreLabel: { fontSize: 14, color: C.muted, marginRight: 8, marginBottom: 4 },
  scoreValue: { fontSize: 52, fontWeight: 'bold', lineHeight: 56 },
  scoreMax: { fontSize: 16, color: C.muted, marginBottom: 6, marginLeft: 2 },
  divider: { height: 1, backgroundColor: C.border, marginHorizontal: 20, marginVertical: 12 },
  certRow: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  certRowLabel: { width: 90, fontSize: 12, color: C.muted, fontWeight: '600' },
  certRowValue: { flex: 1, fontSize: 13, color: C.foreground, fontWeight: '600' },
  certRowHighlight: { color: C.primary },
  certIdBox: { alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  certIdLabel: { fontSize: 11, color: C.muted, textTransform: 'uppercase', marginBottom: 4 },
  certId: { fontSize: 11, color: C.primary, fontFamily: 'monospace' },
  qrBox: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: C.surfaceElevated,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 8,
  },
  qrLabel: { fontSize: 11, color: C.muted },
  sigSection: { alignItems: 'center', padding: 20 },
  sigLine: { width: 120, height: 1, backgroundColor: C.border, marginBottom: 8 },
  sigName: { fontSize: 12, fontWeight: 'bold', color: C.foreground },
  sigTitle: { fontSize: 11, color: C.muted, marginTop: 2 },
  downloadBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  downloadText: { color: C.primaryFg, fontWeight: 'bold', fontSize: 15 },
  verifyBtn: {
    backgroundColor: C.surfaceElevated,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  verifyText: { color: C.primary, fontWeight: 'bold', fontSize: 15 },
  link: { color: C.primary, fontWeight: '600' },
});

const CertificateScreen = () => {
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);

  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const jobId = route.params?.job_id;

  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);

  const BADGE_COLORS: Record<string, string> = {
    platinum: C.platinum,
    gold: C.gold,
    silver: C.silver,
    bronze: C.bronze,
  };

  const BADGE_BG_COLORS: Record<string, string> = {
    platinum: C.platinumBg,
    gold: C.goldBg,
    silver: C.silverBg,
    bronze: C.bronzeBg,
  };

  const BadgeIcon = ({ badge }: { badge: string }) => {
    const color = BADGE_COLORS[badge] || C.muted;
    switch (badge) {
      case 'platinum': return <Shield size={48} weight="fill" color={color} />;
      case 'gold': return <Trophy size={48} weight="fill" color={color} />;
      case 'silver': return <Medal size={48} weight="fill" color={color} />;
      case 'bronze': return <Star size={48} weight="fill" color={color} />;
      default: return <Star size={48} weight="fill" color={color} />;
    }
  };

  const CertRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
    <View style={styles.certRow}>
      <Text style={styles.certRowLabel}>{label}</Text>
      <Text style={[styles.certRowValue, highlight && styles.certRowHighlight]}>{value}</Text>
    </View>
  );

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
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!cert) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFoundText}>Certificate not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.goBackBtn}>
          <ArrowLeft size={18} weight="regular" color={C.primary} />
          <Text style={styles.link}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const badge = cert.eco_score >= 86 ? 'platinum' : cert.eco_score >= 66 ? 'gold' : cert.eco_score >= 41 ? 'silver' : 'bronze';

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={C.foreground} />
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
            <View style={[styles.badgeIconWrap, { backgroundColor: BADGE_BG_COLORS[badge] }]}>
              <BadgeIcon badge={badge} />
            </View>
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
            <QrCode size={56} weight="regular" color={C.foreground} />
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
            <DownloadSimple size={20} weight="bold" color={C.primaryFg} />
            <Text style={styles.downloadText}>Download PDF Certificate</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.verifyBtn}
          onPress={() => Alert.alert('Verify', `Certificate ID: ${cert.id}\nStatus: ${cert.status}`)}
        >
          <ShieldCheck size={20} weight="regular" color={C.primary} />
          <Text style={styles.verifyText}>Verify Certificate</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default CertificateScreen;
