import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { incidentAPI, uploadAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';

const SEVERITIES = [
  { label: 'Low', value: 'low', color: COLORS.info },
  { label: 'Medium', value: 'medium', color: COLORS.warning },
  { label: 'High', value: 'high', color: '#F97316' },
  { label: 'Critical', value: 'critical', color: COLORS.danger },
];

const IncidentReportScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const jobId = route.params?.job_id;

  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (description.trim().length < 10) {
      Alert.alert('Error', 'Description must be at least 10 characters');
      return;
    }

    setSubmitting(true);
    try {
      let photo_url: string | undefined;
      if (photoUri) {
        const uploadRes = await uploadAPI.uploadPhoto(photoUri, 'incidents') as any;
        photo_url = uploadRes.data?.url || uploadRes.url;
      }

      await incidentAPI.create({
        job_id: jobId,
        description: description.trim(),
        severity,
        photo_url,
      });

      Alert.alert('Incident Reported', 'Your incident report has been submitted.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Incident</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Severity */}
        <Text style={styles.label}>Severity</Text>
        <View style={styles.severityRow}>
          {SEVERITIES.map(s => (
            <TouchableOpacity
              key={s.value}
              style={[
                styles.severityChip,
                severity === s.value && { backgroundColor: s.color, borderColor: s.color },
              ]}
              onPress={() => setSeverity(s.value)}
            >
              <Text style={[
                styles.severityText,
                severity === s.value && { color: '#FFF' },
              ]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Describe the incident in detail..."
          placeholderTextColor={COLORS.muted}
          multiline
          numberOfLines={5}
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />

        {/* Photo */}
        <Text style={styles.label}>Photo Evidence</Text>
        <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
          <Text style={styles.photoBtnText}>
            {photoUri ? '✅ Photo attached — tap to retake' : '📷 Take Photo'}
          </Text>
        </TouchableOpacity>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.primaryFg} />
          ) : (
            <Text style={styles.submitText}>Submit Incident Report</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { marginRight: 12 },
  backText: { fontSize: 24, color: COLORS.primary },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.foreground },
  body: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.foreground, marginBottom: 10, marginTop: 16 },
  severityRow: { flexDirection: 'row', gap: 8 },
  severityChip: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  severityText: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  textArea: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    color: COLORS.foreground, fontSize: 14, minHeight: 120,
    borderWidth: 1, borderColor: COLORS.border,
  },
  photoBtn: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  photoBtnText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  submitBtn: {
    backgroundColor: COLORS.danger, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 24,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});

export default IncidentReportScreen;
