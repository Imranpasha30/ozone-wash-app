/**
 * ComplianceStepScreen - per-phase data entry for the FA Check List PDF SOP.
 *
 * Drives a single step (0..8) of the 9-phase compliance flow. The UI is
 * config-driven: STEP_UI[stepNumber] declares which input blocks to render
 * (water-test panel, PPE/safety panel, duration picker, etc.) so all step-
 * specific switching lives in one place rather than scattered conditionals.
 *
 * Mandatory photo per step maps to the right DB column (photo_before_url for
 * Stages 0/1/6/7, photo_after_url for the rest) - matches the backend's
 * required_fields list exactly.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, ActivityIndicator, Alert, TextInput, Platform, StatusBar, Switch,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { complianceAPI, uploadAPI } from '../../services/api';
import { enqueue as enqueuePendingUpload } from '../../utils/pendingUploads';
import { useTheme } from '../../hooks/useTheme';
import {
  COMPLIANCE_STEPS, WATER_TEST_BUCKETS, WATER_LEVEL_BUCKETS,
  TANK_CONDITION_OPTIONS, DURATION_BUCKETS, DISPOSAL_OPTIONS,
  SAFETY_OPTIONS, UV_DOSE_BUCKETS, UV_LUMINES_OPTIONS, PPE_ITEMS,
} from '../../utils/constants';
import {
  ArrowLeft, MapPin, Camera, Check, CheckCircle, Clock,
  ShieldCheck, Flask, Drop,
} from '../../components/Icons';

const TOTAL_STEPS = 9;

// Which DB column the mandatory photo for this step writes to. Matches the
// required_fields list in src/modules/compliance/compliance.service.js.
const PHOTO_FIELD: Record<number, 'photo_before_url' | 'photo_after_url'> = {
  0: 'photo_before_url',
  1: 'photo_before_url',
  2: 'photo_after_url',
  3: 'photo_after_url',
  4: 'photo_after_url',
  5: 'photo_after_url',
  6: 'photo_before_url',
  7: 'photo_before_url',
  8: 'photo_after_url',
};

// Declarative per-step UI configuration. Keys = step_number (0..8).
// `blocks` lists the input panels to render in order; the photo + GPS rows
// are universal and rendered outside this map.
type Block =
  | 'safety'           // Stage 0 PPE + ladder/electrical/emergency/fence/board
  | 'pre_water_test'   // Step 1 - Turbidity/pH/ORP/Conductivity/TDS/ATP
  | 'drain'            // Step 2 - Water level + tank condition
  | 'scrub'            // Step 3 - scrub completed toggle
  | 'rinse'            // Step 4 - rinse duration bucket
  | 'sludge'           // Step 5 - disposal status
  | 'ozone'            // Step 6 - cycle duration + PPM
  | 'uv'               // Step 7 - UV duration + dose + lumines + skip toggle
  | 'post_water_test'  // Step 8 - same as pre_water_test (shared component)
  | 'signature';       // Step 8 - signature URL + technician remarks

const STEP_UI: Record<number, Block[]> = {
  0: ['safety'],
  1: ['pre_water_test'],
  2: ['drain'],
  3: ['scrub'],
  4: ['rinse'],
  5: ['sludge'],
  6: ['ozone'],
  7: ['uv'],
  8: ['post_water_test', 'signature'],
};

interface StepData {
  // Photos (only the relevant one per step is filled)
  photo_before_url: string;
  photo_after_url: string;

  // GPS auto-capture
  gps_lat: number;
  gps_lng: number;

  // Stage 0 - PPE + safety
  ppe_list: string[];
  ladder_check: string;
  electrical_check: string;
  emergency_kit: boolean;
  spare_tank_water: boolean;
  fence_placed: boolean;
  danger_board: boolean;

  // Steps 1 + 8 - water tests (bucket labels)
  turbidity: string;
  ph_level: string;
  orp: string;
  conductivity: string;
  tds: string;
  atp: string;

  // Step 2
  water_level_pct: string;
  tank_condition: string;

  // Step 3
  scrub_completed: boolean;

  // Step 4
  rinse_duration: string;

  // Step 5
  disposal_status: string;

  // Step 6
  ozone_cycle_duration: string;
  ozone_ppm_dosed: string;

  // Step 7
  uv_cycle_duration: string;
  uv_dose: string;
  uv_lumines_status: string;
  uv_skipped: boolean;

  // Step 8
  client_signature_url: string;
  technician_remarks: string;
}

const initialState: StepData = {
  photo_before_url: '',
  photo_after_url: '',
  gps_lat: 0,
  gps_lng: 0,
  ppe_list: [],
  ladder_check: '',
  electrical_check: '',
  emergency_kit: false,
  spare_tank_water: false,
  fence_placed: false,
  danger_board: false,
  turbidity: '', ph_level: '', orp: '', conductivity: '', tds: '', atp: '',
  water_level_pct: '',
  tank_condition: '',
  scrub_completed: false,
  rinse_duration: '',
  disposal_status: '',
  ozone_cycle_duration: '',
  ozone_ppm_dosed: '',
  uv_cycle_duration: '',
  uv_dose: '',
  uv_lumines_status: '',
  uv_skipped: false,
  client_signature_url: '',
  technician_remarks: '',
};

const ComplianceStepScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();
  const { job_id: jobId, step_number: stepNumber, read_only: readOnly } = route.params;

  const stepInfo = COMPLIANCE_STEPS.find((s) => s.step === stepNumber);
  const blocks = STEP_UI[stepNumber] || [];
  const photoField = PHOTO_FIELD[stepNumber] || 'photo_after_url';
  const isStage0 = stepNumber === 0;
  const isUvStep = stepNumber === 7;

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const draftKey = `compliance_draft_${jobId}_${stepNumber}`;
  const draftLoaded = useRef(false);

  const [data, setData] = useState<StepData>(initialState);

  useEffect(() => {
    // Read-only mode: pull the saved phase data from the server and hydrate
    // the same form so the agent can review every field they entered.
    if (readOnly) {
      (async () => {
        try {
          const res = await complianceAPI.getChecklist(jobId) as any;
          const stepRow = res.data?.checklist?.find((s: any) => s.step_number === stepNumber)?.data;
          if (stepRow) {
            setData({
              ...initialState,
              ...stepRow,
              ppe_list: Array.isArray(stepRow.ppe_list)
                ? stepRow.ppe_list
                : (typeof stepRow.ppe_list === 'string' ? JSON.parse(stepRow.ppe_list || '[]') : []),
            });
          }
        } catch (_) { /* fall back to empty state */ }
        draftLoaded.current = true;
      })();
      return;
    }
    const loadDraft = async () => {
      try {
        const saved = await AsyncStorage.getItem(draftKey);
        if (saved) setData({ ...initialState, ...JSON.parse(saved) });
      } catch (_) {}
      draftLoaded.current = true;
    };
    loadDraft();
    getLocation();
  }, [readOnly]);

  useEffect(() => {
    if (!draftLoaded.current) return;
    AsyncStorage.setItem(draftKey, JSON.stringify(data)).catch(() => {});
  }, [data]);

  const getLocation = async () => {
    if (Platform.OS === 'web') {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => setData((d) => ({ ...d, gps_lat: pos.coords.latitude, gps_lng: pos.coords.longitude })),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 },
      );
      return;
    }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setData((d) => ({ ...d, gps_lat: loc.coords.latitude, gps_lng: loc.coords.longitude }));
    } catch (_) {}
  };

  const pickPhoto = async () => {
    if (Platform.OS === 'web') {
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: false });
      if (!result.canceled && result.assets[0]) await uploadPhoto(result.assets[0].uri);
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos');
      return;
    }
    Alert.alert('Photo Source', 'Take a photo or choose from gallery?', [
      { text: 'Camera', onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
          if (!result.canceled && result.assets[0]) await uploadPhoto(result.assets[0].uri);
        },
      },
      { text: 'Gallery', onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: false });
          if (!result.canceled && result.assets[0]) await uploadPhoto(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadPhoto = async (uri: string) => {
    setUploading(true);
    try {
      const res = await uploadAPI.uploadPhoto(uri, 'compliance') as any;
      const url = res.data?.url || res.url || uri;
      setData((d) => ({ ...d, [photoField]: url }));
    } catch (_) {
      // Upload failed - keep local URI so the form still validates, queue for retry.
      setData((d) => ({ ...d, [photoField]: uri }));
      enqueuePendingUpload(uri, jobId, 'compliance').catch(() => {});
      Alert.alert(
        'Photo Saved Offline',
        'Your photo will upload when your connection improves. You can keep working.',
      );
    } finally {
      setUploading(false);
    }
  };

  const togglePpe = (item: string) => {
    setData((d) => ({
      ...d,
      ppe_list: d.ppe_list.includes(item)
        ? d.ppe_list.filter((p) => p !== item)
        : [...d.ppe_list, item],
    }));
  };

  const setField = <K extends keyof StepData>(key: K, value: StepData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const buildPayload = () => ({
    job_id: jobId,
    step_number: stepNumber,
    step_name: stepInfo?.name || `Phase ${stepNumber}`,
    photo_before_url: data.photo_before_url || undefined,
    photo_after_url: data.photo_after_url || undefined,
    gps_lat: data.gps_lat,
    gps_lng: data.gps_lng,
    // Stage 0
    ppe_list: data.ppe_list,
    ladder_check: data.ladder_check || undefined,
    electrical_check: data.electrical_check || undefined,
    emergency_kit: isStage0 ? data.emergency_kit : undefined,
    spare_tank_water: isStage0 ? data.spare_tank_water : undefined,
    fence_placed: isStage0 ? data.fence_placed : undefined,
    danger_board: isStage0 ? data.danger_board : undefined,
    arrival_at: isStage0 ? new Date().toISOString() : undefined,
    // Water tests (steps 1 + 8)
    turbidity: data.turbidity || undefined,
    ph_level: data.ph_level || undefined,
    orp: data.orp || undefined,
    conductivity: data.conductivity || undefined,
    tds: data.tds || undefined,
    atp: data.atp || undefined,
    // Step 2
    water_level_pct: data.water_level_pct || undefined,
    tank_condition: data.tank_condition || undefined,
    // Step 3
    scrub_completed: stepNumber === 3 ? data.scrub_completed : undefined,
    // Step 4
    rinse_duration: data.rinse_duration || undefined,
    // Step 5
    disposal_status: data.disposal_status || undefined,
    // Step 6
    ozone_cycle_duration: data.ozone_cycle_duration || undefined,
    ozone_ppm_dosed: data.ozone_ppm_dosed || undefined,
    // Step 7
    uv_cycle_duration: data.uv_cycle_duration || undefined,
    uv_dose: data.uv_dose || undefined,
    uv_lumines_status: data.uv_lumines_status || undefined,
    uv_skipped: isUvStep ? data.uv_skipped : undefined,
    // Step 8
    client_signature_url: data.client_signature_url || undefined,
    technician_remarks: data.technician_remarks || undefined,
    completed: true,
  });

  const handleSubmit = async () => {
    // UV skipped bypasses photo + field requirements (backend mirrors this).
    const isSkipping = isUvStep && data.uv_skipped;

    if (!isSkipping) {
      if (!data[photoField]) {
        return Alert.alert('Photo Required', `Please capture: "${stepInfo?.mandatoryPhotoLabel}"`);
      }
      if (Platform.OS !== 'web' && data.gps_lat === 0 && data.gps_lng === 0) {
        return Alert.alert('GPS Required', 'GPS location not captured. Please enable location and try again.');
      }
    }

    setLoading(true);
    try {
      await complianceAPI.logStep(buildPayload());
      await AsyncStorage.removeItem(draftKey);
      Alert.alert(
        isSkipping ? 'Phase Skipped' : 'Phase Saved',
        isSkipping
          ? 'UV step was skipped (not in this booking).'
          : `${stepInfo?.name || 'Phase'} logged successfully. Customer notified.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save phase');
    } finally {
      setLoading(false);
    }
  };

  const stepLabel = isStage0 ? 'Stage 0 - Pre-Service' : `Phase ${stepNumber} of ${TOTAL_STEPS - 1}`;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={C.foreground} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.stepNum}>{stepLabel}</Text>
          <Text style={styles.stepName}>{stepInfo?.name}</Text>
          {readOnly ? (
            <Text style={[styles.optionalBadge, { color: C.success }]}>View only - phase logged</Text>
          ) : stepInfo?.optional ? (
            <Text style={styles.optionalBadge}>Optional add-on</Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        // pointerEvents=none on the form locks every Switch / BucketRow / photo
        // tile / textarea at once. The submit button below sits OUTSIDE this
        // ScrollView (it's a separate child of the root View)... actually it's
        // INSIDE - so we wrap only the form blocks below in a sub-view instead.
      >
        {/* GPS Status */}
        <View style={[styles.gpsRow, data.gps_lat !== 0 ? styles.gpsOk : styles.gpsWaiting]}>
          <View style={styles.gpsContent}>
            <MapPin size={16} weight="fill" color={data.gps_lat !== 0 ? C.success : C.warning} />
            <Text style={styles.gpsText}>
              {data.gps_lat !== 0
                ? `GPS: ${data.gps_lat.toFixed(4)}, ${data.gps_lng.toFixed(4)}`
                : 'Getting GPS location...'}
            </Text>
          </View>
          {data.gps_lat === 0 && !readOnly && (
            <TouchableOpacity onPress={getLocation}>
              <Text style={styles.gpsRetry}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Read-only mode: lock every input below this point so the agent can
            review what was entered without accidentally tapping anything. The
            submit button further down is OUTSIDE this lock - it shows
            "Back to checklist" instead of "Save & Notify". */}
        <View pointerEvents={readOnly ? 'none' : 'auto'}>

        {/* UV skip toggle (only on step 7, rendered before mandatory-photo) */}
        {isUvStep && (
          <View style={styles.skipRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.skipTitle}>Skip - not in this booking</Text>
              <Text style={styles.skipBody}>
                UV Double Lock is an optional add-on. Toggle on if this booking does not include UV.
              </Text>
            </View>
            <Switch
              value={data.uv_skipped}
              onValueChange={(v) => setField('uv_skipped', v)}
              thumbColor={data.uv_skipped ? C.primary : '#fff'}
              trackColor={{ false: C.border, true: C.primaryBg }}
            />
          </View>
        )}

        {/* Mandatory Photo */}
        {!(isUvStep && data.uv_skipped) && (
          <>
            <View style={styles.labelRow}>
              <Camera size={16} weight="regular" color={C.foreground} />
              <Text style={styles.label}>Mandatory Photo: {stepInfo?.mandatoryPhotoLabel}</Text>
            </View>
            <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto} activeOpacity={0.7}>
              {uploading && !data[photoField] ? (
                <ActivityIndicator color={C.primary} />
              ) : data[photoField] ? (
                <Image source={{ uri: data[photoField] }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <View style={styles.photoIconContainer}>
                    <Camera size={28} weight="regular" color={C.muted} />
                  </View>
                  <Text style={styles.photoLabel}>Tap to capture photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Step-specific input blocks */}
        {!(isUvStep && data.uv_skipped) && blocks.map((b) => {
          switch (b) {
            case 'safety':
              return (
                <View key={b}>
                  <SectionHeader icon={<ShieldCheck size={16} weight="regular" color={C.foreground} />} label="PPE Kit (all 6 required)" styles={styles} />
                  <View style={styles.ppeGrid}>
                    {PPE_ITEMS.map((p) => {
                      const selected = data.ppe_list.includes(p.value);
                      return (
                        <TouchableOpacity
                          key={p.value}
                          style={[styles.ppeItem, selected && styles.ppeItemActive]}
                          onPress={() => togglePpe(p.value)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.ppeIconContainer, selected && styles.ppeIconContainerActive]}>
                            <ShieldCheck size={18} weight={selected ? 'fill' : 'regular'} color={selected ? C.primary : C.muted} />
                          </View>
                          <Text style={[styles.ppeLabel, selected && styles.ppeLabelActive]}>{p.label}</Text>
                          {selected && <Check size={16} weight="bold" color={C.primary} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <SectionHeader icon={<ShieldCheck size={16} weight="regular" color={C.foreground} />} label="Ladder safety check" styles={styles} />
                  <BucketRow options={SAFETY_OPTIONS.ladder} value={data.ladder_check} onPick={(v) => setField('ladder_check', v)} styles={styles} C={C} />

                  <SectionHeader icon={<ShieldCheck size={16} weight="regular" color={C.foreground} />} label="Electrical safety check" styles={styles} />
                  <BucketRow options={SAFETY_OPTIONS.electrical} value={data.electrical_check} onPick={(v) => setField('electrical_check', v)} styles={styles} C={C} />

                  <ToggleRow label="Emergency kit available?"          value={data.emergency_kit}    onToggle={(v) => setField('emergency_kit', v)}    styles={styles} C={C} />
                  <ToggleRow label="Spare tank filled for O3 treatment?" value={data.spare_tank_water} onToggle={(v) => setField('spare_tank_water', v)} styles={styles} C={C} />
                  <ToggleRow label="Safety fence placed?"               value={data.fence_placed}     onToggle={(v) => setField('fence_placed', v)}     styles={styles} C={C} />
                  <ToggleRow label="Danger board displayed?"            value={data.danger_board}     onToggle={(v) => setField('danger_board', v)}     styles={styles} C={C} />
                </View>
              );

            case 'pre_water_test':
            case 'post_water_test':
              return (
                <View key={b}>
                  <WaterTestPanel data={data} onPick={setField} styles={styles} C={C} />
                </View>
              );

            case 'drain':
              return (
                <View key={b}>
                  <SectionHeader icon={<Drop size={16} weight="regular" color={C.foreground} />} label="Water level remaining" styles={styles} />
                  <BucketRow options={WATER_LEVEL_BUCKETS} value={data.water_level_pct} onPick={(v) => setField('water_level_pct', v)} styles={styles} C={C} />
                  <SectionHeader icon={<Drop size={16} weight="regular" color={C.foreground} />} label="Tank condition" styles={styles} />
                  <BucketRow options={TANK_CONDITION_OPTIONS} value={data.tank_condition} onPick={(v) => setField('tank_condition', v)} styles={styles} C={C} />
                </View>
              );

            case 'scrub':
              return (
                <View key={b}>
                  <ToggleRow label="Mechanical scrub & rotary jet completed?" value={data.scrub_completed} onToggle={(v) => setField('scrub_completed', v)} styles={styles} C={C} />
                </View>
              );

            case 'rinse':
              return (
                <View key={b}>
                  <SectionHeader icon={<Clock size={16} weight="regular" color={C.foreground} />} label="High-pressure rinse duration" styles={styles} />
                  <BucketRow options={DURATION_BUCKETS} value={data.rinse_duration} onPick={(v) => setField('rinse_duration', v)} styles={styles} C={C} />
                </View>
              );

            case 'sludge':
              return (
                <View key={b}>
                  <SectionHeader icon={<Flask size={16} weight="regular" color={C.foreground} />} label="Sludge disposal" styles={styles} />
                  <BucketRow options={DISPOSAL_OPTIONS} value={data.disposal_status} onPick={(v) => setField('disposal_status', v)} styles={styles} C={C} />
                </View>
              );

            case 'ozone':
              return (
                <View key={b}>
                  <SectionHeader icon={<Clock size={16} weight="regular" color={C.foreground} />} label="Ozone cycle duration" styles={styles} />
                  <BucketRow options={DURATION_BUCKETS} value={data.ozone_cycle_duration} onPick={(v) => setField('ozone_cycle_duration', v)} styles={styles} C={C} />
                  <SectionHeader icon={<Flask size={16} weight="regular" color={C.foreground} />} label="PPM dosed" styles={styles} />
                  <BucketRow options={['<1 ppm', '1-2 ppm', '>2 ppm']} value={data.ozone_ppm_dosed} onPick={(v) => setField('ozone_ppm_dosed', v)} styles={styles} C={C} />
                </View>
              );

            case 'uv':
              return (
                <View key={b}>
                  <SectionHeader icon={<Clock size={16} weight="regular" color={C.foreground} />} label="UV cycle duration" styles={styles} />
                  <BucketRow options={DURATION_BUCKETS} value={data.uv_cycle_duration} onPick={(v) => setField('uv_cycle_duration', v)} styles={styles} C={C} />
                  <SectionHeader icon={<Flask size={16} weight="regular" color={C.foreground} />} label="UV dose" styles={styles} />
                  <BucketRow options={UV_DOSE_BUCKETS} value={data.uv_dose} onPick={(v) => setField('uv_dose', v)} styles={styles} C={C} />
                  <SectionHeader icon={<ShieldCheck size={16} weight="regular" color={C.foreground} />} label="Lumines logging" styles={styles} />
                  <BucketRow options={UV_LUMINES_OPTIONS} value={data.uv_lumines_status} onPick={(v) => setField('uv_lumines_status', v)} styles={styles} C={C} />
                </View>
              );

            case 'signature':
              return (
                <View key={b}>
                  <SectionHeader icon={<CheckCircle size={16} weight="regular" color={C.foreground} />} label="Client signature URL" styles={styles} />
                  <TextInput
                    style={styles.input}
                    placeholder="Paste/scan signature image URL or capture handover"
                    value={data.client_signature_url}
                    onChangeText={(v) => setField('client_signature_url', v)}
                    placeholderTextColor={C.muted}
                  />
                  <SectionHeader icon={<Flask size={16} weight="regular" color={C.foreground} />} label="Technician remarks" styles={styles} />
                  <TextInput
                    style={[styles.input, { minHeight: 80 }]}
                    placeholder="Observations, recommendations, follow-up notes..."
                    multiline numberOfLines={3}
                    value={data.technician_remarks}
                    onChangeText={(v) => setField('technician_remarks', v)}
                    placeholderTextColor={C.muted}
                    textAlignVertical="top"
                  />
                </View>
              );
          }
          return null;
        })}

        {/* Customer message preview - what the customer sees on WhatsApp after submit */}
        {stepInfo?.customerMessage && !(isUvStep && data.uv_skipped) && (
          <View style={styles.customerMsgBox}>
            <Text style={styles.customerMsgLabel}>CUSTOMER WILL RECEIVE</Text>
            <Text style={styles.customerMsgText}>"{stepInfo.customerMessage}"</Text>
          </View>
        )}

        </View>{/* end read-only lock wrapper */}

        {readOnly ? (
          // Read-only review mode - no submit, just a "Done" back button.
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: C.surfaceElevated }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <View style={styles.submitContent}>
              <ArrowLeft size={18} weight="bold" color={C.foreground} />
              <Text style={[styles.submitText, { color: C.foreground }]}>Back to checklist</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading || uploading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={C.primaryFg} />
            ) : (
              <View style={styles.submitContent}>
                <CheckCircle size={18} weight="fill" color={C.primaryFg} />
                <Text style={styles.submitText}>
                  {isUvStep && data.uv_skipped ? 'Mark Skipped & Continue' : 'Save & Notify Customer'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

/* ─── Sub-components ─────────────────────────────────────────────── */

function SectionHeader({ icon, label, styles }: any) {
  return (
    <View style={styles.labelRow}>
      {icon}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

function BucketRow({ options, value, onPick, styles, C }: {
  options: string[]; value: string; onPick: (v: string) => void; styles: any; C: any;
}) {
  return (
    <View style={styles.bucketRow}>
      {options.map((opt: string) => {
        const active = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.bucket, active && styles.bucketActive]}
            onPress={() => onPick(opt)}
            activeOpacity={0.7}
          >
            <Text style={[styles.bucketText, active && { color: C.primaryFg }]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ToggleRow({ label, value, onToggle, styles, C }: {
  label: string; value: boolean; onToggle: (v: boolean) => void; styles: any; C: any;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        thumbColor={value ? C.primary : '#fff'}
        trackColor={{ false: C.border, true: C.primaryBg }}
      />
    </View>
  );
}

function WaterTestPanel({ data, onPick, styles, C }: any) {
  const tests: { key: keyof typeof WATER_TEST_BUCKETS; label: string }[] = [
    { key: 'turbidity',    label: 'Turbidity' },
    { key: 'ph_level',     label: 'pH' },
    { key: 'orp',          label: 'ORP' },
    { key: 'conductivity', label: 'Conductivity' },
    { key: 'tds',          label: 'TDS' },
    { key: 'atp',          label: 'ATP' },
  ];
  return (
    <View>
      {tests.map((t) => (
        <View key={t.key}>
          <SectionHeader icon={<Flask size={16} weight="regular" color={C.foreground} />} label={t.label} styles={styles} />
          <BucketRow
            options={WATER_TEST_BUCKETS[t.key]}
            value={data[t.key]}
            onPick={(v: string) => onPick(t.key, v)}
            styles={styles}
            C={C}
          />
        </View>
      ))}
    </View>
  );
}

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: {
    backgroundColor: C.surface,
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
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
  headerContent: { flex: 1 },
  stepNum: { fontSize: 12, color: C.muted, fontWeight: '700', letterSpacing: 0.5 },
  stepName: { fontSize: 18, fontWeight: '700', color: C.foreground },
  optionalBadge: {
    fontSize: 10, fontWeight: '800', color: C.warning,
    marginTop: 2, letterSpacing: 0.8, textTransform: 'uppercase',
  },
  body: { padding: 20, paddingBottom: 40 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 20 },
  label: { fontSize: 14, fontWeight: '700', color: C.foreground },

  gpsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 12, padding: 12, marginBottom: 4,
  },
  gpsOk: { backgroundColor: C.successBg },
  gpsWaiting: { backgroundColor: C.warningBg },
  gpsContent: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  gpsText: { fontSize: 12, color: C.foreground, fontWeight: '600' },
  gpsRetry: { fontSize: 12, color: C.primary, fontWeight: '700', marginLeft: 8 },

  photoBtn: {
    backgroundColor: C.surfaceElevated, borderRadius: 16,
    borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed',
    overflow: 'hidden', minHeight: 140,
    justifyContent: 'center', alignItems: 'center',
  },
  photoPreview: { width: '100%', height: 200, resizeMode: 'cover' },
  photoPlaceholder: { alignItems: 'center', padding: 20 },
  photoIconContainer: {
    width: 56, height: 56, borderRadius: 14,
    backgroundColor: C.surfaceHighlight,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  photoLabel: { fontSize: 14, color: C.muted, fontWeight: '600' },

  ppeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ppeItem: {
    width: '47%', backgroundColor: C.surface,
    borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  ppeItemActive: { backgroundColor: C.primaryBg },
  ppeIconContainer: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: C.surfaceElevated,
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  ppeIconContainerActive: { backgroundColor: C.primaryBg },
  ppeLabel: { fontSize: 14, color: C.muted, fontWeight: '600', flex: 1 },
  ppeLabelActive: { color: C.primary },

  bucketRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bucket: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface,
  },
  bucketActive: { backgroundColor: C.primary, borderColor: C.primary },
  bucketText: { fontSize: 13, fontWeight: '700', color: C.foreground },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 12, backgroundColor: C.surfaceElevated, marginTop: 12,
  },
  toggleLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: C.foreground, marginRight: 12 },

  skipRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.warningBg, padding: 14, borderRadius: 12,
    marginTop: 16, marginBottom: 4,
  },
  skipTitle: { fontSize: 14, fontWeight: '800', color: C.foreground, marginBottom: 2 },
  skipBody: { fontSize: 12, color: C.muted, lineHeight: 16, paddingRight: 8 },

  input: {
    backgroundColor: C.surfaceElevated, borderRadius: 12,
    padding: 14, fontSize: 15, color: C.foreground,
  },

  customerMsgBox: {
    marginTop: 24, padding: 14, borderRadius: 12,
    backgroundColor: C.primaryBg, borderWidth: 1, borderColor: C.primary,
  },
  customerMsgLabel: {
    fontSize: 10, fontWeight: '800', color: C.primary,
    letterSpacing: 1.4, marginBottom: 6,
  },
  customerMsgText: {
    fontSize: 13, color: C.foreground, lineHeight: 19,
    fontStyle: 'italic',
  },

  submitBtn: {
    backgroundColor: C.primary, borderRadius: 16, padding: 18,
    alignItems: 'center', marginTop: 24,
  },
  submitBtnDisabled: { backgroundColor: C.muted },
  submitContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitText: { color: C.primaryFg, fontWeight: '700', fontSize: 16 },
});

export default ComplianceStepScreen;
