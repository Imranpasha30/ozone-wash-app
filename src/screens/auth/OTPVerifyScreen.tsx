import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import useAuthStore from '../../store/auth.store';
import { COLORS } from '../../utils/constants';

const OTPVerifyScreen = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const inputs = useRef<any[]>([]);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { phone } = route.params;
  const { verifyOtp, sendOtp, isLoading } = useAuthStore();

  // Countdown timer
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

    // Auto move to next input
    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }

    // Auto submit when all 6 digits entered
    if (index === 5 && value) {
      const fullOtp = [...newOtp].join('');
      if (fullOtp.length === 6) {
        handleVerify(fullOtp);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Go back on backspace
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
      const role = await verifyOtp(phone, code);
      // Navigation happens automatically via RootNavigator
      // based on role in auth store
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoMark}>
            <View style={styles.logoRing} />
            <View style={styles.logoCore} />
          </View>
          <Text style={styles.brand}>OZONE WASH</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{'\n'}
            <Text style={styles.phone}>+91 {phone}</Text>
          </Text>

          {/* OTP Input Boxes */}
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputs.current[index] = ref; }}
                style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                value={digit}
                onChangeText={value => handleOtpChange(value, index)}
                onKeyPress={e => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                autoFocus={index === 0}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Timer */}
          <Text style={styles.timer}>
            {timer > 0
              ? `Resend OTP in ${timer}s`
              : ''}
          </Text>

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.button, otp.join('').length !== 6 && styles.buttonDisabled]}
            onPress={() => handleVerify()}
            disabled={otp.join('').length !== 6 || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.primaryFg} />
            ) : (
              <Text style={styles.buttonText}>Verify & Login</Text>
            )}
          </TouchableOpacity>

          {/* Resend */}
          {timer === 0 && (
            <TouchableOpacity onPress={handleResend} style={styles.resend}>
              <Text style={styles.resendText}>Resend OTP</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  inner: {
    flex: 1,
    padding: 24,
  },
  header: {
    marginTop: 50,
    marginBottom: 20,
  },
  back: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoMark: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.primaryDim,
    backgroundColor: COLORS.primaryBg,
  },
  logoCore: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 6,
  },
  brand: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 4,
  },
  form: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.foreground,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 32,
    lineHeight: 22,
  },
  phone: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.foreground,
    backgroundColor: COLORS.surfaceElevated,
  },
  otpBoxFilled: {
    borderColor: COLORS.borderActive,
    backgroundColor: COLORS.primaryBg,
    color: COLORS.primary,
  },
  timer: {
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 13,
    marginBottom: 20,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: COLORS.surfaceElevated,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: COLORS.primaryFg,
    fontSize: 18,
    fontWeight: 'bold',
  },
  resend: {
    marginTop: 16,
    alignItems: 'center',
  },
  resendText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default OTPVerifyScreen;
