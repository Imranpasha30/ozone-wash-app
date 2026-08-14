/**
 * AdminLoginScreen — hidden, link-only entry point for admin users.
 *
 * IMPORTANT: This screen is intentionally NOT linked from any user-facing
 * surface (landing page, customer flow, app store description). The
 * super_admin shares the direct URL (`/admin-login`) with admins through
 * a private channel.
 *
 * Backend: POST /api/v1/admin-auth/login
 *   → returns admin JWT with type='admin' + session_id
 *   → auth.store.adminLogin() maps the admin record to a User { role: 'admin' }
 *     so the existing RootNavigator routes to AdminNavigator unchanged.
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuthStore from '../../store/auth.store';
import { useTheme } from '../../hooks/useTheme';
import { useResponsive } from '../../utils/responsive';
import { ShieldCheck, Eye, Lock } from '../../components/Icons';

export default function AdminLoginScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const C = useTheme();
  const { isLarge } = useResponsive();
  const adminLogin = useAuthStore((s) => s.adminLogin);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Missing info', 'Enter your username (or email) and password.');
      return;
    }
    setSubmitting(true);
    try {
      await adminLogin(username.trim(), password);
      // RootNavigator will swap to AdminNavigator automatically on next render.
    } catch (err: any) {
      Alert.alert('Login failed', err?.message || 'Invalid credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const styles = makeStyles(C);

  // Form panel — extracted so we can render it inside either the mobile stack
  // or the desktop side-by-side layout.
  const FormPanel = (
    <View style={styles.formCard}>
      <Text style={styles.formTitle}>Sign in</Text>
      <Text style={styles.formSub}>
        Use the credentials issued to you by your organization.
      </Text>

      <Text style={[styles.label, { marginTop: 20 }]}>USERNAME OR EMAIL</Text>
      <View style={styles.inputBox}>
        <TextInput
          style={styles.input}
          placeholder="e.g. ramesh.admin"
          placeholderTextColor={C.muted}
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={setUsername}
          returnKeyType="next"
        />
      </View>

      <Text style={[styles.label, { marginTop: 14 }]}>PASSWORD</Text>
      <View style={styles.inputBox}>
        <Lock size={16} weight="duotone" color={C.muted} />
        <TextInput
          style={styles.input}
          placeholder="••••••••••"
          placeholderTextColor={C.muted}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
          returnKeyType="go"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Eye size={16} weight={showPassword ? 'fill' : 'duotone'} color={C.muted} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={submit}
        disabled={submitting || isLoading || !username || !password}
        style={[styles.btn, (submitting || isLoading || !username || !password) && { opacity: 0.5 }]}
        activeOpacity={0.85}
      >
        {submitting || isLoading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>Sign in to console</Text>}
      </TouchableOpacity>

      <Text style={styles.helper}>
        Forgot your password? Contact your account administrator.{'\n'}
        For security, sessions expire after 8 hours.
      </Text>

      <View style={styles.formFooter}>
        <Text style={styles.legal}>
          Unauthorized access is logged and may be reported under the Indian IT Act, 2000.
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Landing')} activeOpacity={0.7}>
          <Text style={styles.backLink}>← Back to public site</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Hero panel — left side on desktop, top on mobile.
  const HeroPanel = (
    <LinearGradient
      colors={['#0B1F33', C.primary || '#0369A1']}
      style={[
        styles.hero,
        isLarge
          ? styles.heroDesktop
          : { paddingTop: insets.top + 32 },
      ]}
    >
      <View style={styles.lockBox}>
        <ShieldCheck size={28} weight="fill" color="#fff" />
      </View>
      <Text style={styles.brand}>OZONE WASH</Text>
      <Text style={styles.title}>Admin Console</Text>
      <Text style={styles.sub}>
        Restricted access. Sign in with the username and password issued
        to you by your organization.
      </Text>

      {isLarge && (
        <View style={styles.heroFeatures}>
          <HeroBullet C={C} text="Granular role-based permissions" />
          <HeroBullet C={C} text="Audit trail on every privileged action" />
          <HeroBullet C={C} text="8-hour session expiry with re-auth" />
        </View>
      )}
    </LinearGradient>
  );

  // Desktop: two-column split, full viewport height, no scroll.
  if (isLarge) {
    return (
      <View style={[styles.root, styles.desktopRoot]}>
        <View style={styles.desktopLeft}>{HeroPanel}</View>
        <View style={styles.desktopRight}>
          <View style={styles.formMaxWidth}>{FormPanel}</View>
        </View>
      </View>
    );
  }

  // Mobile: stacked hero + form, scrollable for short screens.
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {HeroPanel}
        <View style={styles.mobileBody}>{FormPanel}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Small bullet used in the desktop hero panel.
function HeroBullet({ C, text }: { C: any; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 12 }}>
      <View style={{
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.7)',
      }} />
      <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: '500' }}>
        {text}
      </Text>
    </View>
  );
}

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },

  // ── Desktop split layout ─────────────────────────────────────────────
  desktopRoot: {
    flexDirection: 'row',
    height: '100%',
  },
  desktopLeft: { flex: 1, minWidth: 360 },
  desktopRight: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: C.background,
  },
  formMaxWidth: { width: '100%', maxWidth: 440 },

  // ── Hero panel (mobile top, desktop left) ────────────────────────────
  hero: { paddingHorizontal: 24, paddingBottom: 36, alignItems: 'center' },
  heroDesktop: {
    flex: 1,
    paddingTop: 0,
    paddingHorizontal: 48,
    paddingVertical: 56,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  lockBox: {
    width: 64, height: 64, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  brand: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '800', letterSpacing: 2.4, marginTop: 18 },
  title: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginTop: 8 },
  sub: {
    color: 'rgba(255,255,255,0.82)', fontSize: 14, lineHeight: 22,
    marginTop: 14, maxWidth: 420,
  },
  heroFeatures: { marginTop: 28 },

  // ── Mobile body wrap ─────────────────────────────────────────────────
  mobileBody: { padding: 18, gap: 18 },

  // ── Form card ────────────────────────────────────────────────────────
  formCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 28,
    borderWidth: 1, borderColor: C.border,
    ...Platform.select({
      default: { boxShadow: '0 14px 30px rgba(11,31,51,0.08)' } as any,
      ios:     { shadowColor: 'rgba(11,31,51,0.15)', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 1, shadowRadius: 30 },
      android: { elevation: 4 },
    }),
  },
  formTitle: { fontSize: 22, fontWeight: '800', color: C.foreground, letterSpacing: -0.3 },
  formSub: { fontSize: 13, color: C.muted, marginTop: 4, lineHeight: 18 },

  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color: C.muted, marginBottom: 6 },

  inputBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
  },
  input: {
    flex: 1, fontSize: 15, color: C.foreground,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },

  btn: {
    height: 50, borderRadius: 12, marginTop: 22,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.2 },

  helper: { fontSize: 11, color: C.muted, marginTop: 14, textAlign: 'center', lineHeight: 16 },

  formFooter: {
    marginTop: 22, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: C.border,
    gap: 10,
  },
  legal: { fontSize: 10, color: C.muted, textAlign: 'center', lineHeight: 14, fontStyle: 'italic' },
  backLink: { fontSize: 12, color: C.primary, textAlign: 'center', textDecorationLine: 'underline', fontWeight: '600' },
});
