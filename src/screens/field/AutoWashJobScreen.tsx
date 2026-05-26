/**
 * AutoWashJobScreen — field crew compliance flow for an auto wash job.
 * Spec: Master Prompt v2.0 PART 4 + Auto Wash Scope PDF Section 4.
 *
 * Phases within the screen:
 *   • Phase 0 — Pre-inspection (min 5 photos: front, rear, left, right, dents)
 *   • Phase 1-6 — 6-step compliance flow (start → end with photo + ozone readings)
 *   • Phase 7 — Final completion (water_used, ppe checklist, zero_chemicals, complete)
 *
 * Step 6 enforces an 8-minute minimum cabin fogging timer + windows-closed
 * confirmation before the END button unlocks.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Platform, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { autoWashAPI, uploadAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import {
  ArrowLeft, Camera, CheckCircle, Warning, Drop, Sparkle, Flask,
  Lightning, Wrench, Eye, ShieldCheck, Car,
} from '../../components/Icons';

const STEP_LIBRARY = [
  { n: 1, name: 'mist_prerinse',    label: 'Mist Pre-Rinse',     Icon: Drop,      hint: 'Loosen dirt with ozone mist.' },
  { n: 2, name: 'eco_foam',         label: 'Eco-Foam',           Icon: Sparkle,   hint: 'pH-neutral foam, no chemicals.' },
  { n: 3, name: 'ozone_rinse',      label: 'Ozone Rinse',        Icon: Flask,     hint: 'Log generator ppm (0.05-0.2).' },
  { n: 4, name: 'precision_drying', label: 'Precision Drying',   Icon: Lightning, hint: 'Microfibre + air, streak-free.' },
  { n: 5, name: 'interior_steam',   label: 'Interior Steam',     Icon: Wrench,    hint: '120°C steam. Photo before + after.' },
  { n: 6, name: 'ozone_fogging',    label: 'Ozone Cabin Fogging', Icon: Eye,      hint: 'MIN 8 minutes. Windows closed.' },
];

const MIN_FOGGING_MIN = 8;

/**
 * Add-on step library — keyed by addon code from the bookings table.
 * Each addon has its own mini-flow; step_number 7-16 are reserved.
 * Spec: Auto Wash Scope PDF Section 4.4.
 */
