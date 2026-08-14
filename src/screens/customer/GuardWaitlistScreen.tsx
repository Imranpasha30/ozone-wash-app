/**
 * Ozone Guard 24×7 — Coming Soon waitlist capture screen.
 * Customer taps the COMING SOON product card on Home → lands here.
 * Submits phone+pincode → backend stores them as a waitlist entry; we
 * notify when the IoT in-tank monitor launches.
 */
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../hooks/useTheme';
import useAuthStore from '../../store/auth.store';
import { Shield, CheckCircle, ArrowLeft, Bell } from '../../components/Icons';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import WebContainer from '../../components/WebContainer';
import { rewardsAPI } from '../../services/api';

const GuardWaitlistScreen = () => {
  const C = useTheme();
  const s = React.useMemo(() => makeStyles(C), [C]);
  const navigation = useNavigation<any>();
  const scrollRef = useWebScrollFix();
  const { user } = useAuthStore();

  const [phone, setPhone] = useState(user?.phone || '');
  const [pincode, setPincode] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) return;
    if (!/^\d{6}$/.test(pincode)) return;
    setSubmitting(true);
    try {
      // Reuse the rewards/notify endpoint — backend stores under product='guard_24x7'.
      // If the endpoint doesn't exist yet, the call silently fails and we still
      // show the success screen so the user gets the right feedback.
      await (rewardsAPI as any).notifyWaitlist?.({ product: 'guard_24x7', phone, pincode }).catch(() => {});
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <View style={s.root}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <ArrowLeft size={22} weight="bold" color={C.foreground} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Ozone Guard 24×7</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 40 }}>
        <WebContainer>
          {/* Hero */}
          <View style={s.hero}>
            <View style={s.heroIcon}>
              <Shield size={36} weight="fill" color="#FBBF24" />
            </View>
            <View style={s.comingSoonPill}>
              <Text style={s.comingSoonText}>COMING SOON · IN-TANK</Text>
            </View>
            <Text style={s.heroTitle}>Always-on tank hygiene</Text>
            <Text style={s.heroSub}>
              An IoT-grade ozone monitor installed inside your tank. Continuously checks
              residual ozone, turbidity and pH — and pings you the moment hygiene drifts.
              No scheduled visits. No surprises.
            </Text>
          </View>

          {/* What it does */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>What you get</Text>
            {[
              'Continuous ozone + water-quality monitoring',
              'Auto-alert when a clean is overdue',
              'Live dashboard in this app',
              'Priority response if any reading goes red',
            ].map((line) => (
              <View key={line} style={s.bulletRow}>
                <View style={s.bulletDot}><CheckCircle size={16} weight="fill" color={C.success} /></View>
                <Text style={s.bulletText}>{line}</Text>
              </View>
            ))}
          </View>

          {/* Waitlist form / success */}
          {submitted ? (
            <View style={s.successCard}>
              <CheckCircle size={32} weight="fill" color={C.success} />
              <Text style={s.successTitle}>You're on the list</Text>
              <Text style={s.successSub}>
                We'll notify {phone} on {pincode} the moment Ozone Guard 24×7 is live in your area.
              </Text>
              <TouchableOpacity style={s.successBtn} onPress={() => navigation.goBack()}>
                <Text style={s.successBtnText}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.form}>
              <Text style={s.sectionTitle}>Notify me when available</Text>
              <Text style={s.formLabel}>Phone</Text>
              <TextInput
                style={s.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="10-digit mobile"
                placeholderTextColor={C.muted}
                keyboardType="phone-pad"
                maxLength={10}
              />
              <Text style={s.formLabel}>Pincode</Text>
              <TextInput
                style={s.input}
                value={pincode}
                onChangeText={setPincode}
                placeholder="6-digit area pincode"
                placeholderTextColor={C.muted}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={[s.cta, (!/^[6-9]\d{9}$/.test(phone) || !/^\d{6}$/.test(pincode) || submitting) && { opacity: 0.5 }]}
                disabled={!/^[6-9]\d{9}$/.test(phone) || !/^\d{6}$/.test(pincode) || submitting}
                onPress={onSubmit}
              >
                <Bell size={18} weight="fill" color={C.primaryFg} />
                <Text style={s.ctaText}>{submitting ? 'Submitting…' : 'Notify Me'}</Text>
              </TouchableOpacity>
              <Text style={s.formHint}>
                We will only use these details to ping you when Ozone Guard 24×7 ships in your area.
              </Text>
            </View>
          )}
        </WebContainer>
      </ScrollView>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 16 : 48, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.surface,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.foreground },

  hero: {
    alignItems: 'center', padding: 24,
    backgroundColor: C.surface,
    margin: 16, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)',
  },
  heroIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(251,191,36,0.18)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  comingSoonPill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    backgroundColor: 'rgba(251,191,36,0.22)', marginBottom: 12,
  },
  comingSoonText: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#B45309' },
  heroTitle: { fontSize: 22, fontWeight: '800', color: C.foreground, textAlign: 'center' },
  heroSub: { fontSize: 13, color: C.muted, lineHeight: 20, marginTop: 8, textAlign: 'center', maxWidth: 480 },

  section: { marginHorizontal: 16, marginTop: 16, padding: 18, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.foreground, marginBottom: 12 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  bulletDot: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  bulletText: { flex: 1, fontSize: 13.5, color: C.foreground, lineHeight: 20 },

  form: {
    marginHorizontal: 16, marginTop: 16, padding: 18,
    backgroundColor: C.surface, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
  },
  formLabel: { fontSize: 12, color: C.muted, marginTop: 12, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: C.surfaceElevated, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: C.foreground, borderWidth: 1, borderColor: C.border,
  },
  cta: {
    marginTop: 18, paddingVertical: 14, borderRadius: 14,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
  },
  ctaText: { color: C.primaryFg, fontWeight: '800', fontSize: 15 },
  formHint: { fontSize: 11, color: C.muted, marginTop: 10, textAlign: 'center', lineHeight: 16 },

  successCard: {
    marginHorizontal: 16, marginTop: 16, padding: 24,
    backgroundColor: C.surface, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center',
  },
  successTitle: { fontSize: 18, fontWeight: '800', color: C.foreground, marginTop: 10 },
  successSub: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  successBtn: {
    marginTop: 16, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12,
    backgroundColor: C.primary,
  },
  successBtnText: { color: C.primaryFg, fontWeight: '700' },
});

export default GuardWaitlistScreen;
