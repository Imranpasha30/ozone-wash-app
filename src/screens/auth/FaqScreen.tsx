/**
 * FaqScreen - "Ask Ozone" conversational FAQ.
 *
 * Mock chat interface where the user picks a question and the
 * Ozone Wash hygiene assistant "replies" with the answer. Typing
 * indicator + slide-in animations make it feel alive without any
 * real backend. Search and category chips filter the suggestion deck.
 *
 * Web-only experience. Native users see the inline accordion FAQ on
 * the landing page; this screen falls back to a simple list there.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Platform, TextInput, Animated, Image, StatusBar, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '../../utils/responsive';
import {
  ArrowLeft, ArrowRight, MagnifyingGlass, Phone, ChatCircle,
  ArrowsClockwise, Sparkle, CheckCircle,
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

type Faq = { cat: string; q: string; a: string };

const FAQ_DATA: Faq[] = [
  { cat: 'Before You Book', q: 'Is Ozone safe for drinking water tanks?', a: 'Yes. Ozone is a stronger oxidiser than chlorine yet leaves no chemical residue. It decomposes back into oxygen within minutes, making it safer for potable water than chemical cleaners. Most bottled mineral water brands use Ozone for purification.' },
  { cat: 'Before You Book', q: 'How long does a service take?', a: 'Domestic tanks are typically completed within 2 hours. Larger tanks may take longer depending on size and condition, but every service is completed in a single visit, no second trip, no mess.' },
  { cat: 'Before You Book', q: "What's included in the 8-step process?", a: 'Our patent-applied 8-step hygiene covers pre-check & setup, drain, mechanical scrub & rotary jet, high-pressure rinse, sludge removal, Ozone disinfection, optional UV double-lock, and after-wash testing with QR-signed proof delivery.' },
  { cat: 'Before You Book', q: 'Do you service my area?', a: 'Yes. We are currently operating across multiple areas in Hyderabad and rapidly expanding. Enter your pincode at booking to see exact availability and pricing.' },

  { cat: 'Safety & Science', q: 'How does Ozone clean my tank?', a: 'Ozone ruptures bacterial and viral cells, neutralises toxins, and oxidises metals. Unlike chlorine, Ozone leaves no chemical residue. It decomposes back into oxygen within minutes.' },
  { cat: 'Safety & Science', q: 'How is Ozone better than chemicals?', a: 'Ozone is a stronger oxidiser than chlorine, killing pathogens up to 3,000 times faster. It neutralises chlorine-resistant organisms, penetrates biofilm, and leaves no chemical residue. Just pure, residue-free water.' },

  { cat: 'Compliance & Proof', q: 'How do QR certificates work?', a: 'Each service generates a QR-signed hygiene certificate with Ozone readings, ATP hygiene checks, and before/after photos. Audit-ready for RWAs, hospitals, and regulators. Share it instantly with tenants, buyers, or inspectors.' },
  { cat: 'Compliance & Proof', q: 'What does GHMC law say about tank cleaning?', a: 'Under the GHMC Act, 1955 (Public Health & Sanitation Bye-laws), drinking water tanks must be cleaned every 3 to 6 months. For commercial establishments and institutions, quarterly cleaning is required to stay compliant.' },
  { cat: 'Compliance & Proof', q: 'How often should tanks be cleaned?', a: 'Domestic tanks: every 3 to 6 months. Commercial establishments: every 3 months. RWAs and hospitals: quarterly. AMC packages ensure recurring compliance and cost savings.' },
  { cat: 'Compliance & Proof', q: 'Why is certified tank hygiene important today?', a: 'Recent outbreaks across India caused thousands of illnesses due to contaminated tanks. Ozone Wash ensures proof-based hygiene with QR certificates and EcoScore tracking.' },

  { cat: 'AMC Plans', q: 'What is an AMC plan?', a: 'A subscription plan with fixed cleaning intervals (monthly, quarterly, half-yearly, or yearly) and built-in discounts.' },
  { cat: 'AMC Plans', q: 'How do AMC discounts work?', a: 'Monthly: 30%. Quarterly: 15%. Half-Yearly: 10%. Yearly: 5%. Multi-tank: 2 tanks 15%, 2+ tanks 30%. All AMC prices are GST-inclusive.' },
  { cat: 'AMC Plans', q: 'Why choose AMC over one-time cleaning?', a: 'Ensures compliance, cost savings, EcoScore tracking, and priority scheduling. Forgetting is now history.' },
  { cat: 'AMC Plans', q: 'What if I miss a scheduled AMC service?', a: 'You can reschedule within the same cycle. EcoScore tracks delays so you stay on top of compliance.' },

  { cat: 'Upgrades & Add-Ons', q: 'What hygiene upgrades can I add?', a: 'UV Sterilisation, Anti-Algae Spray, Anti-Lime Treatment, Pathogen Testing, Structural Audit, and IoT Sensors.' },
  { cat: 'Upgrades & Add-Ons', q: 'Are add-ons optional?', a: 'Yes. The base Ozone service already delivers certified hygiene. Add-ons provide extra assurance, compliance proof, and preventive protection. They bundle at discounted rates with AMC.' },

  { cat: 'Testing & Proof', q: 'Do you provide testing after cleaning?', a: 'Yes. Every service includes pre and post hygiene checks showing measurable improvement in tank quality.' },
  { cat: 'Testing & Proof', q: 'What is the lab-based upgrade?', a: 'A 21-parameter certified laboratory report covering pathogens, chemical residues, and water quality. Ideal for RWAs, hospitals, and regulators.' },
  { cat: 'Testing & Proof', q: 'Tank hygiene vs source contamination?', a: 'Testing validates tank hygiene post-service, but the water supply itself may still be contaminated. GHMC municipal water, tankers, and borewell sources have all reported contamination incidents. Source filtration is recommended alongside tank hygiene.' },

  { cat: 'EcoScore', q: 'What is EcoScore?', a: 'A gamified hygiene rating (0 to 100) that converts compliance data into a score, badge, rationale, and improvement tips.' },
  { cat: 'EcoScore', q: 'What do the badges mean?', a: 'Platinum (90+), Gold (75 to 89), Silver (60 to 74), Bronze (40 to 59), Unrated (under 40). Each badge shows a rationale (timely service, Ozone + UV cycles logged, water test passed, AMC compliant).' },
  { cat: 'EcoScore', q: 'What are EcoPoints and how do I redeem them?', a: 'Your EcoScore percentage equals your EcoPoints. Bonus points for badges and streaks. Points accumulate in your wallet (valid 24 months, capped at 1,000) and redeem against AMC renewal discounts, hygiene upgrades, partner benefits, and streak rewards.' },

  { cat: 'Preparation', q: 'What preparations are needed before cleaning?', a: 'Ensure clear access to the tank, switch off pumps, inform residents, keep alternate water ready, remove nearby clutter, and provide a 16A power socket for equipment. Send the "Ozone at Work" caution message so residents know the hygiene process is in progress.' },
  { cat: 'Preparation', q: 'What should I avoid during cleaning?', a: "Don't use tank water until the certificate is issued, don't leave lids open, don't delay cleaning beyond 6 months, and don't add chemicals yourself. Keep humans and pets away from the Ozone work zone until the service is certified safe." },

  { cat: 'For Your Sector', q: 'RWAs: How do we share proof with residents?', a: 'Each service generates a QR-signed certificate and EcoScore dashboard, shareable with residents and regulators in one tap.' },
  { cat: 'For Your Sector', q: 'Hospitals: Is Ozone safe for patient tanks?', a: 'Yes. Ozone sterilises without residues. Natural and safer than chemicals for sensitive environments like hospitals and clinics.' },
  { cat: 'For Your Sector', q: 'Restaurants: How do you ensure kitchen hygiene?', a: 'Our Hygiene Wall Wash service disinfects walls and surfaces monthly, leaving them odour-less and sterilised.' },
];

const CATEGORIES = ['All', ...Array.from(new Set(FAQ_DATA.map(f => f.cat)))];

type Msg =
  | { kind: 'greet'; id: string }
  | { kind: 'user';  id: string; text: string }
  | { kind: 'bot';   id: string; text: string; q: string };

/* ─────────────────────────────────────────────────────────────────
   AVATAR - animated ozone-drop molecule (the brand mark, but tiny)
   ─────────────────────────────────────────────────────────────── */
