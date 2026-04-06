import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Linking, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { jobAPI, complianceAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';
import { Job } from '../../types';
import {
  ArrowLeft, Calendar, Phone, CheckCircle, ArrowsClockwise,
  Hourglass, Key, ClipboardText, Siren, ArrowRight, MapPin, NavigationArrow,
} from '../../components/Icons';

const JobDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const jobId = route.params?.job_id;

  const [job, setJob] = useState<Job | null>(null);
  const [compliance, setCompliance] = useState<any>(null);
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
    if (s === 'completed') return COLORS.success;
    if (s === 'in_progress') return COLORS.primary;
    if (s === 'cancelled') return COLORS.danger;
    return COLORS.warning;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Job not found</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.goBackRow}>
          <ArrowLeft size={18} weight="regular" color={COLORS.primary} />
          <Text style={styles.link}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={[styles.badge, { backgroundColor: statusColor(job.status) }]}>
          <Text style={styles.badgeText}>{job.status === 'in_progress' ? 'ACTIVE' : job.status?.toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Job Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.jobTitle}>
            {job.tank_type?.replace('_', ' ').toUpperCase() || 'CLEANING JOB'}
          </Text>
          <Text style={styles.jobSize}>{job.tank_size_litres} Litres</Text>
          <View style={styles.scheduledRow}>
            <Calendar size={16} weight="regular" color={COLORS.primary} />
            <Text style={styles.scheduledAt}>{formatDate(job.scheduled_at)}</Text>
          </View>
        </View>

        {/* Customer Info */}
        <Text style={styles.sectionTitle}>Customer</Text>
        <View style={styles.customerCard}>
          <View style={styles.customerRow}>
            <Text style={styles.customerName}>{job.customer_name || 'Customer'}</Text>
            <TouchableOpacity style={styles.callBtn} onPress={callCustomer}>
              <Phone size={14} weight="regular" color={COLORS.primary} />
              <Text style={styles.callText}>Call</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.customerPhone}>{job.customer_phone}</Text>
          <Text style={styles.address}>{job.address}</Text>
          <TouchableOpacity style={styles.navigateBtn} onPress={openInMaps}>
            <NavigationArrow size={16} weight="fill" color={COLORS.primaryFg} />
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
                      <CheckCircle size={18} weight="fill" color={COLORS.success} />
                    ) : step.logged ? (
                      <ArrowsClockwise size={18} weight="regular" color={COLORS.primary} />
                    ) : (
                      <Hourglass size={18} weight="regular" color={COLORS.warning} />
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
          >
            {starting ? (
              <ActivityIndicator color={COLORS.primaryFg} />
            ) : (
              <View style={styles.actionBtnContent}>
                <Key size={18} weight="fill" color={COLORS.primaryFg} />
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
            >
              <View style={styles.actionBtnContent}>
                <ClipboardText size={18} weight="regular" color={COLORS.primaryFg} />
                <Text style={styles.actionBtnText}>
                  Open Compliance Checklist ({compliance?.completion_percentage ?? 0}%)
                </Text>
              </View>
            </TouchableOpacity>

            {compliance?.completion_percentage === 100 && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: COLORS.success }, starting && styles.btnDisabled]}
                onPress={handleGenerateEndOtp}
                disabled={starting}
              >
                {starting ? (
                  <ActivityIndicator color={COLORS.primaryFg} />
                ) : (
                  <View style={styles.actionBtnContent}>
                    <Key size={18} weight="fill" color={COLORS.primaryFg} />
                    <Text style={styles.actionBtnText}>Complete Job (End OTP)</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </>
        )}

        {job.status === 'completed' && (
          <View style={styles.completedBox}>
            <CheckCircle size={40} weight="fill" color={COLORS.success} />
            <Text style={styles.completedText}>Job Completed</Text>
            {job.completed_at && (
              <Text style={styles.completedTime}>{formatDate(job.completed_at)}</Text>
            )}
          </View>
        )}

        {/* Secondary Actions -- visible when job is not completed/cancelled */}
        {job.status !== 'completed' && job.status !== 'cancelled' && (
          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('IncidentReport', { job_id: job.id })}
            >
              <View style={styles.secondaryIconContainer}>
                <Siren size={20} weight="fill" color={COLORS.danger} />
              </View>
              <Text style={styles.secondaryBtnText}>Report Incident</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => navigation.navigate('JobTransfer', { job_id: job.id })}
            >
              <View style={styles.secondaryIconContainer}>
                <ArrowsClockwise size={20} weight="regular" color={COLORS.primary} />
              </View>
              <Text style={styles.secondaryBtnText}>Transfer Job</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  errorText: { fontSize: 16, color: COLORS.muted, marginBottom: 12 },
  goBackRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.foreground, flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: COLORS.primaryFg, fontSize: 10, fontWeight: 'bold' },
  body: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.foreground, marginBottom: 10, marginTop: 16 },
  summaryCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderActive,
  },
  jobTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.foreground },
  jobSize: { fontSize: 14, color: COLORS.muted, marginTop: 4 },
  scheduledRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  scheduledAt: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  customerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  customerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  customerName: { fontSize: 16, fontWeight: 'bold', color: COLORS.foreground },
  callBtn: {
    backgroundColor: COLORS.primaryBg, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.borderActive, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  callText: { fontSize: 13, color: COLORS.primary, fontWeight: 'bold' },
  customerPhone: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  address: { fontSize: 13, color: COLORS.muted, lineHeight: 20 },
  navigateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8, marginTop: 10, alignSelf: 'flex-start',
  },
  navigateBtnText: { fontSize: 13, color: COLORS.primaryFg, fontWeight: '600' },
  complianceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  complianceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pct: { fontSize: 32, fontWeight: 'bold', color: COLORS.primary, marginRight: 10 },
  pctSub: { fontSize: 13, color: COLORS.muted },
  progressBarContainer: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, marginBottom: 14 },
  progressBarFill: { height: 8, backgroundColor: COLORS.primary, borderRadius: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepIconContainer: { marginRight: 8, width: 20, alignItems: 'center' },
  stepName: { fontSize: 13, color: COLORS.muted },
  stepDone: { color: COLORS.success, fontWeight: '600' },
  actionBtn: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 16,
  },
  actionBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  startBtn: { backgroundColor: COLORS.primary },
  checklistBtn: { backgroundColor: COLORS.primary },
  btnDisabled: { backgroundColor: COLORS.muted },
  actionBtnText: { color: COLORS.primaryFg, fontWeight: 'bold', fontSize: 16 },
  completedBox: {
    backgroundColor: COLORS.successBg,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  completedText: { fontSize: 18, fontWeight: 'bold', color: COLORS.success, marginTop: 8 },
  completedTime: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  link: { color: COLORS.primary, fontWeight: '600' },
  secondaryActions: {
    flexDirection: 'row', gap: 12, marginTop: 16,
  },
  secondaryBtn: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  secondaryIconContainer: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  secondaryBtnText: { fontSize: 12, color: COLORS.muted, fontWeight: '600' },
});

export default JobDetailScreen;
