/**
 * CarWashAreaScreen — area-specific SEO landing for Ozone Auto Wash.
 * Spec: Auto Wash Scope PDF Section 6.5.
 *
 * One screen powers all 10 area pages by reading the `slug` route param.
 * Each slug renders the same template with localised hero copy + area
 * name in meta-style page-title text so search engines index per-area.
 *
 * URL: /car-wash/[area]
 */

import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../../utils/responsive';
import {
  ArrowLeft, ArrowRight, Leaf, Drop, MapPin, CheckCircle, ShieldCheck,
} from '../../components/Icons';

const B = {
  primary:    '#0EA5E9',
  primaryDk:  '#0369A1',
  primaryDkr: '#0C4A6E',
  leaf:       '#22C55E',
  ink:        '#0B1F33',
  muted:      '#64748B',
  surface:    '#FFFFFF',
  surfaceAlt: '#F4F8FB',
  line:       '#E2E8F0',
  aqua:       '#E0F2FE',
};

type AreaSlug =
  | 'gachibowli' | 'kondapur' | 'madhapur' | 'banjara-hills' | 'jubilee-hills'
  | 'kukatpally' | 'hitec-city' | 'manikonda' | 'nallagandla' | 'bachupally';

const AREAS: Record<AreaSlug, {
  name: string;
  pincode: string;
  blurb: string;
  highlight: string;
}> = {
  'gachibowli':    { name: 'Gachibowli',     pincode: '500032', blurb: 'IT hub & gated communities — silent EV crews welcomed at every gate.',                        highlight: 'Most-booked weekend slots: Sat 09:00 & 11:00.' },
  'kondapur':      { name: 'Kondapur',       pincode: '500084', blurb: 'High-rise apartment density makes our zero-emission service the only one allowed inside.', highlight: 'Same-day bookings available before 14:00.' },
  'madhapur':      { name: 'Madhapur',       pincode: '500081', blurb: 'IT corridor doorstep service — wash while you work from home or take that meeting.',         highlight: '60% of customers here also book the AC vent fogging add-on.' },
  'banjara-hills': { name: 'Banjara Hills',  pincode: '500034', blurb: 'Luxury vehicles get HygieneElite — engine bay, leather conditioning, ceramic nano-coat.',   highlight: 'Premium ceramic nano-coat available as an add-on.' },
  'jubilee-hills': { name: 'Jubilee Hills',  pincode: '500033', blurb: 'Private villas, no need for a tap or power source — our EV unit carries everything.',       highlight: 'Yearly plan saves 33% vs ad-hoc bookings.' },
  'kukatpally':    { name: 'Kukatpally',     pincode: '500072', blurb: 'Family neighbourhoods — clean cabin hygiene matters for kids and elders.',                  highlight: 'Family plan: 2 cars same address, 15% bundle discount.' },
  'hitec-city':    { name: 'HITEC City',     pincode: '500081', blurb: 'Tech parks and apartment towers — EV crews bypass parking restrictions.',                   highlight: 'Most popular package here: OzoneComplete.' },
  'manikonda':     { name: 'Manikonda',      pincode: '500089', blurb: 'Outer Ring Road residents — no waiting in traffic to find a wash centre.',                  highlight: 'Monthly Gold: 8 washes a month for under ₹290 each.' },
  'nallagandla':   { name: 'Nallagandla',    pincode: '500019', blurb: 'New growth corridor — our EVs reach every gated community without exception.',              highlight: 'Subscription customers get priority slots.' },
  'bachupally':    { name: 'Bachupally',     pincode: '500090', blurb: 'Detached homes and apartment clusters — doorstep delivery anywhere within 5 km of hub.',     highlight: 'Bi-monthly plan: 8 washes over 2 months.' },
};

const FEATURES = [
  { Icon: Drop,        title: '94% less water',     sub: '~3 L per wash vs ~50 L at a traditional wash centre.' },
  { Icon: Leaf,        title: 'Zero emissions',      sub: 'EV 3-wheeler — silent, no diesel exhaust, allowed in every gated community.' },
  { Icon: ShieldCheck, title: 'Hygiene-certified',   sub: 'QR-signed certificate after every wash. Audit-ready.' },
];

