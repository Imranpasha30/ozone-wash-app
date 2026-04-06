import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { complianceAPI } from '../../services/api';
import { uploadAPI } from '../../services/api';
import { COLORS, COMPLIANCE_STEPS } from '../../utils/constants';
import {
  ArrowLeft, MapPin, Camera, Check, CheckCircle, Clock,
  ShieldCheck, Flask,
} from '../../components/Icons';

const PPE_ITEMS = ['mask', 'gloves', 'boots', 'suit'];

interface StepData {
  photo_before_url: string;
  photo_after_url: string;
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
  const { job_id: jobId, step_number: stepNumber } = route.params;

  const stepInfo = COMPLIANCE_STEPS.find((s) => s.step === stepNumber);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [data, setData] = useState<StepData>({
    photo_before_url: '',
    photo_after_url: '',
    ppe_list: [],
    ozone_exposure_mins: '',
    chemical_type: '',
    chemical_qty_ml: '',
    gps_lat: 0,
    gps_lng: 0,
  });

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setData((d) => ({ ...d, gps_lat: loc.coords.latitude, gps_lng: loc.coords.longitude }));
    } catch (_) {}
  };

  const pickPhoto = async (type: 'before' | 'after') => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos');
      return;
    }

    Alert.alert('Photo Source', 'Take a photo or choose from gallery?', [
      {
        text: 'Camera',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            quality: 0.7,
            allowsEditing: false,
          });
          if (!result.canceled && result.assets[0]) {
            await uploadPhoto(result.assets[0].uri, type);
          }
        },
      },
      {
        text: 'Gallery',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            quality: 0.7,
            allowsEditing: false,
          });
          if (!result.canceled && result.assets[0]) {
            await uploadPhoto(result.assets[0].uri, type);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const uploadPhoto = async (uri: string, type: 'before' | 'after') => {
    setUploading(true);
    try {
      const res = await uploadAPI.uploadPhoto(uri, 'compliance') as any;
      const url = res.data?.url || res.url || uri;
      if (type === 'before') {
        setData((d) => ({ ...d, photo_before_url: url }));
      } else {
        setData((d) => ({ ...d, photo_after_url: url }));
      }
    } catch (_) {
      // If upload fails (placeholder R2), use local URI for demo
      if (type === 'before') {
        setData((d) => ({ ...d, photo_before_url: uri }));
      } else {
        setData((d) => ({ ...d, photo_after_url: uri }));
      }
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
    if (data.gps_lat === 0 && data.gps_lng === 0) {
      return Alert.alert('GPS Required', 'GPS location not captured. Please enable location and try again.');
    }

    setLoading(true);
    try {
      await complianceAPI.logStep(buildPayload());
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

  const ppeIconName = (item: string) => {
    // All PPE items use ShieldCheck icon with different semantics
    return item;
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.stepNum}>Step {stepNumber} of 8</Text>
          <Text style={styles.stepName}>{stepInfo?.name}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* GPS Status */}
        <View style={[styles.gpsRow, data.gps_lat !== 0 ? styles.gpsOk : styles.gpsWaiting]}>
          <View style={styles.gpsContent}>
            <MapPin size={16} weight="fill" color={data.gps_lat !== 0 ? COLORS.success : COLORS.warning} />
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
          <Camera size={16} weight="regular" color={COLORS.foreground} />
          <Text style={styles.label}>Before Photo</Text>
        </View>
        <TouchableOpacity style={styles.photoBtn} onPress={() => pickPhoto('before')}>
          {uploading && !data.photo_before_url ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : data.photo_before_url ? (
            <Image source={{ uri: data.photo_before_url }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <View style={styles.photoIconContainer}>
                <Camera size={28} weight="regular" color={COLORS.muted} />
              </View>
              <Text style={styles.photoLabel}>Tap to take Before photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* After Photo */}
        <View style={styles.labelRow}>
          <Camera size={16} weight="regular" color={COLORS.foreground} />
          <Text style={styles.label}>After Photo</Text>
        </View>
        <TouchableOpacity style={styles.photoBtn} onPress={() => pickPhoto('after')}>
          {data.photo_after_url ? (
            <Image source={{ uri: data.photo_after_url }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <View style={styles.photoIconContainer}>
                <Camera size={28} weight="regular" color={COLORS.muted} />
              </View>
              <Text style={styles.photoLabel}>Tap to take After photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* PPE Check */}
        {showPpe && (
          <>
            <View style={styles.labelRow}>
              <ShieldCheck size={16} weight="regular" color={COLORS.foreground} />
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
                  >
                    <View style={[styles.ppeIconContainer, selected && styles.ppeIconContainerActive]}>
                      <ShieldCheck size={18} weight={selected ? 'fill' : 'regular'} color={selected ? COLORS.primary : COLORS.muted} />
                    </View>
                    <Text style={[styles.ppeLabel, selected && styles.ppeLabelActive]}>
                      {item.charAt(0).toUpperCase() + item.slice(1)}
                    </Text>
                    {selected && <Check size={16} weight="bold" color={COLORS.primary} />}
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
              <Clock size={16} weight="regular" color={COLORS.foreground} />
              <Text style={styles.label}>Ozone Exposure (minutes)</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="e.g. 30"
              keyboardType="number-pad"
              value={data.ozone_exposure_mins}
              onChangeText={(v) => setData((d) => ({ ...d, ozone_exposure_mins: v }))}
              placeholderTextColor={COLORS.gray}
            />
          </>
        )}

        {/* Chemical Usage */}
        {showChemicals && (
          <>
            <View style={styles.labelRow}>
              <Flask size={16} weight="regular" color={COLORS.foreground} />
              <Text style={styles.label}>Chemical Used</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Chemical name (e.g. Chlorine)"
              value={data.chemical_type}
              onChangeText={(v) => setData((d) => ({ ...d, chemical_type: v }))}
              placeholderTextColor={COLORS.gray}
            />
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder="Quantity (ml, e.g. 500)"
              keyboardType="number-pad"
              value={data.chemical_qty_ml}
              onChangeText={(v) => setData((d) => ({ ...d, chemical_qty_ml: v }))}
              placeholderTextColor={COLORS.gray}
            />
          </>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading || uploading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.primaryFg} />
          ) : (
            <View style={styles.submitContent}>
              <CheckCircle size={18} weight="fill" color={COLORS.primaryFg} />
              <Text style={styles.submitText}>Save Step {stepNumber}</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
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
  headerContent: { flex: 1 },
  stepNum: { fontSize: 12, color: COLORS.muted },
  stepName: { fontSize: 18, fontWeight: 'bold', color: COLORS.foreground },
  body: { padding: 20, paddingBottom: 40 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginTop: 16 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.foreground },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    padding: 10,
    marginBottom: 4,
  },
  gpsOk: { backgroundColor: COLORS.successBg, borderWidth: 1, borderColor: COLORS.success },
  gpsWaiting: { backgroundColor: COLORS.warningBg, borderWidth: 1, borderColor: COLORS.warning },
  gpsContent: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  gpsText: { fontSize: 12, color: COLORS.foreground, fontWeight: '600' },
  gpsRetry: { fontSize: 12, color: COLORS.primary, fontWeight: 'bold', marginLeft: 8 },
  photoBtn: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photoLabel: { fontSize: 14, color: COLORS.muted, fontWeight: '600' },
  ppeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  ppeItem: {
    width: '47%',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ppeItemActive: { borderColor: COLORS.borderActive, backgroundColor: COLORS.primaryBg },
  ppeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ppeIconContainerActive: {
    backgroundColor: COLORS.primaryBg,
    borderColor: COLORS.borderActive,
  },
  ppeLabel: { fontSize: 14, color: COLORS.muted, fontWeight: '600', flex: 1 },
  ppeLabelActive: { color: COLORS.primary },
  input: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.foreground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { backgroundColor: COLORS.muted },
  submitContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitText: { color: COLORS.primaryFg, fontWeight: 'bold', fontSize: 16 },
});

export default ComplianceStepScreen;
