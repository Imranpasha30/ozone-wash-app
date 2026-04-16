import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  Platform, Image, ScrollView, Animated,
  NativeSyntheticEvent, NativeScrollEvent, useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../utils/constants';
import { useResponsive } from '../../utils/responsive';
import {
  ArrowRight, Phone, Users, Flask, Certificate,
  Leaf, ShieldCheck, Lightning, Star, Lock,
  MapPin, CheckCircle, Drop, Buildings, Wrench,
} from '../../components/Icons';

/* ─── data ──────────────────────────────────────────────────────── */
const HOW_IT_WORKS = [
  { icon: Phone,       num: '01', title: 'Book in 60 Seconds',  desc: 'Choose tank type, size, date & preferred time slot' },
  { icon: Users,       num: '02', title: 'Expert Team Arrives', desc: 'Certified OzoneWash agents at your doorstep' },
  { icon: Flask,       num: '03', title: '8-Step Ozone Clean',  desc: 'Deep hygiene treatment powered by ozone technology' },
  { icon: Certificate, num: '04', title: 'Get Certified',       desc: 'Digital hygiene certificate with QR verification' },
];
const FEATURES = [
  { icon: Leaf,        title: 'Eco-Friendly',     desc: 'Chemical-free ozone-powered cleaning technology' },
  { icon: ShieldCheck, title: 'Certified Hygiene', desc: 'Digital certificates with QR verification' },
  { icon: Lightning,   title: 'Fast & Reliable',  desc: 'Professional service in under 2 hours' },
  { icon: Star,        title: 'EcoScore Rating',  desc: "Track your tank's hygiene score over time" },
];
const STATS = [
  { value: '500+',   label: 'Tanks Cleaned' },
  { value: '4.9',    label: 'Customer Rating' },
  { value: '100+',   label: 'Happy Families' },
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
 *  useScrollReveal — receives screenH so it's correct on web too
 * ═══════════════════════════════════════════════════════════════════ */
type AnimType = 'fadeUp' | 'slideLeft' | 'zoom';

const useScrollReveal = (
  scrollContentRef: React.RefObject<View | null>,
  screenH: number,
  type: AnimType = 'fadeUp',
  staggerDelay: number = 0,
) => {
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(type === 'fadeUp'    ? 40  : 0)).current;
  const translateX = useRef(new Animated.Value(type === 'slideLeft' ? -40 : 0)).current;
  const scale      = useRef(new Animated.Value(type === 'zoom'      ? 0.6 : 1)).current;

  const viewRef      = useRef<any>(null);
  const posY         = useRef(-1);
  const isVisible    = useRef(false);
  const staggerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const measureSelf = useCallback(() => {
    if (!viewRef.current || !scrollContentRef.current) return;
    viewRef.current.measureLayout(
      scrollContentRef.current,
      (_x: number, y: number) => { posY.current = y; },
      () => {},
    );
  }, [scrollContentRef]);

  const checkVisibility = useCallback((scrollOffset: number) => {
    if (posY.current < 0) return;
    const viewBottom = scrollOffset + screenH;
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
  }, [type, staggerDelay, opacity, translateY, translateX, scale, screenH]);

  const animStyle =
    type === 'fadeUp'    ? { opacity, transform: [{ translateY }] } :
    type === 'slideLeft' ? { opacity, transform: [{ translateX }] } :
                           { opacity, transform: [{ scale }] };

  return { viewRef, animStyle, measureSelf, checkVisibility };
};

