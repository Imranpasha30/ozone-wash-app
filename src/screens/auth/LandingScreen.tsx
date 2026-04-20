import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Platform, Image, ScrollView, Animated,
  NativeSyntheticEvent, NativeScrollEvent, useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../../utils/responsive';
import {
  ArrowRight, Phone, Users, Flask, Certificate,
  Leaf, ShieldCheck, Lightning, Star, Lock,
  MapPin, CheckCircle, Drop, Buildings, Wrench, QrCode,
  Sparkle, Play, Shield,
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
  { num: '01', Icon: Phone,       t: 'Book in 60 seconds',    d: 'Pick tank type, size, and a slot that works for you.' },
  { num: '02', Icon: Users,       t: 'Certified team arrives', d: 'Uniformed, background-checked technicians at your door.' },
  { num: '03', Icon: Flask,       t: '8-step ozone clean',     d: 'Chemical-free deep hygiene powered by activated ozone.' },
  { num: '04', Icon: Certificate, t: 'Digital certificate',    d: 'Verified hygiene report with a scannable QR code.' },
];
const FEATURES = [
  { Icon: Leaf,        t: 'Eco-friendly',    d: 'Zero chemicals. Ozone breaks down into oxygen after cleaning.' },
  { Icon: ShieldCheck, t: 'Certified hygiene', d: 'Lab-grade sanitation with verifiable QR certificates.' },
  { Icon: Lightning,   t: 'Under 2 hours',   d: 'In-and-out service window. No second visit, no mess.' },
  { Icon: Star,        t: 'EcoScore\u2122', d: 'Track your tank health month over month in-app.' },
];
const STATS: { v: number; suffix: string; l: string; decimal?: boolean }[] = [
  { v: 500,  suffix: '+',     l: 'Tanks cleaned' },
  { v: 4.9,  suffix: '',      l: 'Customer rating', decimal: true },
  { v: 100,  suffix: '+',     l: 'Happy families' },
  { v: 8,    suffix: '-Step', l: 'Hygiene process' },
];
const SERVICES = [
  { Icon: Buildings, name: 'Overhead Tank',    price: '\u20B9799', cap: 'up to 2,000L' },
  { Icon: Drop,      name: 'Underground Sump', price: '\u20B9999', cap: 'up to 5,000L' },
  { Icon: Wrench,    name: 'Syntex / Plastic', price: '\u20B9799', cap: 'any shape' },
];
const TESTIMONIALS = [
  { name: 'Ananya R.', area: 'Madhapur',   text: 'Booked Friday evening, cleaned Saturday morning. Before/after photos inside the tank were genuinely shocking.', r: 5 },
  { name: 'Kiran M.',  area: 'Gachibowli', text: 'Crew was on time, polite, left zero mess. The QR certificate is a nice touch for tenants.', r: 5 },
  { name: 'Priya S.',  area: 'Kondapur',   text: 'Switched from the guy our neighbours use. OzoneWash is a different league.', r: 5 },
];
const FAQ_DATA = [
  { q: 'Is ozone safe for drinking water tanks?', a: 'Yes. Ozone is a stronger oxidiser than chlorine and leaves no residue \u2014 it decomposes back into oxygen within minutes, making it safer for potable water than chemical cleaners.' },
  { q: 'How long does a service take?',           a: "Most overhead tanks up to 2,000L are cleaned in under 90 minutes. Larger sumps take up to 2 hours. You'll see a live ETA in the app." },
  { q: "What's included in the 8-step process?",  a: 'Drain, scrub, high-pressure rinse, vacuum, ozone injection, dwell, verification sample, and certification \u2014 all in one visit.' },
  { q: 'Do you service my area?',                 a: 'We currently cover all of Hyderabad. Enter your pincode at booking to see exact availability and pricing.' },
];
const COMPARE_BAD = [
  'Chemicals linger in water for days',
  'No certification, no proof',
  'Manual scrub & rinse only',
  'Cleaner leaves, you wonder if it worked',
];
const COMPARE_GOOD = [
  'Ozone decomposes to pure oxygen \u2014 zero residue',
  'QR-signed certificate after every clean',
  '8-step process incl. ATP verification',
  'Live app tracking + before/after photos',
];
const CERT_TAGS = ['Sanitation levels', 'ATP readings', 'Before/after photos', 'Crew verification'];

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
function FaqItem({ q, a, open, onToggle, compact = false }: { q: string; a: string; open: boolean; onToggle: () => void; compact?: boolean }) {
  const rot = useRef(new Animated.Value(0)).current;
  const height = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(rot,    { toValue: open ? 1 : 0, duration: 250, useNativeDriver: true }),
      Animated.timing(height, { toValue: open ? 1 : 0, duration: 280, useNativeDriver: false }),
    ]).start();
  }, [open]);
  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
  const maxH   = height.interpolate({ inputRange: [0, 1], outputRange: [0, compact ? 200 : 400] });
  return (
    <View style={[s.faqCard, { borderColor: B.line }]}>
      <TouchableOpacity onPress={onToggle} style={[s.faqHeader, compact && { padding: 13 }]} activeOpacity={0.7}>
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
      </TouchableOpacity>
      <Animated.View style={{ maxHeight: maxH, overflow: 'hidden' }}>
        <Text style={[s.faqA, { color: B.muted }, compact && { fontSize: 12.5, padding: 14, paddingTop: 0 }]}>{a}</Text>
      </Animated.View>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════
   BUBBLES (web only, rising particles)
   ════════════════════════════════════════════════════════════════ */
function BubblesEffect({ count = 14, seed = 1 }: { count?: number; seed?: number }) {
  if (Platform.OS !== 'web') return null;
  const Div = 'div' as any;
  const Span = 'span' as any;
  const bubbles = useMemo(() => {
    const rng = (i: number) => {
      const x = Math.sin(i * 9301 + seed * 49297) * 233280;
      return x - Math.floor(x);
    };
    return Array.from({ length: count }).map((_, i) => ({
      size: 8 + rng(i) * 44,
      left: rng(i + 100) * 100,
      delay: rng(i + 200) * -14,
      dur: 10 + rng(i + 300) * 12,
      drift: (rng(i + 400) - 0.5) * 40,
      op: 0.3 + rng(i + 500) * 0.5,
    }));
  }, [count, seed]);
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
   HERO PHONE MOCKUP (desktop hero right side)
   ════════════════════════════════════════════════════════════════ */
function HeroPhoneMockup() {
  const [pct, setPct] = useState(0);
  const [phase, setPhase] = useState<'fill' | 'hold' | 'pulse'>('fill');
  const [waveOffset, setWaveOffset] = useState(0);

  useEffect(() => {
    let raf: number;
    const t0 = performance.now();
    const FILL = 3800, HOLD = 1200, PULSE = 2000;
    const CYCLE = FILL + HOLD + PULSE;

    const loop = (t: number) => {
      const elapsed = (t - t0) % CYCLE;
      // Wave animation runs continuously
      setWaveOffset((t - t0) * 0.003);

      if (elapsed < FILL) {
        // Fill phase: 0 → 1
        const p = elapsed / FILL;
        const eased = 1 - Math.pow(1 - p, 2.5);
        setPct(eased);
        setPhase('fill');
      } else if (elapsed < FILL + HOLD) {
        // Hold at 100%
        setPct(1);
        setPhase('hold');
      } else {
        // Pulse/glow phase then restart
        setPct(1);
        setPhase('pulse');
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const Div = 'div' as any;
  const steps = ['Drained', 'High-pressure rinse', 'Ozone injection', 'Certification'];
  const fillH = 30 + pct * 70;
  const displayPct = Math.round(fillH);
  const stepsCompleted = pct * 4;

  // SVG wave path that shifts over time
  const w1 = `M0 12 Q ${25 + Math.sin(waveOffset) * 15} ${4 + Math.sin(waveOffset * 1.3) * 4} 50 10 Q ${75 + Math.cos(waveOffset * 0.9) * 12} ${16 + Math.cos(waveOffset) * 4} 100 12 Q ${125 + Math.sin(waveOffset * 1.1) * 10} ${6 + Math.sin(waveOffset * 0.7) * 3} 150 10 Q 175 ${14 + Math.cos(waveOffset * 1.2) * 3} 200 12 L200 24 L0 24Z`;
  const w2 = `M0 14 Q ${30 + Math.cos(waveOffset * 0.8) * 12} ${8 + Math.cos(waveOffset * 1.1) * 3} 60 12 Q ${90 + Math.sin(waveOffset * 1.2) * 10} ${16 + Math.sin(waveOffset * 0.6) * 4} 130 14 Q 165 ${9 + Math.cos(waveOffset) * 3} 200 13 L200 24 L0 24Z`;

  return (
    <View style={{ position: 'relative', width: '100%', height: 440 }}>
      <Div style={{
        position: 'absolute', right: 40, top: 20,
        width: 240, height: 440, borderRadius: 38,
        background: '#0B1F33', padding: 10,
        boxShadow: '0 40px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)',
        transform: 'rotate(4deg)',
      }}>
        <Div style={{
          width: '100%', height: '100%', borderRadius: 30, overflow: 'hidden',
          background: B.surfaceAlt, display: 'flex', flexDirection: 'column',
        }}>
          {/* Status bar with proper icons */}
          <Div style={{
            padding: '12px 18px 8px', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', fontSize: 10, fontWeight: 700, color: B.ink,
          }}>
            <span>9:41</span>
            <Div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {/* Signal bars */}
              <svg width="14" height="10" viewBox="0 0 14 10">
                <rect x="0" y="7" width="2.5" height="3" rx="0.5" fill={B.ink}/>
                <rect x="3.5" y="5" width="2.5" height="5" rx="0.5" fill={B.ink}/>
                <rect x="7" y="2.5" width="2.5" height="7.5" rx="0.5" fill={B.ink}/>
                <rect x="10.5" y="0" width="2.5" height="10" rx="0.5" fill={B.ink}/>
              </svg>
              {/* WiFi */}
              <svg width="12" height="10" viewBox="0 0 12 10">
                <path d="M6 8.5a1 1 0 110 2 1 1 0 010-2z" fill={B.ink}/>
                <path d="M3.5 7a3.5 3.5 0 015 0" stroke={B.ink} strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                <path d="M1.5 5a6 6 0 019 0" stroke={B.ink} strokeWidth="1.2" fill="none" strokeLinecap="round"/>
              </svg>
              {/* Battery */}
              <svg width="20" height="10" viewBox="0 0 20 10">
                <rect x="0" y="1" width="16" height="8" rx="2" stroke={B.ink} strokeWidth="1" fill="none"/>
                <rect x="1.5" y="2.5" width="12" height="5" rx="1" fill={B.leaf}/>
                <rect x="16.5" y="3" width="2" height="4" rx="1" fill={B.ink} opacity="0.4"/>
              </svg>
            </Div>
          </Div>

          <Div style={{ padding: '4px 16px 12px', flex: 1 }}>
            <Div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Div style={{ fontSize: 10, fontWeight: 700, color: B.primaryDk, letterSpacing: 1 }}>LIVE CLEAN</Div>
              {phase === 'hold' || phase === 'pulse' ? (
                <Div style={{
                  fontSize: 8, padding: '2px 8px', borderRadius: 999,
                  background: B.leaf, color: '#fff', fontWeight: 800,
                  animation: 'ozFloat 1s ease-in-out infinite',
                }}>COMPLETE</Div>
              ) : null}
            </Div>
            <Div style={{ fontSize: 15, fontWeight: 800, marginTop: 3, fontFamily: 'Manrope, sans-serif' }}>Overhead Tank</Div>

            {/* Tank visualization */}
            <Div style={{ position: 'relative', marginTop: 14, height: 150 }}>
              <Div style={{
                position: 'absolute', inset: 0, borderRadius: 14,
                border: `2px solid ${phase === 'pulse' ? B.primary : B.line}`,
                overflow: 'hidden', background: '#fff',
                boxShadow: phase === 'pulse' ? `0 0 20px ${B.primary}40, inset 0 0 20px ${B.primary}15` : 'none',
                transition: 'border-color .4s, box-shadow .4s',
              }}>
                {/* Water fill */}
                <Div style={{
                  position: 'absolute', left: 0, right: 0, bottom: 0,
                  height: `${fillH}%`,
                  background: `linear-gradient(180deg, ${B.primary}cc, ${B.primaryDk}ee)`,
                  transition: phase === 'fill' ? 'none' : 'height .3s linear',
                }}>
                  {/* Animated wave surface */}
                  <svg viewBox="0 0 200 24" preserveAspectRatio="none" style={{
                    position: 'absolute', top: -12, left: 0, width: '100%', height: 24,
                  }}>
                    <path fill={`${B.primary}dd`} d={w1}/>
                    <path fill={`${B.primary}88`} d={w2}/>
                  </svg>
                  <BubblesEffect count={10} seed={2} />
                  {/* Shimmer highlight */}
                  <Div style={{
                    position: 'absolute', top: 0, left: '15%', width: '20%', height: '100%',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.25), transparent 60%)',
                    filter: 'blur(6px)',
                  }}/>
                </Div>
              </Div>

              {/* Progress badge */}
              <Div style={{
                position: 'absolute', top: 10, right: 10,
                padding: '4px 10px', borderRadius: 999,
                background: phase === 'pulse' ? B.leaf : 'rgba(255,255,255,0.92)',
                color: phase === 'pulse' ? '#fff' : B.primaryDk,
                fontSize: 11, fontWeight: 800,
                backdropFilter: 'blur(4px)',
                transition: 'background .3s, color .3s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}>{displayPct}%</Div>

              {/* Mini progress ring */}
              <Div style={{ position: 'absolute', bottom: 10, left: 10 }}>
                <svg width="28" height="28" viewBox="0 0 28 28">
                  <circle cx="14" cy="14" r="11" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5"/>
                  <circle cx="14" cy="14" r="11" fill="none" stroke="#fff" strokeWidth="2.5"
                    strokeDasharray={`${pct * 69.1} 69.1`}
                    strokeLinecap="round"
                    style={{ transform: 'rotate(-90deg)', transformOrigin: '14px 14px', transition: 'stroke-dasharray .2s' }}/>
                  <text x="14" y="14" textAnchor="middle" dominantBaseline="central"
                    fill="#fff" fontSize="7" fontWeight="800">
                    {Math.round(pct * 4)}/4
                  </text>
                </svg>
              </Div>
            </Div>

            {/* Steps */}
            <Div style={{ marginTop: 12 }}>
              {steps.map((st, i) => {
                const done = stepsCompleted > i + 0.9;
                const active = stepsCompleted > i && stepsCompleted <= i + 1;
                const upcoming = stepsCompleted <= i;
                return (
                  <Div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 0', fontSize: 10, fontWeight: 600,
                    color: done ? B.ink : active ? B.primaryDk : B.muted,
                    transition: 'color .3s',
                  }}>
                    <Div style={{
                      width: 14, height: 14, borderRadius: '50%',
                      background: done ? B.leaf : active ? B.primary : B.line,
                      color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 800,
                      transition: 'background .3s',
                      boxShadow: active ? `0 0 8px ${B.primary}60` : 'none',
                    }}>{done ? '\u2713' : upcoming ? (i + 1) : '\u2022'}</Div>
                    <Div style={{ flex: 1 }}>{st}</Div>
                    {active && <Div style={{
                      fontSize: 8, padding: '2px 6px', borderRadius: 999,
                      background: B.aqua, color: B.primaryDk, fontWeight: 800,
                      animation: 'ozFloat 1.5s ease-in-out infinite',
                    }}>LIVE</Div>}
                    {done && <Div style={{ fontSize: 8, color: B.leaf, fontWeight: 800 }}>{'\u2713'}</Div>}
                  </Div>
                );
              })}
            </Div>
          </Div>
        </Div>
      </Div>

      {/* Floating QR badge */}
      <Div style={{
        position: 'absolute', left: 10, top: 80,
        background: '#fff', color: B.ink,
        borderRadius: 16, padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        animation: 'ozFloat 4s ease-in-out infinite',
      }}>
        <Div style={{
          width: 36, height: 36, borderRadius: 10, background: B.leaf,
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldCheck size={20} weight="fill" color="#fff" />
        </Div>
        <Div>
          <Div style={{ fontSize: 11, color: B.muted, fontWeight: 600 }}>Last visit</Div>
          <Div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'Manrope, sans-serif' }}>QR certified {'\u2713'}</Div>
        </Div>
      </Div>

      {/* Floating EcoScore badge */}
      <Div style={{
        position: 'absolute', left: 40, bottom: 20,
        background: '#fff', color: B.ink,
        borderRadius: 16, padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        animation: 'ozFloat 4s ease-in-out infinite 1.5s',
      }}>
        <Div style={{
          width: 36, height: 36, borderRadius: 10,
          background: B.aqua, color: B.primaryDk,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkle size={20} weight="fill" color={B.primaryDk} />
        </Div>
        <Div>
          <Div style={{ fontSize: 11, color: B.muted, fontWeight: 600 }}>EcoScore</Div>
          <Div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'Manrope, sans-serif' }}>A+ {'\u00b7'} 98/100</Div>
        </Div>
      </Div>
    </View>
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
        {/* Top cap */}
        <Div style={{
          position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
          width: TANK_W * 0.96, height: 38, borderRadius: '50%',
          background: 'radial-gradient(ellipse at 50% 30%, #9DB0A4, #6A7A70 60%, #4C5A53)',
          boxShadow: 'inset 0 -4px 8px rgba(0,0,0,0.25), inset 0 4px 8px rgba(255,255,255,0.3)',
          zIndex: 3,
        }}/>
        <Div style={{
          position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
          width: TANK_W * 0.92, height: 22, borderRadius: '50%',
          background: 'radial-gradient(ellipse at 50% 40%, #2B3A33, #0F1816)',
          zIndex: 4,
        }}/>
        {/* Lid handle */}
        <Div style={{
          position: 'absolute', top: -28, left: '50%', transform: 'translateX(-50%)',
          width: 56, height: 16, borderRadius: 8,
          background: 'linear-gradient(180deg, #B8C5BC, #7D8C83)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)', zIndex: 5,
        }}/>
        {/* Cylinder body */}
        <Div style={{
          position: 'absolute', top: 8, left: 0, width: TANK_W, height: TANK_H - 8,
          borderRadius: `${TANK_W / 2}px / 22px`,
          background: `linear-gradient(90deg,
            #3F4E46 0%, #6B7D72 18%, #8FA397 40%,
            #7B8E83 60%, #58695F 82%, #384640 100%)`,
          boxShadow: `
            inset 8px 0 20px rgba(0,0,0,0.25),
            inset -8px 0 20px rgba(0,0,0,0.25),
            inset 0 -12px 24px rgba(0,0,0,0.25),
            0 30px 40px rgba(15,23,42,0.25)`,
          overflow: 'hidden',
        }}>
          {Array.from({ length: 14 }).map((_, i) => (
            <Div key={i} style={{
              position: 'absolute', left: 0, right: 0,
              top: 14 + i * ((TANK_H - 40) / 14),
              height: 3,
              background: i % 2 === 0
                ? 'linear-gradient(90deg, transparent, rgba(0,0,0,0.18) 20%, rgba(0,0,0,0.25) 80%, transparent)'
                : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12) 20%, rgba(255,255,255,0.18) 80%, transparent)',
            }}/>
          ))}
          <Div style={{
            position: 'absolute', top: 8, bottom: 8, left: '22%', width: 18,
            background: 'linear-gradient(90deg, rgba(255,255,255,0.25), transparent)',
            filter: 'blur(6px)',
          }}/>
          {/* Tap */}
          <Div style={{
            position: 'absolute', bottom: 46, left: -6,
            width: 22, height: 22, borderRadius: 4,
            background: 'linear-gradient(180deg, #B8C5BC, #58695F)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
          }}/>
          <Div style={{
            position: 'absolute', bottom: 52, left: -16,
            width: 14, height: 10, borderRadius: 3,
            background: '#58695F',
          }}/>
        </Div>
        {/* Ground shadow */}
        <Div style={{
          position: 'absolute', width: 320, height: 30, bottom: -10, left: '50%',
          transform: 'translateX(-50%)', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(0,0,0,0.3), transparent 70%)',
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
    // Native fallback — just show features in a grid
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

      {/* CTA */}
      <Div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: 28 }}>
        <TouchableOpacity onPress={onCta} activeOpacity={0.85} style={{
          height: 52, paddingHorizontal: 26, borderRadius: 14,
          backgroundColor: B.ink,
          flexDirection: 'row', alignItems: 'center', gap: 10,
          alignSelf: 'center',
          ...Platform.select({
            default: { boxShadow: '0 14px 28px rgba(11,31,51,0.25)' } as any,
          }),
        }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Book your ozone clean</Text>
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
    `;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrolled(e.nativeEvent.contentOffset.y > 40);
  }, []);

  const goToLogin = () => navigation.navigate('PhoneInput');
  const pad  = isLarge ? 48 : 20;
  const maxW = 1200;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ════════════════════ STICKY NAV (appears on scroll) ════════════════════ */}
      {scrolled && (
        <View style={[
          s.nav,
          s.navScrolled,
          { paddingTop: insets.top + 10 },
          Platform.OS === 'web' && ({ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 } as any),
        ]}>
          <View style={s.navInner}>
            <View style={s.navLeft}>
              <View style={s.navLogo}>
                <Image source={require('../../../assets/logo.png')} style={s.navLogoImg} resizeMode="contain" />
              </View>
              <Text style={[s.navBrand, { color: B.ink }]}>OZONEWASH</Text>
            </View>
            {isLarge && (
              <View style={s.navLinks}>
                {['Services', 'How it works', 'Certification', 'Customers'].map(l => (
                  <Text key={l} style={[s.navLink, { color: B.inkSoft }]}>{l}</Text>
                ))}
              </View>
            )}
            <TouchableOpacity
              onPress={goToLogin}
              style={[s.navBtn, { backgroundColor: B.ink }]}
              activeOpacity={0.85}
            >
              <Text style={s.navBtnText}>{isLarge ? 'Book a clean' : 'Book'}</Text>
              <ArrowRight size={14} weight="bold" color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

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
              <Text style={[s.navBrand, { color: '#fff' }]}>OZONEWASH</Text>
            </View>
            {isLarge && (
              <View style={s.navLinks}>
                {['Services', 'How it works', 'Certification', 'Customers'].map(l => (
                  <Text key={l} style={[s.navLink, { color: 'rgba(255,255,255,0.9)' }]}>{l}</Text>
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
              ]}>{isLarge ? 'Book a clean' : 'Book'}</Text>
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
                  <Text style={s.heroBadgeText}>NOW IN HYDERABAD {'\u00b7'} 500+ TANKS CLEANED</Text>
                </View>
              </Reveal>

              <Reveal delay={80}>
                <Text style={[s.heroH1, isLarge && { fontSize: 64, lineHeight: 74, letterSpacing: -2, textAlign: 'left' }]}>
                  Cleaner water.{'\n'}
                  <Text style={s.heroH1Grad}>Certified, every visit.</Text>
                </Text>
              </Reveal>

              <Reveal delay={160}>
                <Text style={[s.heroPara, isLarge && { fontSize: 18, lineHeight: 30, textAlign: 'left', maxWidth: 500 }]}>
                  Chemical-free ozone tank cleaning, booked in 60 seconds. Certified technician at your door. QR-verified hygiene report in your hand.
                </Text>
              </Reveal>

              <Reveal delay={240}>
                <View style={[s.heroCtas, isLarge && { justifyContent: 'flex-start' }]}>
                  <TouchableOpacity style={s.heroCtaPrimary} onPress={goToLogin} activeOpacity={0.85}>
                    <Text style={s.heroCtaPrimaryText}>Book a clean</Text>
                    <ArrowRight size={18} weight="bold" color={B.primaryDk} />
                  </TouchableOpacity>
                  {isLarge ? (
                    <TouchableOpacity style={s.heroCtaGhost} activeOpacity={0.8}>
                      <View style={s.heroPlayCircle}>
                        <Play size={12} weight="fill" color="#fff" />
                      </View>
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Watch 60-sec demo</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={s.heroPlayBtn} activeOpacity={0.8}>
                      <Play size={18} weight="fill" color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              </Reveal>

              <Reveal delay={340}>
                <View style={s.heroTrustRow}>
                  {(isLarge
                    ? ['No chemicals. Ever.', 'Insured crews', 'Under 2-hour service', '4.9 / 5 \u2605']
                    : ['No chemicals', 'Insured crew', '\u20B9799 onwards']
                  ).map((t, i) => (
                    <View key={i} style={s.heroTrustItem}>
                      <CheckCircle size={13} weight="fill" color={B.leaf} />
                      <Text style={s.heroTrustText}>{t}</Text>
                    </View>
                  ))}
                </View>
              </Reveal>
            </View>

            {/* Right column — desktop phone mockup */}
            {isLarge && (
              <Reveal delay={300} style={{ flex: 1 }}>
                <HeroPhoneMockup />
              </Reveal>
            )}
          </View>

          {/* Stats glass (desktop) */}
          {isLarge && (
            <Reveal delay={400} style={{ maxWidth: maxW, alignSelf: 'center', width: '100%', paddingHorizontal: pad }}>
              <View style={s.statsGlass}>
                {STATS.map((st, i) => (
                  <View key={i} style={[s.statsGlassItem, i < STATS.length - 1 && s.statsGlassDivider]}>
                    <Text style={s.statsGlassVal}>
                      <Counter value={st.v} suffix={st.suffix} decimal={st.decimal} />
                    </Text>
                    <Text style={s.statsGlassLbl}>{st.l}</Text>
                  </View>
                ))}
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
                    <Text style={s.statsCardLbl}>{st.l}</Text>
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

        <View style={isLarge ? [s.centerWrap, { maxWidth: maxW }] : undefined}>

          {/* ════════════════════ SERVICES ════════════════════ */}
          <View style={[s.section, { paddingHorizontal: pad }]}>
            <View style={isLarge ? { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 36 } : undefined}>
              <View>
                <Reveal>
                  <Text style={[s.sectionLabel, { color: B.primaryDk }]}>ANY TANK, ANY SIZE</Text>
                </Reveal>
                <Reveal delay={60}>
                  <Text style={[s.sectionTitle, { color: B.ink }, isLarge && s.sectionTitleLg]}>
                    {isLarge ? 'We clean everything that holds water.' : 'We clean them all.'}
                  </Text>
                </Reveal>
              </View>
              {isLarge && (
                <Reveal delay={120}>
                  <Text style={{ fontSize: 14, color: B.muted, maxWidth: 360, textAlign: 'right' }}>
                    One app-enabled service. Pick your tank, pick a slot {'\u2014'} a certified crew handles the rest.
                  </Text>
                </Reveal>
              )}
            </View>

            <View style={[s.servicesList, isLarge && s.servicesGrid]}>
              {SERVICES.map((svc, i) => {
                const active = activeTank === i;

                const cardInner = (
                  <View style={{ position: 'relative', zIndex: 1, flex: 1 }}>
                    <View style={[
                      s.serviceIcon,
                      { backgroundColor: active ? 'rgba(255,255,255,0.18)' : B.aqua },
                      active && { transform: [{ rotate: '-6deg' }, { scale: 1.08 }] },
                    ]}>
                      <svc.Icon size={isLarge ? 30 : 26} color={active ? '#fff' : B.primaryDk} weight="duotone" />
                    </View>
                    <Text style={[
                      s.serviceName,
                      { color: active ? '#fff' : B.ink },
                      isLarge && { fontSize: 22, letterSpacing: -0.5 },
                    ]}>{svc.name}</Text>
                    <Text style={[s.serviceCap, { color: active ? 'rgba(255,255,255,0.8)' : B.muted }]}>{svc.cap}</Text>
                    {isLarge ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 22 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#fff' : B.primaryDk }}>Book this tank</Text>
                        <ArrowRight size={14} weight="bold" color={active ? '#fff' : B.primaryDk} />
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
                      onPress={() => isLarge ? goToLogin() : setActiveTank(i)}
                      activeOpacity={isLarge ? 1 : 0.85}
                      {...(Platform.OS === 'web' && isLarge ? { onMouseEnter: () => setActiveTank(i) } as any : {})}
                      {...(Platform.OS === 'web' && isLarge ? { dataSet: { ozSvc: 'true' } } : {})}
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

          {/* ════════════════════ COMPARISON ════════════════════ */}
          <View style={[s.section, { paddingHorizontal: pad, backgroundColor: B.surfaceAlt }]}>
            <View style={isLarge ? { alignItems: 'center', marginBottom: 24 } : undefined}>
              <Reveal>
                <Text style={[s.sectionLabel, { color: B.primaryDk }]}>THE OZONE DIFFERENCE</Text>
              </Reveal>
              <Reveal delay={60}>
                <Text style={[s.sectionTitle, { color: B.ink }, isLarge && s.sectionTitleLg, isLarge && { textAlign: 'center' }]}>
                  {isLarge ? "Why ordinary cleaning doesn't cut it." : 'Why ordinary cleaning fails.'}
                </Text>
              </Reveal>
            </View>

            <View style={[s.compareRow, isLarge && { flexDirection: 'row', gap: 20 }]}>
              {/* Bad card */}
              <Reveal delay={100} style={isLarge ? { flex: 1 } : undefined}>
                <View style={[s.compareCard, s.compareCardBad, isLarge && { minHeight: 320 }]}>
                  <View style={s.compareBadge}>
                    <Text style={[s.compareBadgeText, { color: B.danger }]}>{'\u2717'} AVOID</Text>
                  </View>
                  <Text style={[s.compareTitle, { color: B.ink }]}>The old way</Text>
                  <Text style={[s.compareSubtitle, { color: B.muted }]}>Chlorine, bleach, guesswork.</Text>
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
                  <View style={[s.compareBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Text style={[s.compareBadgeText, { color: '#fff' }]}>{'\u2713'} RECOMMENDED</Text>
                  </View>
                  <Text style={[s.compareTitle, { color: '#fff' }]}>OzoneWash</Text>
                  <Text style={[s.compareSubtitle, { color: 'rgba(255,255,255,0.85)' }]}>Lab-grade hygiene, app-verified.</Text>
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

          {/* ════════════════════ HOW IT WORKS ════════════════════ */}
          <View style={[s.section, { paddingHorizontal: pad, backgroundColor: isLarge ? B.surfaceAlt : B.surface }]}>
            <View style={isLarge ? { alignItems: 'center', marginBottom: 48 } : undefined}>
              <Reveal>
                <Text style={[s.sectionLabel, { color: B.primaryDk }, isLarge && { textAlign: 'center' }]}>THE 8-STEP PROCESS</Text>
              </Reveal>
              <Reveal delay={60}>
                <Text style={[s.sectionTitle, { color: B.ink }, isLarge && s.sectionTitleLg, isLarge && { textAlign: 'center' }]}>
                  How we get water brilliant.
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
                {HOW.map((h, i) => (
                  <Reveal key={i} delay={i * 100} style={{ flex: 1, alignItems: 'center' }}>
                    <View style={{ alignItems: 'center', position: 'relative' }}>
                      <LinearGradient
                        colors={[B.primary, B.primaryDk]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={s.howCircle}
                      >
                        <h.Icon size={26} color="#fff" weight="regular" />
                        <View style={s.howNum}>
                          <Text style={s.howNumText}>{h.num}</Text>
                        </View>
                      </LinearGradient>
                      <Text style={[s.howTitle, { color: B.ink, textAlign: 'center' }]}>{h.t}</Text>
                      <Text style={[s.howDesc, { color: B.muted, textAlign: 'center', maxWidth: 220 }]}>{h.d}</Text>
                    </View>
                  </Reveal>
                ))}
              </View>
            ) : (
              <View style={s.timeline}>
                <View style={[s.timelineLine, { backgroundColor: B.line }]} />
                {HOW.map((h, i) => (
                  <Reveal key={i} delay={i * 80}>
                    <View style={s.timelineRow}>
                      <LinearGradient colors={[B.primary, B.primaryDk]} style={s.timelineCircle}>
                        <Text style={[s.timelineNum]}>{h.num}</Text>
                      </LinearGradient>
                      <View style={[s.timelineCard, { borderColor: B.line }]}>
                        <View style={[s.timelineIcon, { backgroundColor: B.aqua }]}>
                          <h.Icon size={20} color={B.primaryDk} weight="regular" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.howTitle, { color: B.ink, marginBottom: 2 }]}>{h.t}</Text>
                          <Text style={[s.howDesc, { color: B.muted }]}>{h.d}</Text>
                        </View>
                      </View>
                    </View>
                  </Reveal>
                ))}
              </View>
            )}
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
              <View style={{ position: 'relative', paddingHorizontal: pad }}>
                <View style={{ alignItems: 'center', marginBottom: 40 }}>
                  <Reveal>
                    <Text style={[s.sectionLabel, { color: B.primaryDk, textAlign: 'center' }]}>WHY OZONE WASH</Text>
                  </Reveal>
                  <Reveal delay={60}>
                    <Text style={[s.sectionTitle, s.sectionTitleLg, { color: B.ink, textAlign: 'center' }]}>
                      Built different, end to end.
                    </Text>
                  </Reveal>
                </View>
                <TankFeatureRing onCta={goToLogin} />
              </View>
            </View>
          ) : (
            <View style={[s.section, { paddingHorizontal: pad, backgroundColor: B.surfaceAlt }]}>
              <Reveal>
                <Text style={[s.sectionLabel, { color: B.primaryDk }]}>WHY OZONE WASH</Text>
              </Reveal>
              <Reveal delay={60}>
                <Text style={[s.sectionTitle, { color: B.ink }]}>Built different, end to end.</Text>
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
                  <Text style={[s.sectionLabel, { color: B.leaf }]}>DIGITAL CERTIFICATE</Text>
                </Reveal>
                <Reveal delay={60}>
                  <Text style={s.certTitle}>A clean you can prove.</Text>
                </Reveal>
                <Reveal delay={120}>
                  <Text style={s.certBody}>
                    Every visit ends with a QR-signed PDF certificate {'\u2014'} ozone readings, before/after tank photos, crew ID, and a tamper-evident signature. Share it with tenants, buyers, or anyone who needs to know the water is safe.
                  </Text>
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
                    <Text style={s.certCardBrand}>OZONEWASH</Text>
                  </View>
                  <Text style={s.certCardType}>CERTIFICATE OF HYGIENE</Text>
                  <Text style={s.certCardTank}>Overhead Tank {'\u00b7'} 2,000L</Text>
                  <View style={s.certCardGrid}>
                    {[['Date', '20 Apr 2026'], ['Location', 'Madhapur'], ['Ozone ppm', '2.4 ppm'], ['ATP reading', '18 RLU']].map(([l, v], i) => (
                      <View key={i} style={{ width: '48%' }}>
                        <Text style={s.certCardStatL}>{l}</Text>
                        <Text style={s.certCardStatV}>{v}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={s.certCardQrRow}>
                    <View style={s.certCardQrBox}>
                      <QrCode size={44} color={B.ink} weight="regular" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.certCardVerifyLbl}>Verify at</Text>
                      <Text style={s.certCardVerifyUrl}>ozonewash.in/v/8K2F9</Text>
                      <Text style={s.certCardVerifyNote}>Tamper-evident {'\u00b7'} Signed 10:42 IST</Text>
                    </View>
                  </View>
                </View>
              </Reveal>
            </View>
          </LinearGradient>

          {/* ════════════════════ TESTIMONIALS ════════════════════ */}
          <View style={[s.section, { paddingHorizontal: isLarge ? pad : 0 }]}>
            <View style={[{ paddingHorizontal: isLarge ? 0 : pad }, isLarge && { alignItems: 'center', marginBottom: 48 }]}>
              <Reveal>
                <Text style={[s.sectionLabel, { color: B.primaryDk }, isLarge && { textAlign: 'center' }]}>CUSTOMERS</Text>
              </Reveal>
              <Reveal delay={60}>
                <Text style={[s.sectionTitle, { color: B.ink }, isLarge && s.sectionTitleLg, isLarge && { textAlign: 'center' }]}>
                  Hyderabad approves.
                </Text>
              </Reveal>
            </View>

            {isLarge ? (
              <View style={{ flexDirection: 'row', gap: 20 }}>
                {TESTIMONIALS.map((t, i) => (
                  <Reveal key={i} delay={i * 100} style={{ flex: 1 }}>
                    <View
                      {...(Platform.OS === 'web' ? { dataSet: { ozTest: 'true' } } : {})}
                      style={[s.testCard, { borderColor: B.line }]}
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
                  </Reveal>
                ))}
              </View>
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

          {/* ════════════════════ FAQ ════════════════════ */}
          <View style={[s.section, { paddingHorizontal: pad, backgroundColor: B.surfaceAlt }]}>
            <View style={isLarge ? { alignItems: 'center', marginBottom: 40 } : undefined}>
              <Reveal>
                <Text style={[s.sectionLabel, { color: B.primaryDk }, isLarge && { textAlign: 'center' }]}>QUESTIONS</Text>
              </Reveal>
              <Reveal delay={60}>
                <Text style={[s.sectionTitle, { color: B.ink }, isLarge && s.sectionTitleLg, isLarge && { textAlign: 'center' }]}>
                  Before you book.
                </Text>
              </Reveal>
            </View>
            <View style={isLarge ? { maxWidth: 860, alignSelf: 'center', width: '100%' } : undefined}>
              {FAQ_DATA.map((f, i) => (
                <Reveal key={i} delay={i * 80}>
                  <FaqItem
                    q={f.q}
                    a={f.a}
                    open={faqOpen === i}
                    onToggle={() => setFaqOpen(faqOpen === i ? null : i)}
                    compact={!isLarge}
                  />
                </Reveal>
              ))}
            </View>
          </View>

          {/* ════════════════════ FINAL CTA ════════════════════ */}
          <LinearGradient
            colors={[B.primary, B.primaryDk]}
            style={[s.finalCta, { paddingHorizontal: pad }]}
          >
            <BubblesEffect count={isLarge ? 18 : 10} seed={isLarge ? 11 : 7} />
            <Reveal>
              <Text style={[s.finalCtaTitle, isLarge && { fontSize: 56, letterSpacing: -1.8 }]}>
                Ready for brilliant water?
              </Text>
            </Reveal>
            <Reveal delay={60}>
              <Text style={s.finalCtaBody}>Your first clean. 60-second booking. Zero pressure.</Text>
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
                    <Text style={s.finalCtaBtnGhostText}>Call +91 98481 44854</Text>
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
                  <Text style={[s.footerBrand, { color: B.ink }]}>OZONEWASH</Text>
                </View>
                <Text style={[s.footerTagline, { color: B.muted }]}>
                  Hyderabad's first app-enabled tank hygiene service. Powered by VijRam Health Sense Pvt. Ltd.
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
            <Text style={s.stickyBtnText}>Book a clean now</Text>
            <ArrowRight size={18} weight="bold" color="#fff" />
          </TouchableOpacity>
        </View>
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
      default: { backdropFilter: 'blur(16px) saturate(180%)' } as any,
    }),
  },
  navInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navLogo: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  navLogoImg: { width: 26, height: 26 },
  navBrand: { fontWeight: '800', fontSize: 15, letterSpacing: 2, fontFamily: 'Manrope, Inter, sans-serif' },
  navLinks: { flexDirection: 'row', gap: 28 },
  navLink: { fontSize: 13, fontWeight: '600', cursor: 'pointer' } as any,
  navBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10,
    ...Platform.select({
      default: { boxShadow: '0 8px 20px rgba(0,0,0,0.15)' } as any,
    }),
  },
  navBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

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
  heroCtas: { flexDirection: 'row', gap: 14, marginBottom: 28, justifyContent: 'center', alignItems: 'center' },
  heroCtaPrimary: {
    height: 56, paddingHorizontal: 24, borderRadius: 14,
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 10,
    ...Platform.select({
      ios:     { shadowColor: 'rgba(0,0,0,0.22)', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 20 },
      android: { elevation: 8 },
      default: { boxShadow: '0 14px 30px rgba(0,0,0,0.22)' } as any,
    }),
  },
  heroCtaPrimaryText: { color: B.primaryDk, fontWeight: '800', fontSize: 16 },
  heroCtaGhost: {
    height: 56, paddingHorizontal: 20, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    flexDirection: 'row', alignItems: 'center', gap: 10,
    cursor: 'pointer',
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

  /* Stats glass (desktop) */
  statsGlass: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    ...Platform.select({
      default: { backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' } as any,
    }),
  },
  statsGlassItem: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  statsGlassDivider: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.2)' },
  statsGlassVal: { fontSize: 34, fontWeight: '800', color: '#fff', marginBottom: 4, letterSpacing: -1 },
  statsGlassLbl: { fontSize: 12, color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5, textAlign: 'center' },

  /* Stats card (mobile) */
  statsCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 14,
    flexDirection: 'row', marginBottom: 8,
    ...Platform.select({
      ios:     { shadowColor: 'rgba(2,132,199,0.25)', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 1, shadowRadius: 30 },
      android: { elevation: 8 },
      default: { boxShadow: '0 20px 40px rgba(2,132,199,0.25), 0 0 0 1px rgba(2,132,199,0.06)' } as any,
    }),
  },
  statsCardItem: { flex: 1, alignItems: 'center' },
  statsCardDivider: { borderLeftWidth: 1, borderLeftColor: B.line },
  statsCardVal: { fontSize: 18, fontWeight: '800', color: B.ink, letterSpacing: -0.5 },
  statsCardLbl: { fontSize: 10, color: B.muted, marginTop: 2, textAlign: 'center' },

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
      default: { boxShadow: '0 14px 30px rgba(2,132,199,0.28)' } as any,
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
      default: { boxShadow: '0 30px 60px rgba(2,132,199,0.35)' } as any,
    }),
  },
  serviceIcon: {
    width: 60, height: 60, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  serviceName: { fontSize: 14, fontWeight: '700', fontFamily: 'Manrope, sans-serif' },
  serviceCap: { fontSize: 13, marginTop: 4 },
  serviceArrow: { marginLeft: 'auto' },
  bookBtn: {
    marginTop: 14, height: 48, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  bookBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  /* Comparison */
  compareRow: { gap: 12 },
  compareCard: { borderRadius: 20, padding: 24, overflow: 'hidden' },
  compareCardBad: { backgroundColor: '#fff', borderWidth: 1, borderColor: B.line },
  compareBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 999, backgroundColor: B.dangerBg, marginBottom: 14,
  },
  compareBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  compareTitle: {
    fontSize: 24, fontWeight: '800', letterSpacing: -0.8, marginBottom: 4,
    fontFamily: 'Manrope, sans-serif',
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
      default: { boxShadow: '0 12px 24px rgba(2,132,199,0.3)' } as any,
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
      default: { boxShadow: '0 4px 12px rgba(2,132,199,0.3)' } as any,
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
  featCardMobile: { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, height: '100%' },
  featIconMobile: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  featTitleMobile: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  featDescMobile: { fontSize: 11.5, lineHeight: 16 },

  /* Certificate band */
  certBand: { paddingVertical: 80, overflow: 'hidden' },
  certTitle: {
    fontSize: 48, fontWeight: '800', color: '#fff', letterSpacing: -1.5,
    lineHeight: 52, marginVertical: 10, fontFamily: 'Manrope, sans-serif',
  },
  certBody: { fontSize: 17, color: 'rgba(255,255,255,0.8)', lineHeight: 28, marginBottom: 28, maxWidth: 500 },
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
      default: { boxShadow: '0 40px 80px rgba(0,0,0,0.35)', transform: 'rotate(-2deg)' } as any,
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
  certCardBrand: { fontSize: 14, fontWeight: '800', letterSpacing: 2, color: B.ink, fontFamily: 'Manrope, sans-serif' },
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
  faqHeader: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 16 },
  faqQ: { fontSize: 16, fontWeight: '700', lineHeight: 22, fontFamily: 'Manrope, sans-serif' },
  faqToggle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  faqA: { fontSize: 15, lineHeight: 24, paddingHorizontal: 18, paddingBottom: 18 },

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
      default: { boxShadow: '0 14px 30px rgba(0,0,0,0.2)' } as any,
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
  footerBrand: { fontWeight: '800', fontSize: 16, letterSpacing: 2.5, fontFamily: 'Manrope, sans-serif' },
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
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 1, paddingTop: 18, marginTop: 20,
  },
  footerCopy: { fontSize: 12 },

  /* Mobile sticky bottom */
  stickyBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 28, paddingHorizontal: 16, zIndex: 50,
    ...Platform.select({
      default: { position: 'fixed' } as any,
    }),
  },
  stickyBtn: {
    height: 52, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: 'rgba(2,132,199,0.5)', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 1, shadowRadius: 20 },
      android: { elevation: 10 },
      default: { boxShadow: '0 14px 28px rgba(2,132,199,0.4)' } as any,
    }),
  },
  stickyBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

export default LandingScreen;
