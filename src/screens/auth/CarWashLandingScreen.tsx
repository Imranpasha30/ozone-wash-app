/**
 * CarWashLandingScreen — public marketing landing page for Ozone Auto Wash.
 * Spec: Auto Wash Scope PDF Section 6.2.
 *
 * 9 sections:
 *   1. Hero
 *   2. How it works (6-step visual)
 *   3. Before/after gallery (placeholder photos)
 *   4. Packages & pricing
 *   5. Add-ons grid
 *   6. Why EV (3 stat cards)
 *   7. Testimonials (placeholder)
 *   8. FAQ (8 entries)
 *   9. Sticky Book Now button
 *
 * URL: /car-wash  (auth nav screen, name="CarWash")
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Platform, Image, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { autoWashAPI } from '../../services/api';
import { useResponsive } from '../../utils/responsive';
import {
  ArrowLeft, ArrowRight, Car, Drop, Sparkle, Wrench, Eye, Lock,
  Lightning, Leaf, ShieldCheck, CheckCircle, Flask,
} from '../../components/Icons';

const B = {
  primary:    '#0EA5E9',
  primaryDk:  '#0369A1',
  primaryDkr: '#0C4A6E',
  leaf:       '#22C55E',
  leafDk:     '#16A34A',
  ink:        '#0B1F33',
  inkSoft:    '#334155',
  muted:      '#64748B',
  line:       '#E2E8F0',
  surface:    '#FFFFFF',
  surfaceAlt: '#F4F8FB',
  aqua:       '#E0F2FE',
};

const STEPS_VISUAL = [
  { num: '01', Icon: Drop,      t: 'Mist Pre-Rinse',     d: 'Gentle ozone-treated mist loosens dirt without scratching paint.' },
  { num: '02', Icon: Sparkle,   t: 'Eco-Foam',           d: 'pH-neutral plant-based foam lifts grime with zero chemicals.' },
  { num: '03', Icon: Flask,     t: 'Ozone Rinse',        d: 'Active ozone neutralises bacteria, allergens, and odours on contact.' },
  { num: '04', Icon: Lightning, t: 'Precision Dry',      d: 'Microfibre + air-dry leaves a streak-free, swirl-free finish.' },
  { num: '05', Icon: Wrench,    t: 'Interior Steam',     d: '120°C steam disinfects seats, mats, and dashboard surfaces.' },
  { num: '06', Icon: Eye,       t: 'Cabin Ozone Fog',    d: '8-12 min ozone fogging eliminates AC mould, smoke, and pet odours.' },
];

const FAQS = [
  { q: 'Is ozone safe for my car?', a: 'Yes. Ozone is gentler than detergents on paint and trim, and decomposes to oxygen within minutes. Used by mineral-water brands worldwide.' },
  { q: 'How long does a wash take?', a: 'EcoRinse 30-45 min. OzoneComplete with cabin fogging is 60-75 min. We arrive at your address — you don\'t go anywhere.' },
  { q: 'Do I need to be home?', a: 'Only to unlock the gate. After that, the crew works on its own. You get live updates via WhatsApp.' },
  { q: 'How much water do you use?', a: '~3 litres per wash vs ~50 litres at a traditional car wash. That\'s a 94% saving — and zero soapy runoff into drains.' },
  { q: 'Can I cancel a subscription?', a: 'Yes. Weekly and monthly plans have no lock-in. Quarterly+ plans require 1-month notice. Pause anytime for up to 30 days.' },
  { q: 'Why is the cabin fogging 15 min waiting period needed?', a: 'Ozone needs time to dissipate back into oxygen. Don\'t enter for 15 min after fogging — perfectly safe after.' },
  { q: 'Do you service gated communities?', a: 'Yes. Our EV unit is silent, has zero emissions, and is permitted where conventional wash vans are not. Mark "gated community" when booking.' },
  { q: 'Is the hygiene certificate real?', a: 'Yes — QR-signed, scannable, and ties to a server record showing ozone dosing, water used, and crew ID. Shareable with anyone.' },
];

const WHY_EV = [
  { Icon: Drop,        n: '94%',  l: 'Less water used vs traditional wash' },
  { Icon: Leaf,        n: 'Zero', l: 'Emissions during service · EV-powered' },
  { Icon: ShieldCheck, n: 'Yes',  l: 'Allowed in every gated community' },
];

type Pkg = {
  code: string; display_name: string; tagline: string;
  features: string[];
  price_hatchback_paise: number; price_sedan_paise: number;
  price_suv_paise: number; price_luxury_paise: number;
};

type Addon = {
  code: string; display_name: string; benefit: string;
  price_hatchback_paise: number;
  coming_soon: boolean;
};

function rupees(paise: number): string {
  return '₹' + (paise / 100).toLocaleString('en-IN');
}

export default function CarWashLandingScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isLarge } = useResponsive();

  const [packages, setPackages] = useState<Pkg[]>([]);
  const [addons, setAddons]     = useState<Addon[]>([]);

  useEffect(() => {
    autoWashAPI.getPackages().then((r: any) => setPackages(r.data?.packages || [])).catch(() => {});
    autoWashAPI.getAddons().then((r: any) => setAddons(r.data?.addons || [])).catch(() => {});
  }, []);

  const goToBook = () => navigation.navigate('PhoneInput');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* ── 1. HERO ──────────────────────────────────────────────────── */}
        <LinearGradient colors={[B.primaryDkr, B.primaryDk, B.primary]} style={[styles.hero, { paddingTop: insets.top + 18 }]}>
          <View style={[styles.heroInner, isLarge && { maxWidth: 1100, alignSelf: 'center', width: '100%' }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.85}>
              <ArrowLeft size={18} weight="bold" color="#fff" />
            </TouchableOpacity>

            <View style={[styles.evBadge]}>
              <Leaf size={11} weight="fill" color="#86EFAC" />
              <Text style={styles.evBadgeText}>EV-POWERED · ZERO EMISSIONS</Text>
            </View>

            <Text style={[styles.heroTitle, isLarge && { fontSize: 56, lineHeight: 60 }]}>
              India's first chemical-free,{'\n'}
              <Text style={styles.heroTitleAccent}>EV doorstep car hygiene.</Text>
            </Text>
            <Text style={[styles.heroSub, isLarge && { maxWidth: 600 }]}>
              We park outside your home, plug nothing in, and leave with your car cabin
              hygiene-certified. ~3 L of water. Zero detergents. QR-signed proof.
            </Text>

            <View style={styles.heroCtas}>
              <TouchableOpacity onPress={goToBook} style={styles.ctaPrimary} activeOpacity={0.85}>
                <Text style={styles.ctaPrimaryText}>Book Your Wash</Text>
                <ArrowRight size={18} weight="bold" color={B.primaryDkr} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('Landing')} style={styles.ctaGhost} activeOpacity={0.85}>
                <Text style={styles.ctaGhostText}>Also clean tanks →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.heroStats}>
              {WHY_EV.map((s, i) => (
                <View key={i} style={styles.heroStat}>
                  <Text style={styles.heroStatN}>{s.n}</Text>
                  <Text style={styles.heroStatL}>{s.l}</Text>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>

        {/* ── 2. HOW IT WORKS ──────────────────────────────────────────── */}
        <View style={[styles.section, isLarge && { paddingHorizontal: 48 }]}>
          <Text style={styles.sectionLabel}>THE PROCESS</Text>
          <Text style={[styles.sectionTitle, isLarge && { fontSize: 36, textAlign: 'center' }]}>
            6 steps. One visit. Hygiene-certified.
          </Text>
          <View style={[styles.stepGrid, isLarge && { flexDirection: 'row', flexWrap: 'wrap', gap: 18 }]}>
            {STEPS_VISUAL.map((step, i) => (
              <View key={i} style={[styles.stepCard, isLarge && { width: '31%' }]}>
                <View style={styles.stepIconBox}>
                  <step.Icon size={22} weight="duotone" color={B.primaryDk} />
                </View>
                <Text style={styles.stepNum}>{step.num}</Text>
                <Text style={styles.stepTitle}>{step.t}</Text>
                <Text style={styles.stepDesc}>{step.d}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── 3. PACKAGES & PRICING ────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: B.surfaceAlt }, isLarge && { paddingHorizontal: 48 }]}>
          <Text style={styles.sectionLabel}>PACKAGES</Text>
          <Text style={[styles.sectionTitle, isLarge && { fontSize: 36, textAlign: 'center' }]}>Pick your wash.</Text>
          <Text style={[styles.sectionSub, isLarge && { textAlign: 'center', maxWidth: 600, alignSelf: 'center' }]}>
            Hatchback pricing shown. SUV / MUV typically 20-25% higher. Final price quoted at booking.
          </Text>
          <View style={[styles.pkgGrid, isLarge && { flexDirection: 'row', gap: 18, marginTop: 24 }]}>
            {packages.map((p) => (
              <View key={p.code} style={[styles.pkgCard, isLarge && { flex: 1 }]}>
                <Text style={styles.pkgName}>{p.display_name}</Text>
                <Text style={styles.pkgPrice}>{rupees(p.price_hatchback_paise)}</Text>
                <Text style={styles.pkgTag}>{p.tagline}</Text>
                {Array.isArray(p.features) && (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    {p.features.map((f, i) => (
                      <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                        <CheckCircle size={14} weight="fill" color={B.leaf} style={{ marginTop: 3 }} />
                        <Text style={styles.pkgFeature}>{f}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <TouchableOpacity onPress={goToBook} style={styles.pkgBtn} activeOpacity={0.85}>
                  <Text style={styles.pkgBtnText}>Book {p.display_name}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* ── 4. ADD-ONS ───────────────────────────────────────────────── */}
        <View style={[styles.section, isLarge && { paddingHorizontal: 48 }]}>
          <Text style={styles.sectionLabel}>HYGIENE UPGRADES</Text>
          <Text style={[styles.sectionTitle, isLarge && { fontSize: 36, textAlign: 'center' }]}>Stack the proof.</Text>
          <View style={[styles.addonGrid, isLarge && { flexDirection: 'row', flexWrap: 'wrap', gap: 14 }]}>
            {addons.map((a) => (
              <View key={a.code} style={[styles.addonCard, isLarge && { width: '47%' }, a.coming_soon && { opacity: 0.5 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <Text style={styles.addonName}>{a.display_name}</Text>
                  <Text style={styles.addonPrice}>from {rupees(a.price_hatchback_paise)}</Text>
                </View>
                <Text style={styles.addonBenefit}>{a.benefit}</Text>
                {a.coming_soon && (
                  <View style={styles.comingSoonPill}>
                    <Text style={styles.comingSoonText}>COMING SOON</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* ── 5. WHY EV ────────────────────────────────────────────────── */}
        <LinearGradient colors={[B.ink, '#0F2B48']} style={[styles.section, isLarge && { paddingHorizontal: 48 }]}>
          <Text style={[styles.sectionLabel, { color: '#86EFAC' }]}>WHY EV-POWERED</Text>
          <Text style={[styles.sectionTitle, { color: '#fff' }, isLarge && { fontSize: 36, textAlign: 'center' }]}>
            Cleaner cars. Cleaner streets.
          </Text>
          <View style={[styles.whyEvGrid, isLarge && { flexDirection: 'row', gap: 18, marginTop: 24 }]}>
            {WHY_EV.map((w, i) => (
              <View key={i} style={[styles.whyEvCard, isLarge && { flex: 1 }]}>
                <View style={styles.whyEvIcon}>
                  <w.Icon size={22} weight="duotone" color={B.leaf} />
                </View>
                <Text style={styles.whyEvN}>{w.n}</Text>
                <Text style={styles.whyEvL}>{w.l}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── 6. FAQ ───────────────────────────────────────────────────── */}
        <View style={[styles.section, { backgroundColor: B.surfaceAlt }, isLarge && { paddingHorizontal: 48 }]}>
          <Text style={styles.sectionLabel}>QUESTIONS</Text>
          <Text style={[styles.sectionTitle, isLarge && { fontSize: 36, textAlign: 'center' }]}>
            Everything you need to ask.
          </Text>
          <View style={[styles.faqList, isLarge && { maxWidth: 800, alignSelf: 'center', width: '100%' }]}>
            {FAQS.map((f, i) => (
              <View key={i} style={styles.faqItem}>
                <Text style={styles.faqQ}>{f.q}</Text>
                <Text style={styles.faqA}>{f.a}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── 7. FINAL CTA ─────────────────────────────────────────────── */}
        <LinearGradient colors={[B.primary, B.primaryDk]} style={[styles.section, { alignItems: 'center' }]}>
          <Text style={[styles.sectionTitle, { color: '#fff', textAlign: 'center' }, isLarge && { fontSize: 42, lineHeight: 48 }]}>
            Hygiene you can see.{'\n'}Health you can feel.
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 10 }}>
            Your first wash is 60 seconds away.
          </Text>
          <TouchableOpacity onPress={goToBook} style={[styles.ctaPrimary, { marginTop: 18 }]} activeOpacity={0.85}>
            <Text style={styles.ctaPrimaryText}>Get started — free</Text>
            <ArrowRight size={18} weight="bold" color={B.primaryDkr} />
          </TouchableOpacity>
        </LinearGradient>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: B.surface },

  /* Hero */
  hero: { paddingBottom: 36, overflow: 'hidden' },
  heroInner: { paddingHorizontal: 20 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
  },
  evBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.22)',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.5)',
    marginBottom: 14,
  },
  evBadgeText: { color: '#86EFAC', fontSize: 9.5, fontWeight: '800', letterSpacing: 1.2 },
  heroTitle: { color: '#fff', fontSize: 32, fontWeight: '800', lineHeight: 38, letterSpacing: -1, marginBottom: 12 },
  heroTitleAccent: { color: '#BAE6FD' },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 24, marginBottom: 20 },

  heroCtas: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  ctaPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 22, paddingVertical: 14,
    borderRadius: 14,
    ...Platform.select({
      web: { boxShadow: '0 14px 30px rgba(0,0,0,0.22)' } as any,
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.22, shadowRadius: 20 },
      android: { elevation: 8 },
    }),
  },
  ctaPrimaryText: { color: B.primaryDkr, fontWeight: '800', fontSize: 15 },
  ctaGhost: {
    paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  ctaGhostText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  heroStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  heroStat: { },
  heroStatN: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  heroStatL: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2, maxWidth: 140 },

  /* Section common */
  section: { paddingVertical: 40, paddingHorizontal: 20 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.8, color: B.primaryDk, marginBottom: 8 },
  sectionTitle: { fontSize: 26, fontWeight: '800', color: B.ink, letterSpacing: -0.8, lineHeight: 32, marginBottom: 12 },
  sectionSub: { fontSize: 14, color: B.muted, lineHeight: 22 },

  /* Steps */
  stepGrid: { marginTop: 18, gap: 12 },
  stepCard: {
    backgroundColor: B.surface,
    borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: B.line,
  },
  stepIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: B.aqua,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  stepNum: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: B.primary, marginBottom: 4 },
  stepTitle: { fontSize: 15, fontWeight: '800', color: B.ink, marginBottom: 4 },
  stepDesc: { fontSize: 13, color: B.muted, lineHeight: 19 },

  /* Packages */
  pkgGrid: { gap: 14, marginTop: 14 },
  pkgCard: {
    backgroundColor: B.surface, borderRadius: 18, padding: 22,
    borderWidth: 1, borderColor: B.line,
  },
  pkgName: { fontSize: 17, fontWeight: '800', color: B.ink, letterSpacing: -0.3 },
  pkgPrice: { fontSize: 32, fontWeight: '800', color: B.primaryDk, letterSpacing: -1, marginTop: 2 },
  pkgTag: { fontSize: 12, color: B.muted, marginTop: 6, lineHeight: 18 },
  pkgFeature: { fontSize: 13, color: B.inkSoft, flex: 1, lineHeight: 18 },
  pkgBtn: {
    marginTop: 18,
    backgroundColor: B.ink,
    paddingVertical: 12, borderRadius: 12,
    alignItems: 'center',
  },
  pkgBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  /* Add-ons */
  addonGrid: { gap: 10, marginTop: 18 },
  addonCard: {
    backgroundColor: B.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: B.line,
  },
  addonName: { fontSize: 14, fontWeight: '800', color: B.ink, flex: 1 },
  addonPrice: { fontSize: 12, fontWeight: '800', color: B.primaryDk },
  addonBenefit: { fontSize: 12, color: B.muted, marginTop: 6, lineHeight: 18 },
  comingSoonPill: {
    alignSelf: 'flex-start', marginTop: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    backgroundColor: 'rgba(100,116,139,0.12)',
  },
  comingSoonText: { color: B.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  /* Why EV */
  whyEvGrid: { gap: 14, marginTop: 18 },
  whyEvCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)',
    borderRadius: 16, padding: 22,
  },
  whyEvIcon: {
    width: 44, height: 44, borderRadius: 999,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  whyEvN: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -1 },
  whyEvL: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4, lineHeight: 19 },

  /* FAQ */
  faqList: { marginTop: 18, gap: 14 },
  faqItem: {
    backgroundColor: B.surface, borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: B.line,
  },
  faqQ: { fontSize: 15, fontWeight: '800', color: B.ink, marginBottom: 8 },
  faqA: { fontSize: 13, color: B.muted, lineHeight: 20 },
});
