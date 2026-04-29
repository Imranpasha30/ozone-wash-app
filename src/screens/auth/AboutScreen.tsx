import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Platform, Image, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../../utils/responsive';
import {
  ArrowLeft, ArrowRight, MapPin, Phone, Envelope,
  Certificate, Drop, Flask, ShieldCheck, Sparkle, Star,
  Buildings, User,
} from '../../components/Icons';

const B = {
  primary:    '#0EA5E9',
  primaryDk:  '#0369A1',
  primaryDkr: '#0C4A6E',
  leaf:       '#22C55E',
  ink:        '#0B1F33',
  inkSoft:    '#334155',
  muted:      '#64748B',
  line:       '#E2E8F0',
  surface:    '#FFFFFF',
  surfaceAlt: '#F4F8FB',
  aqua:       '#E0F2FE',
};

const INNOVATION = [
  {
    Icon: ShieldCheck,
    title: 'India’s 1st Patent-Applied 8-Step Hygiene Process',
    desc: 'Ozone + UV sterilization, proof-based testing, and QR-verified certificates.',
  },
  {
    Icon: Star,
    title: 'EcoScore™ Dashboard',
    desc: 'A gamified hygiene rating system that tracks compliance, rewards streaks, and offers AMC discounts.',
  },
  {
    Icon: Sparkle,
    title: 'AMC + Hygiene Upgrades',
    desc: 'Structured service ladder with recurring compliance and premium add-ons with App automation.',
  },
];

const FOUNDERS = [
  {
    name: 'Ramesh Kumar Sappa',
    role: 'Co-founder',
    bio: 'IIM-trained Business Management professional with 30+ years of leadership across FMCG, insurance, telecom, forex, and travel. Award-winning leader with expertise in sales, operational excellence, product launches, and premium branding.',
  },
  {
    name: 'Shanmuga Valli S',
    role: 'Co-founder',
    bio: 'Co-founder with strengths in financial consultancy, execution, compliance, and customer-centric operations.',
  },
];

