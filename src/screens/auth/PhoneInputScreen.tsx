import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useAuthStore from '../../store/auth.store';
import { COLORS } from '../../utils/constants';

const PhoneInputScreen = () => {
  const [phone, setPhone] = useState('');
  const { sendOtp, isLoading } = useAuthStore();
  const navigation = useNavigation<any>();

  const handleSendOtp = async () => {
  if (phone.length !== 10) {
    Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number');
    return;
  }
  try {
    await sendOtp(phone);
    // Navigate after OTP sent successfully
    console.log('OTP sent, navigating to OTPVerify with phone:', phone);
    navigation.navigate('OTPVerify', { phone });
  } catch (err: any) {
    console.log('sendOtp error:', err);
    Alert.alert('Error', err.message || 'Failed to send OTP');
  }
};
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoMark}>
            <View style={styles.logoRing} />
            <View style={styles.logoCore} />
          </View>
          <Text style={styles.brand}>OZONE WASH</Text>
          <Text style={styles.tagline}>Hygiene You Can See. Health You Can Feel.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.title}>Enter Your Mobile Number</Text>
          <Text style={styles.subtitle}>We'll send you a verification code</Text>

          <View style={styles.phoneInput}>
            <Text style={styles.countryCode}>🇮🇳 +91</Text>
            <TextInput
              style={styles.input}
              placeholder="9876543210"
              placeholderTextColor={COLORS.muted}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.button, phone.length !== 10 && styles.buttonDisabled]}
            onPress={handleSendOtp}
            disabled={phone.length !== 10 || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.primaryFg} />
            ) : (
              <Text style={styles.buttonText}>Send OTP</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          By continuing you agree to our Terms & Privacy Policy
        </Text>
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
    justifyContent: 'space-between',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  logoMark: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: COLORS.primaryDim,
    backgroundColor: COLORS.primaryBg,
  },
  logoCore: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 8,
  },
  brand: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.foreground,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 24,
  },
  phoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    height: 56,
    backgroundColor: COLORS.surfaceElevated,
  },
  countryCode: {
    fontSize: 16,
    marginRight: 12,
    color: COLORS.foreground,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: COLORS.foreground,
    letterSpacing: 2,
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
  footer: {
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 24,
  },
});

export default PhoneInputScreen;
