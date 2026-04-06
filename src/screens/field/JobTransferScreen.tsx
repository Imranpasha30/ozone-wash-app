import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { jobAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';
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
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transfer Job</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Reason */}
        <View style={styles.labelRow}>
          <ArrowsClockwise size={16} weight="regular" color={COLORS.foreground} />
          <Text style={styles.label}>Reason for Transfer</Text>
        </View>
        {REASONS.map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.reasonChip, reason === r && styles.reasonActive]}
            onPress={() => setReason(r)}
          >
            <Text style={[styles.reasonText, reason === r && styles.reasonTextActive]}>{r}</Text>
            {reason === r && <Check size={16} weight="bold" color={COLORS.primary} />}
          </TouchableOpacity>
        ))}
        {reason === 'Other' && (
          <TextInput
            style={styles.input}
            placeholder="Enter reason..."
            placeholderTextColor={COLORS.muted}
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
            >
              <View style={styles.teamAvatar}>
                <Text style={styles.teamInitial}>{(t.name || 'A')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.teamName}>{t.name}</Text>
                <Text style={styles.teamPhone}>{t.phone}</Text>
              </View>
              {selectedTeam === t.id && (
                <View style={styles.checkMarkContainer}>
                  <Check size={18} weight="bold" color={COLORS.primary} />
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
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.primaryFg} />
          ) : (
            <Text style={styles.submitText}>Confirm Transfer</Text>
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
    backgroundColor: COLORS.surface, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.foreground },
  body: { padding: 20, paddingBottom: 40 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 16 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.foreground },
  labelStandalone: { fontSize: 14, fontWeight: '700', color: COLORS.foreground, marginBottom: 10, marginTop: 16 },
  reasonChip: {
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  reasonActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
  reasonText: { fontSize: 14, color: COLORS.muted },
  reasonTextActive: { color: COLORS.primary, fontWeight: '600' },
  input: {
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginTop: 4,
    color: COLORS.foreground, fontSize: 14, borderWidth: 1, borderColor: COLORS.border,
  },
  teamCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  teamActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
  teamAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryDim,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  teamInitial: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  teamName: { fontSize: 15, fontWeight: '600', color: COLORS.foreground },
  teamPhone: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  checkMarkContainer: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryBg,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.borderActive,
  },
  emptyText: { fontSize: 14, color: COLORS.muted, textAlign: 'center', padding: 20 },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 24,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: COLORS.primaryFg, fontWeight: 'bold', fontSize: 16 },
});

export default JobTransferScreen;