export default function CarWashAreaScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { isLarge } = useResponsive();

  const slug = (route.params?.slug || 'gachibowli') as AreaSlug;
  const area = AREAS[slug] || AREAS['gachibowli'];

  // Set browser tab title for SEO (web only).
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.title = `Car Wash in ${area.name}, Hyderabad | Ozone Wash Auto — Doorstep · EV · Chemical-Free`;
    }
  }, [slug, area.name]);

  const goBook = () => navigation.navigate('PhoneInput');

  return (
    <View style={styles.root}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* HERO */}
        <LinearGradient colors={[B.primaryDkr, B.primaryDk, B.primary]} style={[styles.hero, { paddingTop: insets.top + 18 }]}>
          <View style={[styles.inner, isLarge && { maxWidth: 1000, alignSelf: 'center', width: '100%' }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.85}>
              <ArrowLeft size={18} weight="bold" color="#fff" />
            </TouchableOpacity>
            <View style={styles.areaPill}>
              <MapPin size={11} weight="fill" color="#fff" />
              <Text style={styles.areaPillText}>{area.name.toUpperCase()} · {area.pincode}</Text>
            </View>
            <Text style={[styles.h1, isLarge && { fontSize: 52, lineHeight: 56 }]}>
              Doorstep Car Wash in{'\n'}
              <Text style={styles.h1Accent}>{area.name}</Text>
            </Text>
            <Text style={[styles.sub, isLarge && { maxWidth: 600 }]}>
              {area.blurb}
            </Text>
            <View style={styles.heroCtas}>
              <TouchableOpacity onPress={goBook} style={styles.ctaPrimary} activeOpacity={0.85}>
                <Text style={styles.ctaPrimaryText}>Book in {area.name}</Text>
                <ArrowRight size={18} weight="bold" color={B.primaryDkr} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('CarWash')} style={styles.ctaGhost} activeOpacity={0.85}>
                <Text style={styles.ctaGhostText}>How it works →</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.heroHighlight}>{area.highlight}</Text>
          </View>
        </LinearGradient>

        {/* LOCAL FEATURES */}
        <View style={[styles.section, isLarge && { paddingHorizontal: 48 }]}>
          <Text style={styles.sectionLabel}>WHY {area.name.toUpperCase()} CUSTOMERS PICK OZONE WASH</Text>
          <View style={[styles.featGrid, isLarge && { flexDirection: 'row', gap: 18 }]}>
            {FEATURES.map((f, i) => (
              <View key={i} style={[styles.featCard, isLarge && { flex: 1 }]}>
                <View style={styles.featIcon}><f.Icon size={22} weight="duotone" color={B.primaryDk} /></View>
                <Text style={styles.featTitle}>{f.title}</Text>
                <Text style={styles.featSub}>{f.sub}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* SEO content block — area + pincode + Hyderabad keywords */}
        <View style={[styles.section, { backgroundColor: B.surfaceAlt }, isLarge && { paddingHorizontal: 48 }]}>
          <Text style={styles.sectionLabel}>AREAS WE SERVE NEAR {area.name.toUpperCase()}</Text>
          <Text style={styles.seoBody}>
            Ozone Wash Auto delivers chemical-free, EV-powered doorstep car hygiene across {area.name} (pincode {area.pincode}) and surrounding parts of Hyderabad, Telangana.
            Our service is built for gated communities, apartment complexes, and IT-corridor offices where traditional car washes are either banned or impractical.
            We arrive in a self-contained EV 3-wheeler — no water tap, no power source, no diesel exhaust.
            Pick a wash window in 60 seconds, and we'll be at your door.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
            {(Object.keys(AREAS) as AreaSlug[]).filter(s => s !== slug).slice(0, 6).map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => navigation.setParams({ slug: s })}
                style={styles.areaChip}
                activeOpacity={0.85}
              >
                <MapPin size={11} weight="fill" color={B.primaryDk} />
                <Text style={styles.areaChipText}>{AREAS[s].name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* PRICING SNAPSHOT */}
        <View style={[styles.section, isLarge && { paddingHorizontal: 48 }]}>
          <Text style={styles.sectionLabel}>PACKAGES STARTING AT</Text>
          <View style={[styles.priceGrid, isLarge && { flexDirection: 'row', gap: 12 }]}>
            <PriceCard name="EcoRinse" price="₹399" sub="Exterior ozone wash + dry" />
            <PriceCard name="EcoShield" price="₹599" sub="+ vacuum + dashboard wipe" />
            <PriceCard name="OzoneComplete" price="₹899" sub="+ steam + cabin fogging" />
            <PriceCard name="HygieneElite" price="₹1,499" sub="+ upholstery + engine bay" />
          </View>
          <Text style={styles.priceFootnote}>
            Hatchback pricing. SUV / MUV / luxury tiers higher. Final price quoted in the app.
          </Text>
        </View>

        {/* FINAL CTA */}
        <LinearGradient colors={[B.primary, B.primaryDk]} style={[styles.section, { alignItems: 'center' }]}>
          <Text style={[styles.finalH, isLarge && { fontSize: 38 }]}>
            Hygiene at your doorstep in {area.name}.
          </Text>
          <Text style={styles.finalSub}>Book your first wash. 60 seconds.</Text>
          <TouchableOpacity onPress={goBook} style={[styles.ctaPrimary, { marginTop: 18 }]} activeOpacity={0.85}>
            <Text style={styles.ctaPrimaryText}>Get started — free</Text>
            <ArrowRight size={18} weight="bold" color={B.primaryDkr} />
          </TouchableOpacity>
        </LinearGradient>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
}

function PriceCard({ name, price, sub }: any) {
  return (
    <View style={styles.priceCard}>
      <Text style={styles.priceName}>{name}</Text>
      <Text style={styles.pricePrice}>{price}</Text>
      <Text style={styles.priceSub}>{sub}</Text>
      <View style={styles.priceCheck}>
        <CheckCircle size={14} weight="fill" color={B.leaf} />
        <Text style={styles.priceCheckText}>EV doorstep</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: B.surface },

  /* hero */
  hero: { paddingBottom: 36 },
  inner: { paddingHorizontal: 20 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  areaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', marginBottom: 14,
  },
  areaPillText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  h1: { color: '#fff', fontSize: 32, fontWeight: '800', lineHeight: 38, letterSpacing: -1, marginBottom: 12 },
  h1Accent: { color: '#BAE6FD' },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 24, marginBottom: 22 },
  heroCtas: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  ctaPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 22, paddingVertical: 14, borderRadius: 14,
  },
  ctaPrimaryText: { color: B.primaryDkr, fontWeight: '800', fontSize: 15 },
  ctaGhost: {
    paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.1)',
  },
  ctaGhostText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  heroHighlight: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 18, fontStyle: 'italic' },

  /* sections */
  section: { paddingVertical: 32, paddingHorizontal: 20 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: B.primaryDk, marginBottom: 14 },

  /* features */
  featGrid: { gap: 12 },
  featCard: {
    backgroundColor: B.surface, borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: B.line,
  },
  featIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: B.aqua, alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  featTitle: { fontSize: 14, fontWeight: '800', color: B.ink },
  featSub: { fontSize: 12, color: B.muted, marginTop: 4, lineHeight: 18 },

  /* SEO body */
  seoBody: { fontSize: 13, color: B.ink, lineHeight: 21 },
  areaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
    backgroundColor: B.surface, borderWidth: 1, borderColor: B.line,
  },
  areaChipText: { fontSize: 12, fontWeight: '700', color: B.primaryDk },

  /* price grid */
  priceGrid: { gap: 10 },
  priceCard: {
    backgroundColor: B.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: B.line, flex: 1,
  },
  priceName: { fontSize: 13, fontWeight: '800', color: B.ink },
  pricePrice: { fontSize: 22, fontWeight: '800', color: B.primaryDk, letterSpacing: -0.5, marginTop: 2 },
  priceSub: { fontSize: 11, color: B.muted, marginTop: 2 },
  priceCheck: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  priceCheckText: { fontSize: 10, color: B.leaf, fontWeight: '700' },
  priceFootnote: { fontSize: 11, color: B.muted, marginTop: 12, fontStyle: 'italic' },

  /* final CTA */
  finalH: { color: '#fff', fontSize: 26, fontWeight: '800', textAlign: 'center', lineHeight: 32 },
  finalSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 8, textAlign: 'center' },
});

export { AREAS };
