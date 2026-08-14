import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, Platform, StatusBar,
} from 'react-native';
import { capturePhoto } from '../../services/cameraCapture';
import {
  useAudioRecorder, useAudioRecorderState, AudioModule,
  RecordingPresets, setAudioModeAsync,
} from 'expo-audio';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { incidentAPI, uploadAPI } from '../../services/api';
import { enqueue as enqueuePendingUpload } from '../../utils/pendingUploads';
import { useTheme } from '../../hooks/useTheme';
import WebContainer from '../../components/WebContainer';
import {
  ArrowLeft, Camera, CheckCircle, Warning, Play,
} from '../../components/Icons';

const fmtRec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const IncidentReportScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();
  const jobId = route.params?.job_id;

  const SEVERITIES = [
    { label: 'Low', value: 'low', color: C.info },
    { label: 'Medium', value: 'medium', color: C.warning },
    { label: 'High', value: 'high', color: '#F97316' },
    { label: 'Critical', value: 'critical', color: C.danger },
  ];

  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Voice note (native only). Everything is best-effort — a recording or
  // upload failure must never block the incident submission itself.
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBusy, setAudioBusy] = useState(false);
  const recSecs = Math.floor((recState?.durationMillis || 0) / 1000);

  const startRecording = async () => {
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Microphone permission is needed to record a voice note.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (_) {
      Alert.alert('Recording Unavailable', 'Could not start recording — you can still submit the report.');
    }
  };

  const stopRecording = async () => {
    setAudioBusy(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        const up = await uploadAPI.uploadPhoto(uri, 'incident-audio') as any;
        const url = up?.data?.url || up?.url;
        if (url) setAudioUrl(url);
        else Alert.alert('Upload Failed', 'Voice note could not be uploaded — you can still submit the report.');
      }
    } catch (_) {
      Alert.alert('Upload Failed', 'Voice note could not be uploaded — you can still submit the report.');
    } finally {
      setAudioBusy(false);
    }
  };

  const takePhoto = async () => {
    // Live camera on every platform (web opens the webcam modal).
    const uri = await capturePhoto();
    if (!uri) return; // cancelled
    setPhotoUri(uri);
  };

  const handleSubmit = async () => {
    if (description.trim().length < 10) {
      Alert.alert('Error', 'Description must be at least 10 characters');
      return;
    }

    setSubmitting(true);
    try {
      let photo_url: string | undefined;
      let photoQueued = false;
      if (photoUri) {
        try {
          const uploadRes = await uploadAPI.uploadPhoto(photoUri, 'incidents') as any;
          photo_url = uploadRes.data?.url || uploadRes.url;
        } catch (uploadErr) {
          // Upload failed — queue for later, but still submit the incident
          // text so the field tech isn't blocked.
          await enqueuePendingUpload(photoUri, jobId, 'incidents');
          photoQueued = true;
        }
      }

      await incidentAPI.create({
        job_id: jobId,
        description: description.trim(),
        severity,
        photo_url,
        audio_url: audioUrl || undefined,
      });

      Alert.alert(
        'Incident Reported',
        photoQueued
          ? 'Your report was submitted. The photo will upload when your connection improves.'
          : 'Your incident report has been submitted.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={C.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Incident</Text>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <WebContainer variant="narrow">
        {/* Severity */}
        <View style={styles.labelRow}>
          <Warning size={16} weight="fill" color={C.foreground} />
          <Text style={styles.label}>Severity</Text>
        </View>
        <View style={styles.severityRow}>
          {SEVERITIES.map(s => (
            <TouchableOpacity
              key={s.value}
              style={[
                styles.severityChip,
                severity === s.value && { backgroundColor: s.color, borderColor: s.color },
              ]}
              onPress={() => setSeverity(s.value)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.severityText,
                severity === s.value && { color: '#FFF' },
              ]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.labelStandalone}>Description</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Describe the incident in detail..."
          placeholderTextColor={C.muted}
          multiline
          numberOfLines={5}
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />

        {/* Photo */}
        <View style={styles.labelRow}>
          <Camera size={16} weight="regular" color={C.foreground} />
          <Text style={styles.label}>Photo Evidence</Text>
        </View>
        <TouchableOpacity style={styles.photoBtn} onPress={takePhoto} activeOpacity={0.7}>
          {photoUri ? (
            <View style={styles.photoAttachedRow}>
              <CheckCircle size={18} weight="fill" color={C.success} />
              <Text style={[styles.photoBtnText, { color: C.success }]}>Photo attached — tap to retake</Text>
            </View>
          ) : (
            <View style={styles.photoAttachedRow}>
              <Camera size={18} weight="regular" color={C.primary} />
              <Text style={styles.photoBtnText}>Take Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Voice note — native only (mic + expo-audio unavailable on web) */}
        {Platform.OS !== 'web' && (
          <>
            <View style={styles.labelRow}>
              <Play size={16} weight="fill" color={C.foreground} />
              <Text style={styles.label}>Voice Note (optional)</Text>
            </View>
            {recState?.isRecording ? (
              <TouchableOpacity style={[styles.audioBtn, styles.audioBtnRec]} onPress={stopRecording} activeOpacity={0.7}>
                <View style={styles.recDot} />
                <Text style={[styles.audioBtnText, { color: C.danger }]}>
                  Recording {fmtRec(recSecs)} — tap to stop
                </Text>
              </TouchableOpacity>
            ) : audioBusy ? (
              <View style={styles.audioBtn}>
                <ActivityIndicator size="small" color={C.primary} />
                <Text style={styles.audioBtnText}>Uploading voice note...</Text>
              </View>
            ) : audioUrl ? (
              <TouchableOpacity style={styles.audioBtn} onPress={startRecording} activeOpacity={0.7}>
                <CheckCircle size={18} weight="fill" color={C.success} />
                <Text style={[styles.audioBtnText, { color: C.success }]}>Voice note attached — tap to re-record</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.audioBtn} onPress={startRecording} activeOpacity={0.7}>
                <Play size={18} weight="fill" color={C.primary} />
                <Text style={styles.audioBtnText}>Record Voice Note</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitText}>Submit Incident Report</Text>
          )}
        </TouchableOpacity>
        </WebContainer>
      </ScrollView>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
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
  labelStandalone: { fontSize: 14, fontWeight: '700', color: C.foreground, marginBottom: 10, marginTop: 20 },
  severityRow: { flexDirection: 'row', gap: 8 },
  severityChip: {
    flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center',
    backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  severityText: { fontSize: 13, fontWeight: '600', color: C.muted },
  textArea: {
    backgroundColor: C.surfaceElevated, borderRadius: 16, padding: 16,
    color: C.foreground, fontSize: 14, minHeight: 120,
  },
  photoBtn: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, alignItems: 'center',
    borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed',
  },
  photoAttachedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  photoBtnText: { fontSize: 14, color: C.primary, fontWeight: '600' },
  audioBtn: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: C.border, borderStyle: 'dashed',
  },
  audioBtnRec: { borderColor: C.danger, borderStyle: 'solid', backgroundColor: C.dangerBg },
  audioBtnText: { fontSize: 14, color: C.primary, fontWeight: '600' },
  recDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: C.danger },
  submitBtn: {
    backgroundColor: C.danger, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 24,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});

export default IncidentReportScreen;