/* ─── component ─────────────────────────────────────────────────── */
const LandingScreen = () => {
  const navigation  = useNavigation<any>();
  const insets      = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const { isLarge, isXL, contentWidth } = useResponsive();

  const scrollContentRef = useRef<View>(null);
  const scrollYRef       = useRef(0);

  // ── Hero animation ───────────────────────────────────────────────
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
  const R = (type: AnimType, delay: number) =>
    useScrollReveal(scrollContentRef, screenH, type, delay); // eslint-disable-line react-hooks/rules-of-hooks

  const howTitle  = R('fadeUp',    0);
  const how0      = R('slideLeft', 0);
  const how1      = R('slideLeft', 120);
  const how2      = R('slideLeft', 240);
  const how3      = R('slideLeft', 360);
  const howAnims  = [how0, how1, how2, how3];

  const featTitle = R('fadeUp', 0);
  const feat0     = R('fadeUp', 0);
  const feat1     = R('fadeUp', 100);
  const feat2     = R('fadeUp', 200);
  const feat3     = R('fadeUp', 300);
  const featAnims = [feat0, feat1, feat2, feat3];

  const stat0     = R('zoom', 0);
  const stat1     = R('zoom', 120);
  const stat2     = R('zoom', 240);
  const stat3     = R('zoom', 360);
  const statAnims = [stat0, stat1, stat2, stat3];

  const svcTitle  = R('fadeUp', 0);
  const svc0      = R('fadeUp', 0);
  const svc1      = R('fadeUp', 120);
  const svc2      = R('fadeUp', 240);
  const svcAnims  = [svc0, svc1, svc2];

  const trustTitle  = R('fadeUp', 0);
  const trust0      = R('fadeUp', 0);
  const trust1      = R('fadeUp', 80);
  const trust2      = R('fadeUp', 160);
  const trust3      = R('fadeUp', 240);
  const trustAnims  = [trust0, trust1, trust2, trust3];

  const footerAnim  = R('fadeUp', 0);

  const allRevealsRef = useRef<Array<ReturnType<typeof useScrollReveal>>>([]);
  allRevealsRef.current = [
    howTitle, ...howAnims,
    featTitle, ...featAnims,
    ...statAnims,
    svcTitle, ...svcAnims,
    trustTitle, ...trustAnims,
    footerAnim,
  ];

  const measureAll = useCallback(() => {
    setTimeout(() => { allRevealsRef.current.forEach(r => r.measureSelf()); }, 80);
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.y;
    scrollYRef.current = offset;
    allRevealsRef.current.forEach(r => r.checkVisibility(offset));
  }, []);

  const goToLogin = () => navigation.navigate('PhoneInput');

  // Dynamic widths for grids
  const sectionPad   = isLarge ? 40 : 20;
  const innerWidth   = isLarge ? Math.min(contentWidth, 1100) : undefined;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: isLarge ? 80 : 160 }}
      >
        <View ref={scrollContentRef} collapsable={false} onLayout={measureAll}>

          {/* ══ A. HERO ═══════════════════════════════════════════ */}
          <LinearGradient
            colors={['#2563EB', '#1D4ED8', '#1E40AF']}
            style={[s.hero, { paddingTop: insets.top + (isLarge ? 56 : 32) }]}
          >
            <View style={[s.heroContent, isLarge && s.heroContentLarge]}>
              {/* Left: brand + tagline */}
              <Animated.View
                style={[
                  s.heroLeft,
                  isLarge && s.heroLeftLarge,
                  { opacity: heroOpacity, transform: [{ translateY: heroTranslateY }] },
                ]}
              >
                <View style={[s.logoCircle, isLarge && s.logoCircleLarge]}>
                  <Image
                    source={require('../../../assets/logo.png')}
                    style={[s.logoImg, isLarge && s.logoImgLarge]}
                    resizeMode="contain"
                  />
                </View>
                <Text style={[s.brand, isLarge && s.brandLarge]}>OZONE WASH</Text>
                <View style={s.taglineBadge}>
                  <Text style={s.taglineBadgeText}>TANK HYGIENE SERVICES</Text>
                </View>
                <Text style={[s.tagline, isLarge && s.taglineLarge]}>
                  Hyderabad's First App-Enabled{'\n'}Tank Hygiene Service
                </Text>
                <View style={[s.heroPills, isLarge && { marginTop: 24 }]}>
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
                {/* Desktop inline CTA */}
                {isLarge && (
                  <TouchableOpacity style={s.heroCtaBtn} onPress={goToLogin} activeOpacity={0.85}>
                    <Text style={s.heroCtaBtnText}>Get Started Free</Text>
                    <ArrowRight size={20} weight="bold" color="#fff" />
                  </TouchableOpacity>
                )}
              </Animated.View>

              {/* Right: stats (desktop only) */}
              {isLarge && (
                <Animated.View
                  style={[s.heroRight, { opacity: heroOpacity, transform: [{ translateY: heroTranslateY }] }]}
                >
                  <View style={s.heroStatsGrid}>
                    {STATS.map((st, i) => (
                      <View key={i} style={s.heroStatCard}>
                        <Text style={s.heroStatValue}>{st.value}</Text>
                        <Text style={s.heroStatLabel}>{st.label}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={s.heroTrustRow}>
                    {TRUST.slice(0, 3).map((t, i) => {
                      const Icon = t.icon;
                      return (
                        <View key={i} style={s.heroTrustPill}>
                          <Icon size={13} color="rgba(255,255,255,0.9)" weight="fill" />
                          <Text style={s.heroTrustText}>{t.label}</Text>
                        </View>
                      );
                    })}
                  </View>
                </Animated.View>
              )}
            </View>
          </LinearGradient>

          <View style={s.curveOverlay} />

          {/* Centered content wrapper for large screens */}
          <View style={isLarge ? [s.centerWrap, { maxWidth: innerWidth, alignSelf: 'center', width: '100%' }] : undefined}>

            {/* ══ B. HOW IT WORKS ═══════════════════════════════════ */}
            <View style={[s.section, { paddingHorizontal: sectionPad }]}>
              <Animated.View ref={howTitle.viewRef} style={howTitle.animStyle}>
                <Text style={s.sectionLabel}>THE PROCESS</Text>
                <Text style={s.sectionTitle}>How It Works</Text>
              </Animated.View>

              <View style={[s.timeline, isLarge && s.timelineGrid]}>
                {HOW_IT_WORKS.map((item, i) => {
                  const Icon = item.icon;
                  const anim = howAnims[i];
                  if (isLarge) {
                    // Desktop: 2×2 card grid, no connector lines
                    return (
                      <Animated.View key={i} ref={anim.viewRef} style={[s.howCard, anim.animStyle]}>
                        <View style={s.howCardDot}>
                          <Text style={s.timelineNum}>{item.num}</Text>
                        </View>
                        <View style={s.timelineIconWrap}>
                          <Icon size={22} color={COLORS.primary} weight="duotone" />
                        </View>
                        <Text style={s.timelineTitle}>{item.title}</Text>
                        <Text style={s.timelineDesc}>{item.desc}</Text>
                      </Animated.View>
                    );
                  }
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

            {/* ══ C. FEATURES ═══════════════════════════════════════ */}
            <View style={[s.section, { backgroundColor: COLORS.surfaceElevated, paddingHorizontal: sectionPad }]}>
              <Animated.View ref={featTitle.viewRef} style={featTitle.animStyle}>
                <Text style={s.sectionLabel}>WHY CHOOSE US</Text>
                <Text style={s.sectionTitle}>Why Ozone Wash?</Text>
              </Animated.View>

              <View style={[s.featureGrid, isLarge && s.featureGridLarge]}>
                {FEATURES.map((item, i) => {
                  const Icon = item.icon;
                  const anim = featAnims[i];
                  return (
                    <Animated.View
                      key={i}
                      ref={anim.viewRef}
                      style={[
                        s.featureCard,
                        isLarge ? s.featureCardLarge : s.featureCardMobile,
                        anim.animStyle,
                      ]}
                    >
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

            {/* ══ D. STATS ══════════════════════════════════════════ */}
            {/* On desktop the stats are shown in the hero; show them here only on mobile */}
            {!isLarge && (
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
            )}

            {/* Desktop stats bar (wider, styled differently) */}
            {isLarge && (
              <LinearGradient colors={['#2563EB', '#1D4ED8']} style={[s.statsStrip, s.statsStripLarge]}>
                {STATS.map((item, i) => {
                  const anim = statAnims[i];
                  return (
                    <Animated.View key={i} ref={anim.viewRef} style={[s.statItem, anim.animStyle]}>
                      <Text style={[s.statValue, { fontSize: 32 }]}>{item.value}</Text>
                      <Text style={s.statLabel}>{item.label}</Text>
                    </Animated.View>
                  );
                })}
              </LinearGradient>
            )}

            {/* ══ E. SERVICES ═══════════════════════════════════════ */}
            <View style={[s.section, { paddingHorizontal: sectionPad }]}>
              <Animated.View ref={svcTitle.viewRef} style={svcTitle.animStyle}>
                <Text style={s.sectionLabel}>OUR SERVICES</Text>
                <Text style={s.sectionTitle}>Tank Types We Clean</Text>
              </Animated.View>

              <View style={[s.serviceRow, isLarge && s.serviceRowLarge]}>
                {SERVICES.map((item, i) => {
                  const Icon = item.icon;
                  const anim = svcAnims[i];
                  return (
                    <Animated.View key={i} ref={anim.viewRef} style={[s.serviceCard, isLarge && s.serviceCardLarge, anim.animStyle]}>
                      <View style={[s.serviceIconWrap, isLarge && s.serviceIconWrapLarge]}>
                        <Icon size={isLarge ? 36 : 28} color={COLORS.primary} weight="duotone" />
                      </View>
                      <Text style={[s.serviceName, isLarge && { fontSize: 16 }]}>{item.name}</Text>
                      <Text style={[s.servicePrice, isLarge && { fontSize: 15 }]}>{item.price}</Text>
                      {isLarge && (
                        <TouchableOpacity style={s.serviceBookBtn} onPress={goToLogin} activeOpacity={0.8}>
                          <Text style={s.serviceBookText}>Book Now</Text>
                          <ArrowRight size={14} weight="bold" color={COLORS.primary} />
                        </TouchableOpacity>
                      )}
                    </Animated.View>
                  );
                })}
              </View>
            </View>

            {/* ══ F. TRUST BADGES ═══════════════════════════════════ */}
            <View style={[s.section, { backgroundColor: COLORS.surfaceElevated, paddingHorizontal: sectionPad }]}>
              <Animated.View ref={trustTitle.viewRef} style={trustTitle.animStyle}>
                <Text style={s.sectionLabel}>TRUST & SAFETY</Text>
                <Text style={s.sectionTitle}>You're in Safe Hands</Text>
              </Animated.View>

              <View style={[s.trustGrid, isLarge && s.trustGridLarge]}>
                {TRUST.map((item, i) => {
                  const Icon = item.icon;
                  const anim = trustAnims[i];
                  return (
                    <Animated.View
                      key={i}
                      ref={anim.viewRef}
                      style={[s.trustBadge, isLarge && s.trustBadgeLarge, anim.animStyle]}
                    >
                      <View style={[s.trustIconWrap, isLarge && s.trustIconWrapLarge]}>
                        <Icon size={isLarge ? 24 : 20} color={COLORS.primary} weight="fill" />
                      </View>
                      <Text style={[s.trustLabel, isLarge && { fontSize: 14 }]}>{item.label}</Text>
                    </Animated.View>
                  );
                })}
              </View>
            </View>

            {/* ══ G. FOOTER ═════════════════════════════════════════ */}
            <Animated.View
              ref={footerAnim.viewRef}
              style={[s.footer, isLarge && s.footerLarge, footerAnim.animStyle]}
            >
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

          </View>{/* end centerWrap */}
        </View>{/* end scrollContentRef */}
      </ScrollView>

      {/* ═══ H. Fixed CTA — mobile only ═══════════════════════════ */}
      {!isLarge && (
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
      )}

      {/* Desktop sticky bottom bar */}
      {isLarge && (
        <View style={s.desktopBar}>
          <Text style={s.desktopBarText}>
            Ready to get your tank cleaned?
          </Text>
          <TouchableOpacity style={s.desktopBarBtn} onPress={goToLogin} activeOpacity={0.85}>
            <Text style={s.desktopBarBtnText}>Book a Service</Text>
            <ArrowRight size={18} weight="bold" color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToLogin}>
            <Text style={s.desktopBarLogin}>Already a user? <Text style={{ fontWeight: '700' }}>Login</Text></Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

/* ─── styles ────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  centerWrap: { paddingHorizontal: 0 },

  // ── Hero ────────────────────────────────────────────────────────
  hero: { overflow: 'visible', paddingBottom: 48 },
  heroContent: { alignItems: 'center', paddingHorizontal: 24 },
  heroContentLarge: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    maxWidth: 1100, alignSelf: 'center', width: '100%',
    paddingHorizontal: 40, paddingBottom: 16,
  },
  heroLeft: { alignItems: 'center' },
  heroLeftLarge: { alignItems: 'flex-start', flex: 1, paddingRight: 40 },
  heroRight: { flex: 1, alignItems: 'flex-start' },

  logoCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    ...Platform.select({
      ios:     { shadowColor: 'rgba(0,0,0,0.15)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  logoCircleLarge: { width: 112, height: 112, borderRadius: 56, marginBottom: 24 },
  logoImg: { width: 68, height: 68, borderRadius: 34 },
  logoImgLarge: { width: 80, height: 80, borderRadius: 40 },

  brand: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: 5, marginBottom: 10 },
  brandLarge: { fontSize: 40, letterSpacing: 6, marginBottom: 12 },

  taglineBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, marginBottom: 16,
  },
  taglineBadgeText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.9)', letterSpacing: 2 },

  tagline: { fontSize: 18, fontWeight: '600', color: 'rgba(255,255,255,0.95)', textAlign: 'center', lineHeight: 26, marginBottom: 4 },
  taglineLarge: { fontSize: 22, lineHeight: 32, textAlign: 'left' },

  heroPills: { flexDirection: 'row', marginTop: 20, gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
  },
  heroPillText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },

  heroCtaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)',
    borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14,
    marginTop: 28,
  },
  heroCtaBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Hero right side — desktop stats
  heroStatsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 20,
  },
  heroStatCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16, padding: 20,
    alignItems: 'center', minWidth: 130,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    flex: 1,
  },
  heroStatValue: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
  heroStatLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  heroTrustRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  heroTrustPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
  },
  heroTrustText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },

  curveOverlay: {
    height: 28, backgroundColor: COLORS.background,
    borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28,
  },

  // ── Sections ────────────────────────────────────────────────────
  section: { paddingVertical: 40 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.primary, letterSpacing: 2, marginBottom: 6 },
  sectionTitle: { fontSize: 24, fontWeight: '800', color: COLORS.foreground, marginBottom: 24 },

  // ── How It Works ─────────────────────────────────────────────────
  timeline: { marginTop: 4 },
  timelineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 8 },
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

  // Desktop How It Works card
  howCard: {
    flex: 1, minWidth: 220,
    backgroundColor: COLORS.surface, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: COLORS.border,
    ...Platform.select({
      ios:     { shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  howCardDot: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },

  // ── Features ─────────────────────────────────────────────────────
  featureGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureGridLarge:  { gap: 16 },
  featureCard:       {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 20,
    ...Platform.select({
      ios:     { shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  featureCardMobile: { width: '48%' },
  featureCardLarge:  { flex: 1, minWidth: 200, padding: 28 },
  featureIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: COLORS.primaryBg, justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  featureTitle: { fontSize: 15, fontWeight: '700', color: COLORS.foreground, marginBottom: 4 },
  featureDesc:  { fontSize: 13, color: COLORS.muted, lineHeight: 18 },

  // ── Stats ────────────────────────────────────────────────────────
  statsStrip:      { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 28, paddingHorizontal: 8 },
  statsStripLarge: { paddingVertical: 40, paddingHorizontal: 40 },
  statItem:   { alignItems: 'center', flex: 1 },
  statValue:  { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  statLabel:  { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.5, textAlign: 'center' },

  // ── Services ─────────────────────────────────────────────────────
  serviceRow:      { flexDirection: 'row', gap: 10 },
  serviceRowLarge: { gap: 20 },
  serviceCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 16,
    paddingVertical: 20, paddingHorizontal: 12, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  serviceCardLarge: { paddingVertical: 32, paddingHorizontal: 24, borderRadius: 20 },
  serviceIconWrap: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: COLORS.primaryBg, justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  serviceIconWrapLarge: { width: 72, height: 72, borderRadius: 36, marginBottom: 16 },
  serviceName:    { fontSize: 13, fontWeight: '700', color: COLORS.foreground, textAlign: 'center', marginBottom: 4 },
  servicePrice:   { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  serviceBookBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 14, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: COLORS.primaryBg, borderRadius: 10,
  },
  serviceBookText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },

  // ── Trust ────────────────────────────────────────────────────────
  trustGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  trustGridLarge: { gap: 16, flexWrap: 'nowrap' },
  trustBadge: {
    width: '48%',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surface, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  trustBadgeLarge: {
    flex: 1, width: undefined,
    paddingVertical: 20, paddingHorizontal: 20, borderRadius: 20,
    flexDirection: 'column', alignItems: 'center', gap: 10,
  },
  trustIconWrap: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primaryBg, justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  trustIconWrapLarge: { width: 48, height: 48, borderRadius: 24 },
  trustLabel: { fontSize: 13, fontWeight: '600', color: COLORS.foreground, flexShrink: 1 },

  // ── Footer ───────────────────────────────────────────────────────
  footer:      { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  footerLarge: { paddingVertical: 48, paddingHorizontal: 40 },
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

  // ── Mobile fixed CTA ─────────────────────────────────────────────
  ctaOuter:    { position: 'absolute', bottom: 0, left: 0, right: 0 },
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
  ctaText:      { color: COLORS.primaryFg, fontSize: 17, fontWeight: '700' },
  ctaLogin:     { textAlign: 'center', marginTop: 14, fontSize: 14, color: COLORS.muted },
  ctaLoginBold: { color: COLORS.primary, fontWeight: '700' },

  // ── Desktop sticky bar ────────────────────────────────────────────
  desktopBar: {
    position: 'fixed' as any,
    bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 40, paddingVertical: 16, gap: 20,
    zIndex: 50,
  },
  desktopBarText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.foreground },
  desktopBarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  desktopBarBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  desktopBarLogin: { fontSize: 13, color: COLORS.muted },
});

export default LandingScreen;
