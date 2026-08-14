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
  Image, ActivityIndicator, Alert, TextInput, Platform, StatusBar, Switch, Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { capturePhoto } from '../../services/cameraCapture';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { complianceAPI, uploadAPI, fieldAPI, jobAPI } from '../../services/api';
import { enqueue as enqueuePendingUpload } from '../../utils/pendingUploads';
import { enqueueStep } from '../../utils/pendingSteps';
import { useTheme } from '../../hooks/useTheme';
import WebContainer from '../../components/WebContainer';
import {
  COMPLIANCE_STEPS, WATER_TEST_BUCKETS, WATER_LEVEL_BUCKETS,
  TANK_CONDITION_OPTIONS, DURATION_BUCKETS, DISPOSAL_OPTIONS,
  SAFETY_OPTIONS, UV_DOSE_BUCKETS, UV_LUMINES_OPTIONS, PPE_ITEMS,
} from '../../utils/constants';
import {
  ArrowLeft, MapPin, Camera, Check, CheckCircle, Clock,
  ShieldCheck, Flask, Drop, Warning, Lightning, Hourglass,
  TestTube, ListChecks, PencilSimple, X,
} from '../../components/Icons';

// WebView-based signature pad — never load it into the web bundle; the web
// fallback keeps the plain signature-URL TextInput instead.
const SignatureCanvas: any =
  Platform.OS === 'web' ? null : require('react-native-signature-canvas').default;

const SIG_WEB_STYLE = `
  .m-signature-pad { box-shadow: none; border: none; height: 100%; }
  .m-signature-pad--body { border: 1px dashed #bbb; border-radius: 12px; }
  .m-signature-pad--footer { margin: 8px; }
`;

const TOTAL_STEPS = 9;

// Numeric meter readings (Phases 2 & 5 water quality). Step 1 logs timing
// 'before', step 8 logs 'after' — dissolved O₃ uses the *_final param on
// step 8. Backend gate G-4 blocks step-2 logging until all 5 before-readings
// exist server-side.
const METER_ROWS: { param: string; label: string; unit: string }[] = [
  { param: 'pH',           label: 'pH',           unit: '0-14' },
  { param: 'TDS',          label: 'TDS',          unit: 'ppm' },
  { param: 'ORP',          label: 'ORP',          unit: 'mV' },
  { param: 'turbidity',    label: 'Turbidity',    unit: 'NTU' },
  { param: 'dissolved_o3', label: 'Dissolved O₃', unit: 'mg/L' },
];

interface MeterRow {
  value: string;
  saved: boolean;
  saving: boolean;
  bis: boolean | null;      // BIS compliance from server (null = no standard)
  delta: number | null;     // after - before, server computed
  capped: boolean;          // ORP < 650 → certificate capped Silver
  error: string;            // red banner (423 gate text)
  safe: boolean | null;     // dissolved_o3_final only
}
const emptyMeterRow: MeterRow = {
  value: '', saved: false, saving: false, bis: null, delta: null,
  capped: false, error: '', safe: null,
};

// Ozone session staging (step 6) — mirrors backend gates G-5..G-8.
type OzStage = 'loading' | 'checklist' | 'start' | 'running' | 'stopped' | 'safety' | 'cleared';

