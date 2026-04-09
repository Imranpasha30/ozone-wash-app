import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Linking, Platform, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { jobAPI, complianceAPI, ecoScoreAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { Job } from '../../types';
import {
  ArrowLeft, Calendar, Phone, CheckCircle, ArrowsClockwise,
  Hourglass, Key, ClipboardText, Siren, ArrowRight, MapPin, NavigationArrow, QrCode,
  Trophy, Crown, Star, Lightning,
} from '../../components/Icons';

const JobDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const jobId = route.params?.job_id;

  const [job, setJob] = useState<Job | null>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [ecoScore, setEcoScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchData();
    const unsubscribe = navigation.addListener('focus', fetchData);
    return unsubscribe;
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const jobRes = await jobAPI.getJob(jobId) as any;
      const j = jobRes.data?.job;
      setJob(j);
      if (j) {
        try {
          const cRes = await complianceAPI.getStatus(j.id) as any;
          setCompliance(cRes.data);
        } catch (_) {}
        if (j.status === 'completed') {
          try {
            const eRes = await ecoScoreAPI.getScore(j.id) as any;
            setEcoScore(eRes.data?.eco_metrics || eRes.data);
          } catch (_) {}
        }
      }
    } catch (_) {
      Alert.alert('Error', 'Could not load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStartOtp = async () => {
    setStarting(true);
    try {
      await jobAPI.generateStartOtp(jobId);
      navigation.navigate('OtpEntry', { jobId, type: 'start' });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not generate start OTP');
    } finally {
      setStarting(false);
    }
  };

  const handleGenerateEndOtp = async () => {
    setStarting(true);
    try {
      await jobAPI.generateEndOtp(jobId);
      navigation.navigate('OtpEntry', { jobId, type: 'end' });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not generate end OTP');
    } finally {
      setStarting(false);
    }
  };

  const callCustomer = () => {
    if (job?.customer_phone) {
      Linking.openURL(`tel:${job.customer_phone}`);
    }
  };

  const openInMaps = () => {
    if (job?.location_lat && job?.location_lng) {
      const url = Platform.select({
        ios: `maps:0,0?q=${job.location_lat},${job.location_lng}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${job.location_lat},${job.location_lng}`,
      });
      Linking.openURL(url!);
    } else if (job?.address) {
      const encoded = encodeURIComponent(job.address);
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });

  const statusColor = (s: string) => {
    if (s === 'completed') return C.success;
    if (s === 'in_progress') return C.primary;
    if (s === 'cancelled') return C.danger;
    return C.warning;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Job not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.goBackRow}>
          <ArrowLeft size={18} weight="regular" color={C.primary} />
          <Text style={styles.link}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={C.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={[styles.badge, { backgroundColor: statusColor(job.status) }]}>
          <Text style={styles.badgeText}>{job.status === 'in_progress' ? 'ACTIVE' : job.status?.toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Job Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.jobIdText}>Job #{job.id?.slice(0, 8).toUpperCase()}</Text>
          {job.booking_id && (
            <Text style={styles.jobIdText}>Booking #{job.booking_id?.slice(0, 8).toUpperCase()}</Text>
          )}
          <Text style={styles.jobTitle}>
            {job.tank_type?.replace('_', ' ').toUpperCase() || 'CLEANING JOB'}
          </Text>
          <Text style={styles.jobSize}>{job.tank_size_litres} Litres</Text>
          <View style={styles.scheduledRow}>
            <Calendar size={16} weight="regular" color={C.primary} />
            <Text style={styles.scheduledAt}>{formatDate(job.scheduled_at)}</Text>
          </View>
        </View>

        {/* Customer Info */}
        <Text style={styles.sectionTitle}>Customer</Text>
        <View style={styles.customerCard}>
          <View style={styles.customerRow}>
            <Text style={styles.customerName}>{job.customer_name || 'Customer'}</Text>
            <TouchableOpacity style={styles.callBtn} onPress={callCustomer}>
              <Phone size={14} weight="regular" color={C.primary} />
              <Text style={styles.callText}>Call</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.customerPhone}>{job.customer_phone}</Text>
          <Text style={styles.address}>{job.address}</Text>
          <TouchableOpacity style={styles.navigateBtn} onPress={openInMaps}>
            <NavigationArrow size={16} weight="fill" color={C.primaryFg} />
            <Text style={styles.navigateBtnText}>Navigate to Location</Text>
          </TouchableOpacity>
        </View>

        {/* Compliance Progress */}
        {compliance && (
          <>
            <Text style={styles.sectionTitle}>Compliance Progress</Text>
            <View style={styles.complianceCard}>
              <View style={styles.complianceHeader}>
                <Text style={styles.pct}>{compliance.completion_percentage}%</Text>
                <Text style={styles.pctSub}>{compliance.completed_steps}/{compliance.total_steps} steps</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${compliance.completion_percentage}%` }]} />
              </View>
              {compliance.checklist?.map((step: any) => (
                <View key={step.step_number} style={styles.stepRow}>
                  <View style={styles.stepIconContainer}>
                    {step.completed ? (
                      <CheckCircle size={18} weight="fill" color={C.success} />
                    ) : step.logged ? (
                      <ArrowsClockwise size={18} weight="regular" color={C.primary} />
                    ) : (
                      <Hourglass size={18} weight="regular" color={C.warning} />
                    )}
                  </View>
                  <Text style={[styles.stepName, step.completed && styles.stepDone]}>
                    {step.step_number}. {step.step_name}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Actions */}
        {job.status === 'scheduled' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.startBtn, starting && styles.btnDisabled]}
            onPress={handleGenerateStartOtp}
            disabled={starting}
            activeOpacity={0.8}
          >
            {starting ? (
              <ActivityIndicator color={C.primaryFg} />
            ) : (
              <View style={styles.actionBtnContent}>
                <Key size={18} weight="fill" color={C.primaryFg} />
                <Text style={styles.actionBtnText}>Start Job (OTP)</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {job.status === 'in_progress' && (
          <>
            <TouchableOpacity
              style={[styles.actionBtn, styles.checklistBtn]}
              onPress={() => navigation.navigate('Checklist', { job_id: job.id })}
              activeOpacity={0.8}
            >
              <View style={styles.actionBtnContent}>
                <ClipboardText size={18} weight="regular" color={C.primaryFg} />
                <Text style={styles.actionBtnText}>
                  Open Compliance Checklist ({compliance?.completion_percentage ?? 0}%)
                </Text>
              </View>
            </TouchableOpacity>

            {compliance?.completion_percentage === 100 && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: C.success }, starting && styles.btnDisabled]}
                onPress={handleGenerateEndOtp}
                disabled={starting}
                activeOpacity={0.8}
              >
                {starting ? (
                  <ActivityIndicator color={C.primaryFg} />
                ) : (
                  <View style={styles.actionBtnContent}>
                    <Key size={18} weight="fill" color={C.primaryFg} />
                    <Text style={styles.actionBtnText}>Complete Job (End OTP)</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </>
        )}

        {job.status === 'completed' && (
          <>
            <View style={styles.completedBox}>
              <CheckCircle size={40} weight="fill" color={C.success} />
              <Text style={styles.completedText}>Job Completed</Text>
              {job.completed_at && (
                <Text style={styles.completedTime}>{formatDate(job.completed_at)}</Text>
              )}
            </View>

            {ecoScore && (
              <View style={styles.ecoCard}>
                <View style={styles.ecoLeft}>
                  <View style={styles.ecoCircle}>
                    <Text style={styles.ecoNum}>{ecoScore.eco_score ?? '--'}</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ecoTitle}>EcoScore for this job</Text>
                  <View style={styles.ecoBadgeRow}>
                    <Star size={12} weight="fill" color={C.gold} />
                    <Text style={styles.ecoBadge}>{ecoScore.badge_level?.toUpperCase() || 'UNRATED'}</Text>
                  </View>
                  {ecoScore.score_breakdown && (
                    <Text style={styles.ecoSub}>
                      Water: {ecoScore.score_breakdown.water_score ?? '-'} · PPE: {ecoScore.score_breakdown.ppe_score ?? '-'} · Chemical: {ecoScore.score_breakdown.chemical_score ?? '-'}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {job.amc_plan && (
              <View style={styles.amcBadge}>
                <Crown size={14} weight="fill" color={C.gold} />
                <Text style={styles.amcBadgeText}>AMC Job — {job.amc_plan?.toUpperCase()} Plan</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.primary }]}
              onPress={() => navigation.navigate('QrScanner')}
              activeOpacity={0.8}
            >
              <View style={styles.actionBtnContent}>
                <QrCode size={18} weight="regular" color={C.primary} />
                <Text style={[styles.actionBtnText, { color: C.primary }]}>Scan Certificate QR</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* Secondary Actions */}
        {job.status !== 'completed' && job.status !== 'cancelled' && (
          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('IncidentReport', { job_id: job.id })}
              activeOpacity={0.7}
            >
              <View style={styles.secondaryIconContainer}>
                <Siren size={20} weight="fill" color={C.danger} />
              </View>
              <Text style={styles.secondaryBtnText}>Report Incident</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('JobTransfer', { job_id: job.id })}
              activeOpacity={0.7}
            >
              <View style={styles.secondaryIconContainer}>
                <ArrowsClockwise size={20} weight="regular" color={C.primary} />
              </View>
              <Text style={styles.secondaryBtnText}>Transfer Job</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('LiveStream', { job_id: job.id })}
              activeOpacity={0.7}
            >
              <View style={[styles.secondaryIconContainer, { backgroundColor: '#DC2626' + '22' }]}>
                <Lightning size={20} weight="fill" color="#DC2626" />
              </View>
              <Text style={styles.secondaryBtnText}>Go Live</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  errorText: { fontSize: 16, color: C.muted, marginBottom: 12 },
  goBackRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  header: {
    backgroundColor: C.surface,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.foreground, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: C.primaryFg, fontSize: 10, fontWeight: '700' },
  body: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.foreground, marginBottom: 10, marginTop: 20 },
  summaryCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  jobIdText: { fontSize: 12, color: C.primary, fontFamily: 'monospace', fontWeight: '600', marginBottom: 4 },
  jobTitle: { fontSize: 20, fontWeight: '700', color: C.foreground },
  jobSize: { fontSize: 14, color: C.muted, marginTop: 4 },
  scheduledRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  scheduledAt: { fontSize: 14, color: C.primary, fontWeight: '600' },
  customerCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  customerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  customerName: { fontSize: 16, fontWeight: '700', color: C.foreground },
  callBtn: {
    backgroundColor: C.primaryBg, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  callText: { fontSize: 13, color: C.primary, fontWeight: '700' },
  customerPhone: { fontSize: 13, color: C.muted, marginBottom: 6 },
  address: { fontSize: 13, color: C.muted, lineHeight: 20 },
  navigateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.primary, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10, marginTop: 12, alignSelf: 'flex-start',
  },
  navigateBtnText: { fontSize: 13, color: C.primaryFg, fontWeight: '600' },
  complianceCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  complianceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pct: { fontSize: 32, fontWeight: '700', color: C.primary, marginRight: 10 },
  pctSub: { fontSize: 13, color: C.muted },
  progressBarContainer: { height: 8, backgroundColor: C.surfaceElevated, borderRadius: 4, marginBottom: 14 },
  progressBarFill: { height: 8, backgroundColor: C.primary, borderRadius: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepIconContainer: { marginRight: 8, width: 20, alignItems: 'center' },
  stepName: { fontSize: 13, color: C.muted },
  stepDone: { color: C.success, fontWeight: '600' },
  actionBtn: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 16,
  },
  actionBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  startBtn: { backgroundColor: C.primary },
  checklistBtn: { backgroundColor: C.primary },
  btnDisabled: { backgroundColor: C.muted },
  actionBtnText: { color: C.primaryFg, fontWeight: '700', fontSize: 16 },
  completedBox: {
    backgroundColor: C.successBg,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
  },
  completedText: { fontSize: 18, fontWeight: '700', color: C.success, marginTop: 8 },
  completedTime: { fontSize: 13, color: C.muted, marginTop: 4 },
  ecoCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginTop: 12,
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderWidth: 1, borderColor: C.borderActive,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  ecoLeft: { alignItems: 'center' },
  ecoCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.primaryBg, borderWidth: 2, borderColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  ecoNum: { fontSize: 20, fontWeight: '700', color: C.primary },
  ecoTitle: { fontSize: 14, fontWeight: '700', color: C.foreground },
  ecoBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ecoBadge: { fontSize: 11, fontWeight: '700', color: C.gold },
  ecoSub: { fontSize: 11, color: C.muted, marginTop: 4 },
  amcBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.goldBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    marginTop: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: C.gold,
  },
  amcBadgeText: { fontSize: 12, fontWeight: '700', color: C.gold },
  link: { color: C.primary, fontWeight: '600' },
  secondaryActions: {
    flexDirection: 'row', gap: 12, marginTop: 16,
  },
  secondaryBtn: {
    flex: 1, backgroundColor: C.surface, borderRadius: 16,
    padding: 16, alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  secondaryIconContainer: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: C.surfaceElevated,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  secondaryBtnText: { fontSize: 12, color: C.muted, fontWeight: '600' },
});

export default JobDetailScreen;
