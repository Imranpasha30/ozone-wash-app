import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Platform, Image, ScrollView, Animated, Easing,
  NativeSyntheticEvent, NativeScrollEvent, useWindowDimensions,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
// react-native-svg used by <HeroVisualNative> for the native hero illustration.
import Svg, { Defs, RadialGradient as SvgRadialGradient, LinearGradient as SvgLinearGradient, Stop, Ellipse, Rect, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../../utils/responsive';
import {
  ArrowRight, Phone, Users, Flask, Certificate,
  Leaf, ShieldCheck, Lightning, Star, Lock,
  MapPin, CheckCircle, Drop, Buildings, Wrench, QrCode,
  Sparkle, Play, Shield, Trophy, Eye, CaretDown,
} from '../../components/Icons';

/* ══════════════════════════════════════════════════════════════════
   BRAND TOKENS
   ════════════════════════════════════════════════════════════════ */
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
  danger:     '#B91C1C',
  dangerBg:   '#FEE2E2',
  amber:      '#F59E0B',
};

/* ══════════════════════════════════════════════════════════════════
   DATA
   ════════════════════════════════════════════════════════════════ */
const HOW = [
  { num: '01', Icon: Phone,       t: 'Book in 60 Seconds',     d: 'Pick tank type, size, and a slot that works for you.' },
  { num: '02', Icon: Users,       t: 'Certified Team Arrives', d: 'Uniformed, trained & verified technicians at your door.' },
  { num: '03', Icon: Flask,       t: '8-Step Ozone Clean',     d: 'Chemical-free deep hygiene powered by activated Ozone.' },
  { num: '04', Icon: Certificate, t: 'Digital Certificate',    d: 'Verified hygiene report with a scannable QR code.' },
];
type EightStep = { num: string; Icon: any; t: string; d: string; tag: string; tagKind: 'photo' | 'live' | 'uv' };
const EIGHT_STEPS: EightStep[] = [
  { num: '01', Icon: Lock,        t: 'Pre-Check & Setup',             d: 'Water tested across 6 parameters — Turbidity, pH, ORP, Conductivity, TDS, ATP. Hygiene baseline recorded. Before-wash photo sent via app.', tag: 'PRE PHOTO',  tagKind: 'photo' },
  { num: '02', Icon: Drop,        t: 'Drain & Inspect',               d: 'Tank emptied safely. Water level + tank condition logged. Sludge volume assessed against the protocol.',                                    tag: 'IN-TANK',    tagKind: 'photo' },
  { num: '03', Icon: Sparkle,     t: 'Mechanical Scrub & Rotary Jet', d: 'Biofilm and deposits physically removed from walls and base. Rotary jet reaches every wall contour.',                                       tag: 'SCRUB',      tagKind: 'photo' },
  { num: '04', Icon: Lightning,   t: 'High-Pressure Rinse',           d: 'Walls and base flushed clean over a timed rinse. Every loosened particle evacuated before disinfection begins.',                            tag: 'RINSE',      tagKind: 'photo' },
  { num: '05', Icon: Wrench,      t: 'Sludge Removal',                d: 'Settled debris extracted in full. Disposal route verified, hazardous waste handled per compliance.',                                        tag: 'CLEAR',      tagKind: 'photo' },
  { num: '06', Icon: Flask,       t: 'Ozone Disinfection',            d: 'Calibrated Ozone cycle dosed at 1–2 ppm. 99.99% kill across germs, biofilm and toxins. Residue-free finish.',                              tag: 'O₃ · LIVE',  tagKind: 'live'  },
  { num: '07', Icon: Eye,         t: 'UV Double Lock · optional',     d: 'UV dose of 20–60 mJ/cm² layered on top of Ozone. Lumines logged. Microbial inactivation locked twice.',                                     tag: 'UV ADD-ON',  tagKind: 'uv'    },
  { num: '08', Icon: Certificate, t: 'After-Wash Testing & Proof',    d: 'Same 6 parameters re-tested — certified safe. Client signature, technician remarks. QR-signed hygiene certificate + final photo.',          tag: '✓ QR CERT',  tagKind: 'photo' },
];
const FEATURES = [
  { Icon: Leaf,        t: 'Eco-Friendly',      d: 'Zero chemicals. Ozone decomposes into oxygen. Smart process saves water vs chemical cleaning.' },
  { Icon: ShieldCheck, t: 'Certified Hygiene', d: '99.99% germ kill ratio. Lab-grade sanitation with QR-verified certificate after every clean.' },
  { Icon: Lightning,   t: 'Swift & Seamless',  d: 'Efficient process tailored to tank size. No second visit, no mess.' },
  { Icon: Star,        t: 'EcoScore\u2122',  d: 'Track your tank\u2019s hygiene month over month in-app. Earn redeemable points & badges.' },
];
const STATS: { v: number; suffix: string; l: string; lShort?: string; decimal?: boolean }[] = [
  { v: 500,  suffix: '+',     l: 'Tanks Cleaned',         lShort: 'Tanks' },
  { v: 4.9,  suffix: '★',     l: 'Rated by Customers',    lShort: 'Rating', decimal: true },
  { v: 100,  suffix: '+',     l: 'Households Protected',  lShort: 'Households' },
  { v: 8,    suffix: '-Step', l: 'Hygiene Process',       lShort: 'Process' },
  { v: 1,    suffix: 'st',    l: 'Patent Applied',        lShort: 'Patent' },
];
const SERVICES = [
  { Icon: Buildings, name: 'Overhead Tank'    , cap: 'Any Size' },
  { Icon: Drop,      name: 'Underground Tank', cap: 'Any Size' },
  { Icon: Wrench,    name: 'Syntex / Plastic', cap: 'any shape' },
];
const TESTIMONIALS = [
  { name: 'Ananya R.',  area: 'Madhapur',     text: 'Booked Friday evening, cleaned Saturday morning. Before/after photos inside the tank were genuinely shocking.', r: 5 },
  { name: 'Kiran M.',   area: 'Gachibowli',   text: 'Crew was on time, polite, left zero mess. The QR certificate is a nice touch for tenants.', r: 5 },
  { name: 'Priya S.',   area: 'Kondapur',     text: 'Switched from the guy our neighbours use. OzoneWash is a different league.', r: 5 },
  { name: 'Rahul V.',   area: 'Banjara Hills',text: 'The 8-step process is no gimmick. Water genuinely tastes different. AMC was a no-brainer after the first clean.', r: 5 },
  { name: 'Sneha K.',   area: 'Jubilee Hills',text: 'Booked through the app at 11pm, crew arrived next morning at the slot promised. The lab report sealed the deal.', r: 5 },
  { name: 'Arjun T.',   area: 'Kukatpally',   text: 'Tenant kept asking when the tank was last cleaned. Sent the QR cert. Conversation over.', r: 5 },
  { name: 'Meera D.',   area: 'Hitech City',  text: 'My RWA used to argue about hygiene at every meeting. Now we just share the EcoScore dashboard.', r: 5 },
  { name: 'Sai P.',     area: 'Manikonda',    text: 'No chemical smell, no scrubbing residue. Just clean water and a one-page certificate. Best ₹999 spent.', r: 5 },
  { name: 'Neha B.',    area: 'Begumpet',     text: 'Restaurant kitchen audit was a stress event before. With certified hygiene + QR proof, it is paperwork done.', r: 5 },
  { name: 'Vikram J.',  area: 'Miyapur',      text: 'The technician walked me through every step and showed me the ATP reading. Felt like a service, not a chore.', r: 5 },
];
type FaqEntry = { cat: string; q: string; a: string };
// Live demo certificate hosted on Cloudflare R2 - opened from the hero QR card
const DEMO_CERT_URL = 'https://pub-a27bf503711744b48b2b244e9fae3255.r2.dev/certificate/ozonewash-certificate%20(1).pdf';

// App store URLs - Play Store live; iOS pending. Update once published.
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.ozonewash.app';
const APP_STORE_URL  = 'https://apps.apple.com/app/ozone-wash/id000000000';
const DEMO_VIDEO_URL = 'https://ozonewash.in/demo';
const openDownload = () => {
  const url = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    Linking.openURL(url).catch(() => {});
  }
};
const openDemo = () => {
  if (Platform.OS === 'web') {
    window.open(DEMO_VIDEO_URL, '_blank', 'noopener,noreferrer');
  } else {
    Linking.openURL(DEMO_VIDEO_URL).catch(() => {});
  }
};

const FAQ_DATA: FaqEntry[] = [
  // Before You Book
  { cat: 'Before You Book', q: 'Is Ozone safe for drinking water tanks?', a: 'Yes. Ozone is a stronger oxidiser than chlorine yet leaves no chemical residue. It decomposes back into oxygen within minutes, making it safer for potable water than chemical cleaners. In fact, most bottled mineral water brands use Ozone for purification - the same science we apply to your tanks.' },
  { cat: 'Before You Book', q: 'How long does a service take?', a: 'Domestic tanks are typically completed within 2 hours. Larger tanks may take longer depending on size and condition, but every service is completed in a single visit - no second trip, no mess.' },
  { cat: 'Before You Book', q: "What's included in the 8-step process?", a: 'Our patent-applied 8-step hygiene covers pre-check & setup, drain, mechanical scrub & rotary jet, high-pressure rinse, sludge removal, Ozone disinfection, optional UV double-lock, and after-wash testing with QR-signed proof delivery.' },
  { cat: 'Before You Book', q: 'Do you service my area?', a: 'Yes. We are currently operating across multiple areas in Hyderabad and rapidly expanding. Enter your pincode at booking to see exact availability and pricing.' },

  // Safety & Science
  { cat: 'Safety & Science', q: 'How does Ozone clean my tank?', a: 'Ozone ruptures bacterial and viral cells, neutralises toxins, and oxidises metals. Unlike chlorine, Ozone leaves no chemical residue - it decomposes back into oxygen within minutes.' },
  { cat: 'Safety & Science', q: 'How is Ozone better than chemicals?', a: 'Ozone is a stronger oxidiser than chlorine, killing pathogens up to 3,000 times faster. It neutralises chlorine-resistant organisms, penetrates biofilm, and leaves no chemical residue - just pure, residue-free water.' },

  // Compliance & Proof
  { cat: 'Compliance & Proof', q: 'How do QR certificates work?', a: 'Each service generates a QR-signed hygiene certificate with Ozone readings, ATP hygiene checks, and before/after photos - audit-ready for RWAs, hospitals, and regulators. Share it instantly with tenants, buyers, or inspectors.' },
  { cat: 'Compliance & Proof', q: 'What does GHMC law say about tank cleaning?', a: 'Under the GHMC Act, 1955 - Public Health & Sanitation Bye-laws, drinking water tanks must be cleaned every 3–6 months. For commercial establishments and institutions, quarterly cleaning (every 3 months) is required to stay compliant.' },
  { cat: 'Compliance & Proof', q: 'How often should tanks be cleaned?', a: 'Domestic tanks: every 3–6 months. Commercial establishments: every 3 months. RWAs / hospitals: quarterly. AMC packages ensure recurring compliance and cost savings.' },
  { cat: 'Compliance & Proof', q: 'Why is certified tank hygiene important today?', a: 'Recent outbreaks across India caused thousands of illnesses due to contaminated tanks. Ozone Wash™ ensures proof-based hygiene with QR certificates and EcoScore™ tracking.' },

  // AMC
  { cat: 'AMC - Annual Maintenance', q: 'What is an AMC plan?', a: 'A subscription plan with fixed cleaning intervals (monthly, quarterly, half-yearly, or yearly) and built-in discounts.' },
  { cat: 'AMC - Annual Maintenance', q: 'How do AMC discounts work?', a: 'Monthly: 30% · Quarterly: 15% · Half-Yearly: 10% · Yearly: 5%. Multi-tank: 2 tanks 15%, 2+ tanks 30%. All AMC prices are GST-inclusive.' },
  { cat: 'AMC - Annual Maintenance', q: 'Why choose AMC over one-time cleaning?', a: 'Ensures compliance, cost savings, EcoScore™ tracking, priority scheduling - forgetting is now history.' },
  { cat: 'AMC - Annual Maintenance', q: 'What if I miss a scheduled AMC service?', a: 'You can reschedule within the same cycle. EcoScore™ tracks delays so you stay on top of compliance.' },

  // Hygiene Upgrades & Add-Ons
  { cat: 'Upgrades & Add-Ons', q: 'What hygiene upgrades can I add?', a: 'UV Sterilisation, Anti-Algae Spray, Anti-Lime Treatment, Pathogen Testing, Structural Audit, and IoT Sensors.' },
  { cat: 'Upgrades & Add-Ons', q: 'Are add-ons optional?', a: 'Yes. The base Ozone service already delivers certified hygiene. Add-ons provide extra assurance, compliance proof, and preventive protection - and bundle at discounted rates with AMC.' },

  // Testing & Proof
  { cat: 'Testing & Proof', q: 'Do you provide testing after cleaning?', a: 'Yes. Every service includes pre and post hygiene checks showing measurable improvement in tank quality.' },
  { cat: 'Testing & Proof', q: 'What is the lab-based upgrade?', a: 'A 21-parameter certified laboratory report covering pathogens, chemical residues, and water quality - ideal for RWAs, hospitals, and regulators.' },
  { cat: 'Testing & Proof', q: 'Tank hygiene vs source contamination?', a: 'Testing validates tank hygiene post-service, but the water supply itself may still be contaminated. Both GHMC municipal water, tankers, and borewell sources have reported contamination incidents - source filtration is recommended alongside tank hygiene.' },

  // EcoScore
  { cat: 'EcoScore™', q: 'What is EcoScore™?', a: 'A gamified hygiene rating (0–100) that converts compliance data into a score, badge, rationale, and improvement tips.' },
  { cat: 'EcoScore™', q: 'What do the badges mean?', a: 'Platinum (90+), Gold (75–89), Silver (60–74), Bronze (40–59), Unrated (<40). Each badge shows a rationale (e.g., “Timely service, Ozone + UV cycles logged, water test passed, AMC compliant”).' },
  { cat: 'EcoScore™', q: 'What are EcoPoints and how do I redeem them?', a: 'Your EcoScore % = EcoPoints. Bonus points for badges and streaks. Points accumulate in your wallet (valid 24 months, capped at 1,000) and redeem against AMC renewal discounts, hygiene upgrades, partner benefits, and streak rewards.' },

  // Preparation Guide
  { cat: 'Preparation', q: 'What preparations are needed before cleaning?', a: 'Ensure clear access to the tank, switch off pumps, inform residents, keep alternate water ready, remove nearby clutter, and provide a 16A power socket for equipment. Send the “Ozone at Work” caution message so residents know the hygiene process is in progress.' },
  { cat: 'Preparation', q: 'What should I avoid during cleaning?', a: 'Don’t use tank water until the certificate is issued, don’t leave lids open, don’t delay cleaning beyond 6 months, and don’t add chemicals yourself. Keep humans and pets away from the Ozone work zone until the service is certified safe.' },

  // Segment-Specific
  { cat: 'Segment-Specific', q: 'RWAs - How do we share proof with residents?', a: 'Each service generates a QR-signed certificate and EcoScore™ dashboard, shareable with residents and regulators in one tap.' },
  { cat: 'Segment-Specific', q: 'Hospitals - Is Ozone safe for patient tanks?', a: 'Yes. Ozone sterilises without residues - natural and safer than chemicals for sensitive environments like hospitals and clinics.' },
  { cat: 'Segment-Specific', q: 'Restaurants - How do you ensure kitchen hygiene?', a: 'Our Hygiene Wall Wash service disinfects walls and surfaces monthly, leaving them odour-less and sterilised.' },
];
const COMPARE_BAD = [
  'Chemicals linger in water for days',
  'Chemicals fail to neutralize many toxins - uncertainty remains',
  'Fail against resistant germs (Cryptosporidium, Giardia, biofilm & fungi)',
  'No certification, no proof of hygiene',
  'No before/after water testing',
  'Manual scrub & rinse - incomplete process',
  'Cleaner leaves, uncertainty remains',
];
const COMPARE_GOOD = [
  'Ozone decomposes to pure Oxygen - Zero Chemical residue',
  'UV double-locks hygiene, reinforcing Ozone\u2019s germ kill',
  '99.99% germs killed - even resistant pathogens and Toxins neutralised',
  'QR-verified hygiene certificate after every clean',
  'Before/after water testing reports delivered via app',
  'Patent-applied 8-step process with ATP verification',
  'Live app tracking with before/after proof photos',
  'Ozone process saves 33% water compared to chemical cleaning',
];
const CERT_TAGS = ['Sanitation levels', 'ATP readings', 'Before/after photos', 'Crew verification'];

type AddOn = { Icon: any; name: string; tag?: string; tagKind?: 'soon' | 'pro'; desc: string };
const ADD_ONS: AddOn[] = [
  { Icon: Eye,         name: 'UV Sterilization Pass',        tag: 'DOUBLE LOCK', tagKind: 'pro',
    desc: 'Your tank already gets Ozone sterilization in the base service. UV adds a second kill step — a visible double layer of protection. Ozone neutralises microbes, UV destroys any residual bacteria.' },
  { Icon: Leaf,        name: 'Anti-Algae Spray / Coating',
    desc: 'Eco-safe spray prevents algae regrowth after cleaning. Keeps water fresher for longer and reduces the need for frequent service.' },
  { Icon: Drop,        name: 'Anti-Lime / Descaling Treatment',
    desc: 'Hard-water deposits damage tanks and affect water quality. Our descaling treatment removes lime safely, restoring tank hygiene.' },
  { Icon: Flask,       name: 'Pathogen Testing & Lab Report',
    desc: 'Scientific proof of hygiene — certified lab testing for E. coli, coliforms, and other bacteria, with a shareable compliance report.' },
  { Icon: Wrench,      name: 'Structural Safety Audit',
    desc: 'Beyond cleaning, we inspect tank walls, lids, and covers for cracks or leaks. A preventive check that keeps your tank safe and durable.' },
  { Icon: Lightning,   name: 'IoT Sensor Installation',      tag: 'COMING SOON', tagKind: 'soon',
    desc: 'Continuous, sensor-driven monitoring of your tank hygiene — water level, quality, and contamination alerts straight to the app.' },
];

/* ══════════════════════════════════════════════════════════════════
   REVEAL HOOK + WRAPPER
   ════════════════════════════════════════════════════════════════ */
function useReveal(delay = 0) {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const viewRef    = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity,    { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.spring(translateY, { toValue: 0, friction: 8,   useNativeDriver: true }),
        ]).start();
      }, delay);
      return;
    }
    const el = viewRef.current as any;
    if (!el) return;
    const io = new (window as any).IntersectionObserver(
      (entries: any[]) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            io.disconnect();
            setTimeout(() => {
              Animated.parallel([
                Animated.timing(opacity,    { toValue: 1, duration: 500, useNativeDriver: false }),
                Animated.spring(translateY, { toValue: 0, friction: 8,   useNativeDriver: false }),
              ]).start();
            }, delay);
          }
        });
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { viewRef, style: { opacity, transform: [{ translateY }] } };
}

function Reveal({ delay = 0, style, children }: { delay?: number; style?: any; children: React.ReactNode }) {
  const { viewRef, style: revealStyle } = useReveal(delay);
  return <Animated.View ref={viewRef} style={[revealStyle, style]}>{children}</Animated.View>;
}

/* ══════════════════════════════════════════════════════════════════
   SERIF ACCENT (italic editorial accent in headings)
   ════════════════════════════════════════════════════════════════ */
function SerifAccent({ children, color, size }: { children: React.ReactNode; color?: string; size?: number }) {
  return (
    <Text style={{
      // Playfair Display has a true 800 italic - pairs with Manrope and matches
      // the bold weight of the surrounding heading without faux-bolding.
      fontFamily: Platform.OS === 'web'
        ? '"Playfair Display", "Instrument Serif", Georgia, serif'
        : Platform.select({ ios: 'Georgia-BoldItalic', android: 'serif' }) as any,
      fontStyle: 'italic',
      fontWeight: '800' as any,
      color: color ?? B.primaryDk,
      ...(size ? { fontSize: size } : {}),
    }}>{children}</Text>
  );
}

/* ══════════════════════════════════════════════════════════════════
   EYEBROW LABEL (small heading with leading dash)
   ════════════════════════════════════════════════════════════════ */
function Eyebrow({ children, color = B.primaryDk, center = false }: { children: React.ReactNode; color?: string; center?: boolean }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 10,
      ...(center ? { justifyContent: 'center' } as const : {}),
    }}>
      <View style={{ width: 26, height: 2, backgroundColor: color }} />
      <Text style={{
        fontSize: 11.5, fontWeight: '800', letterSpacing: 2,
        color, textTransform: 'uppercase',
        fontFamily: 'Manrope, sans-serif',
      }}>{children}</Text>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TM (proper superscript trademark - raised + smaller than parent text)
   ════════════════════════════════════════════════════════════════ */
