import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, Alert, StatusBar, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import useAuthStore from '../../store/auth.store';
import { COLORS } from '../../utils/constants';
import { useResponsive } from '../../utils/responsive';
import { ArrowRight } from '../../components/Icons';

const PhoneInputScreen = () => {
  const [phone, setPhone] = useState('');
  const { sendOtp, isLoading } = useAuthStore();
  const navigation = useNavigation<any>();
  const { isLarge } = useResponsive();

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number');
      return;
    }
    try {
      await sendOtp(phone);
      navigation.navigate('OTPVerify', { phone });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send OTP');
    }
  };

  const isValid = phone.length === 10;

  const formContent = (
    <View style={[styles.inner, isLarge && styles.innerWeb]}>
      {/* Hero Section */}
      <View style={[styles.hero, isLarge && styles.heroWeb]}>
        <View style={styles.logoWrap}>
          <Image
            source={require('../../../assets/logo.png')}
            style={[styles.logoImage, isLarge && styles.logoImageWeb]}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.brand, isLarge && styles.brandWeb]}>OZONE WASH</Text>
        <Text style={styles.tagline}>Hygiene you can see. Health you can feel.</Text>
      </View>

      {/* Form Card */}
      <View style={[styles.formCard, isLarge && styles.formCardWeb]}>
        <Text style={styles.title}>Get started</Text>
        <Text style={styles.subtitle}>Enter your mobile number to continue</Text>

        <View style={[styles.inputWrap, phone.length > 0 && styles.inputWrapFocused]}>
          <View style={styles.countryBadge}>
            <Text style={styles.flag}>🇮🇳</Text>
            <Text style={styles.countryCode}>+91</Text>
          </View>
          <View style={styles.divider} />
          <TextInput
            style={styles.input}
            placeholder="Enter mobile number"
            placeholderTextColor={COLORS.muted}
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
            autoFocus
          />
          {isValid && (
            <View style={styles.checkMark}>
              <Text style={{ color: COLORS.success, fontSize: 16, fontWeight: 'bold' }}>✓</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={handleSendOtp}
          disabled={!isValid || isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.primaryFg} />
          ) : (
            <View style={styles.buttonInner}>
              <Text style={[styles.buttonText, !isValid && styles.buttonTextDisabled]}>
                Continue
              </Text>
              <ArrowRight size={20} weight="bold" color={isValid ? COLORS.primaryFg : COLORS.muted} />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Text style={[styles.footer, isLarge && styles.footerWeb]}>
        By continuing, you agree to our{' '}
        <Text
          style={styles.link}
          onPress={() => navigation.navigate('Policy', { type: 'terms' })}
        >
          Terms of Service
        </Text>{' '}
        &{' '}
        <Text
          style={styles.link}
          onPress={() => navigation.navigate('Policy', { type: 'privacy' })}
        >
          Privacy Policy
        </Text>
      </Text>
    </View>
  );

  if (isLarge) {
    // Desktop: gradient background + centered card
    return (
      <View style={styles.webRoot}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#2563EB', '#1D4ED8', '#1E40AF']}
          style={styles.webBg}
        />
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
  // ── Mobile root ─────────────────────────────────────────────────
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 24 },

  // ── Web root ─────────────────────────────────────────────────────
  webRoot: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  webBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  webCard: {
    backgroundColor: COLORS.background,
    borderRadius: 28, padding: 0,
    width: '100%', maxWidth: 480,
    ...Platform.select({
      ios:     { shadowColor: 'rgba(0,0,0,0.25)', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 1, shadowRadius: 40 },
      android: { elevation: 24 },
      default: { boxShadow: '0 20px 60px rgba(0,0,0,0.25)' } as any,
    }),
  },
  innerWeb: {
    flex: undefined,
    paddingHorizontal: 32,
    paddingVertical: 40,
    justifyContent: 'center',
  },

  // ── Hero ────────────────────────────────────────────────────────
  hero: { alignItems: 'center', marginTop: 80 },
  heroWeb: { marginTop: 0, marginBottom: 8 },
  logoWrap: { marginBottom: 16 },
  logoImage: { width: 110, height: 110 },
  logoImageWeb: { width: 80, height: 80 },
  brand: { fontSize: 26, fontWeight: '700', color: COLORS.foreground, letterSpacing: 3 },
  brandWeb: { fontSize: 22 },
  tagline: { fontSize: 14, color: COLORS.muted, marginTop: 8, textAlign: 'center', lineHeight: 20 },

  // ── Form ────────────────────────────────────────────────────────
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24, padding: 24,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1, shadowRadius: 16, elevation: 8,
  },
  formCardWeb: {
    shadowOpacity: 0, elevation: 0, padding: 0,
    backgroundColor: 'transparent', borderRadius: 0,
  },
  title:    { fontSize: 22, fontWeight: '700', color: COLORS.foreground, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.muted, marginBottom: 24 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated, borderRadius: 16,
    height: 60, paddingHorizontal: 16,
    borderWidth: 1.5, borderColor: COLORS.border,
    marginBottom: 20,
  },
  inputWrapFocused: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
  countryBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flag:          { fontSize: 20 },
  countryCode:   { fontSize: 16, fontWeight: '600', color: COLORS.foreground },
  divider:       { width: 1, height: 24, backgroundColor: COLORS.border, marginHorizontal: 14 },
  input: {
    flex: 1, fontSize: 18, fontWeight: '600', color: COLORS.foreground, letterSpacing: 1.5,
  },
  checkMark: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.successBg,
    alignItems: 'center', justifyContent: 'center',
  },

  // ── CTA Button ──────────────────────────────────────────────────
  button: {
    backgroundColor: COLORS.primary, borderRadius: 16, height: 56,
    justifyContent: 'center', alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: COLORS.surfaceElevated },
  buttonInner:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText:     { color: COLORS.primaryFg, fontSize: 17, fontWeight: '700' },
  buttonTextDisabled: { color: COLORS.muted },

  // ── Footer ──────────────────────────────────────────────────────
  footer: {
    textAlign: 'center', color: COLORS.muted, fontSize: 12,
    marginBottom: 32, lineHeight: 18, paddingHorizontal: 24,
  },
  footerWeb: { marginBottom: 0, marginTop: 16, paddingHorizontal: 0 },
  link: { color: COLORS.primary, fontWeight: '600' },
});

export default PhoneInputScreen;