const ADDON_LIBRARY: Record<string, {
  label: string;
  iconHint: string;
  subSteps: { label: string; hint: string; needsPpm?: boolean; needsPhoto?: boolean }[];
}> = {
  upholstery_deep_clean: {
    label: 'Upholstery Deep Clean',
    iconHint: 'wrench',
    subSteps: [
      { label: 'Pre-treatment photo of stains',         hint: 'Photo of each visible stain.', needsPhoto: true },
      { label: 'Apply enzyme pre-spray',                hint: 'Front / full / mats — log area treated.' },
      { label: 'Run steam extractor',                   hint: 'Note duration in minutes.' },
      { label: 'Ozone deodorisation',                   hint: 'Short 2-3 min ozone burst on extracted areas.' },
      { label: 'Post-treatment photo',                  hint: 'Final result photo.', needsPhoto: true },
    ],
  },
  ac_vent_ozone_fogging: {
    label: 'AC Vent Ozone Fogging',
    iconHint: 'flask',
    subSteps: [
      { label: 'Start engine, AC on max recirculation',  hint: 'All windows must be closed.' },
      { label: 'Insert ozone nozzle at AC intake',       hint: 'Position firmly — don\'t pinch the duct.' },
      { label: 'Run 5 minutes, log ppm',                 hint: 'Generator ppm reading expected.', needsPpm: true },
      { label: 'Confirm windows closed',                 hint: 'Final window check before sealing.' },
      { label: 'Photo of AC intake area',                hint: 'Single photo of intake post-treatment.', needsPhoto: true },
    ],
  },
  dashboard_leather_cond: {
    label: 'Dashboard & Leather Conditioning',
    iconHint: 'sparkle',
    subSteps: [
      { label: 'Wipe dashboard with conditioner',        hint: 'Even coverage, no streaks.' },
      { label: 'Apply leather UV protectant to seats',   hint: 'Front seats first, then rear.' },
      { label: 'Buff with clean microfibre',             hint: 'Until matte/sheen as customer prefers.' },
      { label: 'After photo',                            hint: 'Show before/after if possible.', needsPhoto: true },
    ],
  },
  headlight_restoration: {
    label: 'Headlight Restoration',
    iconHint: 'lightning',
    subSteps: [
      { label: 'Before photo (both headlights)',         hint: 'Show the haze clearly.', needsPhoto: true },
      { label: 'Wet sand (1000 → 2000 grit)',            hint: 'Log final grit used.' },
      { label: 'Polish + UV clear coat',                 hint: 'Apply UV protectant; let cure.' },
      { label: 'After photo',                            hint: 'Demonstrate clarity.', needsPhoto: true },
    ],
  },
  engine_bay_clean: {
    label: 'Engine Bay Clean',
    iconHint: 'wrench',
    subSteps: [
      { label: 'Before photo of engine bay',             hint: 'Document existing state.', needsPhoto: true },
      { label: 'Cover electricals + apply degreaser',    hint: 'Protect ECU, alternator, intake.' },
      { label: 'Low-pressure rinse',                     hint: 'Use mist setting only.' },
      { label: 'After-drying photo',                     hint: 'After dry, before close.', needsPhoto: true },
    ],
  },
  ceramic_nano_coat: {
    label: 'Ceramic Nano-Coat Express',
    iconHint: 'sparkle',
    subSteps: [
      { label: 'Confirm surface clean + dry',            hint: 'Cannot apply over moisture.' },
      { label: 'Apply coat panel by panel',              hint: 'Hood → roof → doors → boot.' },
      { label: 'Cure 5 min per panel',                   hint: 'Don\'t rush curing.' },
      { label: 'Final photo + log batch number',         hint: 'Photo + product batch ID for warranty.', needsPhoto: true },
    ],
  },
  pet_hair_removal: {
    label: 'Pet Hair Removal',
    iconHint: 'sparkle',
    subSteps: [
      { label: 'Before photo',                           hint: 'Show hair-covered surfaces.', needsPhoto: true },
      { label: 'Specialised vacuum + roller tool',       hint: 'Roller for embedded hair.' },
      { label: 'Ozone deodorisation pass',               hint: 'Same as Step 6 cabin, shorter.' },
      { label: 'After photo',                            hint: 'Confirm clean surfaces.', needsPhoto: true },
    ],
  },
  two_wheeler_wash: {
    label: '2-Wheeler Wash',
    iconHint: 'drop',
    subSteps: [
      { label: 'Mist rinse',                             hint: 'Bike on stand, no engine.' },
      { label: 'Ozone rinse',                            hint: 'Cover air intake.' },
      { label: 'Microfibre dry',                         hint: 'Log litres used.' },
      { label: 'After photo with bike reg no',           hint: 'Reg plate must be visible.', needsPhoto: true },
    ],
  },
};

// Map addon → starting step_number in DB (7 onwards, contiguous per addon).
function stepNumberForAddon(addonIndex: number, subIndex: number) {
  // Up to 7 addons × ~5 sub-steps each — but DB CHECK is 1-16. We cap each
  // addon to 5 sub-steps; sub-steps 6+ get merged into the last DB row's notes.
  // For typical orders (1-2 addons), step_number stays safely in 7-16.
  return Math.min(16, 7 + addonIndex * 2 + Math.min(subIndex, 1));
}

type StepStatus = {
  step_number: number;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  photo_urls: string[];
  ozone_ppm: number | null;
};

