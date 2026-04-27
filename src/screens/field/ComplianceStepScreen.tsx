import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, ActivityIndicator, Alert, TextInput, Platform, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { complianceAPI } from '../../services/api';
import { uploadAPI } from '../../services/api';
import { enqueue as enqueuePendingUpload } from '../../utils/pendingUploads';
import { useTheme } from '../../hooks/useTheme';
import { COMPLIANCE_STEPS } from '../../utils/constants';
import {
  ArrowLeft, MapPin, Camera, Check, CheckCircle, Clock,
  ShieldCheck, Flask,
} from '../../components/Icons';

const PPE_ITEMS = ['mask', 'gloves', 'boots', 'suit'];

interface StepData {
  photo_before_url: string;
  photo_after_url: string;
  microbial_test_url: string;
  microbial_result: 'pass' | 'fail' | '';
  microbial_notes: string;
  ppe_list: string[];
  ozone_exposure_mins: string;
  chemical_type: string;
  chemical_qty_ml: string;
  gps_lat: number;
  gps_lng: number;
}

const ComplianceStepScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();
  const { job_id: jobId, step_number: stepNumber } = route.params;

  const stepInfo = COMPLIANCE_STEPS.find((s) => s.step === stepNumber);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const draftKey = `compliance_draft_${jobId}_${stepNumber}`;
  const draftLoaded = useRef(false);

  const [data, setData] = useState<StepData>({
    photo_before_url: '',
    photo_after_url: '',
    microbial_test_url: '',
    microbial_result: '',
    microbial_notes: '',
    ppe_list: [],
    ozone_exposure_mins: '',
    chemical_type: '',
    chemical_qty_ml: '',
    gps_lat: 0,
    gps_lng: 0,
  });

  // Load saved draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const saved = await AsyncStorage.getItem(draftKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setData(parsed);
        }
      } catch (_) {}
      draftLoaded.current = true;
    };
    loadDraft();
    getLocation();
  }, []);

  // Save draft whenever data changes (after initial load)
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

  const pickPhoto = async (type: 'before' | 'after' | 'microbial') => {
    if (Platform.OS === 'web') {
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: false });
      if (!result.canceled && result.assets[0]) await uploadPhoto(result.assets[0].uri, type);
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos');
      return;
    }

    Alert.alert('Photo Source', 'Take a photo or choose from gallery?', [
      {
        text: 'Camera',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
          if (!result.canceled && result.assets[0]) await uploadPhoto(result.assets[0].uri, type);
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: false });
          if (!result.canceled && result.assets[0]) await uploadPhoto(result.assets[0].uri, type);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadPhoto = async (uri: string, type: 'before' | 'after' | 'microbial') => {
    setUploading(true);
    try {
      const res = await uploadAPI.uploadPhoto(uri, 'compliance') as any;
      const url = res.data?.url || res.url || uri;
      if (type === 'before') setData((d) => ({ ...d, photo_before_url: url }));
      else if (type === 'after') setData((d) => ({ ...d, photo_after_url: url }));
      else setData((d) => ({ ...d, microbial_test_url: url }));
    } catch (_) {
      // Upload failed — keep the local URI so the form is still valid,
      // and queue for later background flush.
      if (type === 'before') setData((d) => ({ ...d, photo_before_url: uri }));
      else if (type === 'after') setData((d) => ({ ...d, photo_after_url: uri }));
      else setData((d) => ({ ...d, microbial_test_url: uri }));
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

  const buildPayload = () => ({
    job_id: jobId,
    step_number: stepNumber,
    step_name: stepInfo?.name || `Step ${stepNumber}`,
    photo_before_url: data.photo_before_url || undefined,
    photo_after_url: data.photo_after_url || undefined,
    microbial_test_url: data.microbial_test_url || undefined,
    microbial_result: data.microbial_result || undefined,
    microbial_notes: data.microbial_notes || undefined,
    ppe_list: data.ppe_list,
    ozone_exposure_mins: data.ozone_exposure_mins ? parseInt(data.ozone_exposure_mins) : undefined,
    chemical_type: data.chemical_type || undefined,
    chemical_qty_ml: data.chemical_qty_ml ? parseInt(data.chemical_qty_ml) : undefined,
    gps_lat: data.gps_lat,
    gps_lng: data.gps_lng,
    completed: true,
  });

  const handleSubmit = async () => {
    if (!data.photo_before_url && !data.photo_after_url) {
      return Alert.alert('Photo Required', 'Please take at least one photo before submitting');
    }
    if (Platform.OS !== 'web' && data.gps_lat === 0 && data.gps_lng === 0) {
      return Alert.alert('GPS Required', 'GPS location not captured. Please enable location and try again.');
    }

    setLoading(true);
    try {
      await complianceAPI.logStep(buildPayload());
      await AsyncStorage.removeItem(draftKey);
      Alert.alert('Step Saved', `Step ${stepNumber} logged successfully!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save step');
    } finally {
      setLoading(false);
    }
  };

  const showOzone = stepNumber === 5;
  const showChemicals = stepNumber === 5 || stepNumber === 3;
  const showPpe = stepNumber === 2;
  const showMicrobialTest = stepNumber === 6;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={C.foreground} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.stepNum}>Step {stepNumber} of 8</Text>
          <Text style={styles.stepName}>{stepInfo?.name}</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
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
          {data.gps_lat === 0 && (
            <TouchableOpacity onPress={getLocation}>
              <Text style={styles.gpsRetry}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Before Photo */}
        <View style={styles.labelRow}>
          <Camera size={16} weight="regular" color={C.foreground} />
          <Text style={styles.label}>Before Photo</Text>
        </View>
        <TouchableOpacity style={styles.photoBtn} onPress={() => pickPhoto('before')} activeOpacity={0.7}>
          {uploading && !data.photo_before_url ? (
            <ActivityIndicator color={C.primary} />
          ) : data.photo_before_url ? (
            <Image source={{ uri: data.photo_before_url }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <View style={styles.photoIconContainer}>
                <Camera size={28} weight="regular" color={C.muted} />
              </View>
              <Text style={styles.photoLabel}>Tap to take Before photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* After Photo */}
        <View style={styles.labelRow}>
          <Camera size={16} weight="regular" color={C.foreground} />
          <Text style={styles.label}>After Photo</Text>
        </View>
        <TouchableOpacity style={styles.photoBtn} onPress={() => pickPhoto('after')} activeOpacity={0.7}>
          {data.photo_after_url ? (
            <Image source={{ uri: data.photo_after_url }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <View style={styles.photoIconContainer}>
                <Camera size={28} weight="regular" color={C.muted} />
              </View>
              <Text style={styles.photoLabel}>Tap to take After photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Microbial Test Result — Step 6 */}
        {showMicrobialTest && (
          <>
            <View style={styles.labelRow}>
              <Flask size={16} weight="regular" color={C.foreground} />
              <Text style={styles.label}>Microbial Test Result Photo</Text>
            </View>
            <TouchableOpacity style={styles.photoBtn} onPress={() => pickPhoto('microbial')} activeOpacity={0.7}>
              {data.microbial_test_url ? (
                <Image source={{ uri: data.microbial_test_url }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <View style={styles.photoIconContainer}>
                    <Flask size={28} weight="regular" color={C.muted} />
                  </View>
                  <Text style={styles.photoLabel}>Upload test result / report photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Microbial Test Result — Pass/Fail + Notes */}
        {showMicrobialTest && (
          <>
            <View style={styles.labelRow}>
              <Flask size={16} weight="regular" color={C.foreground} />
              <Text style={styles.label}>Test Result</Text>
            </View>
            <View style={styles.resultRow}>
              <TouchableOpacity
                style={[styles.resultBtn, data.microbial_result === 'pass' && styles.resultBtnPass]}
                onPress={() => setData(d => ({ ...d, microbial_result: 'pass' }))}
              >
                <Text style={[styles.resultBtnText, data.microbial_result === 'pass' && { color: '#fff' }]}>✓ Pass</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.resultBtn, data.microbial_result === 'fail' && styles.resultBtnFail]}
                onPress={() => setData(d => ({ ...d, microbial_result: 'fail' }))}
              >
                <Text style={[styles.resultBtnText, data.microbial_result === 'fail' && { color: '#fff' }]}>✗ Fail</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, { marginTop: 10, minHeight: 80 }]}
              placeholder="Test notes — bacteria count, observations..."
              multiline
              numberOfLines={3}
              value={data.microbial_notes}
              onChangeText={(v) => setData(d => ({ ...d, microbial_notes: v }))}
              placeholderTextColor={C.muted}
              textAlignVertical="top"
            />
          </>
        )}

        {/* PPE Check */}
        {showPpe && (
          <>
            <View style={styles.labelRow}>
              <ShieldCheck size={16} weight="regular" color={C.foreground} />
              <Text style={styles.label}>PPE Checklist</Text>
            </View>
            <View style={styles.ppeGrid}>
              {PPE_ITEMS.map((item) => {
                const selected = data.ppe_list.includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.ppeItem, selected && styles.ppeItemActive]}
                    onPress={() => togglePpe(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.ppeIconContainer, selected && styles.ppeIconContainerActive]}>
                      <ShieldCheck size={18} weight={selected ? 'fill' : 'regular'} color={selected ? C.primary : C.muted} />
                    </View>
                    <Text style={[styles.ppeLabel, selected && styles.ppeLabelActive]}>
                      {item.charAt(0).toUpperCase() + item.slice(1)}
                    </Text>
                    {selected && <Check size={16} weight="bold" color={C.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Ozone Exposure */}
        {showOzone && (
          <>
            <View style={styles.labelRow}>
              <Clock size={16} weight="regular" color={C.foreground} />
              <Text style={styles.label}>Ozone Exposure (minutes)</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="e.g. 30"
              keyboardType="number-pad"
              value={data.ozone_exposure_mins}
              onChangeText={(v) => setData((d) => ({ ...d, ozone_exposure_mins: v }))}
              placeholderTextColor={C.muted}
            />
          </>
        )}

        {/* Chemical Usage */}
        {showChemicals && (
          <>
            <View style={styles.labelRow}>
              <Flask size={16} weight="regular" color={C.foreground} />
              <Text style={styles.label}>Chemical Used</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Chemical name (e.g. Chlorine)"
              value={data.chemical_type}
              onChangeText={(v) => setData((d) => ({ ...d, chemical_type: v }))}
              placeholderTextColor={C.muted}
            />
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder="Quantity (ml, e.g. 500)"
              keyboardType="number-pad"
              value={data.chemical_qty_ml}
              onChangeText={(v) => setData((d) => ({ ...d, chemical_qty_ml: v }))}
              placeholderTextColor={C.muted}
            />
          </>
        )}

        {/* Submit */}
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
              <Text style={styles.submitText}>Save Step {stepNumber}</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
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
  headerContent: { flex: 1 },
  stepNum: { fontSize: 12, color: C.muted },
  stepName: { fontSize: 18, fontWeight: '700', color: C.foreground },
  body: { padding: 20, paddingBottom: 40 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 20 },
  label: { fontSize: 14, fontWeight: '700', color: C.foreground },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  gpsOk: { backgroundColor: C.successBg },
  gpsWaiting: { backgroundColor: C.warningBg },
  gpsContent: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  gpsText: { fontSize: 12, color: C.foreground, fontWeight: '600' },
  gpsRetry: { fontSize: 12, color: C.primary, fontWeight: '700', marginLeft: 8 },
  photoBtn: {
    backgroundColor: C.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPreview: { width: '100%', height: 200, resizeMode: 'cover' },
  photoPlaceholder: { alignItems: 'center', padding: 20 },
  photoIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: C.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoLabel: { fontSize: 14, color: C.muted, fontWeight: '600' },
  ppeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ppeItem: {
    width: '47%',
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  ppeItemActive: { backgroundColor: C.primaryBg },
  ppeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  ppeIconContainerActive: {
    backgroundColor: C.primaryBg,
  },
  ppeLabel: { fontSize: 14, color: C.muted, fontWeight: '600', flex: 1 },
  ppeLabelActive: { color: C.primary },
  resultRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  resultBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surfaceElevated },
  resultBtnPass: { backgroundColor: C.success, borderColor: C.success },
  resultBtnFail: { backgroundColor: C.danger, borderColor: C.danger },
  resultBtnText: { fontSize: 15, fontWeight: '700', color: C.muted },
  input: {
    backgroundColor: C.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: C.foreground,
  },
  submitBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { backgroundColor: C.muted },
  submitContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitText: { color: C.primaryFg, fontWeight: '700', fontSize: 16 },
});

export default ComplianceStepScreen;
