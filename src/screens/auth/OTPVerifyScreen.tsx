import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, StatusBar,
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

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputs.current[index + 1]?.focus();
    if (index === 5 && value) {
      const fullOtp = [...newOtp].join('');
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
            maxLength={1}
            autoFocus={i === 0}
            selectTextOnFocus
          />
        ))}
      </View>

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
    flex: 1, height: 60, borderRadius: 14,
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
