import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { complianceAPI, jobAPI, ecoScoreAPI, certificateAPI } from '../../services/api';
import { COLORS, COMPLIANCE_STEPS } from '../../utils/constants';
import {
  ArrowLeft, Check, Lock, CheckCircle, ArrowRight, Confetti,
} from '../../components/Icons';

const ChecklistScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
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
      'Complete Job',
      'Are all steps done? This will generate the EcoScore and hygiene certificate.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete Job',
          onPress: async () => {
            setCompleting(true);
            try {
              // Complete compliance
              await complianceAPI.completeCompliance(jobId);
              // Complete job
              await jobAPI.completeJob(jobId);
              // Calculate EcoScore
              await ecoScoreAPI.calculateScore(jobId);
              // Generate certificate
              await certificateAPI.generate(jobId);

              Alert.alert(
                'Job Complete!',
                'EcoScore calculated and certificate generated.',
                [
                  {
                    text: 'Back to Jobs',
                    onPress: () => navigation.navigate('FieldTabs'),
                  },
                ]
              );
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not complete job');
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
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const steps = checklist?.checklist || [];
  const completedCount = checklist?.completed_steps || 0;
  const totalCount = checklist?.total_steps || 8;
  const pct = checklist?.completion_percentage || 0;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={COLORS.primary} />
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
            >
              <View style={styles.stepLeft}>
                <View style={[
                  styles.stepCircle,
                  isCompleted && styles.stepCircleDone,
                  isLocked && styles.stepCircleLocked,
                ]}>
                  {isCompleted ? (
                    <Check size={16} weight="bold" color={COLORS.primaryFg} />
                  ) : isLocked ? (
                    <Lock size={14} weight="fill" color={COLORS.muted} />
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
                      <CheckCircle size={14} weight="fill" color={COLORS.success} />
                      <Text style={[styles.stepFields, { color: COLORS.success }]}>Completed</Text>
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
                  <ArrowRight size={16} weight="bold" color={COLORS.primary} />
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
        >
          {completing ? (
            <ActivityIndicator color={COLORS.primaryFg} />
          ) : (
            <View style={styles.completeBtnContent}>
              {pct >= 100 && <Confetti size={18} weight="fill" color={COLORS.primaryFg} />}
              <Text style={styles.completeBtnText}>
                {pct < 100 ? `Complete ${8 - completedCount} more steps to finish` : 'Complete Job & Generate Certificate'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
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
  headerCount: { fontSize: 16, color: COLORS.primary, fontWeight: 'bold' },
  progressSection: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  progressBar: { height: 10, backgroundColor: COLORS.border, borderRadius: 5, marginBottom: 6 },
  progressFill: { height: 10, backgroundColor: COLORS.primary, borderRadius: 5 },
  progressText: { fontSize: 13, color: COLORS.muted, textAlign: 'center', fontWeight: '600' },
  body: { padding: 16, paddingBottom: 40 },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepCardDone: { borderColor: COLORS.success, backgroundColor: COLORS.successBg },
  stepCardLocked: { opacity: 0.5 },
  stepLeft: { alignItems: 'center', marginRight: 14, width: 36 },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepCircleDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  stepCircleLocked: { backgroundColor: COLORS.surfaceElevated, borderColor: COLORS.border },
  stepCircleText: { color: COLORS.foreground, fontWeight: 'bold', fontSize: 14 },
  stepConnector: { width: 2, flex: 1, backgroundColor: COLORS.border, minHeight: 12, marginTop: 2 },
  stepConnectorDone: { backgroundColor: COLORS.success },
  stepContent: { flex: 1 },
  stepName: { fontSize: 14, fontWeight: '700', color: COLORS.foreground, marginBottom: 4 },
  stepNameDone: { color: COLORS.success },
  stepNameLocked: { color: COLORS.muted },
  stepFieldsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepFields: { fontSize: 12, color: COLORS.muted, lineHeight: 18 },
  stepArrowContainer: { alignSelf: 'center' },
  completeBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 16,
  },
  completeBtnDisabled: { backgroundColor: COLORS.muted },
  completeBtnContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  completeBtnText: { color: COLORS.primaryFg, fontWeight: 'bold', fontSize: 15, textAlign: 'center' },
});

export default ChecklistScreen;