const AboutScreen = () => {
  const navigation = useNavigation<any>();
  const insets     = useSafeAreaInsets();
  const { isLarge } = useResponsive();

  const scrollRef = useRef<any>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const sv = scrollRef.current;
    if (!sv) return;
    const inner = (sv.getScrollableNode?.() ?? sv) as HTMLElement;
    if (inner?.style) {
      inner.style.maxHeight = '100vh';
      inner.style.overflowY = 'scroll';
    }
  }, []);

  const pad = isLarge ? 48 : 20;
  const goBook = () => navigation.navigate('PhoneInput');

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView ref={scrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* HERO */}
        <LinearGradient colors={[B.primaryDkr, B.primaryDk, B.primary]} style={[s.hero, { paddingTop: insets.top + 24 }]}>
          <View style={[s.heroInner, { paddingHorizontal: pad }, isLarge && { maxWidth: 1100, alignSelf: 'center', width: '100%' }]}>
            <View style={s.heroTopRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.8}>
                <ArrowLeft size={20} color="#fff" weight="bold" />
              </TouchableOpacity>
              <View style={s.heroBrand}>
                <Image source={require('../../../assets/logo.png')} style={s.heroLogo} resizeMode="contain" />
                <Text style={s.heroBrandText}>OZONE WASH</Text>
              </View>
            </View>

            <Text style={[s.eyebrow, isLarge && { textAlign: 'center' }]}>ABOUT US</Text>
            <Text style={[s.heroTitle, isLarge && s.heroTitleLg]}>
              India’s 1st patent-applied,{'\n'}app-enabled tank hygiene service.
            </Text>
            <Text style={[s.heroSub, isLarge && { textAlign: 'center', maxWidth: 760, alignSelf: 'center' }]}>
              Ozone Wash{'™'} is headquartered in Hyderabad, Telangana, and powered by VijRam Health Sense Pvt. Ltd. We are a DPIIT-recognized Start-Up India company, combining science, compliance, and eco-tech innovation to protect households, RWAs, hospitals, and institutions from waterborne risks.
            </Text>
          </View>
        </LinearGradient>

        {/* COMPANY CARD */}
        <View style={[s.section, { paddingHorizontal: pad }, isLarge && { maxWidth: 1100, alignSelf: 'center', width: '100%' }]}>
          <View style={[s.companyCard, isLarge && { flexDirection: 'row', gap: 40, alignItems: 'center' }]}>
            <View style={[s.companyLogoBox, isLarge && { width: 200, height: 200 }]}>
              <Image source={require('../../../assets/logo.png')} style={isLarge ? s.companyLogoLg : s.companyLogo} resizeMode="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.companyEyebrow}>POWERED BY</Text>
              <Text style={[s.companyName, isLarge && { fontSize: 32, lineHeight: 38 }]}>VijRam Health Sense Pvt. Ltd.</Text>
              <View style={s.companyMeta}>
                <View style={s.metaRow}>
                  <MapPin size={14} weight="fill" color={B.primaryDk} />
                  <Text style={s.metaText}>Hyderabad, Telangana, India</Text>
                </View>
                <View style={s.metaRow}>
                  <Buildings size={14} weight="fill" color={B.primaryDk} />
                  <Text style={s.metaText}>DPIIT-recognized Start-Up India company</Text>
                </View>
                <View style={s.metaRow}>
                  <Flask size={14} weight="fill" color={B.primaryDk} />
                  <Text style={s.metaText}>Patent-applied 8-step hygiene process</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* OUR INNOVATION */}
        <View style={[s.section, { paddingHorizontal: pad, backgroundColor: B.surfaceAlt }]}>
          <View style={isLarge ? { maxWidth: 1100, alignSelf: 'center', width: '100%' } : undefined}>
            <Text style={[s.sectionLabel, isLarge && { textAlign: 'center' }]}>OUR INNOVATION</Text>
            <Text style={[s.sectionTitle, isLarge && { textAlign: 'center' }]}>What sets Ozone Wash apart.</Text>
            <View style={[s.valuesGrid, isLarge && { flexDirection: 'row', gap: 18 }]}>
              {INNOVATION.map((v, i) => (
                <View key={i} style={[s.valueCard, isLarge && { flex: 1 }]}>
                  <View style={s.valueIconBox}>
                    <v.Icon size={24} color={B.primaryDk} weight="duotone" />
                  </View>
                  <Text style={s.valueTitle}>{v.title}</Text>
                  <Text style={s.valueDesc}>{v.desc}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* VISION + MISSION */}
        <View style={[s.section, { paddingHorizontal: pad }, isLarge && { maxWidth: 1100, alignSelf: 'center', width: '100%' }]}>
          <View style={[isLarge && { flexDirection: 'row', gap: 24 }]}>
            <View style={[s.mvCard, isLarge && { flex: 1 }]}>
              <View style={s.mvIconBox}>
                <Certificate size={22} color={B.primary} weight="fill" />
              </View>
              <Text style={s.mvLabel}>OUR VISION</Text>
              <Text style={s.mvTitle}>Set the benchmark for eco-friendly hygiene.</Text>
              <Text style={s.mvBody}>
                To set the benchmark for eco-friendly, patent-backed hygiene services across India, making tank hygiene visible, verifiable, and sustainable.
              </Text>
            </View>
            <View style={[s.mvCard, isLarge && { flex: 1 }, !isLarge && { marginTop: 14 }]}>
              <View style={s.mvIconBox}>
                <Drop size={22} color={B.primary} weight="fill" />
              </View>
              <Text style={s.mvLabel}>OUR MISSION</Text>
              <Text style={s.mvTitle}>Proof-based hygiene for every home.</Text>
              <Text style={s.mvBody}>
                To make proof-based hygiene accessible to every household, gated community, and institution {'—'} ensuring compliance, safety, and health through innovation.
              </Text>
            </View>
          </View>
        </View>

        {/* FOUNDERS */}
        <View style={[s.section, { paddingHorizontal: pad, backgroundColor: B.surfaceAlt }]}>
          <View style={isLarge ? { maxWidth: 1100, alignSelf: 'center', width: '100%' } : undefined}>
            <Text style={[s.sectionLabel, isLarge && { textAlign: 'center' }]}>FOUNDERS</Text>
            <Text style={[s.sectionTitle, isLarge && { textAlign: 'center' }]}>The team behind Ozone Wash.</Text>
            <View style={[isLarge && { flexDirection: 'row', gap: 18 }]}>
              {FOUNDERS.map((f, i) => (
                <View key={i} style={[s.founderCard, isLarge && { flex: 1 }, !isLarge && i > 0 && { marginTop: 14 }]}>
                  <View style={s.founderAvatar}>
                    <User size={28} color={B.primaryDk} weight="duotone" />
                  </View>
                  <Text style={s.founderName}>{f.name}</Text>
                  <Text style={s.founderRole}>{f.role}</Text>
                  <Text style={s.founderBio}>{f.bio}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* CONTACT */}
        <View style={[s.section, { paddingHorizontal: pad }, isLarge && { maxWidth: 1100, alignSelf: 'center', width: '100%' }]}>
          <LinearGradient colors={[B.ink, B.primaryDkr]} style={s.contactCard}>
            <Text style={s.contactTitle}>Get in touch.</Text>
            <Text style={s.contactBody}>
              Talk to founders, partners, or the on-call hygiene team. We answer everything from RWA bulk pricing to nerdy questions about Ozone half-life.
            </Text>
            <View style={[s.contactGrid, isLarge && { flexDirection: 'row', gap: 14 }]}>
              <View style={[s.contactItem, isLarge && { flex: 1 }]}>
                <Phone size={18} weight="regular" color={B.aqua} />
                <Text style={s.contactLabel}>Call</Text>
                <Text style={s.contactValue}>81 79 69 59 59</Text>
              </View>
              <View style={[s.contactItem, isLarge && { flex: 1 }]}>
                <Envelope size={18} weight="regular" color={B.aqua} />
                <Text style={s.contactLabel}>Email</Text>
                <Text style={s.contactValue}>hello@ozonewash.in</Text>
              </View>
              <View style={[s.contactItem, isLarge && { flex: 1 }]}>
                <MapPin size={18} weight="regular" color={B.aqua} />
                <Text style={s.contactLabel}>Office</Text>
                <Text style={s.contactValue}>Flat No 201, Sai Krishna Thakur Residency, Padmaraonagar, Secunderabad, Hyderabad, Telangana - 500 020</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* FINAL CTA */}
        <View style={[s.section, { alignItems: 'center', paddingHorizontal: pad }]}>
          <Text style={s.finalCtaTitle}>Ready to see the difference?</Text>
          <TouchableOpacity onPress={goBook} style={s.bookBtn} activeOpacity={0.85}>
            <Text style={s.bookBtnText}>Book your first clean</Text>
            <ArrowRight size={18} weight="bold" color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: B.surface },

  hero: { paddingBottom: 48, overflow: 'hidden' },
  heroInner: { width: '100%' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroLogo: { width: 28, height: 28 },
  heroBrandText: { color: '#fff', fontWeight: '800', letterSpacing: 2.2, fontSize: 13 },

  eyebrow: { color: '#BAE6FD', fontSize: 11, fontWeight: '800', letterSpacing: 2.4, marginBottom: 12 },
  heroTitle: { color: '#fff', fontSize: 32, fontWeight: '800', letterSpacing: -1.2, lineHeight: 40, marginBottom: 14 },
  heroTitleLg: { fontSize: 56, lineHeight: 64, letterSpacing: -2.2, textAlign: 'center', marginTop: 6 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 24 },

  section: { paddingVertical: 36 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 2.4, color: B.primaryDk, marginBottom: 8 },
  sectionTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.8, color: B.ink, marginBottom: 20, lineHeight: 34 },

  companyCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: B.line,
    ...Platform.select({
      default: { boxShadow: '0 14px 30px rgba(2,132,199,0.08)' } as any,
      ios:     { shadowColor: 'rgba(2,132,199,0.15)', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 1, shadowRadius: 30 },
      android: { elevation: 4 },
    }),
  },
  companyLogoBox: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: B.aqua, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  companyLogo:    { width: 56, height: 56 },
  companyLogoLg:  { width: 140, height: 140 },
  companyEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 2, color: B.primaryDk, marginBottom: 6 },
  companyName:    { fontSize: 22, fontWeight: '800', color: B.ink, letterSpacing: -0.6, lineHeight: 28, marginBottom: 14 },
  companyMeta:    { gap: 8 },
  metaRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText:       { fontSize: 13, color: B.inkSoft, fontWeight: '600' },

  mvCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: B.line,
  },
  mvIconBox: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: B.aqua,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  mvLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 2, color: B.primaryDk, marginBottom: 6 },
  mvTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: B.ink, marginBottom: 10, lineHeight: 28 },
  mvBody:  { fontSize: 14, color: B.muted, lineHeight: 22 },

  valuesGrid:   { gap: 12 },
  valueCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: B.line,
  },
  valueIconBox: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: B.aqua,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  valueTitle: { fontSize: 15, fontWeight: '800', color: B.ink, marginBottom: 6, lineHeight: 22 },
  valueDesc:  { fontSize: 13, color: B.muted, lineHeight: 20 },

  founderCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: B.line,
  },
  founderAvatar: {
    width: 64, height: 64, borderRadius: 999, backgroundColor: B.aqua,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  founderName: { fontSize: 20, fontWeight: '800', color: B.ink, letterSpacing: -0.4, marginBottom: 4 },
  founderRole: { fontSize: 12, fontWeight: '800', color: B.primaryDk, letterSpacing: 1.5, marginBottom: 12 },
  founderBio:  { fontSize: 14, color: B.muted, lineHeight: 22 },

  contactCard: { borderRadius: 24, padding: 28, overflow: 'hidden' },
  contactTitle: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -0.6, marginBottom: 8 },
  contactBody: { color: 'rgba(255,255,255,0.78)', fontSize: 14, lineHeight: 22, marginBottom: 22, maxWidth: 520 },
  contactGrid: { gap: 12 },
  contactItem: {
    paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'column', gap: 6,
  },
  contactLabel: { color: B.aqua, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  contactValue: { color: '#fff', fontSize: 15, fontWeight: '700' },

  finalCtaTitle: { fontSize: 18, color: B.muted, marginBottom: 14, textAlign: 'center' },
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: B.primary, paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: 14,
    ...Platform.select({
      default: { boxShadow: '0 14px 30px rgba(2,132,199,0.4)' } as any,
      ios:     { shadowColor: 'rgba(2,132,199,0.5)', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 1, shadowRadius: 30 },
      android: { elevation: 6 },
    }),
  },
  bookBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

export default AboutScreen;