function TM({ size = 10, color }: { size?: number; color?: string }) {
  if (Platform.OS === 'web') {
    // Use the native <sup> HTML element for true superscript behaviour
    // (the browser handles raise + line-height inside the parent span).
    const Sup = 'sup' as any;
    return (
      <Sup style={{
        fontSize: size,
        fontWeight: 700,
        marginLeft: 1,
        ...(color ? { color } : {}),
        // Tighter raise - sup defaults to ~0.5em above baseline which is good.
        verticalAlign: 'super',
        lineHeight: 0,
      }}>™</Sup>
    );
  }
  // Native: lift the smaller character with translateY so it sits above baseline
  return (
    <Text style={{
      fontSize: size,
      fontWeight: '700',
      marginLeft: 1,
      ...(color ? { color } : {}),
      transform: [{ translateY: -size * 0.7 }] as any,
    }}>™</Text>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PATENT BADGE (white "PATENT APPLIED" seal - professional, brand-aligned)
   ════════════════════════════════════════════════════════════════ */
function PatentMedal({ size = 36 }: { size?: number; onDark?: boolean }) {
  return (
    <Image
      source={require('../../../assets/patent-badge.png')}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

/* ══════════════════════════════════════════════════════════════════
   COUNTER
   ════════════════════════════════════════════════════════════════ */
function Counter({ value, suffix = '', decimal = false, duration = 1400 }: { value: number; suffix?: string; decimal?: boolean; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<any>(null);
  const started = useRef(false);

  const startAnimation = useCallback(() => {
    if (started.current) return;
    started.current = true;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(decimal ? parseFloat((value * eased).toFixed(1)) : Math.round(value * eased));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration, decimal]);

  useEffect(() => {
    if (Platform.OS !== 'web') { startAnimation(); return; }
    const el = ref.current;
    if (!el) return;
    const io = new (window as any).IntersectionObserver(
      (entries: any[]) => entries.forEach(e => { if (e.isIntersecting) { io.disconnect(); startAnimation(); } }),
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [startAnimation]);

  return <Text ref={ref} style={{ fontWeight: '800', fontFamily: 'Manrope, Inter, sans-serif' }}>{display}{suffix}</Text>;
}

/* ══════════════════════════════════════════════════════════════════
   FAQ ITEM
   ════════════════════════════════════════════════════════════════ */
function FaqItem({ q, a, open, onToggle, onHover, compact = false, hoverMode = false }: { q: string; a: string; open: boolean; onToggle: () => void; onHover?: () => void; compact?: boolean; hoverMode?: boolean }) {
  const rot = useRef(new Animated.Value(0)).current;
  const height = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(rot,    { toValue: open ? 1 : 0, duration: 260, useNativeDriver: true }),
      Animated.timing(height, { toValue: open ? 1 : 0, duration: 340, useNativeDriver: false }),
      Animated.spring(lift,   { toValue: open ? 1 : 0, friction: 7, tension: 90, useNativeDriver: true }),
    ]).start();
  }, [open]);
  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '135deg'] });
  const maxH   = height.interpolate({ inputRange: [0, 1], outputRange: [0, compact ? 220 : 460] });
  const translateY = lift.interpolate({ inputRange: [0, 1], outputRange: [0, -3] });

  const inner = (
    <>
      <View style={[s.faqHeader, compact && { padding: 13 }]}>
        <Text style={[s.faqQ, { color: B.ink, flex: 1 }, compact && { fontSize: 13 }]}>{q}</Text>
        <Animated.View style={[
          s.faqToggle,
          compact && { width: 22, height: 22, borderRadius: 11 },
          { backgroundColor: open ? B.primary : B.aqua, transform: [{ rotate }] },
        ]}>
          <Text style={{
            color: open ? '#fff' : B.primaryDk,
            fontSize: compact ? 16 : 22,
            fontWeight: '300', lineHeight: compact ? 16 : 22, marginTop: -1,
          }}>+</Text>
        </Animated.View>
      </View>
      <Animated.View style={{ maxHeight: maxH, overflow: 'hidden' }}>
        <Text style={[s.faqA, { color: B.muted }, compact && { fontSize: 12.5, padding: 14, paddingTop: 0 }]}>{a}</Text>
      </Animated.View>
    </>
  );

  if (hoverMode && Platform.OS === 'web') {
    return (
      <Animated.View
        {...({ onMouseEnter: onHover, dataSet: { ozFaq: 'true' } } as any)}
        style={[s.faqCard, { borderColor: open ? B.primary : B.line, transform: [{ translateY }] }, open && s.faqCardOpen]}
      >
        {inner}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[s.faqCard, { borderColor: open ? B.primary : B.line, transform: [{ translateY }] }, open && s.faqCardOpen]}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ══════════════════════════════════════════════════════════════════
   BUBBLES (web only, rising particles)
   ════════════════════════════════════════════════════════════════ */
/* Native bubble component - single animated circle rising */
function NativeBubble({ size, leftPct, delay, dur, opacity: baseOp }: {
  size: number; leftPct: number; delay: number; dur: number; opacity: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.loop(
        Animated.timing(anim, { toValue: 1, duration: dur * 1000, easing: Easing.linear, useNativeDriver: true }),
      ).start();
    }, Math.abs(delay) * 300);
    return () => clearTimeout(timeout);
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [100, -600] });
  const opacity = anim.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, baseOp, baseOp * 0.6, 0] });

  return (
    <Animated.View style={{
      position: 'absolute', left: `${leftPct}%` as any, bottom: -20,
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: 'rgba(255,255,255,0.25)',
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
      transform: [{ translateY }], opacity,
    }} />
  );
}

function BubblesEffect({ count = 14, seed = 1 }: { count?: number; seed?: number }) {
  // On native we cap the bubble count at 8 to keep frame rate smooth on lower-end
  // devices - each bubble owns its own Animated value + native driver loop.
  const effectiveCount = Platform.OS === 'web' ? count : Math.min(count, 8);
  const bubbles = useMemo(() => {
    const rng = (i: number) => {
      const x = Math.sin(i * 9301 + seed * 49297) * 233280;
      return x - Math.floor(x);
    };
    return Array.from({ length: effectiveCount }).map((_, i) => ({
      size: 8 + rng(i) * 44,
      left: rng(i + 100) * 100,
      delay: rng(i + 200) * -14,
      dur: 10 + rng(i + 300) * 12,
      drift: (rng(i + 400) - 0.5) * 40,
      op: 0.3 + rng(i + 500) * 0.5,
    }));
  }, [effectiveCount, seed]);

  // Web version uses CSS keyframes
  if (Platform.OS === 'web') {
    const Div = 'div' as any;
    const Span = 'span' as any;
    return (
      <Div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        overflow: 'hidden', pointerEvents: 'none', zIndex: 0,
      }}>
        {bubbles.map((b: any, i: number) => (
          <Span key={i} style={{
            position: 'absolute',
            left: `${b.left}%`, bottom: -80,
            width: b.size, height: b.size,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0.15) 60%, transparent 70%)',
            border: '1px solid rgba(255,255,255,0.35)',
            opacity: b.op,
            animation: `ozBubbleRise ${b.dur}s linear ${b.delay}s infinite`,
            '--drift': `${b.drift}px`,
          }} />
        ))}
      </Div>
    );
  }

  // Native version uses Animated API
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {bubbles.map((b, i) => (
        <NativeBubble key={i} size={b.size} leftPct={b.left} delay={b.delay} dur={b.dur} opacity={b.op} />
      ))}
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SPARKLE (decorative)
   ════════════════════════════════════════════════════════════════ */
function SparkleDot({ style, size = 18 }: { style?: any; size?: number }) {
  if (Platform.OS !== 'web') return null;
  const Div = 'div' as any;
  return (
    <Div style={{
      position: 'absolute', width: size, height: size, color: B.primary,
      animation: 'ozFloat 3.5s ease-in-out infinite', ...style,
    }}>
      <svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor">
        <path d="M12 2L13.5 9.5 21 11l-7.5 1.5L12 20l-1.5-7.5L3 11l7.5-1.5L12 2z"/>
      </svg>
    </Div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CENTER RIPPLE (web only - big drop + expanding rings)
   ════════════════════════════════════════════════════════════════ */
function CenterRipple({ color = '#38BDF8' }: { color?: string }) {
  if (Platform.OS !== 'web') return null;
  const Div = 'div' as any;
  return (
    <Div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1,
    }}>
      <Div style={{
        position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)',
        width: 28, height: 42,
        background: `radial-gradient(ellipse at 38% 28%, #ffffff 0%, #BAE6FD 35%, ${color} 70%, #0284C7 100%)`,
        borderRadius: '50% 50% 50% 50% / 62% 62% 38% 38%',
        boxShadow: `0 0 20px ${color}80, inset -4px -8px 14px rgba(2,132,199,0.5), inset 4px 6px 10px rgba(255,255,255,0.6)`,
        animation: 'ozCrDrop 4.2s cubic-bezier(.55,0,.85,.55) infinite',
        transformOrigin: 'center top',
      }} />
      <Div style={{
        position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)',
        width: 3, height: 0,
        background: `linear-gradient(180deg, transparent, ${color}aa, transparent)`,
        filter: 'blur(1px)',
        animation: 'ozCrStreak 4.2s cubic-bezier(.55,0,.85,.55) infinite',
      }} />
      <Div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        width: 60, height: 60, borderRadius: '50%',
        background: `radial-gradient(circle, rgba(255,255,255,0.9), ${color}60 55%, transparent 75%)`,
        opacity: 0, animation: 'ozCrFlash 4.2s cubic-bezier(.3,.7,.3,1) infinite',
      }} />
      {[0, 0.22, 0.42].map((delay, i) => (
        <Div key={i} style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          width: 20, height: 20, borderRadius: '50%',
          border: `2px solid ${color}`, opacity: 0,
          boxShadow: `0 0 16px ${color}40, inset 0 0 12px ${color}30`,
          animation: `ozCrRing 4.2s cubic-bezier(.25,.7,.3,1) ${delay}s infinite`,
        }} />
      ))}
      <Div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        width: 40, height: 12, borderRadius: '50%',
        border: `1.5px solid ${color}`, opacity: 0,
        animation: 'ozCrWave 4.2s cubic-bezier(.25,.7,.3,1) infinite',
        boxShadow: `0 0 20px ${color}60`,
      }} />
      <Div style={{
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
        width: 40, height: 12, borderRadius: '50%',
        border: `1px solid ${color}`, opacity: 0,
        animation: 'ozCrWave 4.2s cubic-bezier(.25,.7,.3,1) 0.35s infinite',
      }} />
      {[-28, -14, 0, 14, 28].map((dx, i) => (
        <Div key={'s' + i} style={{
          position: 'absolute', left: `calc(50% + ${dx}px)`, top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 5, height: 5, borderRadius: '50%',
          background: color, boxShadow: `0 0 8px ${color}`,
          opacity: 0, animation: `ozCrCrown${i} 4.2s cubic-bezier(.2,.9,.3,1) infinite`,
        }} />
      ))}
    </Div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   OZONE-DROP CURSOR (web only - drop follows pointer + disperse trail)
   ════════════════════════════════════════════════════════════════ */
