import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Platform, StatusBar,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { complianceAPI, jobAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { COMPLIANCE_STEPS } from '../../utils/constants';
import {
  ArrowLeft, Check, Lock, CheckCircle, ArrowRight, Confetti,
} from '../../components/Icons';

const ChecklistScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const jobId = route.params?.job_id;

  const [checklist, setChecklist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  const fetchChecklist = async () => {
    setLoading(true);
    try {
      const res = await complianceAPI.getChecklist(jobId) as any;
      setChecklist(res.data);
    } catch (_) {
      Alert.alert('Error', 'Could not load checklist');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchChecklist();
    }, [])
  );

  const handleComplete = async () => {
    if ((checklist?.completion_percentage || 0) < 100) {
      return Alert.alert(
        'Incomplete',
        'Please complete all 8 compliance steps before finishing the job.'
      );
    }

    Alert.alert(
      'Send End OTP',
      'All 8 steps are complete. This will generate an End OTP for the customer to confirm job completion.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate OTP',
          onPress: async () => {
            setCompleting(true);
            try {
              await complianceAPI.completeCompliance(jobId);
              await jobAPI.generateEndOtp(jobId);
              navigation.navigate('OtpEntry', { jobId, type: 'end' });
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not generate OTP');
            } finally {
              setCompleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const steps = checklist?.checklist || [];
  const completedCount = checklist?.completed_steps || 0;
  const totalCount = checklist?.total_steps || 8;
  const pct = checklist?.completion_percentage || 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={C.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compliance Checklist</Text>
        <Text style={styles.headerCount}>{completedCount}/{totalCount}</Text>
      </View>

      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.progressText}>{pct}% complete</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {steps.map((step: any, i: number) => {
          const isCompleted = step.completed;
          const isLocked = i > 0 && !steps[i - 1].completed;

          return (
            <TouchableOpacity
              key={step.step_number}
              style={[
                styles.stepCard,
                isCompleted && styles.stepCardDone,
                isLocked && styles.stepCardLocked,
              ]}
              onPress={() => {
                if (isLocked) {
                  Alert.alert('Step Locked', 'Please complete the previous step first.');
                  return;
                }
                if (isCompleted) {
                  Alert.alert('Already Done', `Step ${step.step_number} is already completed.`);
                  return;
                }
                navigation.navigate('ComplianceStep', {
                  job_id: jobId,
                  step_number: step.step_number,
                });
              }}
              disabled={isCompleted}
              activeOpacity={0.7}
            >
              <View style={styles.stepLeft}>
                <View style={[
                  styles.stepCircle,
                  isCompleted && styles.stepCircleDone,
                  isLocked && styles.stepCircleLocked,
                ]}>
                  {isCompleted ? (
                    <Check size={16} weight="bold" color={C.primaryFg} />
                  ) : isLocked ? (
                    <Lock size={14} weight="fill" color={C.muted} />
                  ) : (
                    <Text style={styles.stepCircleText}>{step.step_number}</Text>
                  )}
                </View>
                {i < steps.length - 1 && (
                  <View style={[styles.stepConnector, isCompleted && styles.stepConnectorDone]} />
                )}
              </View>

              <View style={styles.stepContent}>
                <Text style={[styles.stepName, isCompleted && styles.stepNameDone, isLocked && styles.stepNameLocked]}>
                  {step.step_name}
                </Text>
                <View style={styles.stepFieldsRow}>
                  {isCompleted ? (
                    <>
                      <CheckCircle size={14} weight="fill" color={C.success} />
                      <Text style={[styles.stepFields, { color: C.success }]}>Completed</Text>
                    </>
                  ) : (
                    <Text style={styles.stepFields}>
                      {isLocked ? 'Complete previous step first' : `Required: ${step.required_fields?.join(', ') || 'photo, GPS'}`}
                    </Text>
                  )}
                </View>
              </View>

              {!isCompleted && !isLocked && (
                <View style={styles.stepArrowContainer}>
                  <ArrowRight size={16} weight="bold" color={C.primary} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Complete Job Button */}
        <TouchableOpacity
          style={[
            styles.completeBtn,
            pct < 100 && styles.completeBtnDisabled,
            completing && styles.completeBtnDisabled,
          ]}
          onPress={handleComplete}
          disabled={completing || pct < 100}
          activeOpacity={0.8}
        >
          {completing ? (
            <ActivityIndicator color={C.primaryFg} />
          ) : (
            <View style={styles.completeBtnContent}>
              {pct >= 100 && <Confetti size={18} weight="fill" color={C.primaryFg} />}
              <Text style={styles.completeBtnText}>
                {pct < 100 ? `Complete ${8 - completedCount} more steps to finish` : 'Send End OTP to Customer'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
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
  headerCount: { fontSize: 16, color: C.primary, fontWeight: '700' },
  progressSection: {
    backgroundColor: C.surface,
    padding: 16,
  },
  progressBar: { height: 10, backgroundColor: C.surfaceElevated, borderRadius: 5, marginBottom: 6 },
  progressFill: { height: 10, backgroundColor: C.primary, borderRadius: 5 },
  progressText: { fontSize: 13, color: C.muted, textAlign: 'center', fontWeight: '600' },
  body: { padding: 16, paddingBottom: 40 },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    alignItems: 'flex-start',
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  stepCardDone: {
    backgroundColor: C.successBg,
  },
  stepCardLocked: { opacity: 0.5 },
  stepLeft: { alignItems: 'center', marginRight: 14, width: 36 },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleDone: { backgroundColor: C.success },
  stepCircleLocked: { backgroundColor: C.surfaceElevated },
  stepCircleText: { color: C.foreground, fontWeight: '700', fontSize: 14 },
  stepConnector: { width: 2, flex: 1, backgroundColor: C.surfaceHighlight, minHeight: 12, marginTop: 2 },
  stepConnectorDone: { backgroundColor: C.success },
  stepContent: { flex: 1 },
  stepName: { fontSize: 14, fontWeight: '700', color: C.foreground, marginBottom: 4 },
  stepNameDone: { color: C.success },
  stepNameLocked: { color: C.muted },
  stepFieldsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepFields: { fontSize: 12, color: C.muted, lineHeight: 18 },
  stepArrowContainer: { alignSelf: 'center' },
  completeBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 16,
  },
  completeBtnDisabled: { backgroundColor: C.muted },
  completeBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  completeBtnText: { color: C.primaryFg, fontWeight: '700', fontSize: 15, textAlign: 'center' },
});

export default ChecklistScreen;
