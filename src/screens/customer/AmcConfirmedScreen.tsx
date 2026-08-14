import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  CheckCircle, Crown, ClipboardText, House, Sparkle, Shield, Star,
} from '../../components/Icons';
import usePremiumStore from '../../store/premium.store';
import { GOLD_GRADIENT } from '../../utils/constants';
import WebContainer from '../../components/WebContainer';

// Premium palette — this screen is the "you just upgraded" moment, so it
// always renders in luxury dark + gold regardless of the user's current theme.
// We also flip the premium store on mount so the rest of the app re-skins
// before the user lands back on Home.
const PREMIUM_BG = '#0B0B0B';
const PREMIUM_SURFACE = '#161616';
const PREMIUM_BORDER = 'rgba(196,154,45,0.18)';
const PREMIUM_GOLD = '#C49A2D';
const PREMIUM_GOLD_LIGHT = 'rgba(196,154,45,0.12)';
const PREMIUM_TEXT = '#F5E9C7';
const PREMIUM_MUTED = '#8A8A8A';
const PREMIUM_SUCCESS = '#4ADE80';
const PREMIUM_SUCCESS_BG = 'rgba(74,222,128,0.14)';

const PERKS = [
  { icon: Shield, label: 'Priority scheduling' },
  { icon: Star,   label: 'Member-only discounts' },
  { icon: Sparkle, label: 'Auto-scheduled cleanings' },
];

const AmcConfirmedScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const setPremium = usePremiumStore((s) => s.setPremium);

  const { plan_label } = route.params || {};

  // Optimistic flip so Home/Profile/AMC chip render in premium theme
  // immediately when the user taps Go Home.
  useEffect(() => { setPremium(true); }, [setPremium]);

  const goHome = () =>
    navigation.reset({ index: 0, routes: [{ name: 'CustomerTabs' }] });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={PREMIUM_BG} />

      {/* Hero gradient backdrop */}
      <LinearGradient
        colors={['#1A1206', PREMIUM_BG]}
        start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject as any}
      />

      <WebContainer variant="narrow" style={{ alignItems: 'center' }}>
      <View style={s.card}>
        {/* Success halo */}
        <View style={s.iconHalo}>
          <View style={s.iconCircle}>
            <CheckCircle size={56} weight="fill" color={PREMIUM_SUCCESS} />
          </View>
          <View style={[s.sparkle, { top: -4, right: 4 }]}>
            <Sparkle size={14} weight="fill" color={PREMIUM_GOLD} />
          </View>
          <View style={[s.sparkle, { bottom: 6, left: -6 }]}>
            <Sparkle size={10} weight="fill" color={PREMIUM_GOLD} />
          </View>
        </View>

        {/* Gold crown ribbon */}
        <LinearGradient
          colors={GOLD_GRADIENT as any}
          start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
          style={s.crownPill}
        >
          <Crown size={14} weight="fill" color="#1A1206" />
          <Text style={s.crownPillText}>
            {(plan_label || 'AMC').toUpperCase()} MEMBER
          </Text>
        </LinearGradient>

        <Text style={s.title}>Welcome to Premium</Text>
        <Text style={s.subtitle}>
          Your {plan_label} Plan is active. Sit back — we'll handle the rest.
        </Text>

        <View style={s.divider} />

        {/* Perk list — three crisp rows */}
        <View style={s.perks}>
          {PERKS.map(({ icon: Icon, label }) => (
            <View key={label} style={s.perkRow}>
              <View style={s.perkIconWrap}>
                <Icon size={14} weight="fill" color={PREMIUM_GOLD} />
              </View>
              <Text style={s.perkText}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={s.infoCard}>
          <Text style={s.infoText}>
            Your first cleaning will be auto-scheduled. You'll get a notification when it's time.
          </Text>
        </View>

        {/* Gold primary CTA */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={goHome}
          style={s.primaryBtnWrap}
        >
          <LinearGradient
            colors={GOLD_GRADIENT as any}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.primaryBtn}
          >
            <House size={18} weight="fill" color="#1A1206" />
            <Text style={s.primaryBtnText}>Go to Home</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.secondaryBtn}
          onPress={() => {
            goHome();
            setTimeout(() => navigation.navigate('MyBookings'), 100);
          }}
          activeOpacity={0.7}
        >
          <ClipboardText size={18} weight="regular" color={PREMIUM_GOLD} />
          <Text style={s.secondaryBtnText}>View My Bookings</Text>
        </TouchableOpacity>
      </View>
      </WebContainer>
    </View>
  );
};

const s = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: PREMIUM_BG,
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  card: {
    backgroundColor: PREMIUM_SURFACE,
    borderRadius: 28, padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: PREMIUM_BORDER,
    width: '100%', maxWidth: 460,
    ...Platform.select({
      web: ({ boxShadow: '0 20px 60px rgba(196,154,45,0.12)' } as any),
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 24 },
      android: { elevation: 8 },
    }),
  },

  iconHalo: { position: 'relative', marginBottom: 18 },
  iconCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: PREMIUM_SUCCESS_BG,
    borderWidth: 2, borderColor: 'rgba(74,222,128,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  sparkle: { position: 'absolute' as any },

  crownPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 999, marginBottom: 16,
  },
  crownPillText: {
    fontSize: 11, fontWeight: '800', color: '#1A1206',
    letterSpacing: 1.4,
  },

  title: {
    fontSize: 26, fontWeight: '800', color: PREMIUM_TEXT,
    letterSpacing: 0.3, marginBottom: 8, textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, color: PREMIUM_MUTED, textAlign: 'center',
    lineHeight: 21, marginBottom: 22, maxWidth: 340,
  },

  divider: {
    width: 48, height: 1.5, backgroundColor: PREMIUM_GOLD_LIGHT,
    marginBottom: 18,
  },

  perks: { width: '100%', gap: 10, marginBottom: 20 },
  perkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(196,154,45,0.05)',
    borderWidth: 1, borderColor: PREMIUM_GOLD_LIGHT,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 12,
  },
  perkIconWrap: {
    width: 24, height: 24, borderRadius: 6,
    backgroundColor: PREMIUM_GOLD_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  perkText: { fontSize: 13, color: PREMIUM_TEXT, fontWeight: '600' },

  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 14,
    marginBottom: 24, width: '100%',
  },
  infoText: {
    fontSize: 12.5, color: PREMIUM_MUTED,
    textAlign: 'center', lineHeight: 19,
  },

  primaryBtnWrap: { width: '100%', borderRadius: 16, marginBottom: 12 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 16,
  },
  primaryBtnText: { color: '#1A1206', fontWeight: '800', fontSize: 16, letterSpacing: 0.3 },

  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 16, borderWidth: 1, borderColor: PREMIUM_BORDER,
  },
  secondaryBtnText: { color: PREMIUM_GOLD, fontWeight: '700', fontSize: 14 },
});

export default AmcConfirmedScreen;
