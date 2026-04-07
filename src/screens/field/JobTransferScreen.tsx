import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, TextInput, Platform, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { jobAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { ArrowLeft, Check, ArrowsClockwise } from '../../components/Icons';

const REASONS = [
  'Unwell / Sick leave',
  'Stuck in traffic',
  'Equipment issue',
  'Personal emergency',
  'Other',
];

const JobTransferScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const jobId = route.params?.job_id;

  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      const res = await jobAPI.getTeamList() as any;
      setTeams(res.data?.teams || []);
    } catch (_) {
      Alert.alert('Error', 'Could not load team list');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedTeam) {
      Alert.alert('Error', 'Please select a team member');
      return;
    }
    const finalReason = reason === 'Other' ? customReason : reason;
    if (!finalReason) {
      Alert.alert('Error', 'Please select or enter a reason');
      return;
    }

    setSubmitting(true);
    try {
      await jobAPI.transferJob(jobId, selectedTeam, finalReason);
      Alert.alert('Job Transferred', 'The job has been transferred to the selected team member.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not transfer job');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
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
        <Text style={styles.headerTitle}>Transfer Job</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Reason */}
        <View style={styles.labelRow}>
          <ArrowsClockwise size={16} weight="regular" color={C.foreground} />
          <Text style={styles.label}>Reason for Transfer</Text>
        </View>
        {REASONS.map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.reasonChip, reason === r && styles.reasonActive]}
            onPress={() => setReason(r)}
            activeOpacity={0.7}
          >
            <Text style={[styles.reasonText, reason === r && styles.reasonTextActive]}>{r}</Text>
            {reason === r && <Check size={16} weight="bold" color={C.primary} />}
          </TouchableOpacity>
        ))}
        {reason === 'Other' && (
          <TextInput
            style={styles.input}
            placeholder="Enter reason..."
            placeholderTextColor={C.muted}
            value={customReason}
            onChangeText={setCustomReason}
          />
        )}

        {/* Team List */}
        <Text style={styles.labelStandalone}>Select Team Member</Text>
        {teams.length === 0 ? (
          <Text style={styles.emptyText}>No other team members available</Text>
        ) : (
          teams.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.teamCard, selectedTeam === t.id && styles.teamActive]}
              onPress={() => setSelectedTeam(t.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.teamAvatar, selectedTeam === t.id && { backgroundColor: C.primaryBg }]}>
                <Text style={[styles.teamInitial, selectedTeam === t.id && { color: C.primary }]}>
                  {(t.name || 'A')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.teamName}>{t.name}</Text>
                <Text style={styles.teamPhone}>{t.phone}</Text>
              </View>
              {selectedTeam === t.id && (
                <View style={styles.checkMarkContainer}>
                  <Check size={18} weight="bold" color={C.primary} />
                </View>
              )}
            </TouchableOpacity>
          ))
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitDisabled]}
          onPress={handleTransfer}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={C.primaryFg} />
          ) : (
            <Text style={styles.submitText}>Confirm Transfer</Text>
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
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },
  body: { padding: 20, paddingBottom: 40 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 20 },
  label: { fontSize: 14, fontWeight: '700', color: C.foreground },
  labelStandalone: { fontSize: 14, fontWeight: '700', color: C.foreground, marginBottom: 10, marginTop: 24 },
  reasonChip: {
    backgroundColor: C.surface, borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  reasonActive: { backgroundColor: C.primaryBg },
  reasonText: { fontSize: 14, color: C.muted },
  reasonTextActive: { color: C.primary, fontWeight: '600' },
  input: {
    backgroundColor: C.surfaceElevated, borderRadius: 12, padding: 14, marginTop: 4,
    color: C.foreground, fontSize: 14,
  },
  teamCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  teamActive: { backgroundColor: C.primaryBg },
  teamAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.surfaceElevated,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  teamInitial: { fontSize: 18, fontWeight: '700', color: C.muted },
  teamName: { fontSize: 15, fontWeight: '600', color: C.foreground },
  teamPhone: { fontSize: 12, color: C.muted, marginTop: 2 },
  checkMarkContainer: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: C.primaryBg,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', padding: 20 },
  submitBtn: {
    backgroundColor: C.primary, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 24,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: C.primaryFg, fontWeight: '700', fontSize: 16 },
});

export default JobTransferScreen;
