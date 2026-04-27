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
  ArrowLeft, ArrowRight, MapPin, Phone, Envelope, ShieldCheck,
  Leaf, Lightning, Star, Buildings, Flask, Certificate, Drop,
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

const VALUES = [
  { Icon: Leaf,        title: 'Chemical-free hygiene',  desc: 'Ozone breaks down into oxygen after every clean. Zero residue, zero compromise.' },
  { Icon: ShieldCheck, title: 'Proof, not promises',     desc: 'Every visit ends with a QR-signed certificate. ATP readings, photos, signatures.' },
  { Icon: Lightning,   title: 'Under 2 hours',           desc: 'Single-visit service window. No second trip, no mess, no mid-week disruption.' },
  { Icon: Star,        title: 'EcoScore tracking',       desc: 'Your tank health gets a number. Track it, share it, defend it at audits.' },
];

const MILESTONES = [
  { y: '2024', t: 'Founded',           d: 'VijRam Health Sense incorporated in Hyderabad with a single goal: certified water hygiene for India.' },
  { y: '2025', t: 'Patent applied',    d: 'Filed our 8-step Ozone hygiene process for patent protection.' },
  { y: '2026', t: 'App-enabled launch', d: 'Released the Ozone Wash mobile and web platform. 500+ tanks cleaned in the first quarter.' },
  { y: 'Next', t: 'Pan-India rollout',  d: 'Expanding the certified-hygiene network city by city through verified partner crews.' },
];