function useOzoneDropCursor() {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined') return;
    // Only on devices with a fine pointer (mouse/trackpad). Skips touch.
    const mq = window.matchMedia && window.matchMedia('(pointer: fine)');
    if (mq && !mq.matches) return;

    // Ozone (O₃) molecule cursor - three glowing blue oxygen atoms in a bent
    // triangular arrangement, with flame-shaped gas plumes evaporating UPWARD from
    // the molecule (like vapour rising off a hot surface, not a circular halo).
    const DROP_SVG = `
      <div class="oz-glow"></div>
      <div class="oz-plume oz-plume-1"></div>
      <div class="oz-plume oz-plume-2"></div>
      <div class="oz-plume oz-plume-3"></div>
      <div class="oz-plume oz-plume-4"></div>
      <div class="oz-plume oz-plume-5"></div>
      <div class="oz-plume oz-plume-6"></div>
      <svg class="oz-mol" viewBox="0 0 36 36" width="34" height="34" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="ozcAtom" cx="38%" cy="32%" r="70%">
            <stop offset="0%"  stop-color="#FFFFFF" stop-opacity="0.98"/>
            <stop offset="35%" stop-color="#BAE6FD" stop-opacity="0.95"/>
            <stop offset="75%" stop-color="#0EA5E9" stop-opacity="0.95"/>
            <stop offset="100%" stop-color="#0369A1" stop-opacity="1"/>
          </radialGradient>
        </defs>
        <!-- molecular bonds -->
        <line x1="18" y1="22" x2="9"  y2="14" stroke="rgba(186,230,253,0.85)" stroke-width="1.4" stroke-linecap="round"/>
        <line x1="18" y1="22" x2="27" y2="14" stroke="rgba(186,230,253,0.85)" stroke-width="1.4" stroke-linecap="round"/>
        <!-- left O atom -->
        <circle cx="9"  cy="14" r="4.4" fill="url(#ozcAtom)" stroke="rgba(2,132,199,0.55)" stroke-width="0.6"/>
        <ellipse cx="7.4" cy="12.4" rx="1.4" ry="1.9" fill="rgba(255,255,255,0.7)"/>
        <!-- right O atom -->
        <circle cx="27" cy="14" r="4.4" fill="url(#ozcAtom)" stroke="rgba(2,132,199,0.55)" stroke-width="0.6"/>
        <ellipse cx="25.4" cy="12.4" rx="1.4" ry="1.9" fill="rgba(255,255,255,0.7)"/>
        <!-- center O atom (slightly larger) -->
        <circle cx="18" cy="22" r="5.6" fill="url(#ozcAtom)" stroke="rgba(2,132,199,0.6)" stroke-width="0.7"/>
        <ellipse cx="16" cy="20" rx="1.8" ry="2.4" fill="rgba(255,255,255,0.75)"/>
      </svg>`;
    // Trail: a tight cluster of tiny bubbles representing dispersing ozone gas.
    const TRAIL_SVG = `
      <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="ozctb" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stop-color="rgba(255,255,255,0.9)"/>
            <stop offset="60%" stop-color="rgba(125,211,252,0.7)"/>
            <stop offset="100%" stop-color="rgba(14,165,233,0.55)"/>
          </radialGradient>
        </defs>
        <circle cx="12" cy="14" r="4.2" fill="url(#ozctb)" stroke="rgba(2,132,199,0.4)" stroke-width="0.5"/>
        <circle cx="6"  cy="9"  r="2.6" fill="url(#ozctb)" stroke="rgba(2,132,199,0.35)" stroke-width="0.4"/>
        <circle cx="18" cy="9"  r="2.4" fill="url(#ozctb)" stroke="rgba(2,132,199,0.35)" stroke-width="0.4"/>
      </svg>`;

    // CSS injection: hide native cursor, define trail keyframes
    const styleId = 'ozonewash-cursor-style';
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      // Smooth gas-disperse trail: invisible → quick fade-in → continuous linear fade-out
      // while drifting upward. No "stuck" plateau - opacity decays monotonically.
      style.textContent = `
        html, body, *, *::before, *::after { cursor: none !important; }
        @keyframes ozCursorRise {
          0%   { opacity: 0;    transform: translate(-50%, -50%) scale(0.45); }
          12%  { opacity: 0.75; transform: translate(-50%, calc(-50% - 4px)) scale(1); }
          100% { opacity: 0;    transform: translate(calc(-50% + var(--drift,0px)), calc(-50% - 42px)) scale(1.7); }
        }
        @keyframes ozCursorSpin {
          0%, 100% { filter: drop-shadow(0 0 6px rgba(14,165,233,0.55)) drop-shadow(0 0 14px rgba(56,189,248,0.35)); }
          50%      { filter: drop-shadow(0 0 10px rgba(14,165,233,0.8)) drop-shadow(0 0 22px rgba(56,189,248,0.55)); }
        }
        .oz-cursor { animation: ozCursorSpin 2.4s ease-in-out infinite; position: relative; }
        .oz-cursor .oz-mol {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          z-index: 2;
        }
        /* ── Static base glow behind the molecule (subtle) ── */
        .oz-cursor .oz-glow {
          position: absolute; top: 50%; left: 50%;
          width: 32px; height: 32px;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          background: radial-gradient(circle, rgba(186,230,253,0.55), rgba(14,165,233,0.18) 55%, transparent 80%);
          filter: blur(4px);
          pointer-events: none;
          z-index: 0;
        }
        /* ── Flame-shaped evaporating gas plumes - rise upward off the molecule
              with a slight S-curve sway, expand & fade like real vapour wisps.
              6 plumes staggered for continuous flow. ── */
        .oz-cursor .oz-plume {
          position: absolute; left: 50%; top: 50%;
          width: 14px; height: 22px;
          /* Tear-drop / flame shape: narrow at base (top), wider at the trailing tip */
          border-radius: 50% 50% 50% 50% / 70% 70% 35% 35%;
          background: radial-gradient(ellipse at 50% 75%,
            rgba(255,255,255,0.85) 0%,
            rgba(186,230,253,0.7) 35%,
            rgba(56,189,248,0.4) 65%,
            transparent 90%);
          filter: blur(2.5px);
          pointer-events: none;
          will-change: transform, opacity;
          transform-origin: 50% 100%;
          z-index: 1;
        }
        .oz-cursor .oz-plume-1 { animation: ozPlume1 2.6s ease-out infinite;                    }
        .oz-cursor .oz-plume-2 { animation: ozPlume2 2.6s ease-out infinite; animation-delay: 0.43s; }
        .oz-cursor .oz-plume-3 { animation: ozPlume3 2.6s ease-out infinite; animation-delay: 0.86s; }
        .oz-cursor .oz-plume-4 { animation: ozPlume4 2.6s ease-out infinite; animation-delay: 1.30s; }
        .oz-cursor .oz-plume-5 { animation: ozPlume5 2.6s ease-out infinite; animation-delay: 1.73s; }
        .oz-cursor .oz-plume-6 { animation: ozPlume6 2.6s ease-out infinite; animation-delay: 2.16s; }
        /* Each plume: starts compressed at the molecule, drifts UPWARD with sway,
           stretches vertically, and fades. Sway pattern alternates left/right. */
        @keyframes ozPlume1 {
          0%   { transform: translate(-50%, -10%) scale(0.35, 0.4); opacity: 0; }
          15%  { opacity: 0.85; }
          55%  { transform: translate(calc(-50% - 4px), -50%) scale(0.95, 1.6); opacity: 0.55; }
          100% { transform: translate(calc(-50% + 3px), -130%) scale(1.5, 2.7); opacity: 0; }
        }
        @keyframes ozPlume2 {
          0%   { transform: translate(-50%, -10%) scale(0.35, 0.4); opacity: 0; }
          15%  { opacity: 0.8; }
          55%  { transform: translate(calc(-50% + 5px), -55%) scale(1.05, 1.7); opacity: 0.5; }
          100% { transform: translate(calc(-50% - 5px), -140%) scale(1.6, 2.8); opacity: 0; }
        }
        @keyframes ozPlume3 {
          0%   { transform: translate(-50%, -10%) scale(0.3, 0.35); opacity: 0; }
          15%  { opacity: 0.75; }
          55%  { transform: translate(calc(-50% - 6px), -45%) scale(0.9, 1.5); opacity: 0.5; }
          100% { transform: translate(calc(-50% + 6px), -120%) scale(1.4, 2.5); opacity: 0; }
        }
        @keyframes ozPlume4 {
          0%   { transform: translate(-50%, -10%) scale(0.35, 0.4); opacity: 0; }
          15%  { opacity: 0.85; }
          55%  { transform: translate(calc(-50% + 7px), -60%) scale(1.0, 1.65); opacity: 0.55; }
          100% { transform: translate(calc(-50% - 4px), -150%) scale(1.55, 2.9); opacity: 0; }
        }
        @keyframes ozPlume5 {
          0%   { transform: translate(-50%, -10%) scale(0.3, 0.35); opacity: 0; }
          15%  { opacity: 0.8; }
          55%  { transform: translate(calc(-50% - 3px), -50%) scale(0.85, 1.5); opacity: 0.5; }
          100% { transform: translate(calc(-50% + 5px), -125%) scale(1.45, 2.6); opacity: 0; }
        }
        @keyframes ozPlume6 {
          0%   { transform: translate(-50%, -10%) scale(0.35, 0.4); opacity: 0; }
          15%  { opacity: 0.75; }
          55%  { transform: translate(calc(-50% + 4px), -55%) scale(1.0, 1.6); opacity: 0.5; }
          100% { transform: translate(calc(-50% - 6px), -135%) scale(1.5, 2.7); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    // Cursor element (O₃ molecule + gas aura, 64x64). The molecule centres at the
    // pointer; the surrounding gas halos and wisps extend beyond it.
    const cursor = document.createElement('div');
    cursor.className = 'oz-cursor';
    cursor.innerHTML = DROP_SVG;
    Object.assign(cursor.style, {
      position: 'fixed', top: '0', left: '0', pointerEvents: 'none',
      zIndex: '2147483647', width: '64px', height: '64px',
      transform: 'translate3d(-1000px, -1000px, 0)',
      willChange: 'transform',
      // No CSS transition - cursor follows pointer 1:1 via rAF for true smoothness
    } as Partial<CSSStyleDeclaration>);
    document.body.appendChild(cursor);

    // rAF-driven cursor positioning - eliminates per-event layout thrash and the
    // "rubber-band" feel that came from the prior CSS transition.
    let targetX = -1000, targetY = -1000;
    let curX = -1000, curY = -1000;
    let rafId = 0;
    const tick = () => {
      // Light easing toward target for buttery glide (~0.35 lerp per frame)
      curX += (targetX - curX) * 0.35;
      curY += (targetY - curY) * 0.35;
      cursor.style.transform = `translate3d(${curX - 32}px, ${curY - 32}px, 0)`;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    let lastX = -1000, lastY = -1000, accum = 0;
    const onMove = (e: MouseEvent) => {
      const x = e.clientX, y = e.clientY;
      targetX = x; targetY = y;
      const dx = x - lastX, dy = y - lastY;
      const step = Math.sqrt(dx * dx + dy * dy);
      accum += step;
      // Denser spawn threshold for continuous gas feel (was 18 → now 11)
      if (accum > 11) {
        accum = 0;
        const trail = document.createElement('div');
        trail.innerHTML = TRAIL_SVG;
        const jitterX = (Math.random() - 0.5) * 12;
        const jitterY = (Math.random() - 0.5) * 6;
        const drift = (Math.random() - 0.5) * 28;
        const scale = 0.5 + Math.random() * 0.45;
        const dur = 520 + Math.random() * 220; // tighter window → smoother flow
        Object.assign(trail.style, {
          position: 'fixed',
          top: `${y + jitterY}px`,
          left: `${x + jitterX}px`,
          width: `${22 * scale}px`,
          height: `${22 * scale}px`,
          pointerEvents: 'none',
          zIndex: '2147483646',
          willChange: 'transform, opacity',
          // Linear ease-out → no plateau, no abrupt vanish
          animation: `ozCursorRise ${dur}ms cubic-bezier(.15,.55,.35,1) forwards`,
        } as Partial<CSSStyleDeclaration>);
        (trail.style as any).setProperty('--drift', `${drift}px`);
        document.body.appendChild(trail);
        window.setTimeout(() => trail.remove(), dur + 50);
      }
      lastX = x; lastY = y;
    };

    const onLeave = () => {
      targetX = -1000; targetY = -1000;
      curX = -1000; curY = -1000;
      cursor.style.transform = 'translate3d(-1000px, -1000px, 0)';
    };
    const onEnter = () => { /* cursor will reposition on next move */ };

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      cursor.remove();
      style?.remove();
    };
  }, []);
}

/* ══════════════════════════════════════════════════════════════════
   HERO VISUAL - NATIVE (mobile-only, lightweight SVG tank + halo + chips)
   ════════════════════════════════════════════════════════════════ */
function HeroVisualNative() {
  // Subtle vertical bob using Animated.loop - no rAF loops, no perspective.
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
  const haloOp     = bob.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.85] });

  return (
    <View style={{ width: '100%', height: 280, alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
      {/* Soft glow halo behind the tank */}
      <Animated.View style={{
        position: 'absolute', width: 240, height: 240, borderRadius: 120,
        backgroundColor: 'rgba(186,230,253,0.35)', opacity: haloOp,
        top: '50%', left: '50%', marginLeft: -120, marginTop: -120,
      }} />

      {/* Tank illustration - bobs gently */}
      <Animated.View style={{ transform: [{ translateY }] }}>
        <Svg width={170} height={220} viewBox="0 0 170 220">
          <Defs>
            <SvgRadialGradient id="ozNativeTankBody" cx="35%" cy="30%" r="80%">
              <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="1" />
              <Stop offset="22%"  stopColor="#E0F2FE" stopOpacity="1" />
              <Stop offset="55%"  stopColor="#38BDF8" stopOpacity="1" />
              <Stop offset="100%" stopColor="#0369A1" stopOpacity="1" />
            </SvgRadialGradient>
            <SvgLinearGradient id="ozNativeWater" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"   stopColor="#BAE6FD" stopOpacity="0.95" />
              <Stop offset="100%" stopColor="#0284C7" stopOpacity="1" />
            </SvgLinearGradient>
          </Defs>
          {/* Ground shadow */}
          <Ellipse cx={85} cy={210} rx={70} ry={6} fill="rgba(2,132,199,0.25)" />
          {/* Dome cap */}
          <Ellipse cx={85} cy={28} rx={62} ry={18} fill="url(#ozNativeTankBody)" />
          {/* Cylinder body */}
          <Rect x={23} y={26} width={124} height={160} rx={10} fill="url(#ozNativeTankBody)" />
          {/* Ribs */}
          <Rect x={23} y={70}  width={124} height={4} fill="rgba(2,132,199,0.35)" />
          <Rect x={23} y={120} width={124} height={4} fill="rgba(2,132,199,0.35)" />
          {/* Water inside (front face) */}
          <Path d="M30 100 L140 100 L140 180 Q140 186 134 186 L36 186 Q30 186 30 180 Z" fill="url(#ozNativeWater)" opacity={0.85} />
          {/* Highlight streak */}
          <Rect x={36} y={32} width={6} height={150} rx={3} fill="rgba(255,255,255,0.45)" />
          {/* Bottom cap */}
          <Rect x={20} y={184} width={130} height={12} rx={5} fill="#0369A1" />
        </Svg>
      </Animated.View>

      {/* Floating info chips - simple absolute positioned glass pills */}
      <View style={{
        position: 'absolute', top: 24, left: 12,
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderWidth: 1, borderColor: 'rgba(2,132,199,0.18)',
        ...Platform.select({
          ios:     { shadowColor: 'rgba(2,132,199,0.3)', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 12 },
          android: { elevation: 4 },
        }),
      }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: B.leaf }} />
        <Text style={{ fontSize: 10.5, fontWeight: '800', color: B.primaryDk, letterSpacing: 0.4 }}>Live cleaning</Text>
      </View>
      <View style={{
        position: 'absolute', bottom: 36, right: 10,
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderWidth: 1, borderColor: 'rgba(2,132,199,0.18)',
        ...Platform.select({
          ios:     { shadowColor: 'rgba(2,132,199,0.3)', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 12 },
          android: { elevation: 4 },
        }),
      }}>
        <QrCode size={11} weight="bold" color={B.primaryDk} />
        <Text style={{ fontSize: 10.5, fontWeight: '800', color: B.primaryDk, letterSpacing: 0.4 }}>QR-Verified Cert</Text>
      </View>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HERO VISUAL (desktop hero right side - blue tank + floating cards)
   ════════════════════════════════════════════════════════════════ */
function HeroVisual() {
  const [pct, setPct] = useState(0);
  const wrapRef = useRef<any>(null);
  const [par, setPar] = useState({ x: 0, y: 0 });
  const [wrapW, setWrapW] = useState(0);
  const compact = wrapW > 0 && wrapW < 720; // tablet / medium screens
  const certCardW = compact ? 140 : 200;

  useEffect(() => {
    let raf: number; const t0 = performance.now();
    const loop = (t: number) => {
      setPct(((t - t0) % 6000) / 6000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const onMove = (e: any) => {
      const r = el.getBoundingClientRect();
      setPar({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
    };
    const onLeave = () => setPar({ x: 0, y: 0 });
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    const updateW = () => setWrapW(el.getBoundingClientRect().width);
    updateW();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateW) : null;
    ro?.observe(el);
    window.addEventListener('resize', updateW);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      ro?.disconnect();
      window.removeEventListener('resize', updateW);
    };
  }, []);

  const Div = 'div' as any;
  const water = 55 + Math.sin(pct * Math.PI * 2) * 18;
  const ozonePpm = (2.1 + Math.sin(pct * Math.PI * 4) * 0.35).toFixed(2);
  const purity = (94 + Math.abs(Math.sin(pct * Math.PI * 2)) * 5).toFixed(1);
  const stepIdx = Math.floor(pct * 4) % 4;
  const stepProg = (pct * 4) % 1;
  const STEPS = ['Drain', 'Pressure rinse', 'Ozone injection', 'Certify'];

  return (
    <Div ref={wrapRef} style={{ position: 'relative', width: '100%', height: 560, perspective: '1400px' }}>
      {/* Aqua radial glow backdrop */}
      <Div style={{
        position: 'absolute', inset: '-40px',
        background: `radial-gradient(60% 55% at 50% 45%, rgba(125,211,252,0.55), transparent 65%),
                     radial-gradient(40% 40% at 20% 80%, rgba(34,197,94,0.22), transparent 70%),
                     radial-gradient(40% 40% at 85% 20%, rgba(186,230,253,0.55), transparent 70%)`,
        filter: 'blur(10px)', pointerEvents: 'none',
      }} />

      {/* Soft grid floor */}
      <svg viewBox="0 0 500 200" preserveAspectRatio="none" style={{
        position: 'absolute', left: 0, right: 0, bottom: 10, width: '100%', height: 180,
        opacity: 0.35, transform: 'translateY(20px)',
      }}>
        <defs>
          <linearGradient id="ozGridFade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0284C7" stopOpacity="0" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        {Array.from({ length: 10 }).map((_, i) => (
          <path key={'h' + i} d={`M${-100 + i * 60} 0 L${-400 + i * 140} 200`} stroke="url(#ozGridFade)" strokeWidth="1" fill="none" />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <path key={'v' + i} d={`M0 ${40 + i * 36} L500 ${40 + i * 36}`} stroke="url(#ozGridFade)" strokeWidth="1" fill="none" opacity={0.5 + i * 0.1} />
        ))}
      </svg>

      <CenterRipple color="#38BDF8" />

      {/* Center: 3D water tank */}
      <Div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: `translate(-50%, -50%) translate3d(${par.x * -14}px, ${par.y * -14}px, 0) rotateY(${par.x * 6}deg) rotateX(${par.y * -4}deg)`,
        transformStyle: 'preserve-3d',
        transition: 'transform .25s cubic-bezier(.2,.7,.2,1)',
        width: 250, height: 340,
      }}>
        {/* Ozone halo ring */}
        <Div style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          width: 360, height: 360, borderRadius: '50%',
          background: `conic-gradient(from ${pct * 360}deg,
            rgba(14,165,233,0) 0%, rgba(14,165,233,0.35) 25%,
            rgba(34,197,94,0.35) 50%, rgba(14,165,233,0.35) 75%, rgba(14,165,233,0) 100%)`,
          filter: 'blur(22px)', opacity: 0.85,
        }} />
        {/* Orbit rings */}
        <Div style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          width: 300, height: 300, borderRadius: '50%',
          border: '1px dashed rgba(2,132,199,0.35)',
          animation: 'ozSpin 18s linear infinite',
        }} />
        <Div style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          width: 380, height: 380, borderRadius: '50%',
          border: '1px dashed rgba(2,132,199,0.18)',
          animation: 'ozSpin 32s linear infinite reverse',
        }} />

        {/* Tank dome top */}
        <Div style={{
          position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)',
          width: 230, height: 44,
          background: 'radial-gradient(ellipse at 35% 20%, #ffffff 0%, #E0F2FE 30%, #7DD3FC 70%, #0284C7 100%)',
          borderRadius: '50% 50% 12% 12% / 100% 100% 20% 20%',
          boxShadow: 'inset 0 -6px 18px rgba(2,132,199,0.4), 0 6px 14px rgba(2,132,199,0.25)',
          zIndex: 3,
        }}>
          <Div style={{
            position: 'absolute', left: '50%', top: -10, transform: 'translateX(-50%)',
            width: 50, height: 16,
            background: 'linear-gradient(180deg, #0EA5E9, #0369A1)',
            borderRadius: '50% 50% 20% 20% / 100% 100% 20% 20%',
            boxShadow: '0 2px 6px rgba(2,132,199,0.4)',
          }} />
          <Div style={{
            position: 'absolute', left: '50%', top: 14, transform: 'translateX(-50%)',
            width: 18, height: 6, borderRadius: 3, background: 'rgba(2,132,199,0.45)',
          }} />
        </Div>

        {/* Tank cylinder body */}
        <Div style={{
          position: 'absolute', left: '50%', top: 36, transform: 'translateX(-50%)',
          width: 230, height: 260, borderRadius: '18px 18px 40px 40% / 18px 18px 24px 24%',
          background: `linear-gradient(90deg,
            #0369A1 0%, #0284C7 12%, #38BDF8 35%, #7DD3FC 52%, #38BDF8 70%, #0284C7 88%, #0369A1 100%)`,
          overflow: 'hidden',
          boxShadow: '0 40px 70px rgba(2,132,199,0.45), inset 0 0 0 2px rgba(255,255,255,0.15)',
          zIndex: 2,
        }}>
          {[50, 110, 180].map((top, i) => (
            <Div key={i} style={{
              position: 'absolute', left: 0, right: 0, top,
              height: 14,
              background: `linear-gradient(180deg,
                rgba(2,132,199,0.35) 0%, rgba(255,255,255,0.15) 50%, rgba(2,132,199,0.35) 100%)`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.12)',
            }} />
          ))}
          <Div style={{
            position: 'absolute', left: 18, top: 0, bottom: 0, width: 14,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.1))',
            borderRadius: 7, filter: 'blur(2px)',
          }} />
          <Div style={{
            position: 'absolute', right: 32, top: 10, bottom: 10, width: 6,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0.05))',
            borderRadius: 4, filter: 'blur(1px)',
          }} />
          {/* Water inside */}
          <Div style={{
            position: 'absolute', left: 10, right: 10, bottom: 14,
            height: `calc(${water}% - 20px)`,
            borderRadius: '8px 8px 30px 30% / 8px 8px 20px 20%',
            background: 'linear-gradient(180deg, rgba(186,230,253,0.9) 0%, rgba(56,189,248,0.9) 40%, rgba(2,132,199,0.95) 100%)',
            boxShadow: 'inset 0 0 40px rgba(255,255,255,0.3)',
            transition: 'height 0.4s cubic-bezier(.4,0,.2,1)',
            overflow: 'hidden',
          }}>
            <svg viewBox="0 0 200 16" preserveAspectRatio="none" style={{
              position: 'absolute', top: -8, left: 0, width: '100%', height: 16,
            }}>
              <path fill="rgba(186,230,253,0.95)"
                d={`M0 8 Q 25 ${4 + Math.sin(pct * Math.PI * 4) * 3} 50 8 T 100 8 T 150 8 T 200 8 L 200 16 L 0 16 Z`} />
              <path fill="rgba(125,211,252,0.7)"
                d={`M0 10 Q 30 ${6 + Math.cos(pct * Math.PI * 4) * 2} 60 10 T 120 10 T 200 10 L 200 16 L 0 16 Z`} />
            </svg>
            {Array.from({ length: 8 }).map((_, i) => (
              <Div key={i} style={{
                position: 'absolute', left: `${10 + (i * 13) % 80}%`, bottom: '-10%',
                width: 4 + (i % 3) * 3, height: 4 + (i % 3) * 3, borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #fff, rgba(255,255,255,0.5))',
                animation: `ozBubbleUp 4s ease-in ${(i * 0.8) % 4}s infinite`,
                opacity: 0.8,
              }} />
            ))}
          </Div>
        </Div>

        {/* Bottom cap with tap */}
        <Div style={{
          position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)',
          width: 240, height: 20,
          background: 'linear-gradient(180deg, #0369A1, #082F49)',
          borderRadius: '10px 10px 14px 14px',
          boxShadow: '0 8px 14px rgba(0,0,0,0.25)', zIndex: 4,
        }}>
          <Div style={{
            position: 'absolute', left: '50%', bottom: -14, transform: 'translateX(-50%)',
            width: 18, height: 14,
            background: 'linear-gradient(180deg, #64748B, #334155)',
            borderRadius: '0 0 3px 3px',
          }}>
            <Div style={{
              position: 'absolute', left: '50%', top: '100%', transform: 'translateX(-50%)',
              width: 4, height: 6,
              borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
              background: '#38BDF8',
              opacity: Math.sin(pct * Math.PI * 8) > 0.9 ? 1 : 0,
              transition: 'opacity .15s',
            }} />
          </Div>
        </Div>

        {/* Ground shadow */}
        <Div style={{
          position: 'absolute', left: '50%', bottom: -32, transform: 'translateX(-50%)',
          width: 260, height: 24, borderRadius: '50%',
          background: 'radial-gradient(ellipse at 50% 50%, rgba(2,132,199,0.5), transparent 70%)',
          filter: 'blur(6px)',
        }} />
      </Div>

      {/* Floating card: Water Purity meter (top-left) */}
      <Div style={{
        position: 'absolute', left: 10, top: 40,
        transform: `translate3d(${par.x * 18}px, ${par.y * 18}px, 0)`,
        transition: 'transform .25s cubic-bezier(.2,.7,.2,1)',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 18, padding: '14px 16px',
        border: '1px solid rgba(2,132,199,0.12)',
        boxShadow: '0 24px 50px rgba(2,132,199,0.22), 0 2px 6px rgba(2,132,199,0.1)',
        display: 'flex', alignItems: 'center', gap: 12,
        animation: 'ozFloat 5s ease-in-out infinite',
      }}>
        <Div style={{ position: 'relative', width: 52, height: 52 }}>
          <svg viewBox="0 0 52 52" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
            <circle cx="26" cy="26" r="22" stroke="#E0F2FE" strokeWidth="4" fill="none" />
            <circle cx="26" cy="26" r="22" stroke="url(#ozMeterGrad)" strokeWidth="4" fill="none"
              strokeDasharray={`${2 * Math.PI * 22}`}
              strokeDashoffset={`${2 * Math.PI * 22 * (1 - parseFloat(purity) / 100)}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset .4s' }} />
            <defs>
              <linearGradient id="ozMeterGrad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#0EA5E9" />
                <stop offset="100%" stopColor="#22C55E" />
              </linearGradient>
            </defs>
          </svg>
          <Div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 12, color: B.ink,
          }}>{purity}%</Div>
        </Div>
        <Div>
          <Div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: B.muted }}>WATER PURITY</Div>
          <Div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 15, fontWeight: 800, color: B.ink, marginTop: 2 }}>Excellent</Div>
          <Div style={{ fontSize: 10, color: B.leaf, fontWeight: 700, marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Div style={{ width: 6, height: 6, borderRadius: '50%', background: B.leaf, boxShadow: `0 0 8px ${B.leaf}` }} />
            LIVE {'\u00b7'} {ozonePpm} ppm O{'\u2083'}
          </Div>
        </Div>
      </Div>

      {/* Floating card: Crew status (bottom-left) */}
      <Div style={{
        position: 'absolute', left: 20, bottom: 30,
        transform: `translate3d(${par.x * 22}px, ${par.y * 22}px, 0)`,
        transition: 'transform .25s cubic-bezier(.2,.7,.2,1)',
        background: '#fff', borderRadius: 18, padding: '14px 16px', width: 220,
        border: '1px solid rgba(2,132,199,0.12)',
        boxShadow: '0 24px 50px rgba(2,132,199,0.22)',
        animation: 'ozFloat 6s ease-in-out infinite 1.2s',
      }}>
        <Div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Div style={{
            width: 28, height: 28, borderRadius: 8,
            background: `linear-gradient(135deg, ${B.primary}, ${B.primaryDk})`,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Users size={14} color="#fff" weight="bold" />
          </Div>
          <Div>
            <Div style={{ fontSize: 10, fontWeight: 700, color: B.muted, letterSpacing: 0.8 }}>CREW #214</Div>
            <Div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, fontWeight: 800, color: B.ink }}>{STEPS[stepIdx]}</Div>
          </Div>
          <Div style={{
            marginLeft: 'auto', fontSize: 9, fontWeight: 800, padding: '3px 7px',
            borderRadius: 999, background: B.aqua, color: B.primaryDk, letterSpacing: 0.5,
          }}>STEP {stepIdx + 1}/4</Div>
        </Div>
        <Div style={{ display: 'flex', gap: 4 }}>
          {STEPS.map((_, i) => (
            <Div key={i} style={{
              flex: 1, height: 5, borderRadius: 99, background: '#E0F2FE', overflow: 'hidden', position: 'relative',
            }}>
              <Div style={{
                position: 'absolute', inset: 0,
                width: i < stepIdx ? '100%' : (i === stepIdx ? `${stepProg * 100}%` : '0%'),
                background: `linear-gradient(90deg, ${B.primary}, ${B.leaf})`,
                transition: 'width .2s linear',
              }} />
            </Div>
          ))}
        </Div>
      </Div>

      {/* Floating card: Certificate stamp (top-right) - clickable, opens live demo cert */}
      <Div
        onClick={() => window.open(DEMO_CERT_URL, '_blank', 'noopener,noreferrer')}
        title="Click to view a live demo certificate"
        style={{
          position: 'absolute', right: 0, top: 20,
          transform: `translate3d(${par.x * 24}px, ${par.y * 24}px, 0) rotate(4deg)`,
          transition: 'transform .25s cubic-bezier(.2,.7,.2,1), box-shadow .3s',
          background: '#fff', borderRadius: 16, padding: compact ? '10px 12px' : '14px 16px', width: certCardW,
          border: '1px solid rgba(2,132,199,0.12)',
          boxShadow: '0 28px 60px rgba(2,132,199,0.28)',
          animation: 'ozFloat 5.5s ease-in-out infinite .5s',
          cursor: 'pointer',
        }}>
        <Div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Div style={{
            width: 34, height: 34, borderRadius: 10,
            background: `linear-gradient(135deg, ${B.leaf}, #16A34A)`,
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldCheck size={18} weight="fill" color="#fff" />
          </Div>
          <Div>
            <Div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.4, color: B.muted }}>CERTIFICATE</Div>
            <Div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, fontWeight: 800, color: B.ink, lineHeight: 1.1 }}>#OW-DEMO</Div>
          </Div>
        </Div>
        {/* Real scannable QR encoding the demo certificate URL */}
        <Div style={{
          marginTop: 10, aspectRatio: '1', width: '100%',
          borderRadius: 8, padding: 6, background: '#fff',
          border: `1px solid ${B.line}`,
          position: 'relative',
        }}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=0&data=${encodeURIComponent(DEMO_CERT_URL)}`}
            alt="Scan to view demo certificate"
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
          {/* Brand chip overlay in the QR centre */}
          <Div style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            width: 26, height: 26, borderRadius: 7, background: '#fff',
            border: `2px solid ${B.primary}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldCheck size={14} weight="fill" color={B.primary} />
          </Div>
        </Div>
        <Div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 9, color: B.muted, fontWeight: 700 }}>
          <Div style={{ color: B.primaryDk }}>Scan or tap for demo</Div>
          <Div style={{ color: B.leaf, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Div style={{ width: 4, height: 4, borderRadius: '50%', background: B.leaf }} />LIVE
          </Div>
        </Div>
      </Div>

      {/* Floating pill: EcoScore (bottom-right) */}
      <Div style={{
        position: 'absolute', right: 10, bottom: 60,
        transform: `translate3d(${par.x * 16}px, ${par.y * 16}px, 0)`,
        transition: 'transform .25s cubic-bezier(.2,.7,.2,1)',
        background: `linear-gradient(135deg, ${B.primaryDk}, ${B.primaryDkr})`,
        color: '#fff', borderRadius: 14, padding: '10px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 20px 40px rgba(3,105,161,0.4)',
        animation: 'ozFloat 4.5s ease-in-out infinite 2s',
      }}>
        <Div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'rgba(255,255,255,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Leaf size={16} color="#BAE6FD" weight="fill" />
        </Div>
        <Div>
          <Div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, color: 'rgba(255,255,255,0.7)' }}>ECOSCORE</Div>
          <Div style={{ fontFamily: 'Manrope, sans-serif', fontSize: 14, fontWeight: 800 }}>A+ {'\u00b7'} zero chemicals</Div>
        </Div>
      </Div>
    </Div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SPINNING DASHED RING (orbits around the expandable Step 03 circle)
   ════════════════════════════════════════════════════════════════ */
