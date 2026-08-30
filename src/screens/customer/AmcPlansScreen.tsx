import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import useBookingStore from '../../store/booking.store';
import { amcAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import { useResponsive } from '../../utils/responsive';
import {
  ArrowLeft, Crown, ShieldCheck, Star, CheckCircle, ArrowRight,
  Sparkle, Lightning,
} from '../../components/Icons';
import WebContainer from '../../components/WebContainer';

type Plan = 'one_time' | 'monthly' | 'quarterly' | 'half_yearly';

interface MatrixPlan {
  matrix_id: string;
  tier_id: number;
  tier_label: string;
  plan: Plan;
  tank_count: number;
  services_per_year: number;
  per_tank_paise: number;
  total_paise: number;
  ex_gst_paise: number;
  gst_paise: number;
  requires_inspection: boolean;
}

const PLAN_LABEL: Record<Plan, string> = {
  one_time:    'One-Time Cleaning',
  half_yearly: 'Half-Yearly AMC',
  quarterly:   'Quarterly AMC',
  monthly:     'Monthly AMC',
};

const PLAN_HEADLINE: Record<Plan, string> = {
  one_time:    'Single visit',
  half_yearly: '2 visits / year',
  quarterly:   '4 visits / year',
  monthly:     '12 visits / year',
};

const FEATURE_BLURB: Record<Plan, string[]> = {
  one_time:    ['One full ozone clean', 'Includes GST', 'Cancel anytime'],
  half_yearly: ['Two scheduled visits', 'Priority support', 'Includes GST'],
  quarterly:   ['Four scheduled visits', 'Priority scheduling', '10% off add-ons', 'Includes GST'],
  monthly:     ['Twelve scheduled visits', 'Top priority + dedicated team', '15% off add-ons', 'Includes GST'],
};

const fmt = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

const AmcPlansScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();
  const { isLarge } = useResponsive();

  const { draft } = useBookingStore();

  // Prefer params (when launched from a screen that already knows the size),
  // fall back to draft.
  const tank_size_litres: number = route.params?.tank_size_litres
    || draft?.tanks?.reduce((max: number, t: any) => Math.max(max, t.tank_size_litres || 0), 0)
    || draft?.tank_size_litres
    || 0;
  const tank_count: number = route.params?.tank_count
    || (draft?.tanks?.length ? draft.tanks.length : 1);

  const [loading, setLoading] = useState(true);
  const [tier, setTier] = useState<any>(null);
  const [plans, setPlans] = useState<MatrixPlan[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        if (tank_size_litres > 0) {
          const res: any = await amcAPI.getPlans(tank_size_litres, tank_count);
          if (!alive) return;
          if (res?.data?.plans?.length) {
            setTier(res.data.tier);
            setPlans(res.data.plans);
          } else {
            setErrorMsg('No pricing matched this tank size. Please contact us for a quote.');
          }
        } else {
          // No tank size → can't price; nudge user to start the booking flow
          setErrorMsg('Add a tank in the booking flow first to see live pricing.');
        }
      } catch (e: any) {
        if (alive) setErrorMsg(e?.message || 'Could not load pricing.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [tank_size_litres, tank_count]);

  const onEnroll = (p: MatrixPlan) => {
    navigation.navigate('AmcEnrollment', {
      plan_type: p.plan,
      tank_size_litres,
      plan_label: (p as any).display_name || PLAN_LABEL[p.plan],
      plan_price: Math.round(p.total_paise / 100),
      matrix_id: p.matrix_id,
      tier_id: p.tier_id,
      tank_count: p.tank_count,
      services_per_year: p.services_per_year,
      per_tank_paise: p.per_tank_paise,
      total_paise: p.total_paise,
      ex_gst_paise: p.ex_gst_paise,
      gst_paise: p.gst_paise,
      requires_inspection: p.requires_inspection,
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={C.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AMC Plans</Text>
        <Crown size={20} weight="fill" color={C.primary} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.body}>
        <WebContainer>
        {/* Hero — gradient banner with shield, tier pill, and value prop. */}
        <LinearGradient
          colors={[C.primary, C.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroIconWrap}>
            <ShieldCheck size={36} weight="fill" color="#fff" />
          </View>
          <Text style={styles.heroKicker}>PREMIUM PROTECTION</Text>
          <Text style={styles.heroTitle}>Choose your AMC plan</Text>
          <Text style={styles.heroSub}>
            Scheduled ozone cleanings, priority service, and the lowest per-clean rate — backed by a satisfaction guarantee.
          </Text>
          {tier && (
            <View style={styles.tierPill}>
              <Sparkle size={12} weight="fill" color="#fff" />
              <Text style={styles.tierPillText}>
                Tier {tier.label} · {tank_count} tank{tank_count > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Trust strip — small reassurance chips below the hero. */}
        <View style={styles.trustRow}>
          <View style={styles.trustChip}>
            <CheckCircle size={13} weight="fill" color={C.success} />
            <Text style={styles.trustText}>GST included</Text>
          </View>
          <View style={styles.trustChip}>
            <Lightning size={13} weight="fill" color={C.warning} />
            <Text style={styles.trustText}>Priority service</Text>
          </View>
          <View style={styles.trustChip}>
            <ShieldCheck size={13} weight="fill" color={C.primary} />
            <Text style={styles.trustText}>Certified crew</Text>
          </View>
          <View style={styles.trustChip}>
            <Crown size={13} weight="fill" color={C.gold || '#F59E0B'} />
            <Text style={styles.trustText}>Cancel anytime</Text>
          </View>
        </View>

        {loading && <ActivityIndicator color={C.primary} style={{ marginTop: 32 }} />}

        {!loading && errorMsg && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Pricing unavailable</Text>
            <Text style={styles.errorBody}>{errorMsg}</Text>
            <TouchableOpacity
              style={styles.errorBtn}
              onPress={() => navigation.navigate('TankDetails')}
              activeOpacity={0.75}
            >
              <Text style={styles.errorBtnText}>Start a booking</Text>
              <ArrowRight size={14} weight="bold" color={C.primaryFg} />
            </TouchableOpacity>
          </View>
        )}

        {/* Plan grid */}
        {!loading && !errorMsg && (
          <View style={styles.planGrid}>
            {plans.map((p) => {
              const isPopular = p.plan === 'quarterly';
              const features = ((p as any).features?.length ? (p as any).features : FEATURE_BLURB[p.plan]) || [];
              const isInspect = p.requires_inspection;
              const perCleanPaise = p.services_per_year > 0
                ? Math.round(p.total_paise / p.services_per_year)
                : p.total_paise;

              return (
                <View
                  key={p.matrix_id}
                  style={[
                    styles.card,
                    isPopular && styles.cardPopular,
                    isLarge && styles.cardWeb,
                  ]}
                >
                  {isPopular && (
                    <View style={styles.popularRibbon}>
                      <Star size={11} weight="fill" color="#fff" />
                      <Text style={styles.popularText}>MOST POPULAR</Text>
                    </View>
                  )}

                  <View style={styles.planHead}>
                    <Text style={[styles.planLabel, isPopular && styles.planLabelPopular]}>
                      {(p as any).display_name || PLAN_LABEL[p.plan]}
                    </Text>
                    <Text style={styles.planSub}>{(p as any).headline || PLAN_HEADLINE[p.plan]}</Text>
                  </View>

                  {isInspect ? (
                    <View style={styles.inspectPill}>
                      <Text style={styles.inspectPillText}>Final pricing post inspection</Text>
                    </View>
                  ) : (
                    <View style={styles.priceBlock}>
                      <View style={styles.priceRow}>
                        <Text style={[styles.priceNum, isPopular && styles.priceNumPopular]}>
                          {fmt(p.total_paise)}
                        </Text>
                        <Text style={styles.pricePer}>/year</Text>
                      </View>
                      {p.services_per_year > 1 ? (
                        <Text style={styles.perCleanLine}>
                          ≈ <Text style={styles.perCleanValue}>{fmt(perCleanPaise)}</Text> per clean
                        </Text>
                      ) : null}
                      <Text style={styles.gstSplit}>
                        Ex-GST {fmt(p.ex_gst_paise)} · 18% GST {fmt(p.gst_paise)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.divider} />

                  <View style={{ flex: 1 }}>
                    {features.map((feat) => (
                      <View key={feat} style={styles.featureRow}>
                        <View style={[styles.featureCheck, isPopular && styles.featureCheckPopular]}>
                          <CheckCircle size={11} weight="fill" color={isPopular ? '#fff' : C.success} />
                        </View>
                        <Text style={styles.featureText}>{feat}</Text>
                      </View>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.enrollBtn, isPopular && styles.enrollBtnPopular]}
                    onPress={() => onEnroll(p)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.enrollText, isPopular && styles.enrollTextPopular]}>
                      {isInspect ? 'Request Inspection' : 'Enroll now'}
                    </Text>
                    <ArrowRight size={16} weight="bold" color={isPopular ? C.primaryFg : C.primary} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Bottom assurance bar — all plans include disclaimer + FAQ link. */}
        {!loading && !errorMsg && plans.length > 0 && (
          <View style={styles.bottomAssurance}>
            <Text style={styles.bottomAssuranceTitle}>EVERY PLAN INCLUDES</Text>
            <Text style={styles.bottomAssuranceText}>
              24×7 customer support  ·  GST receipt  ·  Certified ozone crew  ·  Doorstep service  ·  Cancel anytime
            </Text>
            <Text style={styles.bottomLegal}>
              All prices final at checkout. Renewal is auto-confirmed 7 days before expiry — you'll be notified.
            </Text>
          </View>
        )}

        <View style={{ height: 24 }} />
        </WebContainer>
      </ScrollView>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: {
    backgroundColor: C.surface,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.foreground, flex: 1 },
  body: { padding: 16, paddingBottom: 40 },

  // ── Hero (gradient) ──────────────────────────────────────────────────
  hero: {
    alignItems: 'center',
    paddingVertical: 32, paddingHorizontal: 24,
    marginBottom: 16, borderRadius: 24,
    ...Platform.select({
      default: { boxShadow: '0 18px 40px rgba(14,165,233,0.25)' } as any,
      android: { elevation: 6 },
      ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 28 },
    }),
  },
  heroIconWrap: {
    width: 64, height: 64, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  heroKicker: {
    color: 'rgba(255,255,255,0.85)', fontSize: 11,
    fontWeight: '800', letterSpacing: 2.2, marginBottom: 6,
  },
  heroTitle: {
    fontSize: 28, fontWeight: '800', color: '#fff',
    letterSpacing: -0.5, marginBottom: 8, textAlign: 'center',
  },
  heroSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.85)',
    textAlign: 'center', lineHeight: 22, maxWidth: 520,
  },
  tierPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 18, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)',
  },
  tierPillText: { fontSize: 12, color: '#fff', fontWeight: '700', letterSpacing: 0.4 },

  // ── Trust chips row ──────────────────────────────────────────────────
  trustRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: 8, marginBottom: 24, paddingHorizontal: 8,
  },
  trustChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.surface, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: C.border,
  },
  trustText: { fontSize: 12, fontWeight: '600', color: C.foreground },

  // ── Plan grid ────────────────────────────────────────────────────────
  planGrid: Platform.OS === 'web'
    ? ({ flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' } as any)
    : { flexDirection: 'column' as const },

  card: {
    backgroundColor: C.surface, borderRadius: 20,
    paddingHorizontal: 22, paddingTop: 22, paddingBottom: 20,
    marginBottom: 14,
    borderWidth: 1, borderColor: C.border,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 },
      android: { elevation: 2 },
      default: { boxShadow: '0 6px 18px rgba(15,23,42,0.06)' } as any,
    }),
  },
  cardWeb: Platform.OS === 'web'
    ? ({
        flexBasis: 'calc(33.333% - 11px)',
        minWidth: 260, maxWidth: '100%',
        marginBottom: 0,
        display: 'flex', flexDirection: 'column',
      } as any)
    : {},
  cardPopular: {
    borderColor: C.primary, borderWidth: 2,
    backgroundColor: C.primary + '08',
    ...Platform.select({
      ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.22, shadowRadius: 28 },
      android: { elevation: 8 },
      default: { boxShadow: '0 20px 40px rgba(14,165,233,0.20)' } as any,
    }),
  },

  popularRibbon: {
    position: 'absolute',
    top: -12, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.primary,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
    ...(Platform.OS === 'web' ? ({ left: '50%', transform: 'translateX(-50%)' } as any) : {}),
  } as any,
  popularText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.8 },

  planHead: { marginBottom: 12 },
  planLabel: { fontSize: 16, fontWeight: '700', color: C.foreground, letterSpacing: -0.2 },
  planLabelPopular: { color: C.primary },
  planSub: { fontSize: 12, color: C.muted, marginTop: 4, fontWeight: '500' },

  priceBlock: { marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  priceNum: { fontSize: 34, fontWeight: '800', color: C.foreground, letterSpacing: -1 },
  priceNumPopular: { color: C.primary },
  pricePer: { fontSize: 14, fontWeight: '500', color: C.muted },
  perCleanLine: { fontSize: 12, color: C.muted, marginTop: 4 },
  perCleanValue: { fontWeight: '700', color: C.foreground },
  gstSplit: { fontSize: 11, color: C.muted, marginTop: 4 },

  inspectPill: {
    alignSelf: 'flex-start', backgroundColor: C.warningBg,
    borderColor: C.warning, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginVertical: 12,
  },
  inspectPillText: { fontSize: 11, color: C.warning, fontWeight: '700' },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 16 },

  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  featureCheck: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: (C.success || '#16A34A') + '18',
    alignItems: 'center', justifyContent: 'center',
  },
  featureCheckPopular: { backgroundColor: C.primary },
  featureText: { fontSize: 13, color: C.foreground, flex: 1, lineHeight: 18 },

  enrollBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 16, paddingVertical: 13, borderRadius: 12,
    backgroundColor: C.primaryBg, borderWidth: 1, borderColor: C.primary,
  },
  enrollBtnPopular: { backgroundColor: C.primary, borderColor: C.primary },
  enrollText: { fontSize: 14, fontWeight: '700', color: C.primary },
  enrollTextPopular: { color: '#fff' },

  // ── Bottom assurance ─────────────────────────────────────────────────
  bottomAssurance: {
    marginTop: 28, padding: 20, borderRadius: 16,
    backgroundColor: C.surfaceElevated || C.surface,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center',
  },
  bottomAssuranceTitle: {
    fontSize: 11, fontWeight: '800', letterSpacing: 1.6,
    color: C.muted, marginBottom: 8,
  },
  bottomAssuranceText: {
    fontSize: 13, color: C.foreground, fontWeight: '500',
    textAlign: 'center', lineHeight: 20, marginBottom: 8,
  },
  bottomLegal: {
    fontSize: 11, color: C.muted, fontStyle: 'italic',
    textAlign: 'center', lineHeight: 16, maxWidth: 520,
  },
  errorCard: {
    backgroundColor: C.surface, borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: C.border, alignItems: 'center', marginTop: 16,
  },
  errorTitle: { fontSize: 15, fontWeight: '700', color: C.foreground, marginBottom: 4 },
  errorBody: { fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 12 },
  errorBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
  },
  errorBtnText: { color: C.primaryFg, fontWeight: '700', fontSize: 13 },
});

export default AmcPlansScreen;
