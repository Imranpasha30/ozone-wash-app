import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Platform, Dimensions, Image, ScrollView, Animated,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../utils/constants';
import {
  ArrowRight, Phone, Users, Flask, Certificate,
  Leaf, ShieldCheck, Lightning, Star, Lock,
  MapPin, CheckCircle, Drop, Buildings, Wrench,
} from '../../components/Icons';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/* ─── data ──────────────────────────────────────────────────────── */
const HOW_IT_WORKS = [
  { icon: Phone, num: '01', title: 'Book in 60 Seconds', desc: 'Choose tank type, size, date & preferred time slot' },
  { icon: Users, num: '02', title: 'Expert Team Arrives', desc: 'Certified OzoneWash agents at your doorstep' },
  { icon: Flask, num: '03', title: '8-Step Ozone Clean', desc: 'Deep hygiene treatment powered by ozone technology' },
  { icon: Certificate, num: '04', title: 'Get Certified', desc: 'Digital hygiene certificate with QR verification' },
];
const FEATURES = [
  { icon: Leaf, title: 'Eco-Friendly', desc: 'Chemical-free ozone-powered cleaning technology' },
  { icon: ShieldCheck, title: 'Certified Hygiene', desc: 'Digital certificates with QR verification' },
  { icon: Lightning, title: 'Fast & Reliable', desc: 'Professional service in under 2 hours' },
  { icon: Star, title: 'EcoScore Rating', desc: "Track your tank's hygiene score over time" },
];
const STATS = [
  { value: '500+', label: 'Tanks Cleaned' },
  { value: '4.9',  label: 'Customer Rating' },
  { value: '100+', label: 'Happy Families' },
  { value: '8-Step', label: 'Certification' },
];
const SERVICES = [
  { icon: Buildings, name: 'Overhead Tank',    price: 'From ₹799' },
  { icon: Drop,      name: 'Underground Sump', price: 'From ₹999' },
  { icon: Wrench,    name: 'Syntex / Plastic', price: 'From ₹799' },
];
const TRUST = [
  { icon: ShieldCheck, label: 'Verified Pros' },
  { icon: Leaf,        label: '100% Eco-Friendly' },
  { icon: Lock,        label: 'Insured Service' },
  { icon: Certificate, label: 'ISO Process' },
];

/* ═══════════════════════════════════════════════════════════════════
 *  useScrollReveal
 *
 *  WHY measureLayout INSTEAD OF onLayout:
 *  onLayout reports Y relative to the IMMEDIATE parent, so every
 *  element inside a section View would show y ≈ 0-50 px — all pass
 *  the "in viewport" check at scroll=0 and fire simultaneously.
 *
 *  measureLayout(scrollContentRef) returns the element's Y relative
 *  to the scroll content root, which IS the scroll offset coordinate
 *  space. That's the only way to get true absolute scroll position.
 * ═══════════════════════════════════════════════════════════════════ */
type AnimType = 'fadeUp' | 'slideLeft' | 'zoom';