function OzoneAvatar({ size = 36 }: { size?: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const glow  = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[a.glow, { width: size * 1.6, height: size * 1.6, borderRadius: size, opacity: glow, transform: [{ scale }] }]} />
      <View style={[a.core, { width: size, height: size, borderRadius: size / 2 }]}>
        <View style={[a.dot, { width: size * 0.18, height: size * 0.18, top: size * 0.16, left: size * 0.18 }]} />
        <View style={[a.dot, { width: size * 0.18, height: size * 0.18, top: size * 0.16, right: size * 0.18 }]} />
        <View style={[a.dot, { width: size * 0.22, height: size * 0.22, bottom: size * 0.18, left: size * 0.39 }]} />
      </View>
    </View>
  );
}
const a = StyleSheet.create({
  glow: { position: 'absolute', backgroundColor: '#38BDF8' },
  core: {
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      default: { boxShadow: '0 4px 12px rgba(2,132,199,0.35), inset 0 0 0 1.5px rgba(2,132,199,0.25)' } as any,
      ios:     { shadowColor: 'rgba(2,132,199,0.4)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  dot: {
    position: 'absolute',
    backgroundColor: B.primary,
    borderRadius: 999,
  },
});

/* ─────────────────────────────────────────────────────────────────
   TYPING DOTS - three pulsing bubbles
   ─────────────────────────────────────────────────────────────── */
function TypingDots() {
  const v = [0, 1, 2].map(() => useRef(new Animated.Value(0)).current);
  useEffect(() => {
    v.forEach((val, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(val, { toValue: 1, duration: 400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      ).start();
    });
  }, []);
  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 4 }}>
      {v.map((val, i) => {
        const ty = val.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
        const op = val.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
        return (
          <Animated.View
            key={i}
            style={{
              width: 7, height: 7, borderRadius: 4,
              backgroundColor: B.primary,
              transform: [{ translateY: ty }],
              opacity: op,
            }}
          />
        );
      })}
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────
   CHAT BUBBLE
   ─────────────────────────────────────────────────────────────── */
function ChatBubble({ msg, isLarge }: { msg: Msg; isLarge: boolean }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(8)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(ty, { toValue: 0, duration: 360, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const baseAnim = { opacity: op, transform: [{ translateY: ty }] };

  if (msg.kind === 'user') {
    return (
      <Animated.View style={[c.row, c.rowUser, baseAnim]}>
        <LinearGradient
          colors={[B.primary, B.primaryDk]}
          style={[c.bubbleUser, isLarge && { maxWidth: 520 }]}
        >
          <Text style={c.userText}>{msg.text}</Text>
        </LinearGradient>
        <View style={c.userTag}>
          <Text style={c.userTagText}>YOU</Text>
        </View>
      </Animated.View>
    );
  }

  if (msg.kind === 'greet') {
    return (
      <Animated.View style={[c.row, baseAnim]}>
        <OzoneAvatar size={36} />
        <View style={[c.bubbleBot, isLarge && { maxWidth: 540 }]}>
          <Text style={c.botName}>Ozone Wash Assistant</Text>
          <Text style={c.botText}>
            Hi there. I'm trained on every page of our hygiene playbook. Tap any
            question below to ask, or search for something specific. I usually
            answer in plain English, and I never ghost.
          </Text>
          <View style={c.statusRow}>
            <View style={c.statusDot} />
            <Text style={c.statusText}>Online · usually replies instantly</Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[c.row, baseAnim]}>
      <OzoneAvatar size={36} />
      <View style={[c.bubbleBot, isLarge && { maxWidth: 540 }]}>
        <Text style={c.botName}>Ozone Wash Assistant</Text>
        <Text style={c.botText}>{msg.text}</Text>
        <View style={c.botMeta}>
          <CheckCircle size={11} weight="fill" color={B.leaf} />
          <Text style={c.botMetaText}>Verified by hygiene team</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const c = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 18 },
  rowUser: { flexDirection: 'row-reverse' },

  bubbleBot: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderTopLeftRadius: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1, borderColor: B.line,
    ...Platform.select({
      default: { boxShadow: '0 6px 16px rgba(15,23,42,0.06)' } as any,
      ios:     { shadowColor: 'rgba(15,23,42,0.08)', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16 },
      android: { elevation: 2 },
    }),
  },
  botName: { fontSize: 11, fontWeight: '800', color: B.primaryDk, letterSpacing: 1.2, marginBottom: 6 },
  botText: { fontSize: 14, lineHeight: 22, color: B.inkSoft },
  botMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  botMetaText: { fontSize: 10, color: B.muted, fontWeight: '600', letterSpacing: 0.4 },

  bubbleUser: {
    paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 18, borderTopRightRadius: 6,
    ...Platform.select({
      default: { boxShadow: '0 8px 18px rgba(2,132,199,0.32)' } as any,
      ios:     { shadowColor: 'rgba(2,132,199,0.4)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 18 },
      android: { elevation: 4 },
    }),
  },
  userText: { color: '#fff', fontSize: 14, lineHeight: 21, fontWeight: '600' },
  userTag: {
    backgroundColor: B.ink, paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, marginRight: 4,
  },
  userTagText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: B.leaf },
  statusText: { fontSize: 11, color: B.muted, fontWeight: '600' },
});

/* ─────────────────────────────────────────────────────────────────
   MAIN SCREEN
   ─────────────────────────────────────────────────────────────── */
const FaqScreen = () => {
  const navigation = useNavigation<any>();
  const insets     = useSafeAreaInsets();
  const { isLarge } = useResponsive();

  const [activeCat,   setActiveCat]   = useState('All');
  const [search,      setSearch]      = useState('');
  const [conversation,setConversation]= useState<Msg[]>([{ kind: 'greet', id: 'g0' }]);
  const [typing,      setTyping]      = useState(false);

  const scrollRef    = useRef<any>(null);
  const threadRef    = useRef<any>(null);
  const chipRailRef  = useRef<any>(null);
  const seqRef       = useRef(0);
  // Tracks whether a click on a chip is the end of a drag (to suppress accidental category change).
  const draggingRef  = useRef(false);

  // Lock outer page to viewport on web so the chat thread scrolls inside.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const sv = scrollRef.current;
    if (!sv) return;
    const inner = (sv.getScrollableNode?.() ?? sv) as HTMLElement;
    if (inner?.style) {
      inner.style.maxHeight = '100vh';
      inner.style.overflowY = 'auto';
    }
  }, []);

  // Drag-to-scroll + vertical-wheel-to-horizontal on the chip rail.
  // Desktop has no horizontal wheel and the scrollbar is hidden, so without
  // this users have no way to scroll the strip even when chips overflow.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = chipRailRef.current as HTMLElement | null;
    if (!el) return;

    let down = false;
    let startX = 0;
    let startScroll = 0;
    let moved = 0;

    const onDown = (e: MouseEvent) => {
      down = true;
      moved = 0;
      startX = e.pageX;
      startScroll = el.scrollLeft;
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
    };
    const onMove = (e: MouseEvent) => {
      if (!down) return;
      const dx = e.pageX - startX;
      moved = Math.max(moved, Math.abs(dx));
      el.scrollLeft = startScroll - dx;
      // Once meaningful drag has happened, suppress the chip click that follows mouseup.
      if (moved > 4) draggingRef.current = true;
    };
    const onUp = () => {
      if (!down) return;
      down = false;
      el.style.cursor = '';
      el.style.userSelect = '';
      // Reset the suppression flag in the next tick so click handlers can read it.
      setTimeout(() => { draggingRef.current = false; }, 0);
    };
    // Convert vertical wheel into horizontal scroll - the natural desktop pattern
    // (Shift+wheel works too, but most users don't know it).
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };

    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      el.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Inject web-only styles: chip rail scrollbar, hover, and hero bubble keyframes.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const id = 'oz-faq-screen-style';
    if (document.getElementById(id)) return;
    const el = document.createElement('style');
    el.id = id;
    el.textContent = `
      .oz-faq-chiprail::-webkit-scrollbar { display: none; }
      .oz-faq-chiprail button:hover { background: ${B.surfaceAlt} !important; }
      @keyframes ozFaqBubbleRise {
        0%   { transform: translate(0, 0) scale(0.8); opacity: 0; }
        10%  { opacity: 1; }
        90%  { opacity: 0.8; }
        100% { transform: translate(var(--drift, 0px), -140vh) scale(1.1); opacity: 0; }
      }
    `;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, []);

  // Auto-scroll the thread to the latest message.
  useEffect(() => {
    const t = setTimeout(() => {
      threadRef.current?.scrollToEnd?.({ animated: true });
    }, 50);
    return () => clearTimeout(t);
  }, [conversation, typing]);

  const askedQs = useMemo(
    () => new Set(conversation.filter(m => m.kind === 'user').map(m => (m as any).text)),
    [conversation],
  );

  const ask = (faq: Faq) => {
    if (askedQs.has(faq.q)) return;
    const uid = `u${++seqRef.current}`;
    setConversation(prev => [...prev, { kind: 'user', id: uid, text: faq.q }]);
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setConversation(prev => [...prev, { kind: 'bot', id: `b${++seqRef.current}`, text: faq.a, q: faq.q }]);
    }, 700);
  };

  const reset = () => {
    seqRef.current = 0;
    setConversation([{ kind: 'greet', id: 'g0' }]);
  };

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return FAQ_DATA
      .filter(f => activeCat === 'All' || f.cat === activeCat)
      .filter(f => !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
      .filter(f => !askedQs.has(f.q));
  }, [activeCat, search, askedQs]);

  const askedCount = conversation.filter(m => m.kind === 'user').length;
  const pad = isLarge ? 48 : 16;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView ref={scrollRef} style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* ─── Hero with floating bubbles + status ─── */}
        <LinearGradient colors={[B.primaryDkr, B.primaryDk, B.primary]} style={[s.hero, { paddingTop: insets.top + 18 }]}>
          {Platform.OS === 'web' && (
            // Animated ozone bubbles drifting up through the hero gradient.
            // @ts-ignore - raw HTML container for CSS keyframe animation
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              overflow: 'hidden', pointerEvents: 'none',
            }}>
              {Array.from({ length: 22 }).map((_, i) => {
                const rng = (k: number) => {
                  const v = Math.sin(k * 9301 + 49297) * 233280;
                  return v - Math.floor(v);
                };
                const size  = 8 + rng(i) * 50;
                const left  = rng(i + 100) * 100;
                const delay = rng(i + 200) * -14;
                const dur   = 12 + rng(i + 300) * 14;
                const drift = (rng(i + 400) - 0.5) * 50;
                const op    = 0.3 + rng(i + 500) * 0.55;
                return (
                  // @ts-ignore
                  <span key={i} style={{
                    position: 'absolute',
                    left: `${left}%`, bottom: -80,
                    width: size, height: size, borderRadius: '50%',
                    background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(255,255,255,0.18) 60%, transparent 70%)',
                    border: '1px solid rgba(255,255,255,0.4)',
                    opacity: op,
                    animation: `ozFaqBubbleRise ${dur}s linear ${delay}s infinite`,
                    ['--drift']: `${drift}px`,
                  } as any} />
                );
              })}
            </div>
          )}
          <View style={[s.heroInner, { paddingHorizontal: pad }, isLarge && { maxWidth: 1100, alignSelf: 'center', width: '100%' }]}>
            <View style={s.heroTop}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.8}>
                <ArrowLeft size={20} color="#fff" weight="bold" />
              </TouchableOpacity>
              <View style={s.heroBrand}>
                <Image source={require('../../../assets/logo.png')} style={s.heroLogo} resizeMode="contain" />
                <Text style={s.heroBrandText}>OZONE WASH</Text>
              </View>
              <TouchableOpacity onPress={reset} style={s.resetBtn} activeOpacity={0.8}>
                <ArrowsClockwise size={14} color="#fff" weight="bold" />
                <Text style={s.resetText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <View style={s.heroBody}>
              <View style={isLarge ? { flex: 1 } : undefined}>
                <Text style={s.eyebrow}>ASK OZONE</Text>
                <Text style={[s.heroTitle, isLarge && s.heroTitleLg]}>
                  Talk to your{'\n'}hygiene assistant.
                </Text>
                <Text style={[s.heroSub, isLarge && { fontSize: 16 }]}>
                  No menus. No 50-question scrolls. Pick what you want to know - I'll answer in plain English.
                </Text>
                <View style={s.statusBadge}>
                  <View style={s.statusBadgeDot} />
                  <Text style={s.statusBadgeText}>{FAQ_DATA.length} answers ready · online now</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* ─── Search + category chips ─── */}
        <View style={[s.controls, { paddingHorizontal: pad }, isLarge && { maxWidth: 1100, alignSelf: 'center', width: '100%' }]}>
          <View style={s.searchWrap}>
            <MagnifyingGlass size={16} weight="regular" color={B.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search what you want to ask..."
              placeholderTextColor={B.muted}
              style={s.searchInput}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Text style={s.searchClear}>×</Text>
              </TouchableOpacity>
            )}
          </View>

          {Platform.OS === 'web' ? (
            // Raw <div> with overflow-x: auto + drag-to-scroll - RNW's ScrollView
            // wraps in extra containers that block horizontal scroll inside a flex column.
            // @ts-ignore
            <div
              ref={chipRailRef}
              className="oz-faq-chiprail"
              style={{
                display: 'flex', flexWrap: 'nowrap', gap: 8,
                overflowX: 'auto', overflowY: 'hidden',
                paddingTop: 4, paddingBottom: 8,
                marginLeft: -4, marginRight: -4, paddingLeft: 4, paddingRight: 4,
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch',
                cursor: 'grab',
                touchAction: 'pan-x',
              } as any}
            >
              {CATEGORIES.map(cat => {
                const active = activeCat === cat;
                return (
                  // @ts-ignore
                  <button
                    key={cat}
                    onClick={() => {
                      // Don't change category if the click ended a drag.
                      if (draggingRef.current) return;
                      setActiveCat(cat);
                    }}
                    style={{
                      flexShrink: 0, whiteSpace: 'nowrap', cursor: 'pointer',
                      paddingLeft: 14, paddingRight: 14, paddingTop: 8, paddingBottom: 8,
                      borderRadius: 999,
                      border: `1px solid ${active ? B.ink : B.line}`,
                      background: active ? B.ink : '#fff',
                      color:      active ? '#fff' : B.inkSoft,
                      fontSize: 12.5, fontWeight: 700,
                      fontFamily: 'inherit',
                      transition: 'background .2s, color .2s, border-color .2s',
                    } as any}>
                    {cat}
                  </button>
                );
              })}
            </div>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chipsRow}
            >
              {CATEGORIES.map(cat => {
                const active = activeCat === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setActiveCat(cat)}
                    style={[s.chip, active && s.chipActive]}
                    activeOpacity={0.85}
                  >
                    <Text style={[s.chipText, active && s.chipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* ─── Conversation thread ─── */}
        <View style={[s.threadWrap, { paddingHorizontal: pad }, isLarge && { maxWidth: 900, alignSelf: 'center', width: '100%' }]}>
          <View style={s.thread} ref={threadRef}>
            {conversation.map(msg => (
              <ChatBubble key={msg.id} msg={msg} isLarge={isLarge} />
            ))}
            {typing && (
              <View style={[c.row]}>
                <OzoneAvatar size={36} />
                <View style={[c.bubbleBot, { paddingVertical: 14, paddingHorizontal: 18 }]}>
                  <TypingDots />
                </View>
              </View>
            )}
          </View>

          {/* Helper after several asks */}
          {askedCount >= 3 && (
            <View style={s.followup}>
              <Sparkle size={16} weight="fill" color={B.primaryDk} />
              <Text style={s.followupText}>
                Want a personal answer? Reach a real hygiene specialist.
              </Text>
              <View style={s.followupBtns}>
                <TouchableOpacity style={s.followupBtn} activeOpacity={0.85}>
                  <Phone size={13} weight="bold" color={B.primaryDk} />
                  <Text style={s.followupBtnText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.followupBtn} activeOpacity={0.85}>
                  <ChatCircle size={13} weight="bold" color={B.primaryDk} />
                  <Text style={s.followupBtnText}>WhatsApp</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ─── Suggestion deck (the "ask box") ─── */}
        <View style={[s.deckWrap, { paddingHorizontal: pad }, isLarge && { maxWidth: 900, alignSelf: 'center', width: '100%' }]}>
          <View style={s.deckHeader}>
            <Text style={s.deckLabel}>SUGGESTED FOR YOU</Text>
            <Text style={s.deckCount}>{suggestions.length} unanswered</Text>
          </View>
          {suggestions.length === 0 ? (
            <View style={s.deckEmpty}>
              <Text style={s.deckEmptyTitle}>You've covered this category.</Text>
              <Text style={s.deckEmptyBody}>Pick another category above, search a topic, or reset to start over.</Text>
            </View>
          ) : (
            <View style={[s.deck, isLarge && s.deckLg]}>
              {suggestions.slice(0, isLarge ? 8 : 6).map((f, i) => (
                <TouchableOpacity
                  key={f.q}
                  onPress={() => ask(f)}
                  activeOpacity={0.85}
                  style={[s.askCard, isLarge && s.askCardLg, i === 0 && s.askCardFeatured]}
                >
                  <View style={s.askCardCat}>
                    <Text style={s.askCardCatText}>{f.cat}</Text>
                  </View>
                  <Text style={[s.askCardQ, i === 0 && { color: '#fff' }]} numberOfLines={3}>{f.q}</Text>
                  <View style={s.askCardFooter}>
                    <Text style={[s.askCardCta, i === 0 && { color: '#BAE6FD' }]}>Ask</Text>
                    <ArrowRight size={13} weight="bold" color={i === 0 ? '#BAE6FD' : B.primaryDk} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ─── Final CTA ─── */}
        <View style={[s.bookCta, { paddingHorizontal: pad }, isLarge && { maxWidth: 1100, alignSelf: 'center', width: '100%' }]}>
          <Text style={s.bookCtaTitle}>All clear? Time for a real clean.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PhoneInput')} style={s.bookBtn} activeOpacity={0.85}>
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
  root: { flex: 1, backgroundColor: B.surfaceAlt },

  // Hero
  hero: { paddingBottom: 56, overflow: 'hidden' },
  heroInner: { width: '100%' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroLogo: { width: 24, height: 24 },
  heroBrandText: { color: '#fff', fontWeight: '800', letterSpacing: 2.2, fontSize: 12 },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  resetText: { color: '#fff', fontWeight: '700', fontSize: 12, letterSpacing: 0.5 },

  heroBody: { flexDirection: 'column', alignItems: 'flex-start' },
  heroBodyLg: { flexDirection: 'row', alignItems: 'center' },
  heroAvatarWrap: { marginBottom: 4 },
  eyebrow: { color: '#BAE6FD', fontSize: 11, fontWeight: '800', letterSpacing: 2.5, marginBottom: 8 },
  heroTitle:   { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -1, lineHeight: 36, marginBottom: 14 },
  heroTitleLg: { fontSize: 48, lineHeight: 54, letterSpacing: -2 },
  heroSub: { color: 'rgba(255,255,255,0.82)', fontSize: 14, lineHeight: 22, maxWidth: 540, marginBottom: 4 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    alignSelf: 'flex-start', marginTop: 22,
  },
  statusBadgeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: B.leaf },
  statusBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },

  // Controls
  controls: { paddingTop: 28, paddingBottom: 8, gap: 14 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 14, height: 48,
    borderWidth: 1, borderColor: B.line,
    ...Platform.select({
      default: { boxShadow: '0 8px 18px rgba(15,23,42,0.05)' } as any,
      ios:     { shadowColor: 'rgba(15,23,42,0.06)', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 18 },
      android: { elevation: 2 },
    }),
  },
  searchInput: { flex: 1, fontSize: 14, color: B.ink, ...Platform.select({ default: { outlineStyle: 'none' as any }, ios: {}, android: {} }) },
  searchClear: { color: B.muted, fontSize: 22, fontWeight: '600', paddingHorizontal: 6, lineHeight: 22 },

  chipsTrack: {
    // Web RNW maps ScrollView to a div - force native horizontal scroll behaviour.
    ...Platform.select({
      default: { overflowX: 'scroll' as any, overflowY: 'hidden' as any, scrollbarWidth: 'none' as any } as any,
      ios: {}, android: {},
    }),
  },
  chipsRow: { gap: 8, paddingVertical: 4, paddingRight: 16, flexWrap: 'nowrap' as any },
  chip: {
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999,
    backgroundColor: '#fff', borderWidth: 1, borderColor: B.line,
    marginRight: 6, flexShrink: 0,
    ...(Platform.OS === 'web' ? { whiteSpace: 'nowrap' as any } : {}),
  },
  chipActive: { backgroundColor: B.ink, borderColor: B.ink },
  chipText: { color: B.inkSoft, fontSize: 12.5, fontWeight: '700' },
  chipTextActive: { color: '#fff' },

  // Conversation thread
  threadWrap: { paddingTop: 22, paddingBottom: 12 },
  thread: { paddingBottom: 4 },

  followup: {
    backgroundColor: B.aqua, borderRadius: 14,
    padding: 14, marginTop: 8,
    flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    borderWidth: 1, borderColor: 'rgba(2,132,199,0.12)',
  },
  followupText: { flex: 1, fontSize: 13, color: B.primaryDkr, fontWeight: '600', lineHeight: 18, minWidth: 200 },
  followupBtns: { flexDirection: 'row', gap: 6 },
  followupBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10,
    borderWidth: 1, borderColor: B.line,
  },
  followupBtnText: { color: B.primaryDk, fontWeight: '800', fontSize: 12 },

  // Suggestion deck
  deckWrap: { paddingTop: 24, paddingBottom: 24 },
  deckHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  deckLabel: { color: B.primaryDk, fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  deckCount: { color: B.muted, fontSize: 11, fontWeight: '700' },

  deck:   { gap: 10 },
  deckLg: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  askCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: B.line,
  },
  askCardLg: { width: 'calc(50% - 6px)' as any, minHeight: 160 },
  askCardFeatured: {
    backgroundColor: B.primaryDk,
    borderColor: B.primaryDk,
    ...Platform.select({
      default: { boxShadow: '0 14px 30px rgba(2,132,199,0.32)' } as any,
      ios:     { shadowColor: 'rgba(2,132,199,0.4)', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 1, shadowRadius: 30 },
      android: { elevation: 4 },
    }),
  },
  askCardCat: { alignSelf: 'flex-start', marginBottom: 8 },
  askCardCatText: { fontSize: 9, fontWeight: '800', color: B.primaryDk, letterSpacing: 1.4, textTransform: 'uppercase' },
  askCardQ: { fontSize: 14, fontWeight: '700', color: B.ink, lineHeight: 20, marginBottom: 12 },
  askCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 'auto' },
  askCardCta: { fontSize: 12, fontWeight: '800', color: B.primaryDk, letterSpacing: 0.6, textTransform: 'uppercase' },

  deckEmpty: {
    backgroundColor: '#fff', borderRadius: 16, padding: 28,
    borderWidth: 1, borderColor: B.line, alignItems: 'center',
  },
  deckEmptyTitle: { fontSize: 16, fontWeight: '800', color: B.ink, marginBottom: 6 },
  deckEmptyBody:  { fontSize: 13, color: B.muted, textAlign: 'center', maxWidth: 320 },

  // Book CTA
  bookCta: { alignItems: 'center', paddingVertical: 18 },
  bookCtaTitle: { fontSize: 16, color: B.muted, marginBottom: 14, textAlign: 'center' },
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

export default FaqScreen;
