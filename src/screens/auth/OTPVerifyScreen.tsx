import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, StatusBar, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import useAuthStore from '../../store/auth.store';
import { COLORS } from '../../utils/constants';
import { useResponsive } from '../../utils/responsive';
import { ArrowLeft, ShieldCheck } from '../../components/Icons';

const OTPVerifyScreen = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const inputs = useRef<any[]>([]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { phone } = route.params;
  const { verifyOtp, sendOtp, isLoading } = useAuthStore();
  const { isLarge } = useResponsive();

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(t => t > 0 ? t - 1 : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Android SMS Retriever auto-fill ─────────────────────────────────────
  // Bank-app-style silent OTP read. Requires:
  //   • a custom dev / production build (not Expo Go)
  //   • the OTP SMS body to end with the app's 11-char hash signature
  // Listener is started on mount, parses the first 6-digit sequence out of
  // the matched SMS, fans it across the boxes, and auto-verifies.
  // Falls back silently if the native module isn't linked (Expo Go).
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let RNOtpVerify: any = null;
    try { RNOtpVerify = require('react-native-otp-verify').default; } catch (_) { return; }
    if (!RNOtpVerify?.getOtp || !RNOtpVerify?.addListener) return;

    let mounted = true;
    RNOtpVerify.getOtp()
      .then(() => RNOtpVerify.addListener((message: string) => {
        if (!mounted || !message) return;
        const match = String(message).match(/(\d{4,6})/);
        if (!match) return;
        const code = match[1].padStart(6, '0').slice(-6);
        // Re-use the multi-char paste handler so all 6 boxes fill at once.
        handleOtpChange(code, 0);
      }))
      .catch(() => {});

    return () => {
      mounted = false;
      try { RNOtpVerify.removeListener?.(); } catch (_) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    // Strip anything non-digit (handles iOS autofill which can include spaces).
    const cleaned = value.replace(/\D/g, '');

    // Multi-char input (paste OR Android/iOS SMS auto-fill into box 0).
    // Spread the digits across the 6 boxes and auto-verify when complete.
    if (cleaned.length > 1) {
      const digits = cleaned.slice(0, 6).split('');
      const newOtp = ['', '', '', '', '', ''];
      digits.forEach((d, i) => { newOtp[i] = d; });
      setOtp(newOtp);
      const focusIdx = Math.min(digits.length, 5);
      inputs.current[focusIdx]?.focus();
      if (digits.length === 6) handleVerify(newOtp.join(''));
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = cleaned;
    setOtp(newOtp);
    if (cleaned && index < 5) inputs.current[index + 1]?.focus();
    if (index === 5 && cleaned) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) handleVerify(fullOtp);
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    if (code.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP');
      return;
    }
    try {
      await verifyOtp(phone, code);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    try {
      await sendOtp(phone);
      setTimer(60);
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
      Alert.alert('OTP Sent', 'A new OTP has been sent to your number');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resend OTP');
    }
  };

  const isComplete = otp.join('').length === 6;
  const maskedPhone = phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1 ••• $3');

  const formContent = (
    <View style={[styles.inner, isLarge && styles.innerWeb]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <ArrowLeft size={24} weight="regular" color={COLORS.foreground} />
      </TouchableOpacity>

      <View style={styles.iconWrap}>
        <ShieldCheck size={40} weight="regular" color={COLORS.primary} />
      </View>

      <Text style={styles.title}>Verify your number</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to{'\n'}
        <Text style={styles.phone}>+91 {maskedPhone}</Text>
      </Text>

      <View style={styles.otpRow}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            ref={(ref) => { inputs.current[i] = ref; }}
            style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
            value={digit}
            onChangeText={value => handleOtpChange(value, i)}
            onKeyPress={e => handleKeyPress(e, i)}
            keyboardType="number-pad"
            // First box accepts the full 6-digit autofill; rest stay single-char.
            // The handler splits multi-char input across boxes.
            maxLength={i === 0 ? 6 : 1}
            // iOS picks up the SMS code automatically from the keyboard
            // suggestion bar when this is set on a text input.
            textContentType={i === 0 ? 'oneTimeCode' : 'none'}
            // Android picks up the OTP via the SMS User Consent API + this hint.
            autoComplete={i === 0 ? 'sms-otp' : 'off'}
            // Older RN compat for Android autofill.
            importantForAutofill={i === 0 ? 'yes' : 'no'}
            autoFocus={i === 0}
            selectTextOnFocus
            contextMenuHidden={false}
          />
        ))}
      </View>

      <Text style={styles.pasteHint}>
        Tip: copy the OTP from your SMS and long-press the first box to paste — it auto-fills all six.
      </Text>

      <View style={styles.timerRow}>
        {timer > 0 ? (
          <Text style={styles.timerText}>
            Resend code in <Text style={styles.timerBold}>{timer}s</Text>
          </Text>
        ) : (
          <TouchableOpacity onPress={handleResend}>
            <Text style={styles.resendText}>Resend OTP</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.button, !isComplete && styles.buttonDisabled]}
        onPress={() => handleVerify()}
        disabled={!isComplete || isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.primaryFg} />
        ) : (
          <Text style={[styles.buttonText, !isComplete && styles.buttonTextDisabled]}>
            Verify & Login
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.securityRow}>
        <ShieldCheck size={14} weight="regular" color={COLORS.muted} />
        <Text style={styles.securityText}>Your data is encrypted and secure</Text>
      </View>
    </View>
  );

  if (isLarge) {
    return (
      <View style={styles.webRoot}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={['#2563EB', '#1D4ED8', '#1E40AF']} style={styles.webBg} />
        <View style={styles.webCard}>
          {formContent}
        </View>
      </View>
    );
  }

  // On web, KeyboardAvoidingView does nothing — use a ScrollView so the page
  // can scroll to keep the focused OTP input above the software keyboard.
  if (Platform.OS === 'web') {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        {formContent}
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      {formContent}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner:     { flex: 1, paddingHorizontal: 24, paddingTop: 56 },

  webRoot: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  webBg:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  webCard: {
    backgroundColor: COLORS.background,
    borderRadius: 28,
    width: '100%', maxWidth: 480,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: 'rgba(0,0,0,0.25)', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 1, shadowRadius: 40 },
      android: { elevation: 24 },
      default: { boxShadow: '0 20px 60px rgba(0,0,0,0.25)' } as any,
    }),
  },
  innerWeb: {
    flex: undefined,
    paddingHorizontal: 40,
    paddingVertical: 40,
    paddingTop: 32,
  },

  backBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 32,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: COLORS.primaryBg,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  title:    { fontSize: 26, fontWeight: '700', color: COLORS.foreground, marginBottom: 8 },
  subtitle: { fontSize: 15, color: COLORS.muted, lineHeight: 22, marginBottom: 32 },
  phone:    { color: COLORS.foreground, fontWeight: '700' },

  otpRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 24, gap: 8,
  },
  otpBox: {
    flex: 1, minWidth: 0, height: 60, borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceElevated,
    textAlign: 'center', fontSize: 24, fontWeight: '700',
    color: COLORS.foreground,
  },
  otpBoxFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryBg,
    color: COLORS.primary,
  },

  pasteHint: {
    fontSize: 11, color: COLORS.muted, fontStyle: 'italic',
    textAlign: 'center', marginTop: 12, marginBottom: 8,
    paddingHorizontal: 24, lineHeight: 15,
  },
  timerRow:  { alignItems: 'center', marginBottom: 32 },
  timerText: { fontSize: 14, color: COLORS.muted },
  timerBold: { fontWeight: '700', color: COLORS.foreground },
  resendText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },

  button:         { backgroundColor: COLORS.primary, borderRadius: 16, height: 56, justifyContent: 'center', alignItems: 'center' },
  buttonDisabled: { backgroundColor: COLORS.surfaceElevated },
  buttonText:         { color: COLORS.primaryFg, fontSize: 17, fontWeight: '700' },
  buttonTextDisabled: { color: COLORS.muted },

  securityRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 20,
  },
  securityText: { fontSize: 12, color: COLORS.muted },
});

export default OTPVerifyScreen;