const useScrollReveal = (
  scrollContentRef: React.RefObject<View | null>,
  type: AnimType = 'fadeUp',
  staggerDelay: number = 0,
) => {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(type === 'fadeUp'    ? 40  : 0)).current;
  const translateX = useRef(new Animated.Value(type === 'slideLeft' ? -40 : 0)).current;
  const scale      = useRef(new Animated.Value(type === 'zoom'      ? 0.6 : 1)).current;

  const viewRef      = useRef<any>(null);
  const posY         = useRef(-1);           // -1 = not measured yet
  const isVisible    = useRef(false);
  const staggerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Call after layout is complete to record true scroll-space Y
  const measureSelf = useCallback(() => {
    if (!viewRef.current || !scrollContentRef.current) return;
    viewRef.current.measureLayout(
      scrollContentRef.current,
      (_x: number, y: number) => { posY.current = y; },
      () => {},
    );
  }, [scrollContentRef]);

  const checkVisibility = useCallback((scrollOffset: number) => {
    if (posY.current < 0) return; // not measured yet

    const viewBottom = scrollOffset + SCREEN_H;
    // Element enters: its top is below the current scroll top (minus 200px grace)
    // and above the bottom of the viewport (minus 80px so it starts animating
    // slightly before it's fully visible)
    const inView =
      posY.current < viewBottom - 80 &&
      posY.current > scrollOffset - 200;

    if (inView && !isVisible.current) {
      isVisible.current = true;
      if (staggerTimer.current) clearTimeout(staggerTimer.current);
      staggerTimer.current = setTimeout(() => {
        const anims: Animated.CompositeAnimation[] = [
          Animated.timing(opacity, { toValue: 1, duration: 420, useNativeDriver: true }),
        ];
        if (type === 'fadeUp') {
          anims.push(Animated.spring(translateY, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }));
        } else if (type === 'slideLeft') {
          anims.push(Animated.spring(translateX, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }));
        } else {
          anims.push(Animated.spring(scale, { toValue: 1, friction: 6, tension: 75, useNativeDriver: true }));
        }
        Animated.parallel(anims).start();
      }, staggerDelay);

    } else if (!inView && isVisible.current) {
      isVisible.current = false;
      if (staggerTimer.current) clearTimeout(staggerTimer.current);
      // Snappy reverse
      const out: Animated.CompositeAnimation[] = [
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ];
      if (type === 'fadeUp') {
        out.push(Animated.timing(translateY, { toValue: 40, duration: 220, useNativeDriver: true }));
      } else if (type === 'slideLeft') {
        out.push(Animated.timing(translateX, { toValue: -40, duration: 220, useNativeDriver: true }));
      } else {
        out.push(Animated.timing(scale, { toValue: 0.6, duration: 220, useNativeDriver: true }));
      }
      Animated.parallel(out).start();
    }
  }, [type, staggerDelay, opacity, translateY, translateX, scale]);

  const animStyle =
    type === 'fadeUp'    ? { opacity, transform: [{ translateY }] } :
    type === 'slideLeft' ? { opacity, transform: [{ translateX }] } :
                           { opacity, transform: [{ scale }] };

  return { viewRef, animStyle, measureSelf, checkVisibility };
};

