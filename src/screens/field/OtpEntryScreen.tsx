import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, Vibration,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { jobAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';

const OtpEntryScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { jobId, type } = route.params; // type: 'start' | 'end'
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isStart = type === 'start';
  const title = isStart ? 'Enter Start OTP' : 'Enter End OTP';
  const subtitle = isStart
    ? 'Ask the customer to show you the Start OTP from their app'
    : 'Ask the customer to show you the End OTP from their app';
  const accentColor = isStart ? COLORS.primary : COLORS.success;

  const handleDigit = (digit: string) => {
    if (otp.length >= 6) return;
    setError('');
    setOtp(prev => prev + digit);
  };

  const handleDelete = () => {
    setOtp(prev => prev.slice(0, -1));
    setError('');
  };

  const handleSubmit = async () => {
    if (otp.length !== 6) {
      setError('Enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (isStart) {
        await jobAPI.verifyStartOtp(jobId, otp);
        Alert.alert('Job Started', 'OTP verified successfully. The checklist is now unlocked.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await jobAPI.verifyEndOtp(jobId, otp);
        Alert.alert('Job Completed', 'End OTP verified. The job is now closed.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err: any) {
      Vibration.vibrate(200);
      setError(err.message || 'Invalid OTP');
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'DEL'];

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>{subtitle}</Text>

      {/* OTP Display */}
      <View style={styles.otpContainer}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <View
            key={i}
            style={[
              styles.otpBox,
              otp.length === i && styles.otpBoxActive,
              error ? styles.otpBoxError : null,
              { borderColor: otp[i] ? accentColor : error ? COLORS.danger : COLORS.border },
            ]}
          >
            <Text style={[styles.otpDigit, { color: otp[i] ? accentColor : COLORS.muted }]}>
              {otp[i] || '—'}
            </Text>
          </View>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Numpad */}
      <View style={styles.numpad}>
        {digits.map((d, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.numKey, !d && styles.numKeyEmpty]}
            disabled={!d || loading}
            onPress={() => {
              if (d === 'DEL') handleDelete();
              else handleDigit(d);
            }}
          >
            <Text style={[styles.numKeyText, d === 'DEL' && styles.delText]}>
              {d === 'DEL' ? '⌫' : d}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: accentColor }, otp.length < 6 && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={otp.length < 6 || loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.primaryFg} />
        ) : (
          <Text style={styles.submitText}>
            {isStart ? 'Verify & Start Job' : 'Verify & Complete'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { marginRight: 12 },
  backText: { fontSize: 24, color: COLORS.primary },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.foreground },
  subtitle: {
    fontSize: 14, color: COLORS.muted, textAlign: 'center',
    marginTop: 24, marginHorizontal: 32, lineHeight: 20,
  },
  otpContainer: {
    flexDirection: 'row', justifyContent: 'center',
    marginTop: 32, marginBottom: 8, gap: 10,
  },
  otpBox: {
    width: 48, height: 56, borderRadius: 12,
    borderWidth: 2, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  otpBoxActive: { borderColor: COLORS.primary },
  otpBoxError: { borderColor: COLORS.danger },
  otpDigit: { fontSize: 24, fontWeight: 'bold' },
  errorText: { color: COLORS.danger, textAlign: 'center', marginTop: 8, fontSize: 14 },
  numpad: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', marginTop: 24,
    paddingHorizontal: 40,
  },
  numKey: {
    width: '33.33%', paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  numKeyEmpty: { opacity: 0 },
  numKeyText: { fontSize: 28, fontWeight: '600', color: COLORS.foreground },
  delText: { fontSize: 24, color: COLORS.muted },
  submitBtn: {
    marginHorizontal: 32, marginTop: 16,
    borderRadius: 16, padding: 18, alignItems: 'center',
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: COLORS.primaryFg, fontWeight: 'bold', fontSize: 17 },
});

export default OtpEntryScreen;
