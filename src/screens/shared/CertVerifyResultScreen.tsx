import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Platform, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { certificateAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import {
  ShieldCheck, XCircle, Warning, ArrowLeft, Trophy,
  Medal, Star, Shield, Calendar, MapPin, Drop,
} from '../../components/Icons';

const CertVerifyResultScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);

  const certId = route.params?.cert_id;
  const errorMsg = route.params?.error;

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(errorMsg || null);

  useEffect(() => {
    if (errorMsg || !certId) {
      setLoading(false);
      if (!errorMsg) setError('Invalid certificate ID');
      return;
    }
    verify();
  }, []);

  const verify = async () => {
    setLoading(true);
    try {
      const res = await certificateAPI.verifyCertificate(certId) as any;
      setResult(res.data || res);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Certificate not found or invalid');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const BADGE_COLORS: Record<string, string> = {
    platinum: C.platinum, gold: C.gold, silver: C.silver, bronze: C.bronze,
  };
  const BADGE_BG: Record<string, string> = {
    platinum: C.platinumBg, gold: C.goldBg, silver: C.silverBg, bronze: C.bronzeBg,
  };

  const BadgeIcon = ({ badge, size = 32 }: { badge: string; size?: number }) => {
    const color = BADGE_COLORS[badge] || C.muted;
    switch (badge) {
      case 'platinum': return <Shield size={size} weight="fill" color={color} />;
      case 'gold': return <Trophy size={size} weight="fill" color={color} />;
      case 'silver': return <Medal size={size} weight="fill" color={color} />;
      default: return <Star size={size} weight="fill" color={color} />;
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <StatusBar barStyle="dark-content" backgroundColor={C.background} />
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Verifying certificate...</Text>
      </View>
    );
  }

  const isValid = result?.valid === true;
  const badge = result?.eco_score >= 86 ? 'platinum' : result?.eco_score >= 66 ? 'gold' : result?.eco_score >= 41 ? 'silver' : 'bronze';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={C.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verification Result</Text>
      </View>

      <View style={styles.body}>
        {error ? (
          /* Error State */
          <View style={styles.resultCard}>
            <View style={[styles.statusCircle, { backgroundColor: C.dangerBg }]}>
              <XCircle size={48} weight="fill" color={C.danger} />
            </View>
            <Text style={[styles.statusTitle, { color: C.danger }]}>Invalid Certificate</Text>
            <Text style={styles.statusSub}>{error}</Text>
            <TouchableOpacity style={styles.scanAgainBtn} onPress={() => navigation.replace('QrScanner')} activeOpacity={0.7}>
              <Text style={styles.scanAgainText}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        ) : isValid ? (
          /* Valid Certificate */
          <View style={styles.resultCard}>
            <View style={[styles.statusCircle, { backgroundColor: C.successBg }]}>
              <ShieldCheck size={48} weight="fill" color={C.success} />
            </View>
            <Text style={[styles.statusTitle, { color: C.success }]}>Certificate Verified</Text>
            <Text style={styles.statusSub}>This certificate is authentic and valid</Text>

            {/* EcoScore Badge */}
            <View style={[styles.badgeCard, { backgroundColor: BADGE_BG[badge] }]}>
              <BadgeIcon badge={badge} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.badgeLevel, { color: BADGE_COLORS[badge] }]}>
                  {badge.toUpperCase()} BADGE
                </Text>
                <Text style={styles.badgeScore}>EcoScore: {result.eco_score}/100</Text>
              </View>
            </View>

            {/* Details */}
            <View style={styles.detailsCard}>
              {result.customer_name && (
                <DetailRow C={C} icon={<Drop size={16} weight="fill" color={C.primary} />} label="Customer" value={result.customer_name} />
              )}
              {result.address && (
                <DetailRow C={C} icon={<MapPin size={16} weight="regular" color={C.muted} />} label="Location" value={result.address} />
              )}
              {result.tank_type && (
                <DetailRow C={C} icon={<Drop size={16} weight="regular" color={C.muted} />} label="Tank Type" value={result.tank_type.replace('_', ' ').toUpperCase()} />
              )}
              {result.service_date && (
                <DetailRow C={C} icon={<Calendar size={16} weight="regular" color={C.muted} />} label="Service Date" value={formatDate(result.service_date)} />
              )}
              {result.valid_until && (
                <DetailRow C={C} icon={<Calendar size={16} weight="regular" color={C.success} />} label="Valid Until" value={formatDate(result.valid_until)} />
              )}
            </View>

            <View style={styles.certIdRow}>
              <Text style={styles.certIdLabel}>Certificate ID</Text>
              <Text style={styles.certIdValue}>{certId?.slice(0, 8)}...{certId?.slice(-4)}</Text>
            </View>

            <TouchableOpacity style={styles.scanAgainBtn} onPress={() => navigation.replace('QrScanner')} activeOpacity={0.7}>
              <Text style={styles.scanAgainText}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Expired / Revoked */
          <View style={styles.resultCard}>
            <View style={[styles.statusCircle, { backgroundColor: C.warningBg }]}>
              <Warning size={48} weight="fill" color={C.warning} />
            </View>
            <Text style={[styles.statusTitle, { color: C.warning }]}>
              {result?.status === 'revoked' ? 'Certificate Revoked' : 'Certificate Expired'}
            </Text>
            <Text style={styles.statusSub}>{result?.message || 'This certificate is no longer valid'}</Text>

            {result?.valid_until && (
              <Text style={styles.expiredDate}>
                {result.status === 'revoked' ? 'Revoked' : 'Expired'} — Valid until was {formatDate(result.valid_until)}
              </Text>
            )}

            <TouchableOpacity style={styles.scanAgainBtn} onPress={() => navigation.replace('QrScanner')} activeOpacity={0.7}>
              <Text style={styles.scanAgainText}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const DetailRow = ({ C, icon, label, value }: { C: any; icon: React.ReactNode; label: string; value: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
    {icon}
    <Text style={{ fontSize: 12, color: C.muted, width: 80 }}>{label}</Text>
    <Text style={{ fontSize: 13, fontWeight: '600', color: C.foreground, flex: 1 }}>{value}</Text>
  </View>
);

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 14, color: C.muted, marginTop: 16 },
  header: {
    backgroundColor: C.surface, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },
  body: { flex: 1, justifyContent: 'center', padding: 20 },
  resultCard: {
    backgroundColor: C.surface, borderRadius: 24, padding: 28, alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 16 },
      android: { elevation: 4 },
    }),
  },
  statusCircle: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  statusTitle: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  statusSub: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 22, marginBottom: 20 },

  // Badge
  badgeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    width: '100%', borderRadius: 16, padding: 14, marginBottom: 16,
  },
  badgeLevel: { fontSize: 14, fontWeight: '700' },
  badgeScore: { fontSize: 12, color: C.muted, marginTop: 2 },

  // Details
  detailsCard: {
    width: '100%', backgroundColor: C.surfaceElevated,
    borderRadius: 16, padding: 16, marginBottom: 16,
  },

  // Cert ID
  certIdRow: {
    flexDirection: 'row', justifyContent: 'space-between', width: '100%',
    paddingHorizontal: 4, marginBottom: 20,
  },
  certIdLabel: { fontSize: 12, color: C.muted },
  certIdValue: { fontSize: 12, color: C.primary, fontFamily: 'monospace' },

  // Expired
  expiredDate: { fontSize: 12, color: C.muted, marginBottom: 20 },

  // Scan Again
  scanAgainBtn: {
    backgroundColor: C.primaryBg, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12, width: '100%', alignItems: 'center',
  },
  scanAgainText: { color: C.primary, fontWeight: '700', fontSize: 14 },
});

export default CertVerifyResultScreen;