const fmtMMSS = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

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

  // Steps 1 + 8 - visual proof (main photo + 2 extras = 3 total, video optional)
  extra_photo_urls: string[];
  video_url: string;

  // Step 2
  water_level_pct: string;
  tank_condition: string;
  volume_drained_litres: string;

  // Step 3
  scrub_completed: boolean;
  confined_entry: boolean;
  harness_attached: boolean;

  // Step 4
  rinse_duration: string;
  water_before_litres: string;
  water_after_litres: string;

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
  cleanup_tools_loaded: boolean;
  cleanup_manhole_secured: boolean;
  cleanup_no_water_pooling: boolean;
  cleanup_ppe_waste_bagged: boolean;
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
  extra_photo_urls: [],
  video_url: '',
  water_level_pct: '',
  tank_condition: '',
  volume_drained_litres: '',
  scrub_completed: false,
  confined_entry: false,
  harness_attached: false,
  rinse_duration: '',
  water_before_litres: '',
  water_after_litres: '',
  disposal_status: '',
  ozone_cycle_duration: '',
  ozone_ppm_dosed: '',
  uv_cycle_duration: '',
  uv_dose: '',
  uv_lumines_status: '',
  uv_skipped: false,
  client_signature_url: '',
  technician_remarks: '',
  cleanup_tools_loaded: false,
  cleanup_manhole_secured: false,
  cleanup_no_water_pooling: false,
  cleanup_ppe_waste_bagged: false,
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
  const isOzoneStep = stepNumber === 6;
  const isWaterStep = stepNumber === 1 || stepNumber === 8;

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [extraUploading, setExtraUploading] = useState<number | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [sigOpen, setSigOpen] = useState(false);
  const [sigUploading, setSigUploading] = useState(false);
  const [beforeHint, setBeforeHint] = useState(''); // step-1 before-photo shown on step 8
  const draftKey = `compliance_draft_${jobId}_${stepNumber}`;
  const draftLoaded = useRef(false);

  const [data, setData] = useState<StepData>(initialState);

  // ── Numeric meter readings (steps 1 + 8) ──────────────────────────
  const meterTiming: 'before' | 'after' = stepNumber === 1 ? 'before' : 'after';
  const meterParamFor = (base: string) =>
    stepNumber === 8 && base === 'dissolved_o3' ? 'dissolved_o3_final' : base;
  const [meters, setMeters] = useState<Record<string, MeterRow>>(() => {
    const m: Record<string, MeterRow> = {};
    METER_ROWS.forEach((r) => {
      m[stepNumber === 8 && r.param === 'dissolved_o3' ? 'dissolved_o3_final' : r.param] = { ...emptyMeterRow };
    });
    return m;
  });
  const metersSaved = METER_ROWS.reduce(
    (n, r) => n + (meters[meterParamFor(r.param)]?.saved ? 1 : 0), 0,
  );

  // ── Ozone session staging (step 6, gates G-5..G-8) ────────────────
  const [ozStage, setOzStage] = useState<OzStage>(isOzoneStep && !readOnly ? 'loading' : 'cleared');
  const [ozChecks, setOzChecks] = useState({
    respirators: false, monitors: false, bystanders_clear: false, customer_notified: false,
  });
  const [ozBusy, setOzBusy] = useState(false);
  const [ozEndsAt, setOzEndsAt] = useState(0);
  const [ozLeft, setOzLeft] = useState(0);
  const [ozNote, setOzNote] = useState('');
  const [ozError, setOzError] = useState('');
  const [extendReason, setExtendReason] = useState('');
  const [ambientVal, setAmbientVal] = useState('');
  const [dissolvedVal, setDissolvedVal] = useState('');
  const [ambientPass, setAmbientPass] = useState(false);
  const [dissolvedPass, setDissolvedPass] = useState(false);
  const [safetyBusy, setSafetyBusy] = useState<'ambient' | 'dissolved' | ''>('');

  const showOzonePanel = isOzoneStep && !readOnly && ozStage !== 'cleared';

  // ── UV add-on detection (step 7) ──────────────────────────────────
  // The crew shouldn't guess whether the booking bought UV: read the
  // booking's add-ons off the job and pre-set the skip toggle to match.
  const [uvIncluded, setUvIncluded] = useState<boolean | null>(null);
  useEffect(() => {
    if (!isUvStep) return;
    (async () => {
      try {
        const r = await jobAPI.getJob(jobId) as any;
        const addons: string[] = r.data?.job?.addons || [];
        const included = addons.some((a) => /uv/i.test(String(a)));
        setUvIncluded(included);
        if (!included && !readOnly) setData((d) => ({ ...d, uv_skipped: true }));
      } catch (_) { /* unknown — leave the manual toggle as-is */ }
    })();
  }, []);

  // Axios interceptor flattens errors to { message, status }; raw axios errors
  // keep response.data — read both so 423 gate info survives either way.
  const gateInfo = (e: any) => {
    const d = e?.response?.data || e || {};
    return {
      status: (e?.status ?? e?.response?.status) as number | undefined,
      message: (d.message as string) || 'Not allowed yet',
      retry: d.retry_after_minutes as number | undefined,
    };
  };

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
              extra_photo_urls: Array.isArray(stepRow.extra_photo_urls)
                ? stepRow.extra_photo_urls
                : (typeof stepRow.extra_photo_urls === 'string' ? JSON.parse(stepRow.extra_photo_urls || '[]') : []),
              video_url: stepRow.video_url || '',
              confined_entry: !!stepRow.confined_entry,
              harness_attached: !!stepRow.harness_attached,
              volume_drained_litres: stepRow.volume_drained_litres != null ? String(stepRow.volume_drained_litres) : '',
              water_before_litres: stepRow.water_before_litres != null ? String(stepRow.water_before_litres) : '',
              water_after_litres: stepRow.water_after_litres != null ? String(stepRow.water_after_litres) : '',
              cleanup_tools_loaded: !!stepRow.cleanup_checklist?.tools_loaded,
              cleanup_manhole_secured: !!stepRow.cleanup_checklist?.manhole_secured,
              cleanup_no_water_pooling: !!stepRow.cleanup_checklist?.no_water_pooling,
              cleanup_ppe_waste_bagged: !!stepRow.cleanup_checklist?.ppe_waste_bagged,
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

  // Prefill saved numeric readings for this step's timing (steps 1 + 8).
  useEffect(() => {
    if (!isWaterStep) return;
    (async () => {
      try {
        const res = await fieldAPI.getReadings(jobId) as any;
        const latest: any[] = res.data?.latest || [];
        setMeters((m) => {
          const next = { ...m };
          for (const r of latest) {
            if (r.timing !== meterTiming || !next[r.param]) continue;
            next[r.param] = {
              ...next[r.param],
              value: String(r.value),
              saved: true,
              bis: r.bis_compliant ?? null,
              delta: r.delta_vs_before != null ? Number(r.delta_vs_before) : null,
              safe: r.param === 'dissolved_o3_final' ? Number(r.value) < 0.05 : null,
            };
          }
          return next;
        });
      } catch (_) {}
    })();
  }, []);

  // Angle-match hint (step 8): show Phase 1's before-photo so the agent can
  // line up the after-shot at the same angle.
  useEffect(() => {
    if (stepNumber !== 8 || readOnly) return;
    (async () => {
      try {
        const res = await complianceAPI.getChecklist(jobId) as any;
        const s1 = res.data?.checklist?.find((s: any) => s.step_number === 1)?.data;
        if (s1?.photo_before_url) setBeforeHint(s1.photo_before_url);
      } catch (_) {}
    })();
  }, []);

  // Restore the ozone session stage on mount (step 6).
  useEffect(() => {
    if (!isOzoneStep || readOnly) return;
    (async () => {
      try {
        const res = await fieldAPI.getOzoneSession(jobId) as any;
        const s = res.data?.session;
        if (!s) { setOzStage('checklist'); return; }
        if (!s.stopped_at) {
          const totalMs = (Number(s.target_duration_min) + Number(s.extended_duration_min || 0)) * 60000;
          setOzEndsAt(new Date(s.started_at).getTime() + totalMs);
          setOzStage('running');
          return;
        }
        if (!s.fan_started_at) {
          setOzNote('Start the 12V fan at the manhole opening now.');
          setOzStage('stopped');
          return;
        }
        setAmbientPass(s.ambient_o3_result === 'PASS');
        setDissolvedPass(s.dissolved_o3_result === 'PASS');
        setOzStage(s.safety_passed ? 'cleared' : 'safety');
      } catch (_) {
        setOzStage('checklist');
      }
    })();
  }, []);

  // Live mm:ss countdown while ozone runs.
  useEffect(() => {
    if (ozStage !== 'running' || !ozEndsAt) return;
    const tick = () => setOzLeft(Math.max(0, Math.ceil((ozEndsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [ozStage, ozEndsAt]);

  // ── Meter reading save (steps 1 + 8) ──────────────────────────────
  const saveMeter = async (param: string) => {
    const row = meters[param];
    const v = Number(row?.value);
    if (!row?.value.trim() || !Number.isFinite(v)) {
      return Alert.alert('Invalid Value', 'Enter a numeric reading first.');
    }
    setMeters((m) => ({ ...m, [param]: { ...m[param], saving: true, error: '' } }));
    try {
      const res = await fieldAPI.submitReading(jobId, {
        param, timing: meterTiming, value: v,
        gps_lat: data.gps_lat || undefined,
        gps_lng: data.gps_lng || undefined,
      }) as any;
      const d = res.data || {};
      setMeters((m) => ({
        ...m,
        [param]: {
          ...m[param], saving: false, saved: true, error: '',
          bis: d.bis_compliant ?? null,
          delta: d.delta_vs_before != null ? Number(d.delta_vs_before) : null,
          capped: !!d.certificate_grade_capped,
          safe: param === 'dissolved_o3_final' ? d.o3_final_safe !== false : null,
        },
      }));
    } catch (e: any) {
      const g = gateInfo(e);
      if (g.status === 423) {
        // Hard gate — for dissolved_o3_final this means NOT SAFE yet.
        const extra = g.retry != null ? ` Retry in ~${g.retry} min.` : '';
        setMeters((m) => ({
          ...m,
          [param]: {
            ...m[param], saving: false, error: g.message + extra,
            safe: param === 'dissolved_o3_final' ? false : m[param].safe,
          },
        }));
      } else {
        setMeters((m) => ({ ...m, [param]: { ...m[param], saving: false } }));
        Alert.alert('Error', g.message);
      }
    }
  };

  // ── Ozone session handlers (step 6) ───────────────────────────────
  const confirmOzoneSafety = async () => {
    if (!ozChecks.respirators || !ozChecks.monitors || !ozChecks.bystanders_clear || !ozChecks.customer_notified) {
      return Alert.alert('Checklist Incomplete', 'All 4 safety checks must be on before starting ozone.');
    }
    setOzBusy(true);
    try {
      await fieldAPI.preOzoneChecklist(jobId, ozChecks);
      setOzStage('start');
    } catch (e: any) {
      const g = gateInfo(e);
      Alert.alert(g.status === 423 ? 'Blocked' : 'Error', g.message);
    } finally { setOzBusy(false); }
  };

  const startOzoneTreatment = async () => {
    setOzBusy(true);
    setOzError('');
    try {
      const res = await fieldAPI.startOzone(jobId, {}) as any;
      const d = res.data || {};
      const secs = Number(d.countdown_seconds) || Number(d.target_duration_min || 15) * 60;
      setOzEndsAt(Date.now() + secs * 1000);
      setOzStage('running');
    } catch (e: any) {
      const g = gateInfo(e);
      Alert.alert(g.status === 423 ? 'Blocked' : 'Error', g.message);
    } finally { setOzBusy(false); }
  };

  const extendOzoneTimer = async () => {
    if (!extendReason.trim()) {
      return Alert.alert('Reason Required', 'Enter a short reason for extending the cycle.');
    }
    setOzBusy(true);
    try {
      await fieldAPI.extendOzone(jobId, 10, extendReason.trim());
      setOzEndsAt((t) => t + 10 * 60000);
      setExtendReason('');
    } catch (e: any) {
      const g = gateInfo(e);
      Alert.alert(g.status === 423 ? 'Blocked' : 'Error', g.message);
    } finally { setOzBusy(false); }
  };

  const stopOzoneGenerator = async () => {
    setOzBusy(true);
    setOzError('');
    try {
      const res = await fieldAPI.stopOzone(jobId) as any;
      const d = res.data || {};
      setOzNote(d.instruction || 'Start the 12V fan at the manhole opening now.');
      setOzStage('stopped');
    } catch (e: any) {
      const g = gateInfo(e);
      if (g.status === 423) {
        setOzError(g.retry != null ? `${g.retry} min remaining before you can stop the generator.` : g.message);
      } else {
        Alert.alert('Error', g.message);
      }
    } finally { setOzBusy(false); }
  };

  const confirmFanRunning = async () => {
    setOzBusy(true);
    try {
      await fieldAPI.confirmFan(jobId);
      setOzNote('Venting in progress — keep the 12V fan running for 15 minutes before safety readings.');
      setOzStage('safety');
    } catch (e: any) {
      const g = gateInfo(e);
      Alert.alert(g.status === 423 ? 'Blocked' : 'Error', g.message);
    } finally { setOzBusy(false); }
  };

  const submitSafetyReading = async (kind: 'ambient' | 'dissolved') => {
    const raw = kind === 'ambient' ? ambientVal : dissolvedVal;
    const v = Number(raw);
    if (!raw.trim() || !Number.isFinite(v)) {
      return Alert.alert('Invalid Value', 'Enter a numeric reading first.');
    }
    setSafetyBusy(kind);
    setOzError('');
    try {
      const res = await fieldAPI.ozoneSafetyReading(jobId, kind, v) as any;
      const d = res.data || {};
      if (kind === 'ambient') setAmbientPass(true); else setDissolvedPass(true);
      if (d.refill_unlocked === true) setOzStage('cleared');
    } catch (e: any) {
      const g = gateInfo(e);
      if (g.status === 423) {
        setOzError(g.message + (g.retry != null ? ` Retry in ~${g.retry} min.` : ''));
        if (kind === 'ambient') setAmbientPass(false); else setDissolvedPass(false);
      } else {
        Alert.alert('Error', g.message);
      }
    } finally { setSafetyBusy(''); }
  };

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

  const captureMainPhoto = async () => {
    const uri = await capturePhoto();
    if (!uri) return; // cancelled
    await uploadPhoto(uri);
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

  // Extra photo slots (steps 1 + 8) — live camera on every platform, retake on tap.
  const captureExtraPhoto = async (slot: number) => {
    const uri = await capturePhoto();
    if (!uri) return; // cancelled
    const setSlot = (url: string) => setData((d) => {
      const next = [...d.extra_photo_urls];
      next[slot] = url;
      return { ...d, extra_photo_urls: next };
    });
    setExtraUploading(slot);
    try {
      const res = await uploadAPI.uploadPhoto(uri, 'compliance') as any;
      setSlot(res.data?.url || res.url || uri);
    } catch (_) {
      // Keep the local URI so the 3-photo rule still validates, queue for retry.
      setSlot(uri);
      enqueuePendingUpload(uri, jobId, 'compliance').catch(() => {});
      Alert.alert('Photo Saved Offline', 'Your photo will upload when your connection improves.');
    } finally {
      setExtraUploading(null);
    }
  };

  // Optional 15-30s walkthrough video (steps 1 + 8, native only).
  const captureVideo = async () => {
    if (Platform.OS === 'web') return;
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to record video');
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], videoMaxDuration: 30 });
      if (result.canceled || !result.assets?.[0]) return;
      setVideoUploading(true);
      const res = await uploadAPI.uploadPhoto(result.assets[0].uri, 'videos') as any;
      const url = res.data?.url || res.url;
      if (url) setField('video_url', url);
      else Alert.alert('Upload Failed', 'Could not upload the video. Try again.');
    } catch (_) {
      Alert.alert('Upload Failed', 'Could not upload the video. Try again.');
    } finally {
      setVideoUploading(false);
    }
  };

  // Signature pad result (native): base64 data-URL → cache file → upload.
  const handleSignature = async (sig: string) => {
    setSigOpen(false);
    if (!sig) return;
    setSigUploading(true);
    try {
      const base64 = sig.replace(/^data:image\/\w+;base64,/, '');
      const fs = require('expo-file-system/legacy');
      const fileUri = `${fs.cacheDirectory}signature_${jobId}_${Date.now()}.png`;
      await fs.writeAsStringAsync(fileUri, base64, { encoding: fs.EncodingType.Base64 });
      const res = await uploadAPI.uploadPhoto(fileUri, 'signatures') as any;
      const url = res.data?.url || res.url;
      if (url) setField('client_signature_url', url);
      else Alert.alert('Upload Failed', 'Could not upload the signature. Try again.');
    } catch (_) {
      Alert.alert('Upload Failed', 'Could not upload the signature. Try again.');
    } finally {
      setSigUploading(false);
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
    // Steps 1 + 8 — 3-photo proof (main + 2 extras) + optional video
    extra_photo_urls: isWaterStep ? data.extra_photo_urls.filter(Boolean) : undefined,
    video_url: isWaterStep && data.video_url ? data.video_url : undefined,
    // Step 2
    water_level_pct: data.water_level_pct || undefined,
    tank_condition: data.tank_condition || undefined,
    volume_drained_litres:
      stepNumber === 2 && data.volume_drained_litres !== ''
        ? parseInt(data.volume_drained_litres, 10)
        : undefined,
    // Step 3
    scrub_completed: stepNumber === 3 ? data.scrub_completed : undefined,
    confined_entry: stepNumber === 3 ? data.confined_entry : undefined,
    harness_attached: stepNumber === 3 ? data.harness_attached : undefined,
    // Step 4
    rinse_duration: data.rinse_duration || undefined,
    water_before_litres:
      stepNumber === 4 && data.water_before_litres !== ''
        ? parseInt(data.water_before_litres, 10)
        : undefined,
    water_after_litres:
      stepNumber === 4 && data.water_after_litres !== ''
        ? parseInt(data.water_after_litres, 10)
        : undefined,
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
    cleanup_checklist: stepNumber === 8 ? {
      tools_loaded: data.cleanup_tools_loaded,
      manhole_secured: data.cleanup_manhole_secured,
      no_water_pooling: data.cleanup_no_water_pooling,
      ppe_waste_bagged: data.cleanup_ppe_waste_bagged,
    } : undefined,
    completed: true,
  });

  const handleSubmit = async () => {
    // UV skipped bypasses photo + field requirements (backend mirrors this).
    const isSkipping = isUvStep && data.uv_skipped;

    if (!isSkipping) {
      if ((stepNumber === 1 || stepNumber === 8) && metersSaved < METER_ROWS.length) {
        const missing = METER_ROWS
          .filter((r) => !meters[meterParamFor(r.param)]?.saved)
          .map((r) => r.label)
          .join(', ');
        return Alert.alert(
          'Meter Readings Required',
          `Save all 5 meter readings before completing this phase — tap Save next to each row.\n\nStill missing: ${missing}.`,
        );
      }
      if (!data[photoField]) {
        return Alert.alert('Photo Required', `Please capture: "${stepInfo?.mandatoryPhotoLabel}"`);
      }
      if (isWaterStep && data.extra_photo_urls.filter(Boolean).length < 2) {
        return Alert.alert(
          'More Photos Needed',
          'This phase needs 3 photos total — capture the 2 additional shots (walls/floor + tank exterior).',
        );
      }
      if (stepNumber === 3 && data.confined_entry && !data.harness_attached) {
        return Alert.alert(
          'Harness Required',
          'Confined-space entry declared — toggle on "Safety harness attached" before saving.',
        );
      }
      if (stepNumber === 2) {
        const vol = parseInt(data.volume_drained_litres, 10);
        if (!Number.isFinite(vol) || vol <= 0) {
          return Alert.alert(
            'Volume Required',
            'Enter "Volume drained (litres)" — a whole number greater than 0.',
          );
        }
      }
      if (stepNumber === 4) {
        const before = parseInt(data.water_before_litres, 10);
        const after = parseInt(data.water_after_litres, 10);
        if (!Number.isFinite(before) || !Number.isFinite(after)) {
          return Alert.alert(
            'Tank Readings Required',
            'Enter the van tank water readings (litres) before and after the rinse.',
          );
        }
        if (after > before) {
          return Alert.alert(
            'Check Readings',
            'The after-rinse reading cannot be higher than the before-rinse reading.',
          );
        }
      }
      if (Platform.OS !== 'web' && data.gps_lat === 0 && data.gps_lng === 0) {
        return Alert.alert('GPS Required', 'GPS location not captured. Please enable location and try again.');
      }
    }

    const payload = buildPayload();
    setLoading(true);
    try {
      await complianceAPI.logStep(payload);
      await AsyncStorage.removeItem(draftKey);
      Alert.alert(
        isSkipping ? 'Phase Skipped' : 'Phase Saved',
        isSkipping
          ? 'UV step was skipped (not in this booking).'
          : `${stepInfo?.name || 'Phase'} logged successfully. Customer notified.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      const g = gateInfo(err);
      if (g.status === undefined) {
        // Pure network failure (no server verdict) — queue and sync later.
        // 4xx/423 are server decisions and must NOT be queued.
        await enqueueStep(payload);
        Alert.alert(
          'Saved Offline',
          'No connection — this phase was saved offline and will sync from the Job List.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      } else if (g.status === 423) {
        Alert.alert('Blocked', g.message + (g.retry != null ? ` Retry in ~${g.retry} min.` : ''));
      } else {
        Alert.alert('Error', g.message || 'Could not save phase');
      }
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
        <WebContainer variant="narrow">
        {/* GPS Status — DECIMAL columns come back as STRINGS from Postgres in
            read-only mode, so always coerce with Number() before .toFixed. */}
        <View style={[styles.gpsRow, Number(data.gps_lat) ? styles.gpsOk : styles.gpsWaiting]}>
          <View style={styles.gpsContent}>
            <MapPin size={16} weight="fill" color={Number(data.gps_lat) ? C.success : C.warning} />
            <Text style={styles.gpsText}>
              {data.gps_lat != null && Number(data.gps_lat)
                ? `GPS: ${Number(data.gps_lat).toFixed(4)}, ${data.gps_lng != null ? Number(data.gps_lng).toFixed(4) : '—'}`
                : 'Getting GPS location...'}
            </Text>
          </View>
          {!Number(data.gps_lat) && !readOnly && (
            <TouchableOpacity onPress={getLocation}>
              <Text style={styles.gpsRetry}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Meter Readings (steps 1 + 8) ─────────────────────────────
            Numeric water-quality readings that back Gates G-4/G-9/G-10.
            Rendered OUTSIDE the read-only lock: readings are append-only
            server-side, so a crew who saved the phase without them can
            still add the missing ones here without redoing the step. */}
        {isWaterStep && (
          <View style={styles.meterCard}>
            <View style={styles.meterHeader}>
              <TestTube size={16} weight="fill" color={C.primary} />
              <Text style={styles.meterTitle}>
                Meter Readings ({meterTiming === 'before' ? 'before service' : 'after service'})
              </Text>
              <Text style={[
                styles.meterCount,
                { color: metersSaved >= METER_ROWS.length ? C.success : C.warning },
              ]}>
                {metersSaved}/{METER_ROWS.length} saved
              </Text>
            </View>
            <Text style={styles.meterHint}>
              Enter the actual meter value for each parameter and tap Save. All 5 are
              required to complete this phase.
            </Text>
            {METER_ROWS.map((r) => {
              const key = meterParamFor(r.param);
              const row = meters[key] || emptyMeterRow;
              return (
                <View key={key} style={styles.meterRowWrap}>
                  <View style={styles.meterRow}>
                    <View style={styles.meterLabelCol}>
                      <Text style={styles.meterLabel}>{r.label}</Text>
                      <Text style={styles.meterUnit}>{r.unit}</Text>
                    </View>
                    <TextInput
                      style={[styles.meterInput, row.saved && styles.meterInputSaved]}
                      value={row.value}
                      onChangeText={(t) =>
                        setMeters((m) => ({
                          ...m,
                          [key]: { ...m[key], value: t, saved: false, error: '' },
                        }))
                      }
                      keyboardType="decimal-pad"
                      placeholder="0.0"
                      placeholderTextColor={C.muted}
                    />
                    <TouchableOpacity
                      style={[styles.meterSaveBtn, row.saved && styles.meterSaveBtnDone]}
                      onPress={() => saveMeter(key)}
                      disabled={row.saving || row.saved}
                      activeOpacity={0.7}
                    >
                      {row.saving ? (
                        <ActivityIndicator size="small" color={C.primaryFg} />
                      ) : row.saved ? (
                        <Check size={16} weight="bold" color={C.primaryFg} />
                      ) : (
                        <Text style={styles.meterSaveText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {row.saved && (row.bis != null || row.delta != null) && (
                    <Text style={styles.meterMeta}>
                      {row.bis != null && (row.bis ? 'BIS compliant ✓' : 'Outside BIS range')}
                      {row.bis != null && row.delta != null ? ' · ' : ''}
                      {row.delta != null && `Δ vs before: ${row.delta > 0 ? '+' : ''}${row.delta}`}
                    </Text>
                  )}
                  {row.capped && (
                    <Text style={styles.meterWarn}>
                      ORP below 650 mV — certificate will be capped at Silver grade.
                    </Text>
                  )}
                  {key === 'dissolved_o3_final' && row.safe === false && (
                    <Text style={styles.meterError}>
                      Dissolved O₃ still above safe limit — wait and re-test before handover.
                    </Text>
                  )}
                  {key === 'dissolved_o3_final' && row.saved && row.safe !== false && (
                    <Text style={styles.meterSafe}>Water safe for use ✓</Text>
                  )}
                  {!!row.error && <Text style={styles.meterError}>{row.error}</Text>}
                </View>
              );
            })}
          </View>
        )}

        {/* ── Ozone Session (step 6, gates G-5→G-8) ────────────────────
            Staged flow the backend enforces before the step can be saved:
            pre-ozone checklist → run (min-duration timer) → stop → fan/vent
            → ambient + dissolved O₃ safety readings. */}
        {showOzonePanel && (
          <View style={styles.ozCard}>
            <View style={styles.meterHeader}>
              <Lightning size={16} weight="fill" color={C.primary} />
              <Text style={styles.meterTitle}>Ozone Session</Text>
              <Text style={styles.ozStageChip}>
                {({ loading: '…', checklist: 'Step 1/4 · Safety', start: 'Step 2/4 · Start',
                   running: 'Step 2/4 · Running', stopped: 'Step 3/4 · Venting',
                   safety: 'Step 4/4 · Readings', cleared: 'Cleared' } as any)[ozStage]}
              </Text>
            </View>

            {ozStage === 'loading' && <ActivityIndicator color={C.primary} style={{ marginVertical: 16 }} />}

            {ozStage === 'checklist' && (
              <>
                <Text style={styles.meterHint}>
                  Confirm all 4 safety checks to unlock the ozone generator.
                </Text>
                {([
                  ['respirators', 'PPE respirators worn (crew)'],
                  ['monitors', 'O₃ monitors switched on'],
                  ['bystanders_clear', 'Bystanders clear of the area'],
                  ['customer_notified', 'Customer informed — keep clear'],
                ] as const).map(([key, label]) => (
                  <View key={key} style={styles.ozCheckRow}>
                    <Text style={styles.ozCheckLabel}>{label}</Text>
                    <Switch
                      value={(ozChecks as any)[key]}
                      onValueChange={(v) => setOzChecks((c) => ({ ...c, [key]: v }))}
                      thumbColor={(ozChecks as any)[key] ? C.primary : '#fff'}
                      trackColor={{ false: C.border, true: C.primaryBg }}
                    />
                  </View>
                ))}
                <TouchableOpacity
                  style={[styles.ozBtn, ozBusy && styles.submitBtnDisabled]}
                  onPress={confirmOzoneSafety} disabled={ozBusy} activeOpacity={0.8}
                >
                  {ozBusy ? <ActivityIndicator color={C.primaryFg} /> :
                    <Text style={styles.ozBtnText}>Confirm Safety Checklist</Text>}
                </TouchableOpacity>
              </>
            )}

            {ozStage === 'start' && (
              <>
                <Text style={styles.meterHint}>
                  Safety confirmed. Start the generator — the minimum run time is set
                  by tank size and the Stop button stays locked until it elapses.
                </Text>
                <TouchableOpacity
                  style={[styles.ozBtn, ozBusy && styles.submitBtnDisabled]}
                  onPress={startOzoneTreatment} disabled={ozBusy} activeOpacity={0.8}
                >
                  {ozBusy ? <ActivityIndicator color={C.primaryFg} /> :
                    <Text style={styles.ozBtnText}>Start Ozone Generator</Text>}
                </TouchableOpacity>
              </>
            )}

            {ozStage === 'running' && (
              <>
                <Text style={styles.ozTimer}>{fmtMMSS(ozLeft)}</Text>
                <Text style={styles.meterHint}>
                  {ozLeft > 0 ? 'Minimum ozone time remaining — generator must keep running.'
                              : 'Minimum time reached — you can stop the generator.'}
                </Text>
                <TouchableOpacity
                  style={[styles.ozBtn, (ozBusy || ozLeft > 0) && styles.submitBtnDisabled]}
                  onPress={stopOzoneGenerator} disabled={ozBusy} activeOpacity={0.8}
                >
                  {ozBusy ? <ActivityIndicator color={C.primaryFg} /> :
                    <Text style={styles.ozBtnText}>Stop Generator</Text>}
                </TouchableOpacity>
                <View style={styles.ozExtendRow}>
                  <TextInput
                    style={[styles.meterInput, { flex: 1 }]}
                    value={extendReason} onChangeText={setExtendReason}
                    placeholder="Reason to extend +10 min (optional)"
                    placeholderTextColor={C.muted}
                  />
                  <TouchableOpacity
                    style={[styles.meterSaveBtn, ozBusy && styles.submitBtnDisabled]}
                    onPress={extendOzoneTimer} disabled={ozBusy} activeOpacity={0.7}
                  >
                    <Text style={styles.meterSaveText}>+10m</Text>
                  </TouchableOpacity>
                </View>
                {!!ozError && <Text style={styles.meterError}>{ozError}</Text>}
              </>
            )}

            {ozStage === 'stopped' && (
              <>
                <Text style={styles.ozNoteText}>{ozNote || 'Start the 12V fan at the manhole opening now.'}</Text>
                <TouchableOpacity
                  style={[styles.ozBtn, ozBusy && styles.submitBtnDisabled]}
                  onPress={confirmFanRunning} disabled={ozBusy} activeOpacity={0.8}
                >
                  {ozBusy ? <ActivityIndicator color={C.primaryFg} /> :
                    <Text style={styles.ozBtnText}>Fan is Running — Start Venting</Text>}
                </TouchableOpacity>
              </>
            )}

            {ozStage === 'safety' && (
              <>
                {!!ozNote && <Text style={styles.ozNoteText}>{ozNote}</Text>}
                <Text style={styles.meterHint}>
                  Both readings must PASS to clear the session (ambient &lt;0.1 ppm,
                  dissolved &lt;0.05 mg/L).
                </Text>
                {([
                  ['ambient', 'Ambient O₃ (ppm)', ambientVal, setAmbientVal, ambientPass],
                  ['dissolved', 'Dissolved O₃ (mg/L)', dissolvedVal, setDissolvedVal, dissolvedPass],
                ] as any[]).map(([kind, label, val, setVal, passed]) => (
                  <View key={kind} style={styles.meterRowWrap}>
                    <View style={styles.meterRow}>
                      <View style={styles.meterLabelCol}>
                        <Text style={styles.meterLabel}>{label}</Text>
                        {passed && <Text style={styles.meterSafe}>PASS ✓</Text>}
                      </View>
                      <TextInput
                        style={[styles.meterInput, passed && styles.meterInputSaved]}
                        value={val} onChangeText={setVal}
                        keyboardType="decimal-pad" placeholder="0.00"
                        placeholderTextColor={C.muted}
                      />
                      <TouchableOpacity
                        style={[styles.meterSaveBtn, passed && styles.meterSaveBtnDone]}
                        onPress={() => submitSafetyReading(kind)}
                        disabled={safetyBusy === kind || passed} activeOpacity={0.7}
                      >
                        {safetyBusy === kind ? <ActivityIndicator size="small" color={C.primaryFg} /> :
                          passed ? <Check size={16} weight="bold" color={C.primaryFg} /> :
                          <Text style={styles.meterSaveText}>Save</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                {!!ozError && <Text style={styles.meterError}>{ozError}</Text>}
              </>
            )}
          </View>
        )}
        {isOzoneStep && !readOnly && ozStage === 'cleared' && (
          <View style={styles.ozClearedRow}>
            <CheckCircle size={16} weight="fill" color={C.success} />
            <Text style={styles.ozClearedText}>Ozone session cleared — log the phase below.</Text>
          </View>
        )}

        {/* Read-only mode: lock every input below this point so the agent can
            review what was entered without accidentally tapping anything. The
            submit button further down is OUTSIDE this lock - it shows
            "Back to checklist" instead of "Save & Notify". */}
        <View pointerEvents={readOnly ? 'none' : 'auto'}>

        {/* UV skip toggle (only on step 7, rendered before mandatory-photo) */}
        {isUvStep && uvIncluded === true && (
          <View style={styles.uvIncludedRow}>
            <CheckCircle size={16} weight="fill" color={C.success} />
            <Text style={styles.uvIncludedText}>
              UV Sterilization Pass is INCLUDED in this booking — complete this phase, do not skip.
            </Text>
          </View>
        )}
        {isUvStep && uvIncluded === false && (
          <Text style={styles.uvNotIncludedText}>
            Not purchased in this booking — auto-skipped. Toggle off only if the
            customer added UV on-site.
          </Text>
        )}
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
            {/* Angle-match hint (step 8) — Phase 1's before-photo as reference */}
            {stepNumber === 8 && !!beforeHint && (
              <View style={styles.angleCard}>
                <Image source={{ uri: beforeHint }} style={styles.angleThumb} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.angleTitle}>Match this angle</Text>
                  <Text style={styles.angleSub}>
                    Line up your after-photo with the Phase 1 before-photo for a clean comparison.
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.labelRow}>
              <Camera size={16} weight="regular" color={C.foreground} />
              <Text style={styles.label}>Mandatory Photo: {stepInfo?.mandatoryPhotoLabel}</Text>
            </View>
            <TouchableOpacity style={styles.photoBtn} onPress={captureMainPhoto} activeOpacity={0.7}>
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

            {/* Steps 1 + 8: two extra photo slots (3 photos total) + optional video */}
            {isWaterStep && (
              <>
                <View style={styles.labelRow}>
                  <Camera size={16} weight="regular" color={C.foreground} />
                  <Text style={styles.label}>Additional photos (2 required)</Text>
                </View>
                <Text style={styles.extraHint}>
                  Water surface, walls/floor and tank exterior — 3 photos total with the main shot.
                </Text>
                <View style={styles.extraRow}>
                  {[0, 1].map((slot) => (
                    <TouchableOpacity
                      key={slot}
                      style={styles.extraSlot}
                      onPress={() => captureExtraPhoto(slot)}
                      disabled={extraUploading !== null}
                      activeOpacity={0.7}
                    >
                      {extraUploading === slot ? (
                        <ActivityIndicator color={C.primary} />
                      ) : data.extra_photo_urls[slot] ? (
                        <Image source={{ uri: data.extra_photo_urls[slot] }} style={styles.extraThumb} />
                      ) : (
                        <View style={styles.photoPlaceholder}>
                          <Camera size={22} weight="regular" color={C.muted} />
                          <Text style={styles.extraSlotLabel}>Photo {slot + 2}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
                {Platform.OS !== 'web' && (
                  <TouchableOpacity
                    style={styles.videoBtn}
                    onPress={captureVideo}
                    disabled={videoUploading}
                    activeOpacity={0.7}
                  >
                    {videoUploading ? (
                      <ActivityIndicator size="small" color={C.primary} />
                    ) : data.video_url ? (
                      <>
                        <CheckCircle size={16} weight="fill" color={C.success} />
                        <Text style={[styles.videoBtnText, { color: C.success }]}>Video attached — tap to retake</Text>
                      </>
                    ) : (
                      <>
                        <Camera size={16} weight="regular" color={C.primary} />
                        <Text style={styles.videoBtnText}>Add 15-30s video (optional)</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
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
                  <SectionHeader icon={<Drop size={16} weight="regular" color={C.foreground} />} label="Volume drained (litres)" styles={styles} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 950"
                    keyboardType="number-pad"
                    value={data.volume_drained_litres}
                    onChangeText={(v) => setField('volume_drained_litres', v.replace(/[^0-9]/g, ''))}
                    placeholderTextColor={C.muted}
                  />
                </View>
              );

            case 'scrub':
              return (
                <View key={b}>
                  <ToggleRow label="Mechanical scrub & rotary jet completed?" value={data.scrub_completed} onToggle={(v) => setField('scrub_completed', v)} styles={styles} C={C} />
                  <ToggleRow
                    label="Confined-space entry?"
                    value={data.confined_entry}
                    onToggle={(v) => setData((d) => ({ ...d, confined_entry: v, harness_attached: v ? d.harness_attached : false }))}
                    styles={styles} C={C}
                  />
                  {data.confined_entry && (
                    <>
                      <ToggleRow label="Safety harness attached" value={data.harness_attached} onToggle={(v) => setField('harness_attached', v)} styles={styles} C={C} />
                      {!data.harness_attached && (
                        <View style={styles.harnessWarnRow}>
                          <Warning size={14} weight="fill" color={C.warning} />
                          <Text style={styles.harnessWarnText}>
                            Harness is mandatory for confined-space entry — the phase will be rejected without it.
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              );

            case 'rinse': {
              const wBefore = parseInt(data.water_before_litres, 10);
              const wAfter = parseInt(data.water_after_litres, 10);
              const waterUsed =
                Number.isFinite(wBefore) && Number.isFinite(wAfter) && wAfter <= wBefore
                  ? wBefore - wAfter
                  : null;
              return (
                <View key={b}>
                  <SectionHeader icon={<Clock size={16} weight="regular" color={C.foreground} />} label="High-pressure rinse duration" styles={styles} />
                  <BucketRow options={DURATION_BUCKETS} value={data.rinse_duration} onPick={(v) => setField('rinse_duration', v)} styles={styles} C={C} />
                  <SectionHeader icon={<Drop size={16} weight="regular" color={C.foreground} />} label="Van tank before rinse (litres)" styles={styles} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 500"
                    keyboardType="number-pad"
                    value={data.water_before_litres}
                    onChangeText={(v) => setField('water_before_litres', v.replace(/[^0-9]/g, ''))}
                    placeholderTextColor={C.muted}
                  />
                  <SectionHeader icon={<Drop size={16} weight="regular" color={C.foreground} />} label="Van tank after rinse (litres)" styles={styles} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 380"
                    keyboardType="number-pad"
                    value={data.water_after_litres}
                    onChangeText={(v) => setField('water_after_litres', v.replace(/[^0-9]/g, ''))}
                    placeholderTextColor={C.muted}
                  />
                  {waterUsed != null && (
                    <Text style={styles.waterUsedText}>Water used: {waterUsed} L</Text>
                  )}
                </View>
              );
            }

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
                  <SectionHeader icon={<PencilSimple size={16} weight="regular" color={C.foreground} />} label="Client signature" styles={styles} />
                  {Platform.OS === 'web' ? (
                    // Web fallback — signature pad is native-only.
                    <TextInput
                      style={styles.input}
                      placeholder="Paste/scan signature image URL or capture handover"
                      value={data.client_signature_url}
                      onChangeText={(v) => setField('client_signature_url', v)}
                      placeholderTextColor={C.muted}
                    />
                  ) : (
                    <TouchableOpacity
                      style={[styles.sigBtn, !!data.client_signature_url && styles.sigBtnDone]}
                      onPress={() => setSigOpen(true)}
                      disabled={sigUploading}
                      activeOpacity={0.7}
                    >
                      {sigUploading ? (
                        <ActivityIndicator size="small" color={C.primary} />
                      ) : data.client_signature_url ? (
                        <>
                          <CheckCircle size={18} weight="fill" color={C.success} />
                          <Text style={[styles.sigBtnText, { color: C.success }]}>Signed ✓ — tap to redo</Text>
                        </>
                      ) : (
                        <>
                          <PencilSimple size={18} weight="regular" color={C.primary} />
                          <Text style={styles.sigBtnText}>Capture signature</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  <SectionHeader icon={<ListChecks size={16} weight="regular" color={C.foreground} />} label="Site clean-up (all 4 required)" styles={styles} />
                  <ToggleRow label="All tools loaded back in van"  value={data.cleanup_tools_loaded}     onToggle={(v) => setField('cleanup_tools_loaded', v)}     styles={styles} C={C} />
                  <ToggleRow label="Manhole cover secured"          value={data.cleanup_manhole_secured}  onToggle={(v) => setField('cleanup_manhole_secured', v)}  styles={styles} C={C} />
                  <ToggleRow label="No water pooling left on site"  value={data.cleanup_no_water_pooling} onToggle={(v) => setField('cleanup_no_water_pooling', v)} styles={styles} C={C} />
                  <ToggleRow label="PPE waste bagged & removed"     value={data.cleanup_ppe_waste_bagged} onToggle={(v) => setField('cleanup_ppe_waste_bagged', v)} styles={styles} C={C} />

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
            disabled={loading || uploading || extraUploading !== null || videoUploading || sigUploading}
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
        </WebContainer>
      </ScrollView>

      {/* Signature pad modal (native only — web keeps the URL TextInput) */}
      {Platform.OS !== 'web' && !!SignatureCanvas && (
        <Modal visible={sigOpen} animationType="slide" onRequestClose={() => setSigOpen(false)}>
          <View style={styles.sigModalRoot}>
            <View style={styles.sigModalHeader}>
              <Text style={styles.sigModalTitle}>Client Signature</Text>
              <TouchableOpacity onPress={() => setSigOpen(false)} style={styles.sigModalClose}>
                <X size={20} weight="bold" color={C.foreground} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sigModalHint}>Ask the client to sign below, then tap Save.</Text>
            <View style={styles.sigCanvasWrap}>
              <SignatureCanvas
                onOK={handleSignature}
                onEmpty={() => Alert.alert('Empty Signature', 'Please sign before saving.')}
                descriptionText=""
                clearText="Clear"
                confirmText="Save"
                penColor="#111827"
                backgroundColor="#FFFFFF"
                webStyle={SIG_WEB_STYLE}
              />
            </View>
          </View>
        </Modal>
      )}
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

  // Extra photo slots (steps 1 + 8)
  extraHint: { fontSize: 12, color: C.muted, marginBottom: 10, lineHeight: 17 },
  extraRow: { flexDirection: 'row', gap: 10 },
  extraSlot: {
    flex: 1, minHeight: 110,
    backgroundColor: C.surfaceElevated, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed',
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
  },
  extraThumb: { width: '100%', height: 110, resizeMode: 'cover' },
  extraSlotLabel: { fontSize: 12, color: C.muted, fontWeight: '600', marginTop: 6 },
  videoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primaryBg, borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14, marginTop: 10,
  },
  videoBtnText: { fontSize: 13, fontWeight: '700', color: C.primary },

  // Angle-match hint (step 8)
  angleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.primaryBg, borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: C.primary, marginTop: 16, marginBottom: -6,
  },
  angleThumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: C.surfaceElevated },
  angleTitle: { fontSize: 13, fontWeight: '800', color: C.primary },
  angleSub: { fontSize: 11, color: C.muted, marginTop: 2, lineHeight: 15 },

  // Step 3 harness warning
  harnessWarnRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: C.warningBg, borderRadius: 12, padding: 12, marginTop: 8,
  },
  harnessWarnText: { flex: 1, fontSize: 12, color: C.foreground, lineHeight: 17 },

  // Signature capture (step 8)
  sigBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.surfaceElevated, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed',
    paddingVertical: 16, paddingHorizontal: 14,
  },
  sigBtnDone: { borderColor: C.success, borderStyle: 'solid', backgroundColor: C.successBg },
  sigBtnText: { fontSize: 14, fontWeight: '700', color: C.primary },
  sigModalRoot: { flex: 1, backgroundColor: C.background, paddingTop: 56 },
  sigModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 4,
  },
  sigModalTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },
  sigModalClose: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  sigModalHint: { fontSize: 12, color: C.muted, paddingHorizontal: 20, marginBottom: 10 },
  sigCanvasWrap: { flex: 1, margin: 16, borderRadius: 16, overflow: 'hidden' },

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

  meterCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 14,
    marginTop: 16, borderWidth: 1, borderColor: C.border,
  },
  meterHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  meterTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: C.foreground },
  meterCount: { fontSize: 13, fontWeight: '800' },
  meterHint: { fontSize: 12, color: C.muted, lineHeight: 17, marginBottom: 10 },
  meterRowWrap: { marginBottom: 10 },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  meterLabelCol: { width: 110 },
  meterLabel: { fontSize: 13, fontWeight: '700', color: C.foreground },
  meterUnit: { fontSize: 11, color: C.muted },
  meterInput: {
    flex: 1, backgroundColor: C.surfaceElevated, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 12, fontSize: 15, color: C.foreground,
  },
  meterInputSaved: { borderWidth: 1, borderColor: C.success },
  meterSaveBtn: {
    backgroundColor: C.primary, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16,
    alignItems: 'center', justifyContent: 'center', minWidth: 60,
  },
  meterSaveBtnDone: { backgroundColor: C.success },
  meterSaveText: { color: C.primaryFg, fontWeight: '700', fontSize: 13 },
  ozCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 14,
    marginTop: 16, borderWidth: 1, borderColor: C.primary,
  },
  ozStageChip: {
    fontSize: 11, fontWeight: '800', color: C.primary,
    backgroundColor: C.primaryBg, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden',
  },
  ozCheckRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 6,
  },
  ozCheckLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: C.foreground, paddingRight: 8 },
  ozBtn: {
    backgroundColor: C.primary, borderRadius: 12, padding: 14,
    alignItems: 'center', marginTop: 10,
  },
  ozBtnText: { color: C.primaryFg, fontWeight: '700', fontSize: 14 },
  ozTimer: {
    fontSize: 40, fontWeight: '800', color: C.primary,
    textAlign: 'center', marginVertical: 8, fontVariant: ['tabular-nums'],
  },
  ozExtendRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  ozNoteText: {
    fontSize: 13, fontWeight: '600', color: C.warning,
    backgroundColor: C.warningBg, borderRadius: 10, padding: 10, marginBottom: 4,
  },
  ozClearedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.successBg, borderRadius: 12, padding: 12, marginTop: 16,
  },
  ozClearedText: { fontSize: 13, fontWeight: '700', color: C.success },

  uvIncludedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.successBg, borderRadius: 12, padding: 12, marginTop: 16,
  },
  uvIncludedText: { flex: 1, fontSize: 13, fontWeight: '700', color: C.success, lineHeight: 18 },
  uvNotIncludedText: {
    fontSize: 12, fontWeight: '600', color: C.warning,
    backgroundColor: C.warningBg, borderRadius: 10, padding: 10, marginTop: 16,
    lineHeight: 17,
  },

  meterMeta: { fontSize: 12, color: C.muted, marginTop: 4, marginLeft: 2 },
  meterWarn: { fontSize: 12, color: C.warning, fontWeight: '600', marginTop: 4, marginLeft: 2 },
  meterError: { fontSize: 12, color: C.danger, fontWeight: '600', marginTop: 4, marginLeft: 2 },
  meterSafe: { fontSize: 12, color: C.success, fontWeight: '700', marginTop: 4, marginLeft: 2 },
  waterUsedText: { fontSize: 13, fontWeight: '700', color: C.primary, marginTop: 10 },

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