function SpinningDashedRing({ size = 76, color }: { size?: number; color: string }) {
  if (Platform.OS === 'web') {
    const Div = 'div' as any;
    return (
      <Div style={{
        position: 'absolute',
        width: size + 12, height: size + 12,
        top: -6, left: -6,
        borderRadius: '50%',
        border: `2px dashed ${color}99`,
        animation: 'ozRingSpin 10s linear infinite',
        pointerEvents: 'none',
        boxSizing: 'border-box',
      }} />
    );
  }
  // Native: rotating dashed border via Animated rotation. Native doesn't render dashed
  // borders perfectly across platforms - fall back to a solid faint ring with a single
  // dash gap simulated by a notched overlay.
  const rot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rot, { toValue: 1, duration: 10000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const spin = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{
      position: 'absolute',
      width: size + 12, height: size + 12,
      top: -6, left: -6,
      borderRadius: (size + 12) / 2,
      borderWidth: 2,
      borderColor: `${color}55`,
      borderStyle: 'dashed',
      transform: [{ rotate: spin }],
    }} />
  );
}

/* ══════════════════════════════════════════════════════════════════
   EXPANDABLE 8-STEP PANEL (under Step 03 in How It Works)
   ════════════════════════════════════════════════════════════════ */
function EightStepsPanel({ open, onClose, isLarge }: { open: boolean; onClose: () => void; isLarge: boolean }) {
  // Native: simple toggle with Animated.View height
  const heightAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: open ? 1 : 0,
      duration: 700,
      easing: Easing.bezier(0.2, 0.7, 0.2, 1),
      useNativeDriver: false,
    }).start();
  }, [open]);

  const numCols = isLarge ? 4 : 1;
  const tagBg = (kind: EightStep['tagKind']) =>
    kind === 'uv' ? '#EDE9FE' : kind === 'live' ? '#DCFCE7' : B.aqua;
  const tagFg = (kind: EightStep['tagKind']) =>
    kind === 'uv' ? '#6D28D9' : kind === 'live' ? B.leafDk : B.primaryDk;

  const inner = (
    <View style={{ paddingTop: isLarge ? 60 : 32, paddingBottom: 20 }}>
      <View style={{
        flexDirection: isLarge ? 'row' : 'column',
        justifyContent: 'space-between',
        alignItems: isLarge ? 'flex-end' : 'flex-start',
        gap: 20, marginBottom: 28,
      }}>
        <View style={{ flex: isLarge ? 1 : undefined }}>
          <Eyebrow>Inside Step 03 · The Patent-Applied Protocol</Eyebrow>
          <Text style={{
            fontSize: isLarge ? 32 : 22, fontWeight: '800', letterSpacing: -1,
            color: B.ink, marginTop: 14,
            fontFamily: 'Manrope, sans-serif',
          }}>The 8-Step Ozone & UV Hygiene Process</Text>
          <Text style={{ fontSize: 14, color: B.muted, marginTop: 8, maxWidth: 480, lineHeight: 21 }}>
            Each step is logged, photo-verified, and reflected in your EcoScore™. Every card includes live photo upload, timestamp, and operator signature.
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: B.ink, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12,
          alignSelf: isLarge ? 'flex-end' : 'flex-start',
        }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Collapse ↑</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>
        {EIGHT_STEPS.map((step, i) => {
          const cardStyle = {
            width: isLarge ? `${(100 / numCols)}%` as any : '100%' as any,
            paddingRight: isLarge && (i + 1) % numCols !== 0 ? 18 : 0,
          };
          // Account for gap by subtracting from width
          const innerCard = (
            <View
              {...(Platform.OS === 'web' ? { className: 'oz-eight-card' } as any : {})}
              style={{
                backgroundColor: '#fff', borderWidth: 1, borderColor: B.line,
                borderRadius: 20, padding: 22, position: 'relative', overflow: 'hidden',
              }}
            >
              <View style={{
                position: 'absolute', top: 18, right: 18,
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: B.surfaceAlt,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <step.Icon size={18} color={B.primaryDk} weight="regular" />
              </View>
              <Text style={{
                fontSize: 44, fontWeight: '400' as any, lineHeight: 44,
                fontStyle: 'italic',
                color: B.primary,
                fontFamily: Platform.OS === 'web' ? 'Instrument Serif, Georgia, serif' : Platform.select({ ios: 'Georgia-Italic', android: 'serif' }) as any,
                marginBottom: 10,
              }}>{step.num}</Text>
              <Text style={{ fontSize: 15, fontWeight: '800', color: B.ink, marginBottom: 6, letterSpacing: -0.2 }}>{step.t}</Text>
              <Text style={{ fontSize: 12.5, color: B.muted, lineHeight: 18, marginBottom: 12 }}>{step.d}</Text>
              <View style={{
                alignSelf: 'flex-start',
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
                backgroundColor: tagBg(step.tagKind),
              }}>
                <Text style={{
                  fontSize: 10, fontWeight: '800', letterSpacing: 0.5,
                  color: tagFg(step.tagKind),
                }}>{step.tag}</Text>
              </View>
            </View>
          );
          return (
            <View key={i} style={cardStyle}>
              {innerCard}
            </View>
          );
        })}
      </View>
    </View>
  );

  // Web: pure CSS open/close transition with class for stagger animation
  if (Platform.OS === 'web') {
    const Div = 'div' as any;
    return (
      <Div className={`oz-eight-wrap${open ? ' open' : ''}`}>
        {inner}
      </Div>
    );
  }

  // Native: animated max-height proxy via opacity + scale + scrollHeight estimate
  const maxH = heightAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 2400] });
  return (
    <Animated.View style={{ maxHeight: maxH, overflow: 'hidden', opacity: heightAnim }}>
      {inner}
    </Animated.View>
  );
}

/* ══════════════════════════════════════════════════════════════════
   3D TANK + FEATURE RING (desktop features section)
   ════════════════════════════════════════════════════════════════ */
function Tank3D({ tilt, active }: { tilt: { x: number; y: number }; active: boolean }) {
  const Div = 'div' as any;
  const TANK_W = 240, TANK_H = 340;

  return (
    <Div style={{
      position: 'relative', width: TANK_W + 160, height: TANK_H + 120,
      display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
      transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
      transformStyle: 'preserve-3d',
      transition: 'transform .35s ease',
    }}>
      {/* Splash ribbons */}
      <svg viewBox="0 0 500 400" style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none',
        opacity: active ? 0.95 : 0.6,
        transition: 'opacity .4s',
      }}>
        <defs>
          <linearGradient id="ozSplashGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={B.primary} stopOpacity="0.85"/>
            <stop offset="100%" stopColor={B.primaryDk} stopOpacity="0.55"/>
          </linearGradient>
        </defs>
        <g style={{
          transformOrigin: '250px 200px',
          animation: active ? 'ozSplashPulse 1.6s ease-in-out infinite' : 'none',
        }}>
          <path fill="url(#ozSplashGrad)"
            d="M120 180 C 60 160, 40 240, 90 280 C 130 310, 170 290, 190 260 C 150 240, 120 230, 110 200 Z"/>
          <path fill="url(#ozSplashGrad)"
            d="M380 180 C 440 160, 460 240, 410 280 C 370 310, 330 290, 310 260 C 350 240, 380 230, 390 200 Z"/>
          <circle cx="70"  cy="150" r="8" fill={B.primary} opacity="0.7"/>
          <circle cx="430" cy="160" r="6" fill={B.primary} opacity="0.7"/>
          <circle cx="50"  cy="300" r="5" fill={B.primary} opacity="0.6"/>
          <circle cx="450" cy="310" r="7" fill={B.primary} opacity="0.6"/>
        </g>
      </svg>

      <Div style={{ position: 'relative', width: TANK_W, height: TANK_H, transformStyle: 'preserve-3d' }}>
        {/* Dome top cap */}
        <Div style={{
          position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
          width: TANK_W * 0.96, height: 44,
          borderRadius: '50% 50% 12% 12% / 100% 100% 20% 20%',
          background: 'radial-gradient(ellipse at 35% 20%, #ffffff 0%, #E0F2FE 30%, #7DD3FC 70%, #0284C7 100%)',
          boxShadow: 'inset 0 -6px 18px rgba(2,132,199,0.4), 0 6px 14px rgba(2,132,199,0.25)',
          zIndex: 3,
        }}>
          {/* Handle */}
          <Div style={{
            position: 'absolute', left: '50%', top: -10, transform: 'translateX(-50%)',
            width: 50, height: 16,
            background: 'linear-gradient(180deg, #0EA5E9, #0369A1)',
            borderRadius: '50% 50% 20% 20% / 100% 100% 20% 20%',
            boxShadow: '0 2px 6px rgba(2,132,199,0.4)',
          }}/>
          {/* Vent cap */}
          <Div style={{
            position: 'absolute', left: '50%', top: 14, transform: 'translateX(-50%)',
            width: 18, height: 6, borderRadius: 3,
            background: 'rgba(2,132,199,0.45)',
          }}/>
        </Div>
        {/* Cylinder body */}
        <Div style={{
          position: 'absolute', top: 20, left: 0, width: TANK_W, height: TANK_H - 20,
          borderRadius: '18px 18px 40px 40% / 18px 18px 24px 24%',
          background: `linear-gradient(90deg,
            #0369A1 0%, #0284C7 12%, #38BDF8 35%,
            #7DD3FC 52%, #38BDF8 70%, #0284C7 88%, #0369A1 100%)`,
          boxShadow: '0 40px 70px rgba(2,132,199,0.45), inset 0 0 0 2px rgba(255,255,255,0.15)',
          overflow: 'hidden',
        }}>
          {/* Horizontal ribs */}
          {[50, 110, 180, 240].map((top, i) => (
            <Div key={i} style={{
              position: 'absolute', left: 0, right: 0, top,
              height: 14,
              background: `linear-gradient(180deg,
                rgba(2,132,199,0.35) 0%, rgba(255,255,255,0.15) 50%, rgba(2,132,199,0.35) 100%)`,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.12)',
            }}/>
          ))}
          {/* Shine streaks */}
          <Div style={{
            position: 'absolute', left: 18, top: 0, bottom: 0, width: 14,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.1))',
            borderRadius: 7, filter: 'blur(2px)',
          }}/>
          <Div style={{
            position: 'absolute', right: 32, top: 10, bottom: 10, width: 6,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0.05))',
            borderRadius: 4, filter: 'blur(1px)',
          }}/>
        </Div>
        {/* Bottom cap */}
        <Div style={{
          position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)',
          width: TANK_W + 10, height: 20,
          background: 'linear-gradient(180deg, #0369A1, #082F49)',
          borderRadius: '10px 10px 14px 14px',
          boxShadow: '0 8px 14px rgba(0,0,0,0.25)', zIndex: 4,
        }}>
          {/* Tap */}
          <Div style={{
            position: 'absolute', left: '50%', bottom: -14, transform: 'translateX(-50%)',
            width: 18, height: 14,
            background: 'linear-gradient(180deg, #64748B, #334155)',
            borderRadius: '0 0 3px 3px',
          }}/>
        </Div>
        {/* Ground shadow */}
        <Div style={{
          position: 'absolute', width: 320, height: 30, bottom: -10, left: '50%',
          transform: 'translateX(-50%)', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(2,132,199,0.4), transparent 70%)',
          filter: 'blur(4px)', zIndex: -1,
        }}/>
      </Div>
    </Div>
  );
}

