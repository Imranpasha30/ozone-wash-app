/**
 * AdminSchedulingScreen — fleet / timing / slot-engine settings.
 *
 * Backend: GET  /admin/settings/scheduling → { setting: { key, value } }
 *          PUT  /admin/settings/scheduling   body { value: {...} }
 *
 * value shape:
 *   { vans, travel_buffer_min, workday_start, workday_end, slot_step_min,
 *     clean_minutes_by_tier: { '1'..'8': minutes } }
 *
 * Slots are generated from these numbers in real time — no code changes
 * needed when the fleet grows or cleaning times are re-tuned.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import api from '../../services/api';
import ScreenHeader from '../../components/ScreenHeader';
import WebContainer from '../../components/WebContainer';
import { Check, Clock, Gear, Hourglass } from '../../components/Icons';

const TIME_RE = /^\d{2}:\d{2}$/;

// Tank-size brackets (litres) — keys match clean_minutes_by_tier on the backend.
const TIERS: { key: string; label: string }[] = [
  { key: '1', label: '500–1,000 L' },
  { key: '2', label: '1,001–10,000 L' },
  { key: '3', label: '10,001–20,000 L' },
  { key: '4', label: '20,001–30,000 L' },
  { key: '5', label: '30,001–40,000 L' },
  { key: '6', label: '40,001–50,000 L' },
  { key: '7', label: '50,001–1,00,000 L' },
  { key: '8', label: '1,00,000+ L' },
];

const AdminSchedulingScreen = () => {
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // All inputs held as strings; parsed + validated on save.
  const [vans, setVans] = useState('');
  const [travelBuffer, setTravelBuffer] = useState('');
  const [slotStep, setSlotStep] = useState('');
  const [workdayStart, setWorkdayStart] = useState('');
  const [workdayEnd, setWorkdayEnd] = useState('');
  const [tierMinutes, setTierMinutes] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res: any = await api.get('/admin/settings/scheduling');
        const value = res?.data?.setting?.value || {};
        setVans(value.vans != null ? String(value.vans) : '');
        setTravelBuffer(value.travel_buffer_min != null ? String(value.travel_buffer_min) : '');
        setSlotStep(value.slot_step_min != null ? String(value.slot_step_min) : '');
        setWorkdayStart(String(value.workday_start || '08:00'));
        setWorkdayEnd(String(value.workday_end || '18:00'));
        const cm = value.clean_minutes_by_tier || {};
        const init: Record<string, string> = {};
        TIERS.forEach(({ key }) => { init[key] = cm[key] != null ? String(cm[key]) : ''; });
        setTierMinutes(init);
      } catch (e: any) {
        const d = e?.response?.data || e || {};
        const msg = d?.message;
        Alert.alert('Error', msg || 'Could not load scheduling settings.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Returns the parsed integer, or null after alerting with the field name.
  const parseNum = (raw: string, field: string): number | null => {
    const trimmed = String(raw ?? '').trim();
    const n = parseInt(trimmed, 10);
    if (!trimmed || Number.isNaN(n) || n < 0) {
      Alert.alert('Invalid value', `Please enter a valid number for "${field}".`);
      return null;
    }
    return n;
  };

  const handleSave = async () => {
    const vansN = parseNum(vans, 'Vans / Crews');
    if (vansN == null) return;
    const travelN = parseNum(travelBuffer, 'Travel buffer (min)');
    if (travelN == null) return;
    const stepN = parseNum(slotStep, 'Slot step (min)');
    if (stepN == null) return;
    if (!TIME_RE.test(workdayStart.trim())) {
      Alert.alert('Invalid value', 'Workday start must be in HH:MM format (e.g. 08:00).');
      return;
    }
    if (!TIME_RE.test(workdayEnd.trim())) {
      Alert.alert('Invalid value', 'Workday end must be in HH:MM format (e.g. 18:00).');
      return;
    }
    const cleanByTier: Record<string, number> = {};
    for (const { key, label } of TIERS) {
      const n = parseNum(tierMinutes[key] ?? '', `Cleaning minutes — ${label}`);
      if (n == null) return;
      cleanByTier[key] = n;
    }

    setSaving(true);
    try {
      await api.put('/admin/settings/scheduling', {
        value: {
          vans: vansN,
          travel_buffer_min: travelN,
          workday_start: workdayStart.trim(),
          workday_end: workdayEnd.trim(),
          slot_step_min: stepN,
          clean_minutes_by_tier: cleanByTier,
        },
      });
      Alert.alert('Saved', 'Slots adapt immediately.');
    } catch (e: any) {
      const d = e?.response?.data || e || {};
      const msg = d?.message;
      Alert.alert('Error', msg || 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScreenHeader title="Scheduling Settings" subtitle="Fleet · timings · slots" />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          <WebContainer variant="narrow">

            {/* Fleet & slot engine */}
            <View style={styles.sectionHeader}>
              <Gear size={16} weight="fill" color={C.primary} />
              <Text style={styles.sectionTitle}>Fleet & slot engine</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Vans / Crews</Text>
                <TextInput
                  style={styles.numInput}
                  value={vans}
                  onChangeText={setVans}
                  keyboardType="number-pad"
                  placeholder="2"
                  placeholderTextColor={C.muted}
                />
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Travel buffer (min)</Text>
                <TextInput
                  style={styles.numInput}
                  value={travelBuffer}
                  onChangeText={setTravelBuffer}
                  keyboardType="number-pad"
                  placeholder="45"
                  placeholderTextColor={C.muted}
                />
              </View>
              <View style={[styles.fieldRow, styles.fieldRowLast]}>
                <Text style={styles.fieldLabel}>Slot step (min)</Text>
                <TextInput
                  style={styles.numInput}
                  value={slotStep}
                  onChangeText={setSlotStep}
                  keyboardType="number-pad"
                  placeholder="30"
                  placeholderTextColor={C.muted}
                />
              </View>
            </View>

            {/* Workday hours */}
            <View style={styles.sectionHeader}>
              <Clock size={16} weight="fill" color={C.primary} />
              <Text style={styles.sectionTitle}>Workday hours</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Workday start (HH:MM)</Text>
                <TextInput
                  style={styles.numInput}
                  value={workdayStart}
                  onChangeText={setWorkdayStart}
                  placeholder="08:00"
                  placeholderTextColor={C.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={5}
                />
              </View>
              <View style={[styles.fieldRow, styles.fieldRowLast]}>
                <Text style={styles.fieldLabel}>Workday end (HH:MM)</Text>
                <TextInput
                  style={styles.numInput}
                  value={workdayEnd}
                  onChangeText={setWorkdayEnd}
                  placeholder="18:00"
                  placeholderTextColor={C.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={5}
                />
              </View>
            </View>

            {/* Cleaning minutes per tank size */}
            <View style={styles.sectionHeader}>
              <Hourglass size={16} weight="fill" color={C.primary} />
              <Text style={styles.sectionTitle}>Cleaning minutes per tank size</Text>
            </View>
            <View style={styles.card}>
              {TIERS.map(({ key, label }, idx) => (
                <View
                  key={key}
                  style={[styles.fieldRow, idx === TIERS.length - 1 && styles.fieldRowLast]}
                >
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <TextInput
                    style={styles.numInput}
                    value={tierMinutes[key] ?? ''}
                    onChangeText={(v) => setTierMinutes((d) => ({ ...d, [key]: v }))}
                    keyboardType="number-pad"
                    placeholder="60"
                    placeholderTextColor={C.muted}
                  />
                </View>
              ))}
            </View>

            {/* Save */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={C.primaryFg} />
              ) : (
                <>
                  <Check size={18} weight="bold" color={C.primaryFg} />
                  <Text style={styles.saveText}>Save Settings</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.footerHint}>
              Slots are generated from these numbers in real time — raising vans adds
              parallel capacity; lowering minutes shortens service windows. No code
              changes needed.
            </Text>
          </WebContainer>
        </ScrollView>
      )}
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body: { padding: 16, paddingBottom: 40 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.foreground },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  fieldRowLast: { borderBottomWidth: 0 },
  fieldLabel: { flex: 1, fontSize: 13.5, fontWeight: '600', color: C.foreground },
  numInput: {
    width: 96,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: C.foreground,
    backgroundColor: C.surfaceElevated,
    textAlign: 'center',
  },
  saveBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  saveText: { color: C.primaryFg, fontWeight: '700', fontSize: 15 },
  footerHint: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 18,
    marginTop: 14,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});

export default AdminSchedulingScreen;