export default function AutoWashJobScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const jobId: string = route.params?.id;

  const [job, setJob] = useState<any>(null);
  const [steps, setSteps] = useState<StepStatus[]>([]);
  const [phase, setPhase] = useState<'pre_inspection' | 'steps' | 'addons' | 'complete'>('pre_inspection');
  const [loading, setLoading] = useState(true);

  // Pre-inspection
  const [preInspectionPhotos, setPreInspectionPhotos] = useState<string[]>([]);
  const [uploadingInspection, setUploadingInspection] = useState(false);

  // Active step
  const [activeStepN, setActiveStepN] = useState<number | null>(null);
  const [stepPhotos, setStepPhotos] = useState<string[]>([]);
  const [ozonePpm, setOzonePpm] = useState('');
  const [foggingStartTime, setFoggingStartTime] = useState<number | null>(null);
  const [foggingElapsedSec, setFoggingElapsedSec] = useState(0);
  const [windowsClosed, setWindowsClosed] = useState(false);

  // Final completion
  const [waterUsed, setWaterUsed] = useState('');
  const [foggingDurationMin, setFoggingDurationMin] = useState('');
  const [ppeFull, setPpeFull] = useState(true);
  const [zeroChemicals, setZeroChemicals] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Add-on completion tracking (client-side; one DB step row per addon)
  const [addonSubChecked, setAddonSubChecked] = useState<Record<string, boolean[]>>({});
  const [addonNotes, setAddonNotes] = useState<Record<string, string>>({});
  const [addonsCompleted, setAddonsCompleted] = useState<string[]>([]);

  /* ── Derived: addons booked on this job ───────────────────────────────── */
  const bookedAddonCodes: string[] = useMemo(() => {
    const raw = job?.addons_booked;
    if (!Array.isArray(raw)) return [];
    return raw.filter((c: string) => !!ADDON_LIBRARY[c]);
  }, [job?.addons_booked]);

  /* ── Load job ─────────────────────────────────────────────────────────── */
  const refresh = async () => {
    try {
      const r: any = await autoWashAPI.getBooking(jobId);
      setJob(r.data?.job);
      setSteps(r.data?.steps || []);
      // Pre-fill completed addons from server
      const completedAddonNames = (r.data?.steps || [])
        .filter((s: any) => s.step_type === 'addon' && s.ended_at)
        .map((s: any) => s.step_name);
      setAddonsCompleted(completedAddonNames);

      const j = r.data?.job;
      if (j?.pre_inspection_photos?.length >= 5) {
        const coreDone = STEP_LIBRARY.every((s) =>
          (r.data?.steps || []).find((x: StepStatus) => x.step_number === s.n)?.ended_at,
        );
        if (!coreDone) {
          setPhase('steps');
        } else if (Array.isArray(j.addons_booked) && j.addons_booked.length > 0
          && j.addons_booked.some((c: string) => ADDON_LIBRARY[c] && !completedAddonNames.includes(c))) {
          setPhase('addons');
        } else {
          setPhase('complete');
        }
      }
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Could not load job.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh(); }, [jobId]);

  /* ── Fogging timer ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (foggingStartTime == null) return;
    const t = setInterval(() => {
      setFoggingElapsedSec(Math.floor((Date.now() - foggingStartTime) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [foggingStartTime]);

  /* ── Pick + upload photo ──────────────────────────────────────────────── */
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const pickAndUpload = async (kind: 'inspection' | 'step') => {
    try {
      // Permission check (Camera and Library both needed on iOS / Android 13+).
      const cam = await ImagePicker.requestCameraPermissionsAsync();
      if (!cam.granted && Platform.OS !== 'web') {
        Alert.alert('Camera permission needed', 'Enable camera access to capture inspection photos.');
        return;
      }
      // Try camera first (preferred for field), fall back to library on web.
      const launcher = Platform.OS === 'web'
        ? ImagePicker.launchImageLibraryAsync
        : ImagePicker.launchCameraAsync;
      const result = await launcher({
        quality: 0.7,
        allowsEditing: false,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (result.canceled || !result.assets?.[0]) return;
      setUploadingPhoto(true);
      const folder = kind === 'inspection'
        ? `auto-wash/${jobId}/pre-inspection`
        : `auto-wash/${jobId}/step-${activeStepN ?? 0}`;
      const res: any = await uploadAPI.uploadPhoto(result.assets[0].uri, folder);
      const url = res?.data?.url || res?.url;
      if (!url) throw new Error('Upload returned no URL');
      if (kind === 'inspection') setPreInspectionPhotos((p) => [...p, url]);
      else                       setStepPhotos((p) => [...p, url]);
    } catch (e: any) {
      Alert.alert('Photo failed', e?.message || 'Could not upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  /* ── Submit pre-inspection ────────────────────────────────────────────── */
  const submitInspection = async () => {
    if (preInspectionPhotos.length < 5) {
      Alert.alert('More photos needed', 'Capture at least 5 photos: front, rear, left, right, dents.');
      return;
    }
    setUploadingInspection(true);
    try {
      await autoWashAPI.uploadPreInspection(jobId, preInspectionPhotos);
      setPhase('steps');
      await refresh();
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Upload failed.');
    } finally {
      setUploadingInspection(false);
    }
  };

  /* ── Step start ───────────────────────────────────────────────────────── */
  const startStep = async (n: number) => {
    try {
      await autoWashAPI.startStep(jobId, n);
      setActiveStepN(n);
      setStepPhotos([]);
      setOzonePpm('');
      if (n === 6) {
        setFoggingStartTime(Date.now());
        setFoggingElapsedSec(0);
        setWindowsClosed(false);
      }
      await refresh();
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Could not start step.');
    }
  };

  /* ── Step end ─────────────────────────────────────────────────────────── */
  const endActiveStep = async () => {
    if (activeStepN == null) return;
    if (stepPhotos.length === 0) {
      Alert.alert('Photo required', 'Capture at least one photo for this step.');
      return;
    }
    if (activeStepN === 3) {
      const ppm = parseFloat(ozonePpm);
      if (!Number.isFinite(ppm) || ppm < 0 || ppm > 5) {
        Alert.alert('Invalid reading', 'Enter the ozone ppm shown on the generator.');
        return;
      }
    }
    if (activeStepN === 6) {
      const minElapsed = Math.floor(foggingElapsedSec / 60);
      if (minElapsed < MIN_FOGGING_MIN) {
        Alert.alert('Wait longer', `Cabin fogging must run at least ${MIN_FOGGING_MIN} minutes. Currently ${minElapsed} min.`);
        return;
      }
      if (!windowsClosed) {
        Alert.alert('Confirm windows', 'Confirm all windows were closed during fogging.');
        return;
      }
    }
    try {
      await autoWashAPI.endStep(jobId, activeStepN, {
        photo_urls: stepPhotos,
        ozone_ppm: ozonePpm ? parseFloat(ozonePpm) : undefined,
        ...(activeStepN === 6 ? {
          fogging_duration_min: Math.floor(foggingElapsedSec / 60),
          windows_closed: true,
        } : {}),
      });
      if (activeStepN === 6) {
        setFoggingDurationMin(String(Math.floor(foggingElapsedSec / 60)));
        setFoggingStartTime(null);
      }
      setActiveStepN(null);
      await refresh();
      // After step 6 — go to add-ons phase if any booked, else completion.
      const allCoreDone = STEP_LIBRARY.every((s) =>
        s.n === activeStepN || (steps.find((x) => x.step_number === s.n)?.ended_at),
      );
      if (allCoreDone) {
        if (bookedAddonCodes.length > 0) setPhase('addons');
        else setPhase('complete');
      }
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Could not end step.');
    }
  };

  /* ── Add-on completion ────────────────────────────────────────────────── */
  const toggleAddonSub = (code: string, subIdx: number) => {
    setAddonSubChecked((prev) => {
      const arr = [...(prev[code] || [])];
      arr[subIdx] = !arr[subIdx];
      return { ...prev, [code]: arr };
    });
  };

  const completeAddon = async (code: string, addonIndex: number) => {
    const lib = ADDON_LIBRARY[code];
    if (!lib) return;
    const checks = addonSubChecked[code] || [];
    const allChecked = lib.subSteps.every((_, i) => !!checks[i]);
    if (!allChecked) {
      Alert.alert('Sub-steps remaining', `Complete all ${lib.subSteps.length} sub-steps before marking ${lib.label} done.`);
      return;
    }
    if (stepPhotos.length === 0) {
      Alert.alert('Photo required', `Capture at least one photo for ${lib.label}.`);
      return;
    }
    const stepNo = stepNumberForAddon(addonIndex, 0);
    try {
      // Start + immediately end the addon "step" as one DB row.
      await autoWashAPI.startStep(jobId, stepNo);
      await autoWashAPI.endStep(jobId, stepNo, {
        photo_urls: stepPhotos,
        notes: addonNotes[code] || `Addon completed: ${lib.label}`,
      });
      setAddonsCompleted((prev) => prev.includes(code) ? prev : [...prev, code]);
      setStepPhotos([]);
      setActiveStepN(null);
      await refresh();
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Could not save addon completion.');
    }
  };

  const allAddonsDone = bookedAddonCodes.every((c) => addonsCompleted.includes(c));

  /* ── Complete job ─────────────────────────────────────────────────────── */
  const completeJob = async () => {
    const water = parseFloat(waterUsed);
    if (!Number.isFinite(water) || water <= 0) {
      Alert.alert('Water reading required', 'Enter the litres of water used.');
      return;
    }
    setSubmitting(true);
    try {
      const r: any = await autoWashAPI.completeJob(jobId, {
        water_used_litres: water,
        fogging_duration_min: foggingDurationMin ? parseInt(foggingDurationMin, 10) : undefined,
        ppe_full: ppeFull,
        zero_chemicals: zeroChemicals,
      });
      const score = r.data?.eco_score;
      const badge = r.data?.eco_badge;
      Alert.alert('Job complete', `EcoScore: ${score} (${badge}). Certificate issued.`, [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Could not complete job.');
    } finally {
      setSubmitting(false);
    }
  };

  const styles = makeStyles(C);

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  const stepStatusFor = (n: number) => steps.find((s) => s.step_number === n) || null;
  const allStepsDone = STEP_LIBRARY.every((s) => stepStatusFor(s.n)?.ended_at);

  return (
    <View style={styles.root}>
      <LinearGradient colors={[C.primary, C.primaryDk || '#0369A1']} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.85}>
            <ArrowLeft size={20} color="#fff" weight="bold" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Auto Wash Job</Text>
            <Text style={styles.headerSub}>{
              phase === 'pre_inspection' ? 'Pre-inspection' :
              phase === 'steps'          ? '6-Step compliance' :
              phase === 'addons'         ? 'Hygiene upgrades' :
                                            'Final completion'
            }</Text>
          </View>
          {job?.gated_community && (
            <View style={styles.gatedPill}>
              <Text style={styles.gatedPillText}>GATED</Text>
            </View>
          )}
        </View>
        <View style={styles.headerMeta}>
          <Car size={14} weight="duotone" color="#fff" />
          <Text style={styles.headerMetaText}>
            {job?.v_type?.replace('_', ' ').toUpperCase()} · {job?.v_reg} · {job?.service_package?.toUpperCase()}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
        {/* ── Pre-inspection phase ───────────────────────────────────────── */}
        {phase === 'pre_inspection' && (
          <View style={{ gap: 14 }}>
            <View style={styles.warningBox}>
              <Warning size={18} weight="fill" color="#F59E0B" />
              <Text style={styles.warningText}>
                Photograph existing damage BEFORE starting any wash. Protects you and the customer.
              </Text>
            </View>
            <Text style={styles.sectionTitle}>Pre-inspection photos</Text>
            <Text style={styles.sectionSub}>Minimum 5: front, rear, left, right, and any existing dents/scratches.</Text>

            <View style={styles.photoGrid}>
              {preInspectionPhotos.map((url, i) => (
                <View key={i} style={styles.photoChip}>
                  <Camera size={16} weight="fill" color="#fff" />
                  <Text style={styles.photoChipText}>{i + 1}</Text>
                </View>
              ))}
              <TouchableOpacity onPress={() => pickAndUpload('inspection')} style={styles.addPhotoBtn} activeOpacity={0.85}>
                <Camera size={20} weight="duotone" color={C.primary} />
                <Text style={styles.addPhotoText}>Add photo</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={submitInspection}
              disabled={preInspectionPhotos.length < 5 || uploadingInspection}
              style={[styles.primaryBtn, (preInspectionPhotos.length < 5 || uploadingInspection) && { opacity: 0.5 }]}
              activeOpacity={0.85}
            >
              {uploadingInspection ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  Start wash ({preInspectionPhotos.length}/5+ photos)
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ── 6-Step compliance phase ────────────────────────────────────── */}
        {phase === 'steps' && (
          <View style={{ gap: 12 }}>
            {STEP_LIBRARY.map((step) => {
              const st = stepStatusFor(step.n);
              const isActive = activeStepN === step.n;
              const isDone = !!st?.ended_at;
              return (
                <View key={step.n} style={[styles.stepCard, isActive && styles.stepCardActive, isDone && styles.stepCardDone]}>
                  <View style={styles.stepHeader}>
                    <View style={[styles.stepIconBox, isDone && { backgroundColor: (C.leaf as any) || '#22C55E' }]}>
                      {isDone ? (
                        <CheckCircle size={20} weight="fill" color="#fff" />
                      ) : (
                        <step.Icon size={20} weight="duotone" color={C.primaryDk || '#0369A1'} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stepLabel}>Step {step.n} · {step.label}</Text>
                      <Text style={styles.stepHint}>{step.hint}</Text>
                    </View>
                  </View>

                  {isActive && (
                    <View style={styles.stepBody}>
                      {/* Step 3: ozone ppm input */}
                      {step.n === 3 && (
                        <View style={styles.inputRow}>
                          <Text style={styles.inputLabel}>Ozone ppm (0.05 - 0.2 target)</Text>
                          <TextInput
                            style={styles.numInput}
                            value={ozonePpm}
                            onChangeText={setOzonePpm}
                            placeholder="0.12"
                            placeholderTextColor={C.muted}
                            keyboardType="decimal-pad"
                          />
                        </View>
                      )}

                      {/* Step 6: fogging timer + windows check */}
                      {step.n === 6 && (
                        <View style={{ gap: 12 }}>
                          <View style={styles.timerBox}>
                            <Text style={styles.timerLabel}>FOGGING TIMER</Text>
                            <Text style={styles.timerValue}>
                              {Math.floor(foggingElapsedSec / 60).toString().padStart(2, '0')}:
                              {(foggingElapsedSec % 60).toString().padStart(2, '0')}
                            </Text>
                            <Text style={styles.timerMin}>
                              {foggingElapsedSec / 60 >= MIN_FOGGING_MIN
                                ? `✓ Minimum reached (${MIN_FOGGING_MIN} min)`
                                : `Min ${MIN_FOGGING_MIN} min — wait ${Math.max(0, MIN_FOGGING_MIN * 60 - foggingElapsedSec)}s`}
                            </Text>
                          </View>
                          <View style={styles.inputRow}>
                            <Text style={styles.inputLabel}>Ozone ppm (during fog)</Text>
                            <TextInput
                              style={styles.numInput}
                              value={ozonePpm}
                              onChangeText={setOzonePpm}
                              placeholder="1.5"
                              placeholderTextColor={C.muted}
                              keyboardType="decimal-pad"
                            />
                          </View>
                          <TouchableOpacity
                            onPress={() => setWindowsClosed(!windowsClosed)}
                            style={[styles.checkRow, windowsClosed && styles.checkRowActive]}
                            activeOpacity={0.85}
                          >
                            <View style={[styles.checkBox, windowsClosed && { backgroundColor: C.primary, borderColor: C.primary }]}>
                              {windowsClosed && <CheckCircle size={14} weight="fill" color="#fff" />}
                            </View>
                            <Text style={styles.checkText}>All windows confirmed closed during fogging</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {/* Photo capture (all steps) */}
                      <View style={styles.photoGrid}>
                        {stepPhotos.map((u, i) => (
                          <View key={i} style={styles.photoChip}>
                            <Camera size={14} weight="fill" color="#fff" />
                            <Text style={styles.photoChipText}>{i + 1}</Text>
                          </View>
                        ))}
                        <TouchableOpacity onPress={() => pickAndUpload('step')} style={styles.addPhotoBtn} activeOpacity={0.85}>
                          <Camera size={18} weight="duotone" color={C.primary} />
                          <Text style={styles.addPhotoText}>Add photo</Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        onPress={endActiveStep}
                        style={[styles.primaryBtn]}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.primaryBtnText}>Mark Step {step.n} complete</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {!isActive && !isDone && (
                    <TouchableOpacity onPress={() => startStep(step.n)} style={styles.startBtn} activeOpacity={0.85}>
                      <Text style={styles.startBtnText}>Start Step {step.n}</Text>
                    </TouchableOpacity>
                  )}

                  {isDone && st && (
                    <Text style={styles.doneNote}>
                      ✓ Completed{st.duration_minutes != null ? ` in ${st.duration_minutes} min` : ''}
                      {st.ozone_ppm != null ? ` · ${st.ozone_ppm} ppm` : ''}
                    </Text>
                  )}
                </View>
              );
            })}

            {allStepsDone && (
              <TouchableOpacity
                onPress={() => setPhase(bookedAddonCodes.length > 0 ? 'addons' : 'complete')}
                style={styles.primaryBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>
                  {bookedAddonCodes.length > 0
                    ? `Core steps done — start ${bookedAddonCodes.length} add-on${bookedAddonCodes.length > 1 ? 's' : ''}`
                    : 'All steps done — finalise wash'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Add-ons phase (only if customer booked any add-ons) ────────── */}
        {phase === 'addons' && (
          <View style={{ gap: 12 }}>
            <Text style={styles.sectionTitle}>Hygiene Upgrades</Text>
            <Text style={styles.sectionSub}>
              Customer purchased {bookedAddonCodes.length} upgrade{bookedAddonCodes.length > 1 ? 's' : ''}. Complete each before finalising.
            </Text>

            {bookedAddonCodes.map((code, addonIdx) => {
              const lib = ADDON_LIBRARY[code];
              if (!lib) return null;
              const isDone = addonsCompleted.includes(code);
              const isActive = activeStepN === stepNumberForAddon(addonIdx, 0) && !isDone;
              const subChecks = addonSubChecked[code] || [];

              return (
                <View
                  key={code}
                  style={[
                    styles.stepCard,
                    isActive && styles.stepCardActive,
                    isDone && styles.stepCardDone,
                  ]}
                >
                  <View style={styles.stepHeader}>
                    <View style={[styles.stepIconBox, isDone && { backgroundColor: (C.leaf as any) || '#22C55E' }]}>
                      {isDone ? (
                        <CheckCircle size={20} weight="fill" color="#fff" />
                      ) : (
                        <Sparkle size={20} weight="duotone" color={C.primaryDk || '#0369A1'} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stepLabel}>{lib.label}</Text>
                      <Text style={styles.stepHint}>{lib.subSteps.length} sub-steps</Text>
                    </View>
                  </View>

                  {!isDone && !isActive && (
                    <TouchableOpacity
                      onPress={() => {
                        setActiveStepN(stepNumberForAddon(addonIdx, 0));
                        setStepPhotos([]);
                      }}
                      style={styles.startBtn}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.startBtnText}>Start {lib.label}</Text>
                    </TouchableOpacity>
                  )}

                  {isActive && (
                    <View style={styles.stepBody}>
                      {lib.subSteps.map((sub, subIdx) => {
                        const checked = !!subChecks[subIdx];
                        return (
                          <TouchableOpacity
                            key={subIdx}
                            onPress={() => toggleAddonSub(code, subIdx)}
                            style={[styles.checkRow, checked && styles.checkRowActive]}
                            activeOpacity={0.85}
                          >
                            <View style={[styles.checkBox, checked && { backgroundColor: C.primary, borderColor: C.primary }]}>
                              {checked && <CheckCircle size={14} weight="fill" color="#fff" />}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.checkText}>{subIdx + 1}. {sub.label}</Text>
                              <Text style={styles.fieldHint}>{sub.hint}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}

                      <View style={styles.photoGrid}>
                        {stepPhotos.map((u, i) => (
                          <View key={i} style={styles.photoChip}>
                            <Camera size={14} weight="fill" color="#fff" />
                            <Text style={styles.photoChipText}>{i + 1}</Text>
                          </View>
                        ))}
                        <TouchableOpacity onPress={() => pickAndUpload('step')} style={styles.addPhotoBtn} activeOpacity={0.85}>
                          <Camera size={18} weight="duotone" color={C.primary} />
                          <Text style={styles.addPhotoText}>Add photo</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.inputRow}>
                        <Text style={styles.inputLabel}>Notes (optional)</Text>
                        <TextInput
                          style={[styles.numInput, { minHeight: 40 }]}
                          placeholder="Any details for the certificate / customer record…"
                          placeholderTextColor={C.muted}
                          value={addonNotes[code] || ''}
                          onChangeText={(t) => setAddonNotes((p) => ({ ...p, [code]: t }))}
                          multiline
                        />
                      </View>

                      <TouchableOpacity
                        onPress={() => completeAddon(code, addonIdx)}
                        style={styles.primaryBtn}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.primaryBtnText}>Mark {lib.label} complete</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {isDone && (
                    <Text style={styles.doneNote}>✓ {lib.label} delivered</Text>
                  )}
                </View>
              );
            })}

            {allAddonsDone && (
              <TouchableOpacity
                onPress={() => setPhase('complete')}
                style={styles.primaryBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>All add-ons done — finalise wash</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Final completion phase ─────────────────────────────────────── */}
        {phase === 'complete' && (
          <View style={{ gap: 14 }}>
            <Text style={styles.sectionTitle}>Wrap up the job</Text>
            <Text style={styles.sectionSub}>Final readings drive the EcoScore + hygiene certificate.</Text>

            <View style={styles.formRow}>
              <Text style={styles.inputLabel}>Water used (litres)</Text>
              <TextInput
                style={styles.numInput}
                value={waterUsed}
                onChangeText={setWaterUsed}
                placeholder="3.0"
                placeholderTextColor={C.muted}
                keyboardType="decimal-pad"
              />
              <Text style={styles.fieldHint}>Target: ≤3 L for max EcoScore. Conventional = 50 L.</Text>
            </View>

            <View style={styles.formRow}>
              <Text style={styles.inputLabel}>Fogging duration (min)</Text>
              <TextInput
                style={styles.numInput}
                value={foggingDurationMin}
                onChangeText={setFoggingDurationMin}
                placeholder="10"
                placeholderTextColor={C.muted}
                keyboardType="number-pad"
              />
              <Text style={styles.fieldHint}>8-12 min = full points. Auto-filled from Step 6 timer.</Text>
            </View>

            <TouchableOpacity
              onPress={() => setPpeFull(!ppeFull)}
              style={[styles.checkRow, ppeFull && styles.checkRowActive]}
              activeOpacity={0.85}
            >
              <View style={[styles.checkBox, ppeFull && { backgroundColor: C.primary, borderColor: C.primary }]}>
                {ppeFull && <CheckCircle size={14} weight="fill" color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.checkText}>Full PPE worn throughout the wash</Text>
                <Text style={styles.fieldHint}>Mask + gloves + goggles. +15 EcoScore pts if confirmed.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setZeroChemicals(!zeroChemicals)}
              style={[styles.checkRow, zeroChemicals && styles.checkRowActive]}
              activeOpacity={0.85}
            >
              <View style={[styles.checkBox, zeroChemicals && { backgroundColor: C.primary, borderColor: C.primary }]}>
                {zeroChemicals && <CheckCircle size={14} weight="fill" color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.checkText}>Zero chemical detergents used</Text>
                <Text style={styles.fieldHint}>+10 EcoScore pts. pH-neutral foam ≠ chemical.</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={completeJob}
              disabled={submitting || !waterUsed}
              style={[styles.primaryBtn, (submitting || !waterUsed) && { opacity: 0.5 }]}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Complete job & issue certificate</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: { paddingHorizontal: 18, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontWeight: '800', fontSize: 18 },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  headerMetaText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  gatedPill: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  gatedPillText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  body: { padding: 16, paddingBottom: 32 },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: C.foreground },
  sectionSub: { fontSize: 13, color: C.muted, lineHeight: 19 },

  warningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderLeftWidth: 3, borderLeftColor: '#F59E0B',
    padding: 12, borderRadius: 10,
  },
  warningText: { flex: 1, fontSize: 13, color: C.foreground, lineHeight: 18 },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoChip: {
    width: 70, height: 70, borderRadius: 10,
    backgroundColor: (C.primary as any) || '#0EA5E9',
    alignItems: 'center', justifyContent: 'center',
  },
  photoChipText: { color: '#fff', fontWeight: '800', fontSize: 12, marginTop: 4 },
  addPhotoBtn: {
    width: 70, height: 70, borderRadius: 10,
    borderWidth: 2, borderStyle: 'dashed' as any, borderColor: C.primary,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  addPhotoText: { color: C.primary, fontSize: 10, fontWeight: '700' },

  stepCard: {
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: C.border,
    padding: 14,
  },
  stepCardActive: { borderColor: C.primary, backgroundColor: (C.primaryBg as any) || '#E0F2FE' },
  stepCardDone: { borderColor: (C.leaf as any) || '#22C55E', opacity: 0.85 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepIconBox: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: (C.primaryBg as any) || '#E0F2FE',
    alignItems: 'center', justifyContent: 'center',
  },
  stepLabel: { fontSize: 14, fontWeight: '800', color: C.foreground },
  stepHint: { fontSize: 12, color: C.muted, marginTop: 2 },
  stepBody: { marginTop: 12, gap: 12 },
  doneNote: { marginTop: 8, fontSize: 12, color: (C.leaf as any) || '#22C55E', fontWeight: '600' },

  inputRow: { gap: 6 },
  inputLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: C.muted },
  numInput: {
    fontSize: 18, fontWeight: '700', color: C.foreground,
    borderBottomWidth: 2, borderBottomColor: C.border, paddingVertical: 6,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  fieldHint: { fontSize: 11, color: C.muted, marginTop: 4 },

  formRow: { gap: 6, marginBottom: 4 },

  timerBox: {
    backgroundColor: C.ink || '#0B1F33', borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  timerLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  timerValue: { color: '#fff', fontSize: 44, fontWeight: '800', letterSpacing: -2, marginTop: 4 },
  timerMin: { color: '#86EFAC', fontSize: 12, fontWeight: '700', marginTop: 4 },

  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
  },
  checkRowActive: { borderColor: C.primary, backgroundColor: (C.primaryBg as any) || '#E0F2FE' },
  checkBox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
  },
  checkText: { fontSize: 13, color: C.foreground, fontWeight: '600' },

  primaryBtn: {
    height: 52, borderRadius: 14, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  startBtn: {
    marginTop: 10,
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10,
    backgroundColor: C.ink || '#0B1F33', alignSelf: 'flex-start',
  },
  startBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
