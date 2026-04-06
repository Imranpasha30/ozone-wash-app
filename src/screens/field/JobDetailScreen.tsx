import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { jobAPI, complianceAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';
import { Job } from '../../types';

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

  const handleStart = async () => {
    setStarting(true);
    try {
      await jobAPI.startJob(jobId);
      await fetchData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not start job');
    } finally {
      setStarting(false);
    }
  };

  const callCustomer = () => {
    if (job?.customer_phone) {
      Linking.openURL(`tel:${job.customer_phone}`);
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
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
          <Text style={styles.scheduledAt}>📅 {formatDate(job.scheduled_at)}</Text>
        </View>

        {/* Customer Info */}
        <Text style={styles.sectionTitle}>Customer</Text>
        <View style={styles.customerCard}>
          <View style={styles.customerRow}>
            <Text style={styles.customerName}>{job.customer_name || 'Customer'}</Text>
            <TouchableOpacity style={styles.callBtn} onPress={callCustomer}>
              <Text style={styles.callText}>📞 Call</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.customerPhone}>{job.customer_phone}</Text>
          <Text style={styles.address}>{job.address}</Text>
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
                  <Text style={styles.stepIcon}>{step.completed ? '✅' : step.logged ? '🔄' : '⏳'}</Text>
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
            onPress={handleStart}
            disabled={starting}
          >
            {starting
              ? <ActivityIndicator color={COLORS.primaryFg} />
              : <Text style={styles.actionBtnText}>🚀 Start Job</Text>
            }
          </TouchableOpacity>
        )}

        {job.status === 'in_progress' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.checklistBtn]}
            onPress={() => navigation.navigate('Checklist', { job_id: job.id })}
          >
            <Text style={styles.actionBtnText}>
              📋 Open Compliance Checklist ({compliance?.completion_percentage ?? 0}%)
            </Text>
          </TouchableOpacity>
        )}

        {job.status === 'completed' && (
          <View style={styles.completedBox}>
            <Text style={styles.completedIcon}>✅</Text>
            <Text style={styles.completedText}>Job Completed</Text>
            {job.completed_at && (
              <Text style={styles.completedTime}>{formatDate(job.completed_at)}</Text>
            )}
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
  scheduledAt: { fontSize: 14, color: COLORS.primary, marginTop: 8, fontWeight: '600' },
  customerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  customerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  customerName: { fontSize: 16, fontWeight: 'bold', color: COLORS.foreground },
  callBtn: { backgroundColor: COLORS.primaryBg, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderActive },
  callText: { fontSize: 13, color: COLORS.primary, fontWeight: 'bold' },
  customerPhone: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  address: { fontSize: 13, color: COLORS.muted, lineHeight: 20 },
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
  stepIcon: { fontSize: 16, marginRight: 8 },
  stepName: { fontSize: 13, color: COLORS.muted },
  stepDone: { color: COLORS.success, fontWeight: '600' },
  actionBtn: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 16,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  startBtn: { backgroundColor: COLORS.primary, shadowColor: COLORS.primary },
  checklistBtn: { backgroundColor: COLORS.primary, shadowColor: COLORS.primary },
  btnDisabled: { backgroundColor: COLORS.muted, shadowOpacity: 0 },
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
  completedIcon: { fontSize: 40, marginBottom: 8 },
  completedText: { fontSize: 18, fontWeight: 'bold', color: COLORS.success },
  completedTime: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  link: { color: COLORS.primary, fontWeight: '600', marginTop: 8 },
});

export default JobDetailScreen;