const STATS = [
  { v: '500+', l: 'Tanks cleaned' },
  { v: '4.9',  l: 'Customer rating' },
  { v: '100+', l: 'Happy families' },
  { v: '8',    l: 'Step process' },
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
              Water hygiene,{'\n'}re-engineered for India.
            </Text>
            <Text style={[s.heroSub, isLarge && { textAlign: 'center', maxWidth: 720, alignSelf: 'center' }]}>
              We're VijRam Health Sense, a Hyderabad company building the country's first app-enabled, certificate-proven water tank hygiene service. Our crews are uniformed and verified. Our process is patent-applied. Our proof is QR-signed.
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
              <Text style={s.companyDesc}>
                Founded in Hyderabad, VijRam Health Sense builds public-health products that turn invisible hygiene risks into verifiable, shareable proof. Ozone Wash is our flagship service: replacing chemical scrubs and guesswork with lab-grade Ozone treatment and digital certification.
              </Text>
              <View style={s.companyMeta}>
                <View style={s.metaRow}>
                  <MapPin size={14} weight="fill" color={B.primaryDk} />
                  <Text style={s.metaText}>Hyderabad, Telangana, India</Text>
                </View>
                <View style={s.metaRow}>
                  <Buildings size={14} weight="fill" color={B.primaryDk} />
                  <Text style={s.metaText}>Tank & sump hygiene platform</Text>
                </View>
                <View style={s.metaRow}>
                  <Flask size={14} weight="fill" color={B.primaryDk} />
                  <Text style={s.metaText}>Patent-applied 8-step process</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* MISSION + VISION */}
        <View style={[s.section, { paddingHorizontal: pad }, isLarge && { maxWidth: 1100, alignSelf: 'center', width: '100%' }]}>
          <View style={[isLarge && { flexDirection: 'row', gap: 24 }]}>
            <View style={[s.mvCard, isLarge && { flex: 1 }]}>
              <View style={s.mvIconBox}>
                <Drop size={22} color={B.primary} weight="fill" />
              </View>
              <Text style={s.mvLabel}>OUR MISSION</Text>
              <Text style={s.mvTitle}>Make every drop accountable.</Text>
              <Text style={s.mvBody}>
                Replace chemical guesswork with certified Ozone hygiene. Every tank we touch leaves measurably cleaner, with a QR proof you can share with tenants, regulators, or your conscience.
              </Text>
            </View>
            <View style={[s.mvCard, isLarge && { flex: 1 }, !isLarge && { marginTop: 14 }]}>
              <View style={s.mvIconBox}>
                <Certificate size={22} color={B.primary} weight="fill" />
              </View>
              <Text style={s.mvLabel}>OUR VISION</Text>
              <Text style={s.mvTitle}>Certified water for a billion.</Text>
              <Text style={s.mvBody}>
                Build India's largest network of trained, traceable water hygiene professionals. Make compliance proof a default, not a privilege. Take Ozone Wash from Hyderabad to every tier-1 and tier-2 city.
              </Text>
            </View>
          </View>
        </View>

        {/* VALUES */}
        <View style={[s.section, { paddingHorizontal: pad, backgroundColor: B.surfaceAlt }, isLarge && { maxWidth: undefined }]}>
          <View style={isLarge ? { maxWidth: 1100, alignSelf: 'center', width: '100%' } : undefined}>
            <Text style={[s.sectionLabel, isLarge && { textAlign: 'center' }]}>WHAT WE STAND FOR</Text>
            <Text style={[s.sectionTitle, isLarge && { textAlign: 'center' }]}>Built different, end to end.</Text>
            <View style={[s.valuesGrid, isLarge && { flexDirection: 'row', gap: 18 }]}>
              {VALUES.map((v, i) => (
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

        {/* STATS BAND */}
        <View style={[s.section, { paddingHorizontal: pad }, isLarge && { maxWidth: 1100, alignSelf: 'center', width: '100%' }]}>
          <View style={[s.statsCard, isLarge && { flexDirection: 'row' }]}>
            {STATS.map((st, i) => (
              <View key={i} style={[s.statItem, i > 0 && (isLarge ? s.statDividerLg : s.statDivider)]}>
                <Text style={s.statV}>{st.v}</Text>
                <Text style={s.statL}>{st.l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* TIMELINE */}
        <View style={[s.section, { paddingHorizontal: pad, backgroundColor: B.surfaceAlt }]}>
          <View style={isLarge ? { maxWidth: 900, alignSelf: 'center', width: '100%' } : undefined}>
            <Text style={[s.sectionLabel, isLarge && { textAlign: 'center' }]}>OUR JOURNEY</Text>
            <Text style={[s.sectionTitle, isLarge && { textAlign: 'center' }]}>Where we are. Where we're headed.</Text>
            <View style={s.timeline}>
              <View style={s.timelineLine} />
              {MILESTONES.map((m, i) => (
                <View key={i} style={s.timelineRow}>
                  <View style={s.timelineDot}>
                    <Text style={s.timelineDotText}>{m.y}</Text>
                  </View>
                  <View style={s.timelineCard}>
                    <Text style={s.timelineTitle}>{m.t}</Text>
                    <Text style={s.timelineDesc}>{m.d}</Text>
                  </View>
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
                <Text style={s.contactValue}>+91 98481 44854</Text>
              </View>
              <View style={[s.contactItem, isLarge && { flex: 1 }]}>
                <Envelope size={18} weight="regular" color={B.aqua} />
                <Text style={s.contactLabel}>Email</Text>
                <Text style={s.contactValue}>hello@ozonewash.in</Text>
              </View>
              <View style={[s.contactItem, isLarge && { flex: 1 }]}>
                <MapPin size={18} weight="regular" color={B.aqua} />
                <Text style={s.contactLabel}>Office</Text>
                <Text style={s.contactValue}>Hyderabad, Telangana</Text>
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

  // Hero
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
  heroTitle: { color: '#fff', fontSize: 34, fontWeight: '800', letterSpacing: -1.2, lineHeight: 42, marginBottom: 14 },
  heroTitleLg: { fontSize: 64, lineHeight: 72, letterSpacing: -2.5, textAlign: 'center', marginTop: 6 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 24 },

  // Sections
  section: { paddingVertical: 36 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 2.4, color: B.primaryDk, marginBottom: 8 },
  sectionTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.8, color: B.ink, marginBottom: 20, lineHeight: 34 },

  // Company card
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
  companyName:    { fontSize: 22, fontWeight: '800', color: B.ink, letterSpacing: -0.6, lineHeight: 28 },
  companyDesc:    { fontSize: 14, color: B.muted, lineHeight: 22, marginTop: 12, marginBottom: 16 },
  companyMeta:    { gap: 8 },
  metaRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText:       { fontSize: 13, color: B.inkSoft, fontWeight: '600' },

  // Mission / Vision
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

  // Values
  valuesGrid:   { gap: 12 },
  valueCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: B.line,
  },
  valueIconBox: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: B.aqua,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  valueTitle: { fontSize: 15, fontWeight: '800', color: B.ink, marginBottom: 6 },
  valueDesc:  { fontSize: 13, color: B.muted, lineHeight: 20 },

  // Stats
  statsCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 22,
    borderWidth: 1, borderColor: B.line,
    flexDirection: 'row', flexWrap: 'wrap',
  },
  statItem:        { flex: 1, alignItems: 'center', minWidth: '40%', paddingVertical: 8 },
  statDivider:     { borderLeftWidth: 1, borderLeftColor: B.line },
  statDividerLg:   { borderLeftWidth: 1, borderLeftColor: B.line },
  statV: { fontSize: 28, fontWeight: '800', color: B.ink, letterSpacing: -1, lineHeight: 34 },
  statL: { fontSize: 11, fontWeight: '700', color: B.muted, letterSpacing: 0.5, marginTop: 4, textAlign: 'center' },

  // Timeline
  timeline: { position: 'relative', paddingLeft: 20 },
  timelineLine: {
    position: 'absolute', left: 38, top: 12, bottom: 12, width: 2,
    backgroundColor: B.line,
  },
  timelineRow: { flexDirection: 'row', gap: 18, marginBottom: 16, alignItems: 'flex-start' },
  timelineDot: {
    width: 56, height: 36, borderRadius: 18,
    backgroundColor: B.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    ...Platform.select({
      default: { boxShadow: '0 6px 14px rgba(2,132,199,0.3)' } as any,
      ios:     { shadowColor: 'rgba(2,132,199,0.4)', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 14 },
      android: { elevation: 4 },
    }),
  },
  timelineDotText: { color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 0.4 },
  timelineCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: B.line },
  timelineTitle: { fontSize: 15, fontWeight: '800', color: B.ink, marginBottom: 4 },
  timelineDesc:  { fontSize: 13, color: B.muted, lineHeight: 20 },

  // Contact
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

  // Final CTA
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
