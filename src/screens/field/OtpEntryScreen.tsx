import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, Vibration, Platform, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { jobAPI, ecoScoreAPI, certificateAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { ArrowLeft, Key, Lock } from '../../components/Icons';

const OtpEntryScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { jobId, type } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isStart = type === 'start';
  const title = isStart ? 'Enter Start OTP' : 'Enter End OTP';
  const subtitle = isStart
    ? 'Ask the customer to show you the Start OTP from their app'
    : 'Ask the customer to show you the End OTP from their app';
  const accentColor = isStart ? C.primary : C.success;

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
        await jobAPI.completeJob(jobId);
        await ecoScoreAPI.calculateScore(jobId);
        await certificateAPI.generate(jobId);
        Alert.alert('Job Completed!', 'End OTP verified. EcoScore calculated and hygiene certificate generated.', [
          { text: 'Done', onPress: () => navigation.navigate('FieldTabs') },
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
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={C.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      {/* Icon + Subtitle */}
      <View style={styles.subtitleSection}>
        <View style={[styles.otpIconContainer, { backgroundColor: isStart ? C.primaryBg : C.successBg }]}>
          <Key size={24} weight="fill" color={accentColor} />
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* OTP Display */}
      <View style={styles.otpContainer}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <View
            key={i}
            style={[
              styles.otpBox,
              otp.length === i && styles.otpBoxActive,
              error ? styles.otpBoxError : null,
              { borderColor: otp[i] ? accentColor : error ? C.danger : C.border },
            ]}
          >
            <Text style={[styles.otpDigit, { color: otp[i] ? accentColor : C.muted }]}>
              {otp[i] || '\u2014'}
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
            activeOpacity={0.6}
          >
            <Text style={[styles.numKeyText, d === 'DEL' && styles.delText]}>
              {d === 'DEL' ? '\u232B' : d}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: accentColor }, otp.length < 6 && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={otp.length < 6 || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={C.primaryFg} />
        ) : (
          <View style={styles.submitContent}>
            <Lock size={18} weight="fill" color={C.primaryFg} />
            <Text style={styles.submitText}>
              {isStart ? 'Verify & Start Job' : 'Verify & Complete'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

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
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },
  subtitleSection: { alignItems: 'center', marginTop: 32 },
  otpIconContainer: {
    width: 64, height: 64, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  subtitle: {
    fontSize: 14, color: C.muted, textAlign: 'center',
    marginHorizontal: 32, lineHeight: 20,
  },
  otpContainer: {
    flexDirection: 'row', justifyContent: 'center',
    marginTop: 24, marginBottom: 8, gap: 10,
  },
  otpBox: {
    width: 48, height: 56, borderRadius: 12,
    borderWidth: 2, borderColor: C.border,
    backgroundColor: C.surface,
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  otpBoxActive: { borderColor: C.primary },
  otpBoxError: { borderColor: C.danger },
  otpDigit: { fontSize: 24, fontWeight: '700' },
  errorText: { color: C.danger, textAlign: 'center', marginTop: 8, fontSize: 14 },
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
  numKeyText: { fontSize: 28, fontWeight: '600', color: C.foreground },
  delText: { fontSize: 24, color: C.muted },
  submitBtn: {
    marginHorizontal: 32, marginTop: 16,
    borderRadius: 16, padding: 18, alignItems: 'center',
  },
  submitDisabled: { opacity: 0.4 },
  submitContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitText: { color: C.primaryFg, fontWeight: '700', fontSize: 17 },
});

export default OtpEntryScreen;