function FeatureCallout({ side, feature, active, onEnter, onLeave, delay }: {
  side: 'left' | 'right'; feature: typeof FEATURES[0]; active: boolean;
  onEnter: () => void; onLeave: () => void; delay: number;
}) {
  const right = side === 'right';
  if (Platform.OS !== 'web') {
    return (
      <Reveal delay={delay}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12 }}>
          <View style={{
            width: 52, height: 52, borderRadius: 26,
            backgroundColor: B.aqua, borderWidth: 2, borderColor: B.primary,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <feature.Icon size={22} color={B.primaryDk} weight="regular" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Manrope, sans-serif', fontWeight: '800', fontSize: 14, letterSpacing: 1.2, color: B.ink, textTransform: 'uppercase' }}>{feature.t}</Text>
            <Text style={{ fontSize: 12, color: B.muted, marginTop: 3 }}>{feature.d}</Text>
          </View>
        </View>
      </Reveal>
    );
  }

  const Div = 'div' as any;
  return (
    <Reveal delay={delay}>
      <Div
        onMouseEnter={onEnter} onMouseLeave={onLeave}
        style={{
          display: 'flex', flexDirection: right ? 'row' : 'row-reverse',
          alignItems: 'center', gap: 16, cursor: 'default',
          transform: active ? `translateX(${right ? '8px' : '-8px'})` : 'none',
          transition: 'transform .3s cubic-bezier(.2,.7,.2,1)',
        }}>
        <Div style={{
          width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
          background: active
            ? `linear-gradient(135deg, ${B.primary}, ${B.primaryDk})`
            : '#fff',
          color: active ? '#fff' : B.primaryDk,
          border: active ? 'none' : `2px solid ${B.primary}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: active ? '0 14px 30px rgba(2,132,199,0.35)' : '0 4px 14px rgba(2,132,199,0.1)',
          transition: 'all .3s',
          transform: active ? 'scale(1.08)' : 'none',
        }}>
          <feature.Icon size={28} color={active ? '#fff' : B.primaryDk} weight="regular" />
        </Div>
        <Div style={{ textAlign: right ? 'left' : 'right', maxWidth: 220 }}>
          <Div style={{
            fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 16,
            letterSpacing: 1.5, textTransform: 'uppercase',
            color: active ? B.primaryDk : B.ink,
            transition: 'color .3s',
          }}>{feature.t}</Div>
          <Div style={{ fontSize: 13, color: B.muted, lineHeight: 1.55, marginTop: 4 }}>{feature.d}</Div>
        </Div>
      </Div>
    </Reveal>
  );
}

function TankFeatureRing({ onCta }: { onCta: () => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const Div = 'div' as any;
  const wrapRef = useRef<any>(null);

  const onMove = (e: any) => {
    if (!wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const cx = (e.clientX - r.left) / r.width - 0.5;
    const cy = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: cy * -10, y: cx * 14 });
  };
  const onLeave = () => setTilt({ x: 0, y: 0 });

  if (Platform.OS !== 'web') {
    // Native fallback - just show features in a grid
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {FEATURES.map((f, i) => (
          <Reveal key={i} delay={i * 80} style={{ width: '47%' }}>
            <View style={{
              backgroundColor: '#fff', borderRadius: 16, padding: 14,
              borderWidth: 1, borderColor: B.line,
            }}>
              <View style={{
                width: 40, height: 40, borderRadius: 11, backgroundColor: B.aqua,
                alignItems: 'center', justifyContent: 'center', marginBottom: 10,
              }}>
                <f.Icon size={20} color={B.primaryDk} weight="regular" />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: B.ink, marginBottom: 3 }}>{f.t}</Text>
              <Text style={{ fontSize: 11.5, color: B.muted, lineHeight: 16 }}>{f.d}</Text>
            </View>
          </Reveal>
        ))}
      </View>
    );
  }

  return (
    <Div ref={wrapRef} onMouseMove={onMove} onMouseLeave={onLeave} style={{
      position: 'relative', height: 520,
      display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', alignItems: 'center',
    }}>
      {/* Left features */}
      <Div style={{ display: 'flex', flexDirection: 'column', gap: 48, paddingRight: 20, textAlign: 'right' }}>
        {[FEATURES[0], FEATURES[1]].map((f, i) => (
          <FeatureCallout key={i} side="left" feature={f}
            active={hover === `L${i}`}
            onEnter={() => setHover(`L${i}`)} onLeave={() => setHover(null)}
            delay={i * 120}/>
        ))}
      </Div>

      {/* Center: 3D tank */}
      <Div style={{
        position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center',
        perspective: '1400px',
      }}>
        <Div style={{
          position: 'absolute', width: 340, height: 60, left: '50%', bottom: 40,
          transform: 'translateX(-50%)', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(14,165,233,0.35), transparent 70%)',
          filter: 'blur(4px)',
        }}/>
        <Tank3D tilt={tilt} active={hover !== null}/>
        <SparkleDot style={{ top: 20, right: 18 }}/>
        <SparkleDot style={{ top: 120, left: 10 }} size={14}/>
        <SparkleDot style={{ bottom: 120, right: -4 }} size={10}/>
      </Div>

      {/* Right features */}
      <Div style={{ display: 'flex', flexDirection: 'column', gap: 48, paddingLeft: 20 }}>
        {[FEATURES[2], FEATURES[3]].map((f, i) => (
          <FeatureCallout key={i} side="right" feature={f}
            active={hover === `R${i}`}
            onEnter={() => setHover(`R${i}`)} onLeave={() => setHover(null)}
            delay={i * 120 + 60}/>
        ))}
      </Div>

      {/* CTA - this branch only renders on web (TankFeatureRing returns early on native) */}
      <Div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', marginTop: 28 }}>
        <TouchableOpacity onPress={onCta} activeOpacity={0.85} style={{
          height: 56, paddingHorizontal: 30, borderRadius: 14,
          backgroundColor: B.ink,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
          alignSelf: 'flex-start',
          ...Platform.select({
            web: { boxShadow: '0 14px 28px rgba(11,31,51,0.25)', display: 'inline-flex' } as any,
          }),
        }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Book Your Ozone Wash<TM size={9} color="#fff" /></Text>
          <ArrowRight size={16} weight="bold" color="#fff" />
        </TouchableOpacity>
      </Div>
    </Div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */
const LandingScreen = () => {
  const navigation = useNavigation<any>();
  const insets     = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const { isLarge } = useResponsive();

  const scrollViewRef = useRef<any>(null);
  const [scrolled, setScrolled]     = useState(false);
  const [activeTank, setActiveTank] = useState(0);
  const [faqOpen, setFaqOpen]       = useState<number | null>(0);
  const [eightOpen, setEightOpen]   = useState(false);

  // Custom ozone-drop cursor with disperse trail (web + fine pointer only)
  useOzoneDropCursor();

  // Fix web scroll
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const sv = scrollViewRef.current;
    if (!sv) return;
    const inner = (sv.getScrollableNode?.() ?? sv) as HTMLElement;
    if (inner?.style) {
      inner.style.maxHeight = `${screenH}px`;
      inner.style.overflowY = 'scroll';
      inner.style.overflowX = 'hidden';
    }
  }, [screenH]);

  // Inject CSS keyframes (web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const id = 'ozonewash-keyframes';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = `
      @keyframes ozBubbleRise {
        0%   { transform: translate(0, 0) scale(0.8); opacity: 0; }
        10%  { opacity: 1; }
        90%  { opacity: 0.8; }
        100% { transform: translate(var(--drift, 0px), -140vh) scale(1.1); opacity: 0; }
      }
      @keyframes ozFloat {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-10px); }
      }
      @keyframes ozSplashPulse {
        0%, 100% { transform: scale(1); }
        50%      { transform: scale(1.05); }
      }
      @keyframes ozBubbleUp {
        0%   { transform: translateY(0) scale(.6); opacity: 0; }
        20%  { opacity: .9; }
        100% { transform: translateY(-180px) scale(1.1); opacity: 0; }
      }
      @keyframes ozSpin {
        from { transform: translate(-50%, -50%) rotate(0deg); }
        to   { transform: translate(-50%, -50%) rotate(360deg); }
      }
      @keyframes ozCrDrop {
        0%   { transform: translate(-50%, -40px) scaleY(1.05); opacity: 0; }
        10%  { opacity: 1; }
        48%  { transform: translate(-50%, 48vh) scaleY(1.25); opacity: 1; }
        50%  { transform: translate(-50%, calc(50% - 10px)) scaleY(0.6); opacity: 0.9; }
        52%  { transform: translate(-50%, calc(50% - 10px)) scaleY(0.2); opacity: 0; }
        100% { opacity: 0; }
      }
      @keyframes ozCrStreak {
        0%, 10% { height: 0; opacity: 0; top: 0; }
        30%     { height: 60px; opacity: 0.8; top: 0; }
        48%     { height: 30px; opacity: 0.5; top: 45vh; }
        52%, 100% { height: 0; opacity: 0; }
      }
      @keyframes ozCrFlash {
        0%, 49% { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
        52%     { opacity: 1; transform: translate(-50%, -50%) scale(1.6); }
        62%     { opacity: 0; transform: translate(-50%, -50%) scale(2.2); }
        100%    { opacity: 0; }
      }
      @keyframes ozCrRing {
        0%, 50%  { width: 20px; height: 20px; opacity: 0; border-width: 3px; }
        53%      { opacity: 0.9; border-width: 2.5px; }
        100%     { width: 520px; height: 520px; opacity: 0; border-width: 0.5px; }
      }
      @keyframes ozCrWave {
        0%, 50%  { width: 40px; height: 12px; opacity: 0; border-width: 2px; }
        55%      { opacity: 0.85; }
        100%     { width: 620px; height: 180px; opacity: 0; border-width: 0.5px; }
      }
      @keyframes ozCrCrown0 {
        0%, 51% { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
        54%     { opacity: 1; transform: translate(calc(-50% + -16.8px), calc(-50% - 28px)) scale(1); }
        64%     { opacity: 0.6; transform: translate(calc(-50% + -30.8px), calc(-50% + 2px)) scale(0.8); }
        70%, 100% { opacity: 0; }
      }
      @keyframes ozCrCrown1 {
        0%, 51% { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
        54%     { opacity: 1; transform: translate(calc(-50% + -8.4px), calc(-50% - 28px)) scale(1); }
        64%     { opacity: 0.6; transform: translate(calc(-50% + -15.4px), calc(-50% + 2px)) scale(0.8); }
        70%, 100% { opacity: 0; }
      }
      @keyframes ozCrCrown2 {
        0%, 51% { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
        54%     { opacity: 1; transform: translate(calc(-50% + 0px), calc(-50% - 28px)) scale(1); }
        64%     { opacity: 0.6; transform: translate(calc(-50% + 0px), calc(-50% + 2px)) scale(0.8); }
        70%, 100% { opacity: 0; }
      }
      @keyframes ozCrCrown3 {
        0%, 51% { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
        54%     { opacity: 1; transform: translate(calc(-50% + 8.4px), calc(-50% - 28px)) scale(1); }
        64%     { opacity: 0.6; transform: translate(calc(-50% + 15.4px), calc(-50% + 2px)) scale(0.8); }
        70%, 100% { opacity: 0; }
      }
      @keyframes ozCrCrown4 {
        0%, 51% { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
        54%     { opacity: 1; transform: translate(calc(-50% + 16.8px), calc(-50% - 28px)) scale(1); }
        64%     { opacity: 0.6; transform: translate(calc(-50% + 30.8px), calc(-50% + 2px)) scale(0.8); }
        70%, 100% { opacity: 0; }
      }
      [data-oz-svc="true"] {
        transition: transform 0.35s cubic-bezier(.2,.7,.2,1), box-shadow 0.35s ease;
        cursor: pointer;
      }
      [data-oz-svc="true"]:hover {
        transform: translateY(-6px) !important;
        box-shadow: 0 30px 60px rgba(2,132,199,0.35) !important;
      }
      [data-oz-test="true"] {
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }
      [data-oz-test="true"]:hover {
        transform: translateY(-4px) !important;
        box-shadow: 0 20px 40px rgba(2,132,199,0.15) !important;
      }
      [data-oz-nav="true"] {
        cursor: pointer;
        transition: background 0.25s ease, color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
      }
      [data-oz-nav="true"]:hover {
        transform: translateY(-1px);
      }
      [data-oz-nav-light="true"]:hover {
        background: rgba(2,132,199,0.08) !important;
        box-shadow: 0 6px 14px rgba(2,132,199,0.12);
      }
      [data-oz-nav-dark="true"]:hover {
        background: rgba(255,255,255,0.28) !important;
        box-shadow: 0 6px 14px rgba(0,0,0,0.18);
      }
      [data-oz-faq="true"] {
        transition: border-color 0.25s ease, transform 0.25s cubic-bezier(.2,.7,.2,1), box-shadow 0.3s ease;
      }
      [data-oz-faq="true"]:hover {
        border-color: ${B.primary} !important;
        box-shadow: 0 14px 28px rgba(2,132,199,0.12) !important;
      }
      @keyframes ozPatentSpin { to { transform: rotate(360deg); } }
      @keyframes ozRingSpin { to { transform: rotate(360deg); } }

      /* Infinite testimonial marquee - Railway-style edge-faded scroller. */
      @keyframes ozMarqueeScroll {
        from { transform: translateX(0); }
        to   { transform: translateX(-50%); }
      }
      .oz-marq {
        position: relative;
        overflow: hidden;
        width: 100%;
        -webkit-mask-image: linear-gradient(to right, transparent 0%, #000 6%, #000 94%, transparent 100%);
        mask-image: linear-gradient(to right, transparent 0%, #000 6%, #000 94%, transparent 100%);
      }
      .oz-marq-track {
        display: flex;
        gap: 20px;
        width: max-content;
        animation: ozMarqueeScroll 60s linear infinite;
        will-change: transform;
      }
      .oz-marq:hover .oz-marq-track { animation-play-state: paused; }

      /* ───── Branded scrollbar (WebKit / Chromium / Edge / Safari) ───── */
      *::-webkit-scrollbar { width: 12px; height: 12px; }
      *::-webkit-scrollbar-track {
        background: ${B.surfaceAlt};
        border-left: 1px solid rgba(2,132,199,0.06);
      }
      *::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, ${B.primary} 0%, ${B.primaryDk} 100%);
        border-radius: 999px;
        border: 3px solid ${B.surfaceAlt};
        background-clip: padding-box;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.25);
        transition: background .25s ease;
      }
      *::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(180deg, #38BDF8 0%, ${B.primary} 100%);
        background-clip: padding-box;
      }
      *::-webkit-scrollbar-thumb:active {
        background: linear-gradient(180deg, ${B.primaryDk} 0%, ${B.primaryDkr} 100%);
        background-clip: padding-box;
      }
      *::-webkit-scrollbar-corner { background: transparent; }
      /* Firefox */
      html { scrollbar-width: thin; scrollbar-color: ${B.primaryDk} ${B.surfaceAlt}; }
      @keyframes ozCardFloat {
        0%, 100% { transform: translateY(0); }
        50%      { transform: translateY(-8px); }
      }
      @keyframes ozSvcPulse {
        0%, 100% { transform: scale(1);    opacity: 0.8; }
        50%      { transform: scale(1.18); opacity: 0; }
      }
      @keyframes ozEightIn {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: none; }
      }
      [data-oz-floatcard="true"] {
        animation: ozCardFloat 6s ease-in-out infinite;
        transition: transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s, border-color .35s;
        will-change: transform;
      }
      [data-oz-floatcard="true"]:nth-child(2) { animation-delay: -2s; }
      [data-oz-floatcard="true"]:nth-child(3) { animation-delay: -4s; }
      [data-oz-floatcard="true"]:hover {
        animation-play-state: paused;
        transform: translateY(-14px) !important;
        box-shadow: 0 34px 70px rgba(2,132,199,0.28) !important;
        border-color: transparent !important;
      }
      [data-oz-svcicon="true"] {
        position: relative;
        transition: background .35s, transform .35s, color .35s;
      }
      [data-oz-svcicon="true"]::after {
        content: '';
        position: absolute;
        inset: -6px;
        border-radius: 22px;
        border: 2px solid rgba(14,165,233,0.25);
        animation: ozSvcPulse 2.8s ease-in-out infinite;
        pointer-events: none;
      }
      [data-oz-svccard="true"]:hover [data-oz-svcicon="true"] {
        background: linear-gradient(135deg, ${B.primaryDk}, ${B.primary}) !important;
        transform: rotate(-6deg) scale(1.08);
      }
      [data-oz-svccard="true"]:hover [data-oz-svcicon="true"] svg { color: #fff !important; }
      .oz-eight-wrap {
        max-height: 0; overflow: hidden;
        transition: max-height .7s cubic-bezier(.2,.7,.2,1);
      }
      .oz-eight-wrap.open { max-height: 2400px; }
      .oz-eight-card {
        opacity: 0; transform: translateY(20px);
      }
      .oz-eight-wrap.open .oz-eight-card {
        animation: ozEightIn .55s cubic-bezier(.2,.7,.2,1) forwards;
      }
      .oz-eight-wrap.open .oz-eight-card:nth-child(1) { animation-delay: .05s; }
      .oz-eight-wrap.open .oz-eight-card:nth-child(2) { animation-delay: .13s; }
      .oz-eight-wrap.open .oz-eight-card:nth-child(3) { animation-delay: .21s; }
      .oz-eight-wrap.open .oz-eight-card:nth-child(4) { animation-delay: .29s; }
      .oz-eight-wrap.open .oz-eight-card:nth-child(5) { animation-delay: .37s; }
      .oz-eight-wrap.open .oz-eight-card:nth-child(6) { animation-delay: .45s; }
      .oz-eight-wrap.open .oz-eight-card:nth-child(7) { animation-delay: .53s; }
      .oz-eight-wrap.open .oz-eight-card:nth-child(8) { animation-delay: .61s; }
      .oz-eight-card { transition: transform .3s, box-shadow .3s, border-color .3s; }
      .oz-eight-card:hover {
        transform: translateY(-6px);
        border-color: ${B.primary} !important;
        box-shadow: 0 22px 40px rgba(2,132,199,0.15) !important;
      }

      /* ── Floating Download App FAB ── */
      @keyframes ozFabPulse {
        0%, 100% { box-shadow: 0 16px 36px rgba(22,163,74,0.45); }
        50%      { box-shadow: 0 18px 44px rgba(22,163,74,0.65), 0 0 0 8px rgba(34,197,94,0.18); }
      }
      @keyframes ozFabExpand {
        0%, 8%, 100% {
          width: 52px;
          gap: 0;
          padding-left: 0; padding-right: 0;
        }
        18%, 32% {
          width: 200px;
          gap: 10px;
          padding-left: 14px; padding-right: 18px;
        }
      }
      @keyframes ozFabTextReveal {
        0%, 14%   { max-width: 0;     opacity: 0; }
        20%, 30%  { max-width: 160px; opacity: 1; }
        36%, 100% { max-width: 0;     opacity: 0; }
      }
      [data-oz-fab="true"] {
        overflow: hidden;
        cursor: pointer;
        width: 52px;
        gap: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
        animation:
          ozFabPulse 2.4s ease-in-out infinite,
          ozFabExpand 7s ease-in-out 1.6s infinite;
        transition: transform .25s ease;
      }
      [data-oz-fab-text="true"] {
        max-width: 0;
        overflow: hidden;
        white-space: nowrap;
        opacity: 0;
        display: inline-block;
        animation: ozFabTextReveal 7s ease-in-out 1.6s infinite;
      }
      [data-oz-fab="true"]:hover {
        width: 220px !important;
        gap: 10px !important;
        padding-left: 14px !important;
        padding-right: 18px !important;
        animation: ozFabPulse 2.4s ease-in-out infinite;
        transform: translateY(-2px);
      }
      [data-oz-fab="true"]:hover [data-oz-fab-text="true"] {
        animation: none;
        max-width: 220px !important;
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(el);

    // Load Playfair Display (true 800 italic) for editorial accents in headings.
    // Instrument Serif is kept as a fallback in the font stack but Playfair carries
    // a real bold weight that pairs with Manrope 800 instead of looking spindly.
    const fontId = 'oz-serif-accent-font';
    if (!document.getElementById(fontId)) {
      const lpre = document.createElement('link');
      lpre.id = fontId + '-pre';
      lpre.rel = 'preconnect';
      lpre.href = 'https://fonts.gstatic.com';
      (lpre as any).crossOrigin = 'anonymous';
      const lcss = document.createElement('link');
      lcss.id = fontId;
      lcss.rel = 'stylesheet';
      lcss.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,700;1,800;1,900&family=Instrument+Serif:ital@0;1&display=swap';
      document.head.appendChild(lpre);
      document.head.appendChild(lcss);
    }
    return () => { el.remove(); };
  }, []);

  // ── Smooth show/hide nav (Zomato/Rapido pattern) ───────────────────────────
  // Always mounted; slides in via translateY on scroll-up, out on scroll-down.
  // Direction detected from a ref so re-renders are minimised. Animation runs on
  // the native driver (transform-only) → 60 fps, no JS-thread blocking.
  const NAV_HEIGHT = 64 + insets.top;            // approx height incl. status bar pad
  const navTranslateY = useRef(new Animated.Value(-NAV_HEIGHT)).current; // start hidden
  const navVisibleRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const navAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const setNavVisible = useCallback((visible: boolean) => {
    if (navVisibleRef.current === visible) return;
    navVisibleRef.current = visible;
    navAnimRef.current?.stop();
    navAnimRef.current = Animated.timing(navTranslateY, {
      toValue: visible ? 0 : -NAV_HEIGHT,
      duration: visible ? 280 : 220,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    navAnimRef.current.start();
  }, [NAV_HEIGHT, navTranslateY]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const dy = y - lastScrollYRef.current;
    lastScrollYRef.current = y;

    // Hero region - keep nav hidden, the in-hero nav is already visible there.
    if (y < 80) {
      setNavVisible(false);
      if (scrolled) setScrolled(false);
      return;
    }

    // Mark "scrolled" once for any consumers that need it (CSS class, etc.)
    if (!scrolled) setScrolled(true);

    // Small dead-zone to ignore micro-jitter from momentum / rubber-band.
    if (Math.abs(dy) < 4) return;

    // Up = show, down = hide. Single toggle per direction change.
    if (dy < 0) setNavVisible(true);
    else        setNavVisible(false);
  }, [scrolled, setNavVisible]);

  const goToLogin = () => navigation.navigate('PhoneInput');
  const goToFaq   = () => navigation.navigate('Faq');
  const goToAbout = () => navigation.navigate('About');

  // Web nav links: only the two separate pages we actually have.
  const NAV_LINKS: { label: string; onPress: () => void }[] = [
    { label: 'About', onPress: goToAbout },
    { label: 'FAQ',   onPress: goToFaq },
  ];

  const pad   = isLarge ? 40 : 20;
  const maxW  = 1400;
  const maxWS = 1600; // services row uses a wider track to match the HTML design

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ════════════════════ STICKY NAV (always mounted, slides via translateY) ════════════════════ */}
      {/* Always mounted so transitions can animate. Hidden by default off-screen
          (translateY = -NAV_HEIGHT). Slides in/out smoothly on scroll direction
          change. Native driver = 60 fps on JS-thread-busy frames too. */}
      <Animated.View
        pointerEvents={navVisibleRef.current ? 'auto' : 'box-none'}
        style={[
          s.nav,
          s.navScrolled,
          { paddingTop: insets.top + 10 },
          Platform.OS === 'web'
            ? ({ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, willChange: 'transform' } as any)
            : ({ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 } as any),
          { transform: [{ translateY: navTranslateY }] },
        ]}
      >
        <View style={s.navInner}>
          <View style={s.navLeft}>
            <View style={s.navLogo}>
              <Image source={require('../../../assets/logo.png')} style={s.navLogoImg} resizeMode="contain" />
            </View>
            <View>
              <Text style={[s.navBrand, { color: B.ink }]}>Ozone Wash<TM size={8.5} /></Text>
              <Text style={[s.navTagline, { color: B.muted }]}>Hygiene You Can See. Health You Can Feel.</Text>
            </View>
          </View>
          {isLarge && (
            <View style={s.navLinks}>
              {NAV_LINKS.map(link => (
                <TouchableOpacity
                  key={link.label}
                  onPress={link.onPress}
                  activeOpacity={0.85}
                  style={[s.navLinkBtn, s.navLinkBtnLight]}
                  {...(Platform.OS === 'web' ? { dataSet: { ozNav: 'true', ozNavLight: 'true' } } as any : {})}
                >
                  <Text style={[s.navLink, { color: B.primaryDk }]}>{link.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TouchableOpacity
            onPress={goToLogin}
            style={[s.navBtn, { backgroundColor: B.ink }]}
            activeOpacity={0.85}
          >
            <Text style={s.navBtnText}>{isLarge ? 'Book Your Clean' : 'Book'}</Text>
            <ArrowRight size={14} weight="bold" color="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: isLarge ? 0 : 80 }}
      >
        {/* ════════════════════ HERO ════════════════════ */}
        <LinearGradient
          colors={[B.primaryDkr, B.primaryDk, B.primary]}
          style={[s.hero, { paddingTop: insets.top + 10 }]}
        >
          {/* ════════════════════ NAV (inside hero) ════════════════════ */}
          <View style={[s.navInner, { paddingHorizontal: 20, paddingBottom: 10, marginBottom: isLarge ? 40 : 30 }]}>
            <View style={s.navLeft}>
              <View style={s.navLogo}>
                <Image source={require('../../../assets/logo.png')} style={s.navLogoImg} resizeMode="contain" />
              </View>
              <View>
                <Text style={[s.navBrand, { color: '#fff' }]}>Ozone Wash<TM size={9} /></Text>
                <Text style={[s.navTagline, { color: 'rgba(255,255,255,0.72)' }]}>Hygiene you can see. Health you can feel.</Text>
              </View>
            </View>
            {isLarge && (
              <View style={s.navLinks}>
                {NAV_LINKS.map(link => (
                  <TouchableOpacity
                    key={link.label}
                    onPress={link.onPress}
                    activeOpacity={0.85}
                    style={[s.navLinkBtn, s.navLinkBtnDark]}
                    {...(Platform.OS === 'web' ? { dataSet: { ozNav: 'true', ozNavDark: 'true' } } as any : {})}
                  >
                    <Text style={[s.navLink, { color: '#fff' }]}>{link.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TouchableOpacity
              onPress={goToLogin}
              style={[
                s.navBtn,
                { backgroundColor: isLarge ? '#fff' : 'rgba(255,255,255,0.22)' },
              ]}
              activeOpacity={0.85}
            >
              <Text style={[
                s.navBtnText,
                isLarge && { color: B.primaryDk },
              ]}>{isLarge ? 'Book Your Clean' : 'Book'}</Text>
              <ArrowRight size={14} weight="bold" color={isLarge ? B.primaryDk : '#fff'} />
            </TouchableOpacity>
          </View>
          <BubblesEffect count={isLarge ? 26 : 18} seed={isLarge ? 5 : 3} />
          {Platform.OS === 'web' && (
            // @ts-ignore
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: isLarge
                ? 'radial-gradient(80% 60% at 70% 10%, rgba(255,255,255,0.18), transparent 60%)'
                : 'radial-gradient(120% 70% at 50% 0%, rgba(255,255,255,0.22), transparent 55%)',
              pointerEvents: 'none',
            }} />
          )}
          <View style={[
            s.heroContent,
            isLarge && {
              flexDirection: 'row', maxWidth: maxW, alignSelf: 'center', width: '100%',
              paddingHorizontal: pad, paddingBottom: 20, alignItems: 'center', gap: 60,
            },
          ]}>
            {/* Left column */}
            <View style={[s.heroLeft, isLarge && { flex: 1, alignItems: 'flex-start' }]}>
              <Reveal>
                <View style={s.heroBadge}>
                  <View style={s.heroBadgeDot} />
                  <Text style={s.heroBadgeText}>{isLarge ? 'INDIA\u2019S 1ST PATENT-APPLIED OZONE CLEANING' : 'PATENT-APPLIED OZONE CLEANING'}</Text>
                </View>
              </Reveal>

              <Reveal delay={80}>
                {Platform.OS === 'web' && isLarge ? (
                  // @ts-ignore
                  <h1 style={{
                    fontFamily: 'Manrope, sans-serif', fontWeight: 800,
                    fontSize: 72, lineHeight: 1, letterSpacing: -2.5,
                    color: '#fff', margin: '0 0 20px', textWrap: 'balance',
                  }}>
                    Pure Tanks.<br />
                    <span style={{
                      background: 'linear-gradient(90deg, #BAE6FD, #FFFFFF 60%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}>Proven Hygiene.</span>
                  </h1>
                ) : (
                  <Text style={[s.heroH1, isLarge && { fontSize: 72, lineHeight: 72, letterSpacing: -2.5, textAlign: 'left' }]}>
                    Pure Tanks.{'\n'}
                    <Text style={s.heroH1Grad}>Proven Hygiene.</Text>
                  </Text>
                )}
              </Reveal>

              <Reveal delay={160}>
                <View style={[s.heroBullets, isLarge && { alignItems: 'flex-start' }]}>
                  <View style={s.heroBulletPill}>
                    <View style={s.heroBulletIcon}>
                      <CheckCircle size={14} weight="fill" color={B.leaf} />
                    </View>
                    <Text style={s.heroBulletText}>Book in 60 seconds. Certified crew at your doorstep.</Text>
                  </View>
                  <View style={s.heroBulletPill}>
                    <View style={s.heroBulletIcon}>
                      <CheckCircle size={14} weight="fill" color={B.leaf} />
                    </View>
                    <Text style={s.heroBulletText}>QR-verified hygiene report. Proof in every clean.</Text>
                  </View>
                  <View style={s.heroBulletPill}>
                    <View style={s.heroBulletIcon}>
                      <CheckCircle size={14} weight="fill" color={B.leaf} />
                    </View>
                    <Text style={s.heroBulletText}>Ozone Power. Zero Chemicals.</Text>
                  </View>
                </View>
              </Reveal>

              <Reveal delay={240}>
                <View style={[s.heroCtas, isLarge && { justifyContent: 'flex-start' }]}>
                  <TouchableOpacity style={s.heroCtaPrimary} onPress={goToLogin} activeOpacity={0.85}>
                    <Text style={s.heroCtaPrimaryText}>Book Your Clean</Text>
                    <ArrowRight size={18} weight="bold" color={B.primaryDk} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.heroCtaGhost} onPress={openDemo} activeOpacity={0.8}>
                    <View style={s.heroPlayCircle}>
                      <Play size={12} weight="fill" color="#fff" />
                    </View>
                    <Text style={s.heroCtaGhostText}>{isLarge ? 'Watch 60-Second Demo' : 'Watch Demo'}</Text>
                  </TouchableOpacity>
                </View>
              </Reveal>

            </View>

            {/* Right column - desktop phone mockup */}
            {isLarge && (
              <Reveal delay={300} style={{ flex: 1 }}>
                <HeroVisual />
              </Reveal>
            )}

            {/* Native-only hero illustration (lightweight SVG tank + halo + chips) */}
            {!isLarge && Platform.OS !== 'web' && (
              <Reveal delay={300}>
                <HeroVisualNative />
              </Reveal>
            )}
          </View>

          {/* Stats glass (desktop) */}
          {isLarge && (
            <Reveal delay={400} style={{ maxWidth: maxW, alignSelf: 'center', width: '100%', paddingHorizontal: pad }}>
              <View style={s.statsGlass}>
                {STATS.map((st, i) => {
                  const isPatent = st.l === 'Patent Applied';
                  return (
                    <View key={i} style={[s.statsGlassItem, i < STATS.length - 1 && s.statsGlassDivider]}>
                      {isPatent ? (
                        // Patent column - elevated visually: larger seal,
                        // raised above the stats row, with a soft halo glow.
                        <View style={s.patentElevated}>
                          <View style={s.patentHalo} />
                          <PatentMedal size={92} />
                        </View>
                      ) : (
                        <>
                          <Text style={s.statsGlassVal}>
                            <Counter value={st.v} suffix={st.suffix} decimal={st.decimal} />
                          </Text>
                          <Text style={s.statsGlassLbl}>{st.l}</Text>
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            </Reveal>
          )}

          {/* Stats card (mobile) */}
          {!isLarge && (
            <Reveal delay={420} style={{ paddingHorizontal: pad }}>
              <View style={s.statsCard}>
                {STATS.map((st, i) => (
                  <View key={i} style={[s.statsCardItem, i > 0 && s.statsCardDivider]}>
                    <Text style={s.statsCardVal}>
                      <Counter value={st.v} suffix={st.suffix} decimal={st.decimal} />
                    </Text>
                    <Text style={s.statsCardLbl} numberOfLines={2}>{st.lShort ?? st.l}</Text>
                  </View>
                ))}
              </View>
            </Reveal>
          )}

          {/* Wave divider */}
          {Platform.OS === 'web' ? (
            <View style={{ marginTop: -1 }}>
              {/* @ts-ignore */}
              <svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: 80 }}>
                {/* @ts-ignore */}
                <path fill={B.surface} d="M0 40 C 180 80, 360 0, 540 30 C 720 60, 900 15, 1080 35 C 1260 55, 1350 25, 1440 40 L 1440 80 L 0 80 Z" />
              </svg>
            </View>
          ) : (
            <View style={s.waveCurve} />
          )}
        </LinearGradient>

        <View style={isLarge ? { width: '100%' } : undefined}>

          {/* ════════════════════ SERVICES ════════════════════ */}
          <View nativeID="services" style={[s.section, { paddingHorizontal: pad }, isLarge && { paddingTop: 28, alignSelf: 'center', width: '100%', maxWidth: maxWS }]}>
            {isLarge && (
              <Reveal>
                <View style={s.trustStrip}>
                  {[
                    { Icon: ShieldCheck, t: 'Patent-Applied 8-Step' },
                    { Icon: Sparkle,     t: '99.99% Germ Kill' },
                    { Icon: QrCode,      t: 'QR-Verified Proof' },
                    { Icon: Users,       t: 'Insured & Certified Crews' },
                    { Icon: Leaf,        t: 'Zero Chemicals · Eco-Safe' },
                   
                  ].map((c, i) => (
                    <View key={i} style={s.trustChip}>
                      <c.Icon size={14} color={B.primaryDk} weight="fill" />
                      <Text style={s.trustChipText}>{c.t}</Text>
                    </View>
                  ))}
                </View>
              </Reveal>
            )}
            <View style={isLarge ? { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36, marginTop: 28 } : undefined}>
              <View style={isLarge ? { flex: 1, maxWidth: 700 } : undefined}>
                <Reveal>
                  <Text style={[s.sectionLabel, { color: B.primaryDk }]}>ANY TANK · ANY SIZE · CERTIFIED HYGIENE</Text>
                </Reveal>
                <Reveal delay={60}>
                  <Text style={[s.sectionTitle, { color: B.ink }, isLarge && s.sectionTitleLg]}>
                    {isLarge
                      ? <>From homes to institutions - we clean anything which holds water with <SerifAccent>Ozone Power.</SerifAccent></>
                      : <>Anything that holds water - cleaned with <SerifAccent>Ozone power.</SerifAccent></>}
                  </Text>
                </Reveal>
              </View>
              {isLarge && (
                <Reveal delay={120} style={{ maxWidth: 380 }}>
                  <Text style={{ fontSize: 14, color: B.muted, textAlign: 'right', lineHeight: 22 }}>
                    App-enabled service, pick your tank, pick a slot - our insured & certified crew delivers proof-based hygiene.
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: B.leaf }} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: B.primaryDk, letterSpacing: 0.4 }}>
                      LIVE ACROSS HYDERABAD · BOOK IN 60s
                    </Text>
                  </View>
                </Reveal>
              )}
            </View>

            <View style={[s.servicesList, isLarge && s.servicesGrid]}>
              {SERVICES.map((svc, i) => {
                const active = activeTank === i;

                const cardInner = (
                  <View style={{ position: 'relative', zIndex: 1, flex: 1 }}>
                    <View
                      {...(Platform.OS === 'web' && isLarge ? { dataSet: { ozSvcicon: 'true' } } as any : {})}
                      style={[
                        s.serviceIcon,
                        { backgroundColor: active ? 'rgba(255,255,255,0.18)' : B.aqua },
                        active && { transform: [{ rotate: '-6deg' }, { scale: 1.08 }] },
                      ]}>
                      <svc.Icon size={isLarge ? 30 : 26} color={active ? '#fff' : B.primaryDk} weight="duotone" />
                    </View>
                    <Text style={[
                      s.serviceName,
                      { color: active ? '#fff' : B.ink },
                      isLarge && { fontSize: 24, letterSpacing: -0.5 },
                    ]}>{svc.name}</Text>
                    {isLarge ? (
                      <View style={s.serviceFooterRow}>
                        <View style={[
                          s.serviceArrowChip,
                          { backgroundColor: active ? '#fff' : B.aqua },
                        ]}>
                          <ArrowRight size={16} weight="bold" color={B.primaryDk} />
                        </View>
                      </View>
                    ) : (
                      <View style={s.serviceArrow}>
                        <ArrowRight size={16} weight="bold" color={active ? '#fff' : B.primaryDk} />
                      </View>
                    )}
                  </View>
                );

                return (
                  <Reveal key={i} delay={80 + i * 80} style={isLarge ? { flex: 1 } : undefined}>
                    <TouchableOpacity
                      onPress={() => { setActiveTank(i); goToLogin(); }}
                      activeOpacity={isLarge ? 1 : 0.85}
                      {...(Platform.OS === 'web' && isLarge ? { onMouseEnter: () => setActiveTank(i) } as any : {})}
                      {...(Platform.OS === 'web' && isLarge ? { dataSet: { ozSvc: 'true', ozSvccard: 'true', ozFloatcard: 'true' } } : {})}
                      style={[
                        s.serviceCard,
                        isLarge ? (active ? s.serviceCardLargeActive : s.serviceCardLarge) : (active ? s.serviceCardActive : s.serviceCardInactive),
                      ]}
                    >
                      {active && isLarge && (
                        <LinearGradient
                          colors={[B.primaryDk, B.primary]}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={[StyleSheet.absoluteFillObject, { borderRadius: 22 }]}
                        />
                      )}
                      {active && <BubblesEffect count={5} seed={i + 1} />}
                      {cardInner}
                    </TouchableOpacity>
                  </Reveal>
                );
              })}
            </View>

            {!isLarge && (
              <Reveal delay={320}>
                <TouchableOpacity style={[s.bookBtn, { backgroundColor: B.ink }]} onPress={goToLogin} activeOpacity={0.85}>
                  <Text style={s.bookBtnText}>Book {SERVICES[activeTank].name}</Text>
                  <ArrowRight size={16} weight="bold" color="#fff" />
                </TouchableOpacity>
              </Reveal>
            )}
          </View>

          {/* ════════════════════ ADD-ONS ════════════════════ */}
          <View style={[s.section, { paddingHorizontal: pad, alignItems: 'center' }]}>
            <View style={{ width: '100%', maxWidth: maxW }}>
              <View style={isLarge ? { alignItems: 'center', marginBottom: 28 } : undefined}>
                <Reveal>
                  <Text style={[s.sectionLabel, { color: B.primaryDk }]}>HYGIENE UPGRADES</Text>
                </Reveal>
                <Reveal delay={60}>
                  <Text style={[s.sectionTitle, { color: B.ink }, isLarge && s.sectionTitleLg, isLarge && { textAlign: 'center' }]}>
                    Add-Ons. <SerifAccent>Stack the proof.</SerifAccent>
                  </Text>
                </Reveal>
                <Reveal delay={120}>
                  <Text style={[s.addOnIntro, isLarge && { textAlign: 'center', maxWidth: 720 }]}>
                    Stack any of these on top of your base clean. Pricing scales with tank capacity — pick what your tank needs at booking.
                  </Text>
                </Reveal>
              </View>

              <View style={[s.addOnGrid, isLarge && { flexDirection: 'row', flexWrap: 'wrap', gap: 18 }]}>
                {ADD_ONS.map((a, i) => (
                  <Reveal key={i} delay={80 + i * 40}>
                    <View style={[s.addOnCard, isLarge && { width: (maxW - 48 - 36) / 3 }]}>
                      <View style={s.addOnTopRow}>
                        <View style={s.addOnIconBox}>
                          <a.Icon size={22} color={B.primaryDk} weight="duotone" />
                        </View>
                        {a.tag && (
                          <View style={[
                            s.addOnTag,
                            a.tagKind === 'soon' && { backgroundColor: 'rgba(100,116,139,0.12)', borderColor: 'rgba(100,116,139,0.25)' },
                            a.tagKind === 'pro'  && { backgroundColor: 'rgba(34,197,94,0.12)',  borderColor: 'rgba(34,197,94,0.3)' },
                          ]}>
                            <Text style={[
                              s.addOnTagText,
                              a.tagKind === 'soon' && { color: B.muted },
                              a.tagKind === 'pro'  && { color: B.leafDk },
                            ]}>{a.tag}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.addOnName}>{a.name}</Text>
                      <Text style={s.addOnDesc}>{a.desc}</Text>
                    </View>
                  </Reveal>
                ))}
              </View>

            </View>
          </View>

          {/* ════════════════════ COMPARISON ════════════════════ */}
          <View style={[s.section, { paddingHorizontal: pad, backgroundColor: B.surfaceAlt, alignItems: 'center' }]}>
           <View style={{ width: '100%', maxWidth: maxW }}>
            <View style={isLarge ? { alignItems: 'center', marginBottom: 24 } : undefined}>
              <Reveal>
                <Text style={[s.sectionLabel, { color: B.primaryDk }]}>PROOF-BASED HYGIENE</Text>
              </Reveal>
              <Reveal delay={60}>
                <Text style={[s.sectionTitle, { color: B.ink }, isLarge && s.sectionTitleLg, isLarge && { textAlign: 'center' }]}>
                  {isLarge ? <>The <SerifAccent>Ozone & UV</SerifAccent> Advantage.</> : <>The <SerifAccent>Ozone & UV</SerifAccent> Advantage.</>}
                </Text>
              </Reveal>
            </View>

            <View style={[s.compareRow, isLarge && { flexDirection: 'row', gap: 20 }]}>
              {/* Bad card */}
              <Reveal delay={100} style={isLarge ? { flex: 1 } : undefined}>
                <View style={[s.compareCard, s.compareCardBad, isLarge && { minHeight: 320 }]}>
                  <View style={s.compareTitleRow}>
                    <View style={[s.compareBadge, { marginBottom: 0 }]}>
                      <Text style={[s.compareBadgeText, { color: B.danger }]}>{'\u2717'} AVOID</Text>
                    </View>
                    <Text style={[s.compareTitle, { color: B.ink, marginBottom: 0 }]}>The Old Way</Text>
                  </View>
                  <Text style={[s.compareSubtitle, { color: B.muted }]}>Chlorine, Bleach, Chemicals & Guesswork.</Text>
                  {(isLarge ? COMPARE_BAD : COMPARE_BAD.slice(0, 3)).map((t, i) => (
                    <View key={i} style={s.compareItem}>
                      <View style={[s.compareItemDot, { backgroundColor: B.dangerBg }]}>
                        <Text style={{ color: B.danger, fontSize: 11, fontWeight: '800' }}>{'\u2717'}</Text>
                      </View>
                      <Text style={[s.compareItemText, { color: B.inkSoft }]}>{t}</Text>
                    </View>
                  ))}
                </View>
              </Reveal>

              {/* Good card */}
              <Reveal delay={200} style={isLarge ? { flex: 1 } : undefined}>
                <LinearGradient
                  colors={[B.primaryDk, B.primary]}
                  style={[s.compareCard, isLarge && { minHeight: 320 }]}
                >
                  <BubblesEffect count={isLarge ? 7 : 5} seed={4} />
                  <View style={s.compareTitleRow}>
                    <View style={[s.compareBadge, { backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 0 }]}>
                      <Text style={[s.compareBadgeText, { color: '#fff' }]}>{'\u2713'} RECOMMENDED</Text>
                    </View>
                    <Text style={[s.compareTitle, { color: '#fff', marginBottom: 0 }]}>Ozone Wash<TM size={16} /></Text>
                  </View>
                  <Text style={[s.compareSubtitle, { color: 'rgba(255,255,255,0.85)' }]}>Lab-grade hygiene. App-verified. Patent-applied.</Text>
                  {(isLarge ? COMPARE_GOOD : COMPARE_GOOD.slice(0, 3)).map((t, i) => (
                    <View key={i} style={s.compareItem}>
                      <View style={[s.compareItemDot, { backgroundColor: B.leaf }]}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{'\u2713'}</Text>
                      </View>
                      <Text style={[s.compareItemText, { color: 'rgba(255,255,255,0.95)' }]}>{t}</Text>
                    </View>
                  ))}
                </LinearGradient>
              </Reveal>
            </View>
           </View>
          </View>

          {/* ════════════════════ HOW IT WORKS ════════════════════ */}
          <View nativeID="how" style={[s.section, { paddingHorizontal: pad, backgroundColor: isLarge ? B.surfaceAlt : B.surface, alignItems: 'center' }]}>
           <View style={{ width: '100%', maxWidth: maxW }}>
            <View style={isLarge ? { alignItems: 'center', marginBottom: 48 } : undefined}>
              <Reveal>
                <Text style={[s.sectionLabel, { color: B.primaryDk }, isLarge && { textAlign: 'center' }]}>PATENT-APPLIED 8-STEP OZONE & UV PROCESS</Text>
              </Reveal>
              <Reveal delay={60}>
                <Text style={[s.sectionTitle, { color: B.ink }, isLarge && s.sectionTitleLg, isLarge && { textAlign: 'center' }]}>
                  How We Make Tanks <SerifAccent>Brilliantly Clean.</SerifAccent>
                </Text>
              </Reveal>
            </View>

            {isLarge ? (
              <View style={s.howGrid}>
                {Platform.OS === 'web' ? (
                  // @ts-ignore
                  <div style={{
                    position: 'absolute', top: 32, left: 60, right: 60, height: 2,
                    background: `linear-gradient(to right, ${B.primaryDk}, ${B.primary}, ${B.leaf})`,
                    opacity: 0.25, zIndex: 0,
                  }} />
                ) : (
                  <LinearGradient
                    colors={[B.primaryDk, B.primary, B.leaf]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ position: 'absolute', top: 32, left: 60, right: 60, height: 2, opacity: 0.25, zIndex: 0 }}
                  />
                )}
                {HOW.map((h, i) => {
                  const isExpand = i === 2;
                  const inner = (
                    <View style={{ alignItems: 'center', position: 'relative' }}>
                      <View style={{ position: 'relative', width: 76, height: 76, alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                        {isExpand && <SpinningDashedRing size={76} color={B.primary} />}
                        <LinearGradient
                          colors={[B.primary, B.primaryDk]}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                          style={[s.howCircle, { marginBottom: 0 }]}
                        >
                          <h.Icon size={26} color="#fff" weight="regular" />
                          <View style={s.howNum}>
                            <Text style={s.howNumText}>{h.num}</Text>
                          </View>
                        </LinearGradient>
                      </View>
                      <Text style={[s.howTitle, { color: B.ink, textAlign: 'center' }]}>{h.t}</Text>
                      <Text style={[s.howDesc, { color: B.muted, textAlign: 'center', maxWidth: 220 }]}>{h.d}</Text>
                      {isExpand && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1, color: B.primaryDk }}>
                            {eightOpen ? 'SHOWING ALL 8 STEPS ↑' : 'TAP TO SEE ALL 8 STEPS ↓'}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                  return (
                    <Reveal key={i} delay={i * 100} style={{ flex: 1, alignItems: 'center' }}>
                      {isExpand ? (
                        <TouchableOpacity onPress={() => setEightOpen(o => !o)} activeOpacity={0.85}>
                          {inner}
                        </TouchableOpacity>
                      ) : inner}
                    </Reveal>
                  );
                })}
              </View>
            ) : (
              <View style={s.timeline}>
                <View style={[s.timelineLine, { backgroundColor: B.line }]} />
                {HOW.map((h, i) => {
                  const isExpand = i === 2;
                  const row = (
                    <View style={s.timelineRow}>
                      <LinearGradient colors={[B.primary, B.primaryDk]} style={s.timelineCircle}>
                        <Text style={[s.timelineNum]}>{h.num}</Text>
                      </LinearGradient>
                      <View style={[s.timelineCard, { borderColor: isExpand && eightOpen ? B.primary : B.line }]}>
                        <View style={[s.timelineIcon, { backgroundColor: B.aqua }]}>
                          <h.Icon size={20} color={B.primaryDk} weight="regular" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.howTitle, { color: B.ink, marginBottom: 2 }]}>{h.t}</Text>
                          <Text style={[s.howDesc, { color: B.muted }]}>{h.d}</Text>
                          {isExpand && (
                            <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1, color: B.primaryDk, marginTop: 6 }}>
                              {eightOpen ? 'SHOWING ALL 8 STEPS ↑' : 'TAP TO SEE ALL 8 STEPS ↓'}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                  return (
                    <Reveal key={i} delay={i * 80}>
                      {isExpand ? (
                        <TouchableOpacity onPress={() => setEightOpen(o => !o)} activeOpacity={0.85}>
                          {row}
                        </TouchableOpacity>
                      ) : row}
                    </Reveal>
                  );
                })}
              </View>
            )}

            {/* Expandable 8-step panel */}
            <EightStepsPanel open={eightOpen} onClose={() => setEightOpen(false)} isLarge={isLarge} />
           </View>
          </View>

          {/* ════════════════════ FEATURES (3D TANK on desktop) ════════════════════ */}
          {isLarge ? (
            <View style={{ position: 'relative', overflow: 'hidden', paddingVertical: 60 }}>
              {Platform.OS === 'web' && (
                // @ts-ignore
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `radial-gradient(70% 60% at 50% 45%, ${B.aqua} 0%, #fff 70%)`,
                }} />
              )}
              <View style={{ position: 'relative', paddingHorizontal: pad, alignSelf: 'center', width: '100%', maxWidth: maxW }}>
                <View style={{ alignItems: 'center', marginBottom: 40 }}>
                  <Reveal>
                    <Text style={[s.sectionLabel, { color: B.primaryDk, textAlign: 'center' }]}>WHY OZONE WASH™</Text>
                  </Reveal>
                  <Reveal delay={60}>
                    <Text style={[s.sectionTitle, s.sectionTitleLg, { color: B.ink, textAlign: 'center' }]}>
                      Visible Purity. <SerifAccent>Proven Safety.</SerifAccent>
                    </Text>
                  </Reveal>
                </View>
                <TankFeatureRing onCta={goToLogin} />
              </View>
            </View>
          ) : (
            <View style={[s.section, { paddingHorizontal: pad, backgroundColor: B.surfaceAlt }]}>
              <Reveal>
                <Text style={[s.sectionLabel, { color: B.primaryDk }]}>WHY OZONE WASH™</Text>
              </Reveal>
              <Reveal delay={60}>
                <Text style={[s.sectionTitle, { color: B.ink }]}>Visible Purity. <SerifAccent>Proven Safety.</SerifAccent></Text>
              </Reveal>
              <View style={s.featGridMobile}>
                {FEATURES.map((f, i) => (
                  <Reveal key={i} delay={i * 80} style={{ width: '47%' }}>
                    <View style={[s.featCardMobile, { borderColor: B.line }]}>
                      <View style={[s.featIconMobile, { backgroundColor: B.aqua }]}>
                        <f.Icon size={20} color={B.primaryDk} weight="regular" />
                      </View>
                      <Text style={[s.featTitleMobile, { color: B.ink }]}>{f.t}</Text>
                      <Text style={[s.featDescMobile, { color: B.muted }]}>{f.d}</Text>
                    </View>
                  </Reveal>
                ))}
              </View>
            </View>
          )}

          {/* ════════════════════ CERTIFICATE BAND ════════════════════ */}
          <LinearGradient
            nativeID="certification"
            colors={[B.ink, '#0F2B48', B.primaryDkr]}
            style={[s.certBand, { paddingHorizontal: pad }]}
          >
            {Platform.OS === 'web' && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
                {/* @ts-ignore */}
                <div style={{
                  position: 'absolute', right: -80, top: -80, width: 400, height: 400,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(14,165,233,0.37), transparent 70%)',
                }} />
                {/* @ts-ignore */}
                <div style={{
                  position: 'absolute', left: -60, bottom: -60, width: 280, height: 280,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(34,197,94,0.19), transparent 70%)',
                }} />
              </View>
            )}
            <View style={isLarge ? {
              flexDirection: 'row', alignItems: 'center', gap: 60,
              maxWidth: maxW, width: '100%', alignSelf: 'center',
            } : undefined}>
              <View style={{ flex: 1 }}>
                <Reveal>
                  <Text style={[s.sectionLabel, { color: B.leaf }]}>DIGITAL CERTIFICATE · SHAREABLE PROOF</Text>
                </Reveal>
                <Reveal delay={60}>
                  <Text style={s.certTitle}><SerifAccent color="#BAE6FD">Digital Certificate.</SerifAccent></Text>
                </Reveal>
                <Reveal delay={90}>
                  <Text style={s.certTagline}>Hygiene you can see. Health you can feel.</Text>
                </Reveal>
                <Reveal delay={120}>
                  <Text style={s.certBody}>Every visit ends with a QR-signed hygiene certificate:</Text>
                </Reveal>
                <Reveal delay={150}>
                  <View style={s.certBullets}>
                    {['Ozone readings', 'ATP verification', 'Before/after tank photos', 'Crew ID & tamper-evident signature'].map((b, i) => (
                      <View key={i} style={s.certBulletRow}>
                        <View style={s.certBulletDot} />
                        <Text style={s.certBulletText}>{b}</Text>
                      </View>
                    ))}
                  </View>
                </Reveal>
                <Reveal delay={170}>
                  <View style={s.certShareRow}>
                    <Text style={s.certShareLbl}>Shareable Proof </Text>
                    <Text style={s.certShareBody}>{'→'} Instantly share with tenants, RWAs, buyers, or inspectors.</Text>
                  </View>
                </Reveal>
                <Reveal delay={180}>
                  <View style={s.certTags}>
                    {CERT_TAGS.map((t, i) => (
                      <View key={i} style={s.certTag}>
                        <Text style={s.certTagText}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </Reveal>
              </View>
              <Reveal delay={240}>
                <View style={[s.certCard, { marginTop: isLarge ? 0 : 32 }]}>
                  <View style={s.certCardVerified}>
                    <Text style={s.certCardVerifiedText}>VERIFIED</Text>
                  </View>
                  <View style={s.certCardHeader}>
                    <View style={s.certCardLogo}>
                      <Image source={require('../../../assets/logo.png')} style={{ width: 28, height: 28 }} resizeMode="contain" />
                    </View>
                    <Text style={s.certCardBrand}>Ozone Wash<TM size={9} /></Text>
                  </View>
                  <Text style={s.certCardType}>CERTIFICATE OF HYGIENE</Text>
                  <Text style={s.certCardTank}>Overhead Tank {'\u00b7'} Any Size</Text>
                  <View style={s.certCardGrid}>
                    {[['Date', '20 Apr 2026'], ['Location', 'Madhapur'], ['Ozone ppm', '2.4 ppm'], ['ATP reading', '18 RLU']].map(([l, v], i) => (
                      <View key={i} style={{ width: '48%' }}>
                        <Text style={s.certCardStatL}>{l}</Text>
                        <Text style={s.certCardStatV}>{v}</Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      if (Platform.OS === 'web') window.open(DEMO_CERT_URL, '_blank', 'noopener,noreferrer');
                    }}
                    activeOpacity={0.85}
                    style={s.certCardQrRow}
                  >
                    {Platform.OS === 'web' ? (
                      // @ts-ignore - real scannable QR via web image
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&data=${encodeURIComponent(DEMO_CERT_URL)}`}
                        alt="Scan to view demo certificate"
                        style={{ width: 64, height: 64, borderRadius: 8, border: `1px solid ${B.line}` }}
                      />
                    ) : (
                      <View style={s.certCardQrBox}>
                        <QrCode size={44} color={B.ink} weight="regular" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={s.certCardVerifyLbl}>Scan or tap to verify</Text>
                      <Text style={s.certCardVerifyUrl}>ozonewash.in/v/demo</Text>
                      <Text style={s.certCardVerifyNote}>Live demo certificate {'\u00b7'} R2-signed</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </Reveal>
            </View>
          </LinearGradient>

          {/* ════════════════════ TESTIMONIALS ════════════════════ */}
          <View nativeID="customers" style={[s.section, { paddingHorizontal: isLarge ? pad : 0, alignItems: 'center' }]}>
           <View style={{ width: '100%', maxWidth: maxW }}>
            <View style={[{ paddingHorizontal: isLarge ? 0 : pad }, isLarge && { alignItems: 'center', marginBottom: 48 }]}>
              <Reveal>
                <Text style={[s.sectionLabel, { color: B.primaryDk }, isLarge && { textAlign: 'center' }]}>CUSTOMERS</Text>
              </Reveal>
              <Reveal delay={60}>
                <Text style={[s.sectionTitle, { color: B.ink }, isLarge && s.sectionTitleLg, isLarge && { textAlign: 'center' }]}>
                  Hyderabad <SerifAccent>Approves.</SerifAccent>
                </Text>
              </Reveal>
            </View>

            {isLarge ? (
              // Web-only infinite marquee - Railway-style. Cards loop seamlessly by
              // duplicating the list and animating translateX from 0 to -50%, plus
              // a soft mask fade on both edges. Hover pauses the animation.
              // @ts-ignore
              <div className="oz-marq">
                {/* @ts-ignore */}
                <div className="oz-marq-track">
                  {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
                    <View
                      key={i}
                      {...(Platform.OS === 'web' ? { dataSet: { ozTest: 'true' } } : {})}
                      style={[s.testCard, s.testCardMarquee, { borderColor: B.line }]}
                    >
                      <View style={s.testStars}>
                        {Array.from({ length: t.r }).map((_, k) => (
                          <Star key={k} size={14} weight="fill" color={B.amber} />
                        ))}
                      </View>
                      <Text style={[s.testText, { color: B.inkSoft }]}>&ldquo;{t.text}&rdquo;</Text>
                      <View style={s.testAuthor}>
                        <LinearGradient colors={[B.primary, B.leaf]} style={s.testAvatar}>
                          <Text style={s.testAvatarText}>{t.name.charAt(0)}</Text>
                        </LinearGradient>
                        <View>
                          <Text style={[s.testName, { color: B.ink }]}>{t.name}</Text>
                          <Text style={[s.testArea, { color: B.muted }]}>{t.area} {'\u00b7'} Hyderabad</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </div>
              </div>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: pad }}>
                {TESTIMONIALS.map((t, i) => (
                  <View key={i} style={[s.testCardMobile, { borderColor: B.line }]}>
                    <View style={s.testStars}>
                      {Array.from({ length: t.r }).map((_, k) => (
                        <Star key={k} size={12} weight="fill" color={B.amber} />
                      ))}
                    </View>
                    <Text style={[s.testTextMobile, { color: B.inkSoft }]}>&ldquo;{t.text}&rdquo;</Text>
                    <View style={s.testAuthor}>
                      <LinearGradient colors={[B.primary, B.leaf]} style={s.testAvatarSm}>
                        <Text style={s.testAvatarSmText}>{t.name.charAt(0)}</Text>
                      </LinearGradient>
                      <View>
                        <Text style={[s.testNameSm, { color: B.ink }]}>{t.name}</Text>
                        <Text style={[s.testArea, { color: B.muted }]}>{t.area}</Text>
                      </View>
                    </View>
                  </View>
                ))}
                <View style={{ width: pad }} />
              </ScrollView>
            )}
           </View>
          </View>

          {/* ════════════════════ FAQ (native only - web has dedicated /faq page) ════════════════════ */}
          {Platform.OS !== 'web' && (
          <View style={[s.section, { paddingHorizontal: pad, backgroundColor: B.surfaceAlt, alignItems: 'center' }]}>
           <View style={{ width: '100%', maxWidth: maxW }}>
            <View style={isLarge ? { alignItems: 'center', marginBottom: 40 } : undefined}>
              <Reveal>
                <Text style={[s.sectionLabel, { color: B.primaryDk }, isLarge && { textAlign: 'center' }]}>QUESTIONS</Text>
              </Reveal>
              <Reveal delay={60}>
                <Text style={[s.sectionTitle, { color: B.ink }, isLarge && s.sectionTitleLg, isLarge && { textAlign: 'center' }]}>
                  Before You <SerifAccent>Book.</SerifAccent>
                </Text>
              </Reveal>
            </View>
            <View style={isLarge ? { maxWidth: 860, alignSelf: 'center', width: '100%' } : undefined}>
              {FAQ_DATA.map((f, i) => {
                const prevCat = i > 0 ? FAQ_DATA[i - 1].cat : null;
                const showHeader = f.cat !== prevCat;
                return (
                  <Reveal key={i} delay={Math.min(i, 8) * 50}>
                    {showHeader && (
                      <Text style={[s.faqCatHeader, { color: B.primaryDk }, i === 0 && { marginTop: 0 }]}>{f.cat}</Text>
                    )}
                    <FaqItem
                      q={f.q}
                      a={f.a}
                      open={faqOpen === i}
                      onToggle={() => setFaqOpen(faqOpen === i ? null : i)}
                      onHover={() => setFaqOpen(i)}
                      hoverMode={isLarge}
                      compact={!isLarge}
                    />
                  </Reveal>
                );
              })}
              <Text style={[s.faqFooterLine, { color: B.muted }]}>Don’t see your question here? Reach out directly - our team is ready with certified answers.</Text>
            </View>
           </View>
          </View>
          )}

          {/* ════════════════════ FINAL CTA ════════════════════ */}
          <LinearGradient
            colors={[B.primary, B.primaryDk]}
            style={[s.finalCta, { paddingHorizontal: pad }]}
          >
            <BubblesEffect count={isLarge ? 18 : 10} seed={isLarge ? 11 : 7} />
            <Reveal>
              <Text style={[s.finalCtaTitle, isLarge && { fontSize: 64, letterSpacing: -2.2, lineHeight: 68 }]}>
                Hygiene you can see.{'\n'}<SerifAccent color="#BAE6FD">Health you can feel.</SerifAccent>
              </Text>
            </Reveal>
            <Reveal delay={60}>
              <Text style={s.finalCtaBody}>Pure tanks. Proven hygiene. Your first clean is 60 seconds away.</Text>
            </Reveal>
            <Reveal delay={120}>
              <View style={s.finalCtaBtns}>
                <TouchableOpacity style={s.finalCtaBtn} onPress={goToLogin} activeOpacity={0.85}>
                  <Text style={[s.finalCtaBtnText, { color: B.primaryDk }]}>Get started free</Text>
                  <ArrowRight size={18} weight="bold" color={B.primaryDk} />
                </TouchableOpacity>
                {isLarge && (
                  <TouchableOpacity style={s.finalCtaBtnGhost} activeOpacity={0.8}>
                    <Phone size={16} weight="regular" color="#fff" />
                    <Text style={s.finalCtaBtnGhostText}>81 79 69 59 59 </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Reveal>
          </LinearGradient>

          {/* ════════════════════ FOOTER ════════════════════ */}
          <View style={[s.footer, { borderTopColor: B.line }]}>
            <View style={isLarge ? { flexDirection: 'row', gap: 40 } : undefined}>
              <View style={[s.footerBrandCol, isLarge && { flex: 1.4 }]}>
                <View style={s.footerLogoRow}>
                  <View style={s.footerLogoCircle}>
                    <Image source={require('../../../assets/logo.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />
                  </View>
                  <Text style={[s.footerBrand, { color: B.ink }]}>Ozone Wash<TM size={10} /></Text>
                </View>
                <Text style={[s.footerTagline, { color: B.muted }]}>
                  Pure Tanks. Proven Hygiene. India’s 1st patent-applied, app-enabled tank hygiene service. Powered by VijRam Health Sense Pvt. Ltd.
                </Text>
                <View style={s.footerLocRow}>
                  <MapPin size={13} weight="fill" color={B.muted} />
                  <Text style={[s.footerLoc, { color: B.inkSoft }]}>Hyderabad, Telangana</Text>
                </View>
              </View>

              {isLarge && (
                <>
                  <FooterCol title="Product" items={['Overhead tanks', 'Underground sumps', 'Syntex / plastic', 'EcoScore']} />
                  <FooterCol title="Company" items={['About', 'Careers', 'Press', 'Contact']} />
                  <FooterCol
                    title="Legal"
                    items={['Terms', 'Privacy', 'Refund policy']}
                    onPress={[
                      () => navigation.navigate('Policy', { type: 'terms' }),
                      () => navigation.navigate('Policy', { type: 'privacy' }),
                      () => navigation.navigate('Policy', { type: 'refund' }),
                    ]}
                  />
                </>
              )}
            </View>

            {!isLarge && (
              <View style={s.footerPolicies}>
                {[['Terms', 'terms'], ['Privacy', 'privacy'], ['Refund', 'refund']].map(([label, type], i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <Text style={{ color: B.muted, fontSize: 11 }}>{'\u00b7'}</Text>}
                    <TouchableOpacity onPress={() => navigation.navigate('Policy', { type })}>
                      <Text style={[s.footerPolicyLink, { color: B.primaryDk }]}>{label}</Text>
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </View>
            )}

            <View style={[s.footerCopyRow, { borderTopColor: B.line }]}>
              <Text style={[s.footerCopy, { color: B.muted }]}>
                {'\u00a9'} 2026 VijRam Health Sense Pvt. Ltd.
              </Text>
              <View style={s.footerPowered}>
                <Text style={[s.footerCopy, { color: B.muted }]}>Powered by </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (Platform.OS === 'web') window.open('https://shyra.pro', '_blank', 'noopener,noreferrer');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.footerCopy, s.footerPoweredLink]}>Shyra.pro</Text>
                </TouchableOpacity>
              </View>
              {isLarge && <Text style={[s.footerCopy, { color: B.muted }]}>Made with {'\ud83d\udca7'} in Hyderabad</Text>}
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Mobile sticky bottom CTA */}
      {!isLarge && (
        <View style={[s.stickyBar, { paddingBottom: Math.max(insets.bottom, 10) + 6 }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.96)', '#fff']}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <TouchableOpacity style={s.stickyBtn} onPress={goToLogin} activeOpacity={0.85}>
            <LinearGradient
              colors={[B.primary, B.primaryDk]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
            />
            <Text style={s.stickyBtnText}>Book Your Clean Now</Text>
            <ArrowRight size={18} weight="bold" color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Download App FAB - web only. Collapsed (icon-only) by default,
          auto-expands periodically + on hover to reveal "Download App" text. */}
      {Platform.OS === 'web' && (
        <TouchableOpacity
          onPress={openDownload}
          activeOpacity={0.85}
          style={[s.fabDownload, !isLarge && { bottom: (insets.bottom || 0) + 96 }]}
          {...({ dataSet: { ozFab: 'true' } } as any)}
        >
          <View style={s.fabIconBox}>
            <ArrowRight size={18} weight="bold" color="#fff" />
          </View>
          <Text
            style={[s.fabText, Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as any) : null]}
            {...({ dataSet: { ozFabText: 'true' } } as any)}
          >Download App</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/* ══════════════════════════════════════════════════════════════════
   FOOTER COLUMN
   ════════════════════════════════════════════════════════════════ */
function FooterCol({ title, items, onPress }: { title: string; items: string[]; onPress?: (() => void)[] }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[s.footerColTitle, { color: B.ink }]}>{title.toUpperCase()}</Text>
      {items.map((item, i) => (
        <TouchableOpacity key={i} onPress={onPress?.[i]} activeOpacity={0.7}>
          <Text style={[s.footerColItem, { color: B.muted }]}>{item}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════
   STYLES
   ════════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: B.surface },
  centerWrap: { alignSelf: 'center', width: '100%' },

  /* ── Nav ── */
  nav: { zIndex: 40, paddingHorizontal: 20, paddingBottom: 10 },
  navScrolled: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderBottomWidth: 1, borderBottomColor: B.line,
    ...Platform.select({
      web:     { backdropFilter: 'blur(16px) saturate(180%)' } as any,
      ios:     { shadowColor: 'rgba(0,0,0,0.08)', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  navInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navLogo: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  navLogoImg: { width: 26, height: 26 },
  navBrand: { fontWeight: '800', fontSize: 16, letterSpacing: -0.3, fontFamily: 'Manrope, Inter, sans-serif' },
  navTagline: {
    fontSize: 9.5, fontWeight: '500', letterSpacing: 0.3,
    fontStyle: 'italic', marginTop: 1, lineHeight: 12,
  },
  navLinks: { flexDirection: 'row', gap: 14, alignItems: 'center', marginHorizontal: 18 },
  navLinkBtn: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999,
    borderWidth: 1, borderColor: 'transparent',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  } as any,
  navLinkBtnLight: {
    backgroundColor: 'rgba(2,132,199,0.06)',
    borderColor: 'rgba(2,132,199,0.12)',
  },
  navLinkBtnDark: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.22)',
  },
  navLink: {
    fontSize: 13, fontWeight: '700', letterSpacing: 0.2,
  } as any,
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10,
    ...Platform.select({
      web:     { boxShadow: '0 8px 20px rgba(0,0,0,0.15)' } as any,
      ios:     { shadowColor: 'rgba(0,0,0,0.18)', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 14 },
      android: { elevation: 4 },
    }),
  },
  navBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  navCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navDownloadBtn: {
    backgroundColor: 'rgba(34,197,94,0.14)',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.4)',
  },

  /* ── Hero ── */
  hero: { overflow: 'hidden', paddingBottom: 0 },
  heroContent: { paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' },
  heroLeft: { alignItems: 'center' },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
    marginBottom: 24,
  },
  heroBadgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: B.leaf },
  heroBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: '#fff' },
  heroH1: {
    fontWeight: '800', fontSize: 38, lineHeight: 50, letterSpacing: -1.2,
    color: '#fff', textAlign: 'center', marginBottom: 20,
    fontFamily: 'Manrope, sans-serif',
  },
  heroH1Grad: { color: '#BAE6FD' },
  heroPara: {
    fontSize: 15, lineHeight: 26, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', marginBottom: 28,
  },
  heroCtas: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, gap: 12, marginBottom: 28, justifyContent: 'center', alignItems: 'center' },
  heroCtaGhostText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  heroCtaDownload: {
    height: 56, paddingHorizontal: 18, borderRadius: 14,
    backgroundColor: 'rgba(34,197,94,0.22)',
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.5)',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  } as any,
  heroCtaPrimary: {
    height: 56, paddingHorizontal: 24, borderRadius: 14,
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 10,
    ...Platform.select({
      ios:     { shadowColor: 'rgba(0,0,0,0.22)', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 20 },
      android: { elevation: 8 },
      web:     { boxShadow: '0 14px 30px rgba(0,0,0,0.22)' } as any,
    }),
  },
  heroCtaPrimaryText: { color: B.primaryDk, fontWeight: '800', fontSize: 16 },
  heroCtaGhost: {
    height: 56, paddingHorizontal: 20, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    flexDirection: 'row', alignItems: 'center', gap: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  } as any,
  heroPlayCircle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroPlayBtn: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTrustRow: { flexDirection: 'row', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 },
  heroTrustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroTrustText: { fontSize: 12, color: 'rgba(255,255,255,0.85)' },

  // Hero bullet pills - replaces the old long tagline; visually highlighted
  // with a soft white-tinted pill background + green check icon to draw the
  // eye to the two key value props.
  heroBullets: { gap: 10, marginBottom: 28, alignItems: 'flex-start' },
  heroBulletPill: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9, paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(8px)' } as any : {}),
  },
  heroBulletIcon: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(34,197,94,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBulletText: { fontSize: 14, color: '#fff', fontWeight: '600', letterSpacing: 0.1 },

  /* Stats glass (desktop) */
  statsGlass: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    ...Platform.select({
      web: { backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' } as any,
    }),
  },
  statsGlassItem: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  statsGlassDivider: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.2)' },
  statsGlassVal: { fontSize: 34, fontWeight: '800', color: '#fff', marginBottom: 4, letterSpacing: -1 },
  statsGlassLbl: { fontSize: 12, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5, textAlign: 'center' },

  // Patent column - raised above the stats row + soft halo behind the seal so
  // it reads as the "trust anchor" of the strip, not just another tile.
  patentElevated: {
    alignItems: 'center', justifyContent: 'center',
    transform: [{ translateY: -16 }],
    position: 'relative',
  },
  patentHalo: {
    position: 'absolute',
    width: 130, height: 130, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    ...Platform.select({
      default: { boxShadow: '0 0 32px 8px rgba(255,255,255,0.18)' } as any,
      ios:     { shadowColor: 'rgba(255,255,255,0.6)', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 32 },
      android: { elevation: 12 },
    }),
  },
  patentLabel: {
    fontSize: 10, fontWeight: '800', letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.92)', marginTop: 8,
    textTransform: 'uppercase',
  },

  /* Stats card (mobile) */
  statsCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 10,
    flexDirection: 'row', marginBottom: 8,
    ...Platform.select({
      ios:     { shadowColor: 'rgba(2,132,199,0.25)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 1, shadowRadius: 30 },
      android: { elevation: 8 },
      web:     { boxShadow: '0 20px 40px rgba(2,132,199,0.25), 0 0 0 1px rgba(2,132,199,0.06)' } as any,
    }),
  },
  statsCardItem: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  statsCardDivider: { borderLeftWidth: 1, borderLeftColor: B.line },
  statsCardVal: { fontSize: 15, fontWeight: '800', color: B.ink, letterSpacing: -0.5, textAlign: 'center' },
  statsCardLbl: { fontSize: 9, color: B.muted, marginTop: 3, textAlign: 'center', lineHeight: 11 },

  waveCurve: {
    height: 28, backgroundColor: B.surface,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -4,
  },

  /* Sections */
  section: { paddingVertical: 40 },
  sectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 2.5, marginBottom: 6 },
  sectionTitle: {
    fontSize: 24, fontWeight: '800', letterSpacing: -0.6, marginBottom: 20,
    lineHeight: 30, fontFamily: 'Manrope, sans-serif',
  },
  sectionTitleLg: { fontSize: 42, lineHeight: 48, letterSpacing: -1.4, marginBottom: 0, marginTop: 8 },

  /* Trust strip (services section) */
  trustStrip: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center',
    paddingVertical: 16, paddingHorizontal: 20,
    backgroundColor: B.aqua, borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(2,132,199,0.12)',
    ...Platform.select({
      web: { boxShadow: '0 8px 24px rgba(2,132,199,0.06)' } as any,
    }),
  },
  trustChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: 'rgba(2,132,199,0.16)',
  },
  trustChipText: {
    fontSize: 12, fontWeight: '700', color: B.primaryDk,
    letterSpacing: 0.3, fontFamily: 'Manrope, sans-serif',
  },

  /* Services */
  servicesList: { gap: 10 },
  servicesGrid: { flexDirection: 'row', gap: 20 },
  serviceCard: {
    overflow: 'hidden', position: 'relative',
    ...Platform.select({
      ios:     { shadowColor: 'rgba(2,132,199,0.2)', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 14 },
      android: { elevation: 3 },
    }),
  },
  serviceCardActive: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 16,
    backgroundColor: B.primaryDk,
    ...Platform.select({
      ios:     { shadowColor: 'rgba(2,132,199,0.32)', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 22 },
      android: { elevation: 6 },
      web:     { boxShadow: '0 14px 30px rgba(2,132,199,0.28)' } as any,
    }),
  },
  serviceCardInactive: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: B.line,
  },
  serviceCardLarge: {
    flex: 1, flexDirection: 'column', alignItems: 'flex-start',
    padding: 28, borderRadius: 22, minHeight: 220,
    backgroundColor: '#fff', borderWidth: 1, borderColor: B.line,
  },
  serviceCardLargeActive: {
    flex: 1, flexDirection: 'column', alignItems: 'flex-start',
    padding: 28, borderRadius: 22, minHeight: 220,
    backgroundColor: 'transparent', borderWidth: 0,
    ...Platform.select({
      web: { boxShadow: '0 30px 60px rgba(2,132,199,0.35)' } as any,
    }),
  },
  serviceIcon: {
    width: 60, height: 60, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  serviceName: { fontSize: 14, fontWeight: '700', fontFamily: 'Manrope, sans-serif' },
  serviceCap: { fontSize: 13, marginTop: 4 },
  serviceArrow: { marginLeft: 'auto' },

  // Minimal footer row for desktop service cards: price pill on the left,
  // small arrow chip on the right. Replaces the wordier "From ₹799 · Book this tank" CTA.
  serviceFooterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    marginTop: 'auto', paddingTop: 24,
  },
  servicePricePill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    borderWidth: 1,
  },
  servicePriceText: {
    fontSize: 14, fontWeight: '800', letterSpacing: 0.2,
  },
  serviceArrowChip: {
    width: 36, height: 36, borderRadius: 999,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      default: { boxShadow: '0 6px 14px rgba(2,132,199,0.18)' } as any,
      ios:     { shadowColor: 'rgba(2,132,199,0.3)', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 14 },
      android: { elevation: 4 },
    }),
  },
  bookBtn: {
    marginTop: 14, height: 48, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  bookBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  /* Add-Ons */
  addOnIntro: {
    fontSize: 15, color: B.muted, lineHeight: 24,
    marginTop: 6, maxWidth: 560,
  },
  addOnGrid: { gap: 14 },
  addOnCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 22,
    borderWidth: 1, borderColor: B.line,
    ...Platform.select({
      default: { boxShadow: '0 10px 24px rgba(2,132,199,0.06)' } as any,
      ios:     { shadowColor: 'rgba(2,132,199,0.12)', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 24 },
      android: { elevation: 3 },
    }),
  },
  addOnTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  addOnIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: B.aqua, alignItems: 'center', justifyContent: 'center',
  },
  addOnTag: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    borderWidth: 1, backgroundColor: 'rgba(14,165,233,0.1)', borderColor: 'rgba(14,165,233,0.25)',
  },
  addOnTagText: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: B.primaryDk },
  addOnName: {
    fontSize: 16, fontWeight: '800', color: B.ink,
    letterSpacing: -0.2, lineHeight: 22, marginBottom: 8,
  },
  addOnDesc: { fontSize: 13.5, color: B.muted, lineHeight: 21 },
  addOnFootnote: {
    fontSize: 12, color: B.muted, textAlign: 'center', marginTop: 22, fontStyle: 'italic',
  },

  /* Comparison */
  compareRow: { gap: 12 },
  compareCard: { borderRadius: 20, padding: 24, overflow: 'hidden' },
  compareCardBad: { backgroundColor: '#fff', borderWidth: 1, borderColor: B.line },
  compareBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 999, backgroundColor: B.dangerBg, marginBottom: 14,
  },
  // Lays out the AVOID/RECOMMENDED pill and the card title on the same line.
  // alignItems: 'baseline' lines up the pill text with the title baseline so
  // they read as a single horizontal line rather than two stacked elements
  // that happen to share a row.
  compareTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    flexWrap: 'wrap', marginBottom: 6,
  },
  compareBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  compareTitle: {
    fontSize: 24, fontWeight: '800', letterSpacing: -0.8, marginBottom: 4,
    lineHeight: 28,
    fontFamily: 'Manrope, sans-serif',
    ...(Platform.OS === 'android' ? ({ includeFontPadding: false } as any) : {}),
  },
  compareSubtitle: { fontSize: 14, marginBottom: 16 },
  compareItem: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 },
  compareItemDot: {
    width: 22, height: 22, borderRadius: 11, flexShrink: 0,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  compareItemText: { fontSize: 14, lineHeight: 20, flex: 1 },

  /* How it works */
  howGrid: { flexDirection: 'row', gap: 20, position: 'relative' },
  howCircle: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18, position: 'relative', zIndex: 1,
    borderWidth: 4, borderColor: '#fff',
    ...Platform.select({
      ios:     { shadowColor: 'rgba(2,132,199,0.4)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 16 },
      android: { elevation: 6 },
      web:     { boxShadow: '0 12px 24px rgba(2,132,199,0.3)' } as any,
    }),
  },
  howNum: {
    position: 'absolute', top: -8, right: -8,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: B.leaf,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  howNumText: { fontSize: 11, fontWeight: '800', color: '#fff', fontFamily: 'Manrope, sans-serif' },
  howTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6, fontFamily: 'Manrope, sans-serif' },
  howDesc: { fontSize: 13, lineHeight: 19 },

  /* Timeline (mobile) */
  timeline: { position: 'relative', paddingLeft: 0, marginTop: 8 },
  timelineLine: { position: 'absolute', left: 17, top: 8, bottom: 8, width: 2 },
  timelineRow: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  timelineCircle: {
    width: 36, height: 36, borderRadius: 18, flexShrink: 0,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: 'rgba(2,132,199,0.4)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 4 },
      web:     { boxShadow: '0 4px 12px rgba(2,132,199,0.3)' } as any,
    }),
  },
  timelineNum: { fontSize: 12, fontWeight: '800', color: '#fff', fontFamily: 'Manrope, sans-serif' },
  timelineCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 12,
    borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  timelineIcon: {
    width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  /* Features mobile */
  featGridMobile: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  featCardMobile: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1 },
  featIconMobile: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  featTitleMobile: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  featDescMobile: { fontSize: 11.5, lineHeight: 16 },

  /* Certificate band */
  certBand: { paddingVertical: 80, overflow: 'hidden' },
  certTitle: {
    fontSize: 48, fontWeight: '800', color: '#fff', letterSpacing: -1.5,
    lineHeight: 52, marginVertical: 10, fontFamily: 'Manrope, sans-serif',
  },
  certTagline: {
    fontSize: 16, fontStyle: 'italic', color: 'rgba(255,255,255,0.72)',
    letterSpacing: 0.2, marginBottom: 18, fontFamily: 'Manrope, sans-serif',
  },
  certBody: { fontSize: 17, color: 'rgba(255,255,255,0.85)', lineHeight: 28, marginBottom: 14, maxWidth: 520, fontWeight: '600' },
  certBullets: { gap: 10, marginBottom: 22, maxWidth: 520 },
  certBulletRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  certBulletDot: { width: 7, height: 7, borderRadius: 999, backgroundColor: '#22D3EE' },
  certBulletText: { fontSize: 16, color: 'rgba(255,255,255,0.88)', lineHeight: 24, flex: 1 },
  certShareRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 26, maxWidth: 520 },
  certShareLbl: { fontSize: 15, fontWeight: '800', color: '#BAE6FD', letterSpacing: 0.3 },
  certShareBody: { fontSize: 15, color: 'rgba(255,255,255,0.82)', lineHeight: 24 },
  certTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  certTag: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  certTagText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },

  /* Certificate card */
  certCard: {
    backgroundColor: '#fff', borderRadius: 22, padding: 28,
    maxWidth: 420, width: '100%',
    ...Platform.select({
      ios:     { shadowColor: 'rgba(0,0,0,0.3)', shadowOffset: { width: 0, height: 30 }, shadowOpacity: 1, shadowRadius: 50 },
      android: { elevation: 12 },
      // CSS-string transform is web-only - native uses array transform syntax via the
      // platform-specific keys above (we omit rotation on native to keep the card upright).
      web:     { boxShadow: '0 40px 80px rgba(0,0,0,0.35)', transform: 'rotate(-2deg)' } as any,
    }),
  },
  certCardVerified: {
    position: 'absolute', top: 20, right: 20,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    backgroundColor: B.leaf, zIndex: 5,
  },
  certCardVerifiedText: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#fff' },
  certCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  certCardLogo: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: B.aqua,
    alignItems: 'center', justifyContent: 'center',
  },
  certCardBrand: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2, color: B.ink, fontFamily: 'Manrope, sans-serif' },
  certCardType: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: B.primaryDk, marginBottom: 4 },
  certCardTank: { fontSize: 22, fontWeight: '800', color: B.ink, marginBottom: 20, fontFamily: 'Manrope, sans-serif' },
  certCardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  certCardStatL: { fontSize: 10, color: B.muted, textTransform: 'uppercase', letterSpacing: 1 },
  certCardStatV: { fontSize: 14, fontWeight: '700', color: B.ink, marginTop: 2 },
  certCardQrRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingTop: 20, borderTopWidth: 1, borderTopColor: B.line,
    borderStyle: 'dashed',
  },
  certCardQrBox: {
    width: 72, height: 72, borderRadius: 10, backgroundColor: '#fff',
    borderWidth: 1, borderColor: B.line,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  certCardVerifyLbl: { fontSize: 11, color: B.muted },
  certCardVerifyUrl: { fontSize: 13, fontWeight: '700', color: B.ink, fontFamily: 'JetBrains Mono, monospace' },
  certCardVerifyNote: { fontSize: 10, color: B.muted, marginTop: 6 },

  /* Testimonials */
  testCard: { backgroundColor: '#fff', borderRadius: 20, padding: 28, borderWidth: 1, height: '100%' },
  testCardMarquee: { width: 360, flexShrink: 0, height: undefined, minHeight: 220 },
  testCardMobile: {
    width: 260, backgroundColor: '#fff', borderRadius: 16, padding: 14,
    borderWidth: 1, marginRight: 12, flexShrink: 0,
  },
  testStars: { flexDirection: 'row', gap: 3, marginBottom: 14 },
  testText: { fontSize: 16, lineHeight: 26, fontWeight: '500', flex: 1 },
  testTextMobile: { fontSize: 13, lineHeight: 20, fontWeight: '500', marginBottom: 10 },
  testAuthor: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  testAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  testAvatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  testAvatarSm: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  testAvatarSmText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  testName: { fontSize: 14, fontWeight: '700' },
  testNameSm: { fontSize: 12, fontWeight: '700' },
  testArea: { fontSize: 12, marginTop: 1 },

  /* FAQ */
  faqCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1,
    marginBottom: 12, overflow: 'hidden',
  },
  faqCardOpen: {
    ...Platform.select({
      ios:     { shadowColor: 'rgba(2,132,199,0.25)', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 1, shadowRadius: 26 },
      android: { elevation: 6 },
      web:     { boxShadow: '0 18px 36px rgba(2,132,199,0.16)' } as any,
    }),
  },
  faqHeader: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 16 },
  faqQ: { fontSize: 16, fontWeight: '700', lineHeight: 22, fontFamily: 'Manrope, sans-serif' },
  faqToggle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  faqA: { fontSize: 15, lineHeight: 24, paddingHorizontal: 18, paddingBottom: 18 },
  faqCatHeader: {
    fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase',
    marginTop: 26, marginBottom: 10, paddingLeft: 2,
    fontFamily: 'Manrope, sans-serif',
  },
  faqFooterLine: {
    fontSize: 13, lineHeight: 20, textAlign: 'center',
    marginTop: 24, paddingHorizontal: 16, fontStyle: 'italic',
  },

  /* Final CTA */
  finalCta: { paddingVertical: 80, alignItems: 'center', overflow: 'hidden' },
  finalCtaTitle: {
    fontSize: 36, fontWeight: '800', color: '#fff',
    letterSpacing: -1.2, textAlign: 'center', lineHeight: 42, marginBottom: 14,
    fontFamily: 'Manrope, sans-serif',
  },
  finalCtaBody: { fontSize: 18, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 32 },
  finalCtaBtns: { flexDirection: 'row', gap: 14, flexWrap: 'wrap', justifyContent: 'center' },
  finalCtaBtn: {
    height: 58, paddingHorizontal: 28, borderRadius: 14,
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 10,
    ...Platform.select({
      ios:     { shadowColor: 'rgba(0,0,0,0.2)', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 20 },
      android: { elevation: 8 },
      web:     { boxShadow: '0 14px 30px rgba(0,0,0,0.2)' } as any,
    }),
  },
  finalCtaBtnText: { fontWeight: '800', fontSize: 16 },
  finalCtaBtnGhost: {
    height: 58, paddingHorizontal: 24, borderRadius: 14,
    backgroundColor: 'transparent', flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  finalCtaBtnGhostText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  /* Footer */
  footer: {
    backgroundColor: B.surface, borderTopWidth: 1,
    paddingHorizontal: 20, paddingTop: 40, paddingBottom: 28,
  },
  footerBrandCol: {},
  footerLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  footerLogoCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: B.aqua,
    alignItems: 'center', justifyContent: 'center',
  },
  footerBrand: { fontWeight: '800', fontSize: 17, letterSpacing: -0.3, fontFamily: 'Manrope, sans-serif' },
  footerTagline: { fontSize: 13, lineHeight: 20, maxWidth: 320, marginBottom: 14 },
  footerLocRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerLoc: { fontSize: 13 },
  footerColTitle: {
    fontSize: 13, fontWeight: '800', letterSpacing: 1, marginBottom: 14,
    fontFamily: 'Manrope, sans-serif',
  },
  footerColItem: { fontSize: 13, marginBottom: 10 },
  footerPolicies: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  footerPolicyLink: { fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' },
  footerCopyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, paddingTop: 18, marginTop: 20, flexWrap: 'wrap', gap: 8,
  },
  footerCopy: { fontSize: 12 },
  footerPowered: { flexDirection: 'row', alignItems: 'center' },
  footerPoweredLink: {
    color: B.primaryDk, fontWeight: '700',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  } as any,

  /* Mobile sticky bottom - native uses 'absolute' (RN doesn't support 'fixed').
     Web overrides with 'fixed' so the bar stays pinned during page scroll. */
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 28, paddingHorizontal: 16, zIndex: 50,
    ...Platform.select({
      web: { position: 'fixed' } as any,
    }),
  },
  stickyBtn: {
    height: 52, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: 'rgba(2,132,199,0.5)', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 20 },
      android: { elevation: 10 },
      web:     { boxShadow: '0 14px 28px rgba(2,132,199,0.4)' } as any,
    }),
  },
  stickyBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  /* Floating Download App FAB (web only, collapses to a 52px circle by default) */
  fabDownload: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    height: 52,
    width: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10,
    borderRadius: 999,
    backgroundColor: B.leafDk,
    zIndex: 9999,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 16px 36px rgba(22,163,74,0.45)',
        cursor: 'pointer',
      } as any,
      ios:     { shadowColor: 'rgba(22,163,74,0.6)', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 1, shadowRadius: 24 },
      android: { elevation: 10 },
    }),
  },
  fabIconBox: {
    width: 30, height: 30, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  fabText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
});

export default LandingScreen;
