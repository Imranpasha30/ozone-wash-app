/**
 * VanCheckScreen — Phase 0 pre-departure van check (gate G-0).
 *
 * Jobs stay locked until today's van check is complete:
 *   0.2  13-item equipment checklist (all ticked)
 *   0.3  Meter calibration — pH / dissolved O₃ / turbidity, today or yesterday
 *   0.4  PPE photo (live camera on native)
 *   0.5  O₂ cylinder pressure — >40 OK, 21–40 refill soon, ≤20 shift blocked
 *   0.6  Van water tank — must be >100 L
 *
 * The server re-validates every rule — this screen only mirrors them.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  ActivityIndicator, Alert, StatusBar, Image,
} from 'react-native';
import { capturePhoto } from '../../services/cameraCapture';
import { useNavigation } from '@react-navigation/native';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { fieldAPI, uploadAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import ScreenHeader from '../../components/ScreenHeader';
import WebContainer from '../../components/WebContainer';
import {
  Check, CheckCircle, XCircle, Warning, Camera, Drop, Gear, ListChecks,
} from '../../components/Icons';

// Fallback if the API hasn't answered yet — same 13 items the server enforces.
const DEFAULT_ITEMS = [
  'ozone_generator', 'o2_cylinder', 'pressure_washer', 'vacuum_pump',
  'ph_meter', 'orp_meter', 'tds_meter', 'turbidity_meter',
  'dissolved_o3_meter', 'ppe_kits', 'safety_harness', 'ventilation_fan',
  'first_aid_kit',
];

const METERS = [
  { key: 'ph_meter', label: 'pH meter' },
  { key: 'dissolved_o3', label: 'Dissolved O₃ meter' },
  { key: 'turbidity', label: 'Turbidity meter' },
];

type CalChoice = 'today' | 'yesterday';

const humanize = (key: string) =>
  key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace(/\bO2\b/gi, 'O₂')
    .replace(/\bO3\b/gi, 'O₃')
    .replace(/\bPh\b/g, 'pH')
    .replace(/\bOrp\b/g, 'ORP')
    .replace(/\bTds\b/g, 'TDS')
    .replace(/\bPpe\b/g, 'PPE');

// Local YYYY-MM-DD (device timezone, not UTC)
const localIso = (d: Date) => {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const VanCheckScreen = () => {
  const navigation = useNavigation<any>();
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();

  const todayIso = useMemo(() => localIso(new Date()), []);
  const yesterdayIso = useMemo(() => localIso(new Date(Date.now() - 86400000)), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [equipmentItems, setEquipmentItems] = useState<string[]>(DEFAULT_ITEMS);
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [calibration, setCalibration] = useState<Record<string, CalChoice | null>>({
    ph_meter: null, dissolved_o3: null, turbidity: null,
  });
  const [ppePhotoUrl, setPpePhotoUrl] = useState<string | null>(null);
  const [o2Bar, setO2Bar] = useState('');
  const [waterLitres, setWaterLitres] = useState('');

  // Server verdict after save
  const [checks, setChecks] = useState<any>(null);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fieldAPI.getVanCheck() as any;
        if (cancelled) return;
        const items: string[] = res.data?.equipment_items;
        if (items?.length) setEquipmentItems(items);
        const vc = res.data?.van_check;
        if (vc) {
          setChecklist(vc.equipment_checklist || {});
          const cal: Record<string, CalChoice | null> = { ph_meter: null, dissolved_o3: null, turbidity: null };
          METERS.forEach((m) => {
            const d = vc.calibration_dates?.[m.key];
            if (d === todayIso) cal[m.key] = 'today';
            else if (d === yesterdayIso) cal[m.key] = 'yesterday';
          });
          setCalibration(cal);
          setPpePhotoUrl(vc.ppe_photo_url || null);
          if (vc.o2_pressure_bar != null) setO2Bar(String(vc.o2_pressure_bar));
          if (vc.water_tank_litres != null) setWaterLitres(String(vc.water_tank_litres));
          setComplete(!!vc.van_check_complete);
        }
      } catch (_) {} finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [todayIso, yesterdayIso]);

  const toggleItem = (key: string) =>
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));

  const tickedCount = equipmentItems.filter((k) => checklist[k]).length;

  const capturePpePhoto = async () => {
    try {
      // Live camera on every platform (web opens the webcam modal).
      const uri = await capturePhoto();
      if (!uri) return; // cancelled
      setUploadingPhoto(true);
      const up = await uploadAPI.uploadPhoto(uri, 'van-checks') as any;
      const url = up.data?.url || up.url;
      if (!url) throw new Error('Upload did not return a URL');
      setPpePhotoUrl(url);
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message || 'Could not upload PPE photo. Try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Live O₂ hint
  const o2Num = o2Bar.trim() === '' ? null : Number(o2Bar);
  let o2Hint: { text: string; color: string } | null = null;
  if (o2Num != null && Number.isFinite(o2Num)) {
    if (o2Num > 40) o2Hint = { text: 'O₂ OK', color: C.success };
    else if (o2Num > 20) o2Hint = { text: 'Refill soon', color: C.warning };
    else o2Hint = { text: 'BLOCKED — shift blocked, admin alerted', color: C.danger };
  }

  const waterNum = waterLitres.trim() === '' ? null : Number(waterLitres);
  let waterHint: { text: string; color: string } | null = null;
  if (waterNum != null && Number.isFinite(waterNum)) {
    waterHint = waterNum > 100
      ? { text: 'Tank level OK', color: C.success }
      : { text: 'Must be more than 100 L', color: C.danger };
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const calibration_dates: Record<string, string> = {};
      METERS.forEach((m) => {
        const choice = calibration[m.key];
        if (choice) calibration_dates[m.key] = choice === 'today' ? todayIso : yesterdayIso;
      });
      const payload: any = { equipment_checklist: checklist, calibration_dates };
      if (ppePhotoUrl) payload.ppe_photo_url = ppePhotoUrl;
      if (o2Num != null && Number.isFinite(o2Num)) payload.o2_pressure_bar = o2Num;
      if (waterNum != null && Number.isFinite(waterNum)) payload.water_tank_litres = waterNum;

      const res = await fieldAPI.saveVanCheck(payload) as any;
      const vc = res.data?.van_check;
      setChecks(vc?.checks || null);
      const done = !!vc?.van_check_complete;
      setComplete(done);
      if (done) {
        setTimeout(() => navigation.goBack(), 1200);
      }
    } catch (e: any) {
      const d = e?.response?.data;
      Alert.alert('Blocked', d?.message || e?.message || 'Could not save van check');
    } finally {
      setSaving(false);
    }
  };

  const CheckRow = ({ ok, label }: { ok: boolean; label: string }) => (
    <View style={styles.checkRow}>
      {ok
        ? <CheckCircle size={18} weight="fill" color={C.success} />
        : <XCircle size={18} weight="fill" color={C.danger} />}
      <Text style={[styles.checkRowText, { color: ok ? C.success : C.danger }]}>{label}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={C.background} />
        <ScreenHeader title="Van Check" subtitle="Pre-departure — Phase 0" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <ScreenHeader title="Van Check" subtitle="Pre-departure — Phase 0" />

      <ScrollView ref={scrollRef} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <WebContainer variant="narrow">
        {complete && (
          <View style={styles.completeBanner}>
            <CheckCircle size={26} weight="fill" color="#FFF" />
            <Text style={styles.completeBannerText}>Van Check Complete — jobs unlocked</Text>
          </View>
        )}

        {/* 0.2 — Equipment checklist */}
        <View style={styles.sectionHead}>
          <ListChecks size={17} weight="bold" color={C.foreground} />
          <Text style={styles.sectionTitle}>Equipment checklist</Text>
          <Text style={[styles.sectionCount, tickedCount === equipmentItems.length && { color: C.success }]}>
            {tickedCount}/{equipmentItems.length}
          </Text>
        </View>
        <Text style={styles.sectionSub}>Tick every item loaded in the van.</Text>
        <View style={styles.tileGrid}>
          {equipmentItems.map((key) => {
            const on = !!checklist[key];
            return (
              <TouchableOpacity
                key={key}
                style={[styles.tile, on && styles.tileOn]}
                onPress={() => toggleItem(key)}
                activeOpacity={0.7}
              >
                <View style={[styles.tileBox, on && styles.tileBoxOn]}>
                  {on && <Check size={12} weight="bold" color="#FFF" />}
                </View>
                <Text style={[styles.tileText, on && styles.tileTextOn]} numberOfLines={2}>
                  {humanize(key)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 0.3 — Meter calibration */}
        <View style={styles.sectionHead}>
          <Gear size={17} weight="bold" color={C.foreground} />
          <Text style={styles.sectionTitle}>Meter calibration</Text>
        </View>
        <Text style={styles.sectionSub}>Each meter must be calibrated today or yesterday.</Text>
        {METERS.map((m) => (
          <View key={m.key} style={styles.calRow}>
            <Text style={styles.calLabel}>{m.label}</Text>
            <View style={styles.calChips}>
              {(['today', 'yesterday'] as CalChoice[]).map((choice) => {
                const on = calibration[m.key] === choice;
                return (
                  <TouchableOpacity
                    key={choice}
                    style={[styles.calChip, on && styles.calChipOn]}
                    onPress={() => setCalibration((prev) => ({ ...prev, [m.key]: choice }))}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.calChipText, on && styles.calChipTextOn]}>
                      {choice === 'today' ? 'Calibrated today' : 'Calibrated yesterday'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* 0.4 — PPE photo */}
        <View style={styles.sectionHead}>
          <Camera size={17} weight="bold" color={C.foreground} />
          <Text style={styles.sectionTitle}>PPE photo</Text>
        </View>
        <Text style={styles.sectionSub}>Photo of today's PPE kit laid out — live camera only.</Text>
        <TouchableOpacity
          style={styles.photoCard}
          onPress={capturePpePhoto}
          disabled={uploadingPhoto}
          activeOpacity={0.7}
        >
          {uploadingPhoto ? (
            <View style={styles.photoInner}>
              <ActivityIndicator size="small" color={C.primary} />
              <Text style={styles.photoText}>Uploading…</Text>
            </View>
          ) : ppePhotoUrl ? (
            <View style={styles.photoInner}>
              <Image source={{ uri: ppePhotoUrl }} style={styles.photoThumb} />
              <View style={styles.photoAttachedCol}>
                <View style={styles.photoAttachedRow}>
                  <CheckCircle size={16} weight="fill" color={C.success} />
                  <Text style={[styles.photoText, { color: C.success }]}>Photo attached</Text>
                </View>
                <Text style={styles.photoRetake}>Tap to retake</Text>
              </View>
            </View>
          ) : (
            <View style={styles.photoInner}>
              <Camera size={18} weight="regular" color={C.primary} />
              <Text style={styles.photoText}>Take PPE photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* 0.5 — O₂ pressure */}
        <View style={styles.sectionHead}>
          <Warning size={17} weight="bold" color={C.foreground} />
          <Text style={styles.sectionTitle}>O{'₂'} cylinder pressure (bar)</Text>
        </View>
        <TextInput
          style={[styles.input, o2Hint && { borderColor: o2Hint.color }]}
          placeholder="e.g. 120"
          placeholderTextColor={C.muted}
          keyboardType="numeric"
          value={o2Bar}
          onChangeText={setO2Bar}
        />
        {o2Hint && (
          <Text style={[styles.hint, { color: o2Hint.color }]}>{o2Hint.text}</Text>
        )}

        {/* 0.6 — Water tank */}
        <View style={styles.sectionHead}>
          <Drop size={17} weight="bold" color={C.foreground} />
          <Text style={styles.sectionTitle}>Van water tank (litres)</Text>
        </View>
        <TextInput
          style={[styles.input, waterHint && { borderColor: waterHint.color }]}
          placeholder="e.g. 400"
          placeholderTextColor={C.muted}
          keyboardType="numeric"
          value={waterLitres}
          onChangeText={setWaterLitres}
        />
        {waterHint && (
          <Text style={[styles.hint, { color: waterHint.color }]}>{waterHint.text}</Text>
        )}

        {/* Server verdict after save */}
        {checks && (
          <View style={styles.checksCard}>
            <Text style={styles.checksTitle}>Server verification</Text>
            <CheckRow ok={!!checks.equipment_ok} label="All 13 equipment items ticked" />
            <CheckRow ok={!!checks.calibration_ok} label="Meters calibrated (today or yesterday)" />
            <CheckRow ok={!!checks.ppe_photo_ok} label="PPE photo uploaded" />
            {checks.o2_blocked ? (
              <CheckRow ok={false} label={'O₂ ≤ 20 bar — shift blocked, admin alerted'} />
            ) : checks.o2_warning ? (
              <View style={styles.checkRow}>
                <Warning size={18} weight="fill" color={C.warning} />
                <Text style={[styles.checkRowText, { color: C.warning }]}>
                  O{'₂'} 21–40 bar — OK for today, refill soon
                </Text>
              </View>
            ) : (
              <CheckRow ok={!!checks.o2_ok} label={'O₂ pressure above 40 bar'} />
            )}
            <CheckRow ok={!!checks.water_ok} label="Water tank above 100 L" />
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.saveText}>Save Van Check</Text>}
        </TouchableOpacity>
        </WebContainer>
      </ScrollView>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body: { padding: 20, paddingBottom: 48 },
  completeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.success, borderRadius: 16, padding: 18, marginBottom: 8,
  },
  completeBannerText: { flex: 1, fontSize: 16, fontWeight: '800', color: '#FFF' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 22, marginBottom: 4 },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: C.foreground },
  sectionCount: { fontSize: 13, fontWeight: '800', color: C.muted },
  sectionSub: { fontSize: 12, color: C.muted, marginBottom: 10 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.surface, borderRadius: 12, padding: 12,
    borderWidth: 1.5, borderColor: C.border,
  },
  tileOn: { backgroundColor: C.successBg, borderColor: C.success },
  tileBox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.surfaceElevated,
  },
  tileBoxOn: { backgroundColor: C.success, borderColor: C.success },
  tileText: { flex: 1, fontSize: 12, fontWeight: '600', color: C.muted },
  tileTextOn: { color: C.foreground },
  calRow: { marginBottom: 12 },
  calLabel: { fontSize: 13, fontWeight: '700', color: C.foreground, marginBottom: 6 },
  calChips: { flexDirection: 'row', gap: 8 },
  calChip: {
    flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center',
    backgroundColor: C.surfaceElevated, borderWidth: 1.5, borderColor: C.border,
  },
  calChipOn: { backgroundColor: C.primaryDim, borderColor: C.primary },
  calChipText: { fontSize: 12, fontWeight: '600', color: C.muted },
  calChipTextOn: { color: C.primary, fontWeight: '700' },
  photoCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 14,
    borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed',
  },
  photoInner: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center' },
  photoThumb: { width: 56, height: 56, borderRadius: 10, backgroundColor: C.surfaceElevated },
  photoAttachedCol: { flex: 1 },
  photoAttachedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  photoText: { fontSize: 14, fontWeight: '600', color: C.primary },
  photoRetake: { fontSize: 12, color: C.muted, marginTop: 2 },
  input: {
    backgroundColor: C.surfaceElevated, borderRadius: 14, padding: 14,
    fontSize: 15, color: C.foreground, borderWidth: 1.5, borderColor: C.border,
  },
  hint: { fontSize: 12, fontWeight: '700', marginTop: 6 },
  checksCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginTop: 24,
    borderWidth: 1, borderColor: C.border,
  },
  checksTitle: { fontSize: 13, fontWeight: '800', color: C.foreground, marginBottom: 10 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  checkRowText: { flex: 1, fontSize: 13, fontWeight: '600' },
  saveBtn: {
    backgroundColor: C.primary, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 24,
  },
  saveText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});

export default VanCheckScreen;