/* ─── component ─────────────────────────────────────────────────── */
const LandingScreen = () => {
  const navigation = useNavigation<any>();
  const insets     = useSafeAreaInsets();

  // Ref to the scroll content root — all measureLayout calls use this
  const scrollContentRef = useRef<View>(null);
  const scrollYRef       = useRef(0);

  // ── Hero: simple mount animation (always visible first) ──────────
  const heroOpacity    = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(30)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(heroOpacity,    { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(heroTranslateY, { toValue: 0, friction: 8,   useNativeDriver: true }),
      ]).start();
    }, 200);
    return () => clearTimeout(t);
  }, []);

  // ── Scroll-triggered hooks ────────────────────────────────────────
  const howTitle = useScrollReveal(scrollContentRef, 'fadeUp', 0);
  const how0     = useScrollReveal(scrollContentRef, 'slideLeft', 0);
  const how1     = useScrollReveal(scrollContentRef, 'slideLeft', 120);
  const how2     = useScrollReveal(scrollContentRef, 'slideLeft', 240);
  const how3     = useScrollReveal(scrollContentRef, 'slideLeft', 360);
  const howAnims = [how0, how1, how2, how3];

  const featTitle = useScrollReveal(scrollContentRef, 'fadeUp', 0);
  const feat0     = useScrollReveal(scrollContentRef, 'fadeUp', 0);
  const feat1     = useScrollReveal(scrollContentRef, 'fadeUp', 100);
  const feat2     = useScrollReveal(scrollContentRef, 'fadeUp', 200);
  const feat3     = useScrollReveal(scrollContentRef, 'fadeUp', 300);
  const featAnims = [feat0, feat1, feat2, feat3];

  const stat0     = useScrollReveal(scrollContentRef, 'zoom', 0);
  const stat1     = useScrollReveal(scrollContentRef, 'zoom', 120);
  const stat2     = useScrollReveal(scrollContentRef, 'zoom', 240);
  const stat3     = useScrollReveal(scrollContentRef, 'zoom', 360);
  const statAnims = [stat0, stat1, stat2, stat3];

  const svcTitle = useScrollReveal(scrollContentRef, 'fadeUp', 0);
  const svc0     = useScrollReveal(scrollContentRef, 'fadeUp', 0);
  const svc1     = useScrollReveal(scrollContentRef, 'fadeUp', 120);
  const svc2     = useScrollReveal(scrollContentRef, 'fadeUp', 240);
  const svcAnims = [svc0, svc1, svc2];

  const trustTitle = useScrollReveal(scrollContentRef, 'fadeUp', 0);
  const trust0     = useScrollReveal(scrollContentRef, 'fadeUp', 0);
  const trust1     = useScrollReveal(scrollContentRef, 'fadeUp', 80);
  const trust2     = useScrollReveal(scrollContentRef, 'fadeUp', 160);
  const trust3     = useScrollReveal(scrollContentRef, 'fadeUp', 240);
  const trustAnims = [trust0, trust1, trust2, trust3];

  const footerAnim = useScrollReveal(scrollContentRef, 'fadeUp', 0);

  // Stable ref holding all reveals — updated every render but
  // handleScroll reads it via ref so it never needs to be recreated
  const allRevealsRef = useRef<Array<ReturnType<typeof useScrollReveal>>>([]);
  allRevealsRef.current = [
    howTitle, ...howAnims,
    featTitle, ...featAnims,
    ...statAnims,
    svcTitle, ...svcAnims,
    trustTitle, ...trustAnims,
    footerAnim,
  ];

  // Called once the scroll content has laid out — measures all elements
  const measureAll = useCallback(() => {
    // Small delay so measureLayout finds valid native nodes
    setTimeout(() => {
      allRevealsRef.current.forEach(r => r.measureSelf());
    }, 80);
  }, []);

  // Stable scroll handler — reads from refs, never recreated
  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.y;
    scrollYRef.current = offset;
    allRevealsRef.current.forEach(r => r.checkVisibility(offset));
  }, []);

  const goToLogin = () => navigation.navigate('PhoneInput');

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        {/*
         * collapsable={false} is REQUIRED — without it Android may
         * collapse this View into its parent and measureLayout fails
         */}
        <View ref={scrollContentRef} collapsable={false} onLayout={measureAll}>

          {/* ── A. Hero ─────────────────────────────────────────── */}
          <LinearGradient
            colors={['#2563EB', '#1D4ED8', '#1E40AF']}
            style={[s.hero, { paddingTop: insets.top + 32 }]}
          >
            <Animated.View
              style={[s.heroInner, { opacity: heroOpacity, transform: [{ translateY: heroTranslateY }] }]}
            >
              <View style={s.logoCircle}>
                <Image
                  source={require('../../../assets/logo.png')}
                  style={s.logoImg}
                  resizeMode="contain"
                />
              </View>
              <Text style={s.brand}>OZONE WASH</Text>
              <View style={s.taglineBadge}>
                <Text style={s.taglineBadgeText}>TANK HYGIENE SERVICES</Text>
              </View>
              <Text style={s.tagline}>
                Hyderabad's First App-Enabled{'\n'}Tank Hygiene Service
              </Text>
              <View style={s.heroPills}>
                <View style={s.heroPill}>
                  <CheckCircle size={14} color="#fff" weight="fill" />
                  <Text style={s.heroPillText}>Certified</Text>
                </View>
                <View style={s.heroPill}>
                  <Leaf size={14} color="#fff" weight="fill" />
                  <Text style={s.heroPillText}>Eco-Friendly</Text>
                </View>
                <View style={s.heroPill}>
                  <Star size={14} color="#fff" weight="fill" />
                  <Text style={s.heroPillText}>4.9 Rated</Text>
                </View>
              </View>
            </Animated.View>
          </LinearGradient>

          <View style={s.curveOverlay} />

          {/* ── B. How It Works ──────────────────────────────────── */}
          <View style={s.section}>
            <Animated.View ref={howTitle.viewRef} style={howTitle.animStyle}>
              <Text style={s.sectionLabel}>THE PROCESS</Text>
              <Text style={s.sectionTitle}>How It Works</Text>
            </Animated.View>

            <View style={s.timeline}>
              {HOW_IT_WORKS.map((item, i) => {
                const Icon = item.icon;
                const anim = howAnims[i];
                return (
                  <Animated.View key={i} ref={anim.viewRef} style={[s.timelineRow, anim.animStyle]}>
                    <View style={s.timelineLeft}>
                      <View style={s.timelineDot}>
                        <Text style={s.timelineNum}>{item.num}</Text>
                      </View>
                      {i < HOW_IT_WORKS.length - 1 && <View style={s.timelineLine} />}
                    </View>
                    <View style={s.timelineCard}>
                      <View style={s.timelineIconWrap}>
                        <Icon size={22} color={COLORS.primary} weight="duotone" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.timelineTitle}>{item.title}</Text>
                        <Text style={s.timelineDesc}>{item.desc}</Text>
                      </View>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          </View>

          {/* ── C. Features ──────────────────────────────────────── */}
          <View style={[s.section, { backgroundColor: COLORS.surfaceElevated }]}>
            <Animated.View ref={featTitle.viewRef} style={featTitle.animStyle}>
              <Text style={s.sectionLabel}>WHY CHOOSE US</Text>
              <Text style={s.sectionTitle}>Why Ozone Wash?</Text>
            </Animated.View>

            <View style={s.featureGrid}>
              {FEATURES.map((item, i) => {
                const Icon = item.icon;
                const anim = featAnims[i];
                return (
                  <Animated.View key={i} ref={anim.viewRef} style={[s.featureCard, anim.animStyle]}>
                    <View style={s.featureIconWrap}>
                      <Icon size={26} color={COLORS.primary} weight="duotone" />
                    </View>
                    <Text style={s.featureTitle}>{item.title}</Text>
                    <Text style={s.featureDesc}>{item.desc}</Text>
                  </Animated.View>
                );
              })}
            </View>
          </View>

          {/* ── D. Stats ─────────────────────────────────────────── */}
          <LinearGradient colors={['#2563EB', '#1D4ED8']} style={s.statsStrip}>
            {STATS.map((item, i) => {
              const anim = statAnims[i];
              return (
                <Animated.View key={i} ref={anim.viewRef} style={[s.statItem, anim.animStyle]}>
                  <Text style={s.statValue}>{item.value}</Text>
                  <Text style={s.statLabel}>{item.label}</Text>
                </Animated.View>
              );
            })}
          </LinearGradient>

          {/* ── E. Services ──────────────────────────────────────── */}
          <View style={s.section}>
            <Animated.View ref={svcTitle.viewRef} style={svcTitle.animStyle}>
              <Text style={s.sectionLabel}>OUR SERVICES</Text>
              <Text style={s.sectionTitle}>Tank Types We Clean</Text>
            </Animated.View>

            <View style={s.serviceRow}>
              {SERVICES.map((item, i) => {
                const Icon = item.icon;
                const anim = svcAnims[i];
                return (
                  <Animated.View key={i} ref={anim.viewRef} style={[s.serviceCard, anim.animStyle]}>
                    <View style={s.serviceIconWrap}>
                      <Icon size={28} color={COLORS.primary} weight="duotone" />
                    </View>
                    <Text style={s.serviceName}>{item.name}</Text>
                    <Text style={s.servicePrice}>{item.price}</Text>
                  </Animated.View>
                );
              })}
            </View>
          </View>

          {/* ── F. Trust Badges ──────────────────────────────────── */}
          <View style={[s.section, { backgroundColor: COLORS.surfaceElevated }]}>
            <Animated.View ref={trustTitle.viewRef} style={trustTitle.animStyle}>
              <Text style={s.sectionLabel}>TRUST & SAFETY</Text>
              <Text style={s.sectionTitle}>You're in Safe Hands</Text>
            </Animated.View>

            <View style={s.trustGrid}>
              {TRUST.map((item, i) => {
                const Icon = item.icon;
                const anim = trustAnims[i];
                return (
                  <Animated.View key={i} ref={anim.viewRef} style={[s.trustBadge, anim.animStyle]}>
                    <View style={s.trustIconWrap}>
                      <Icon size={20} color={COLORS.primary} weight="fill" />
                    </View>
                    <Text style={s.trustLabel}>{item.label}</Text>
                  </Animated.View>
                );
              })}
            </View>
          </View>

          {/* ── G. Footer ────────────────────────────────────────── */}
          <Animated.View ref={footerAnim.viewRef} style={[s.footer, footerAnim.animStyle]}>
            <View style={s.footerDivider} />
            <Text style={s.footerBrand}>OZONE WASH</Text>
            <Text style={s.footerCompany}>Powered by VijRam Health Sense Pvt. Ltd.</Text>
            <View style={s.footerLocRow}>
              <MapPin size={13} color={COLORS.muted} weight="fill" />
              <Text style={s.footerLoc}>Hyderabad, Telangana</Text>
            </View>
            <View style={s.footerPhoneRow}>
              <Phone size={13} color={COLORS.primary} weight="fill" />
              <Text style={s.footerPhone}>+91 98481 44854</Text>
            </View>
            {/* Policy links */}
            <View style={s.footerPolicyRow}>
              <TouchableOpacity onPress={() => navigation.navigate('Policy', { type: 'terms' })}>
                <Text style={s.footerPolicyLink}>Terms</Text>
              </TouchableOpacity>
              <Text style={s.footerPolicySep}>·</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Policy', { type: 'privacy' })}>
                <Text style={s.footerPolicyLink}>Privacy</Text>
              </TouchableOpacity>
              <Text style={s.footerPolicySep}>·</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Policy', { type: 'refund' })}>
                <Text style={s.footerPolicyLink}>Refund Policy</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

        </View>{/* end scrollContentRef wrapper */}
      </ScrollView>

      {/* ═══ H. Fixed CTA ═══ */}
      <View style={[s.ctaOuter, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.96)', '#FFFFFF']}
          style={s.ctaGradient}
        />
        <View style={s.ctaContent}>
          <TouchableOpacity style={s.ctaButton} onPress={goToLogin} activeOpacity={0.85}>
            <Text style={s.ctaText}>Get Started</Text>
            <ArrowRight size={20} weight="bold" color={COLORS.primaryFg} />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToLogin} activeOpacity={0.7}>
            <Text style={s.ctaLogin}>
              Already have an account? <Text style={s.ctaLoginBold}>Login</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

/* ─── styles ────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  hero: { alignItems: 'center', paddingBottom: 48, overflow: 'visible' },
  heroInner: { alignItems: 'center', paddingHorizontal: 24 },
  logoCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    ...Platform.select({
      ios:     { shadowColor: 'rgba(0,0,0,0.15)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  logoImg: { width: 68, height: 68, borderRadius: 34 },
  brand: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: 5, marginBottom: 10 },
  taglineBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, marginBottom: 16,
  },
  taglineBadgeText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.9)', letterSpacing: 2 },
  tagline: { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.95)', textAlign: 'center', lineHeight: 26, marginBottom: 4 },
  heroPills: { flexDirection: 'row', marginTop: 20, gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
  },
  heroPillText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },

  curveOverlay: {
    height: 28, backgroundColor: COLORS.background,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28,
  },

  section: { paddingHorizontal: 20, paddingVertical: 32 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.primary, letterSpacing: 2, marginBottom: 6 },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: COLORS.foreground, marginBottom: 24 },

  timeline: { marginTop: 4 },
  timelineRow: { flexDirection: 'row', marginBottom: 4 },
  timelineLeft: { width: 48, alignItems: 'center' },
  timelineDot: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  timelineNum: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  timelineLine: { width: 2, flex: 1, backgroundColor: COLORS.primaryDim, marginVertical: 4 },
  timelineCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 16, marginLeft: 12, marginBottom: 12, gap: 14,
    ...Platform.select({
      ios:     { shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  timelineIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.primaryBg, justifyContent: 'center', alignItems: 'center',
  },
  timelineTitle: { fontSize: 15, fontWeight: '700', color: COLORS.foreground, marginBottom: 3 },
  timelineDesc:  { fontSize: 13, color: COLORS.muted, lineHeight: 18 },

  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureCard: {
    width: (SCREEN_W - 52) / 2,
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 20,
    ...Platform.select({
      ios:     { shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  featureIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: COLORS.primaryBg, justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  featureTitle: { fontSize: 15, fontWeight: '700', color: COLORS.foreground, marginBottom: 4 },
  featureDesc:  { fontSize: 13, color: COLORS.muted, lineHeight: 18 },

  statsStrip: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 28, paddingHorizontal: 8 },
  statItem:   { alignItems: 'center', flex: 1 },
  statValue:  { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  statLabel:  { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5, textAlign: 'center' },

  serviceRow:  { flexDirection: 'row', gap: 10 },
  serviceCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 16,
    paddingVertical: 20, paddingHorizontal: 12, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  serviceIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.primaryBg, justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  serviceName:  { fontSize: 13, fontWeight: '700', color: COLORS.foreground, textAlign: 'center', marginBottom: 4 },
  servicePrice: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  // 2×2 equal grid: gap:10 between items, each item takes exactly half the row
  trustGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  trustBadge: {
    width: '48%',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  trustIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primaryBg, justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  trustLabel: { fontSize: 13, fontWeight: '600', color: COLORS.foreground, flexShrink: 1 },

  footer:        { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  footerDivider: { width: 40, height: 3, backgroundColor: COLORS.primary, borderRadius: 2, marginBottom: 20 },
  footerBrand:   { fontSize: 16, fontWeight: '800', color: COLORS.foreground, letterSpacing: 3, marginBottom: 6 },
  footerCompany: { fontSize: 13, color: COLORS.muted, marginBottom: 4 },
  footerLocRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  footerLoc:     { fontSize: 12, color: COLORS.muted },
  footerPhoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14 },
  footerPhone:   { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  footerPolicyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerPolicyLink: { fontSize: 12, color: COLORS.primary, fontWeight: '600', textDecorationLine: 'underline' },
  footerPolicySep:  { fontSize: 12, color: COLORS.muted },

  ctaOuter:   { position: 'absolute', bottom: 0, left: 0, right: 0 },
  ctaGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  ctaContent:  { paddingHorizontal: 20, paddingTop: 20 },
  ctaButton: {
    backgroundColor: COLORS.primary, borderRadius: 16, height: 56,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    ...Platform.select({
      ios:     { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  ctaText:       { color: COLORS.primaryFg, fontSize: 17, fontWeight: '700' },
  ctaLogin:      { textAlign: 'center', marginTop: 14, fontSize: 14, color: COLORS.muted },
  ctaLoginBold:  { color: COLORS.primary, fontWeight: '700' },
});

export default LandingScreen;
