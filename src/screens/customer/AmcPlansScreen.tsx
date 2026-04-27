import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import useBookingStore from '../../store/booking.store';
import { amcAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import {
  ArrowLeft, Crown, ShieldCheck, Star, CheckCircle, ArrowRight,
} from '../../components/Icons';

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
      plan_label: PLAN_LABEL[p.plan],
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
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <ShieldCheck size={32} weight="fill" color={C.primary} />
          </View>
          <Text style={styles.heroTitle}>Premium Protection</Text>
          <Text style={styles.heroSub}>
            Annual Maintenance Contracts give you scheduled cleanings, priority service, and the lowest per-clean rate.
          </Text>
          {tier && (
            <View style={styles.tierPill}>
              <Text style={styles.tierPillText}>
                Tank tier: {tier.label} · {tank_count} tank{tank_count > 1 ? 's' : ''}
              </Text>
            </View>
          )}
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

        {!loading && !errorMsg && plans.map((p) => {
          const isPopular = p.plan === 'quarterly';
          const features = FEATURE_BLURB[p.plan] || [];
          const isInspect = p.requires_inspection;
          const perTankInr = (p.per_tank_paise / 100).toLocaleString('en-IN');

          return (
            <View key={p.matrix_id} style={[styles.card, isPopular && styles.cardPopular]}>
              {isPopular && (
                <View style={styles.popularBadge}>
                  <Star size={12} weight="fill" color={C.primaryFg} />
                  <Text style={styles.popularText}>BEST VALUE</Text>
                </View>
              )}
              <View style={styles.cardHeader}>
                <Crown size={18} weight="fill" color={isPopular ? C.primary : C.muted} />
                <Text style={[styles.planLabel, isPopular && styles.planLabelPopular]}>
                  {PLAN_LABEL[p.plan]}
                </Text>
              </View>
              <Text style={styles.planSub}>{PLAN_HEADLINE[p.plan]}</Text>

              {isInspect ? (
                <View style={styles.inspectPill}>
                  <Text style={styles.inspectPillText}>Final pricing post inspection</Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.planPrice, isPopular && styles.planPricePopular]}>
                    {fmt(p.total_paise)}
                    <Text style={styles.planPer}> /year</Text>
                  </Text>
                  <Text style={styles.planCaption}>
                    ₹{perTankInr}/tank × {p.tank_count} tank{p.tank_count > 1 ? 's' : ''} × {p.services_per_year} visit{p.services_per_year > 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.gstSplit}>
                    Ex-GST {fmt(p.ex_gst_paise)} · GST 18% {fmt(p.gst_paise)}
                  </Text>
                </>
              )}

              {features.map((feat) => (
                <View key={feat} style={styles.featureRow}>
                  <CheckCircle size={14} weight="fill" color={isPopular ? C.primary : C.success} />
                  <Text style={styles.featureText}>{feat}</Text>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.enrollBtn, isPopular && styles.enrollBtnPopular]}
                onPress={() => onEnroll(p)}
                activeOpacity={0.7}
              >
                <Text style={[styles.enrollText, isPopular && styles.enrollTextPopular]}>
                  {isInspect ? 'Request Inspection' : 'Enroll Now'}
                </Text>
                <ArrowRight size={16} weight="bold" color={isPopular ? C.primaryFg : C.primary} />
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={{ height: 24 }} />
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
  hero: { alignItems: 'center', paddingVertical: 20, marginBottom: 8 },
  heroIconWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: C.primaryBg,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: { fontSize: 22, fontWeight: '700', color: C.primary, marginBottom: 6 },
  heroSub: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
  tierPill: {
    marginTop: 12, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: C.primaryBg, borderWidth: 1, borderColor: C.borderActive,
  },
  tierPillText: { fontSize: 12, color: C.primary, fontWeight: '600' },
  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 18, marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardPopular: {
    borderWidth: 2, borderColor: C.primary,
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  popularBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.primary, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10,
  },
  popularText: { fontSize: 10, fontWeight: '700', color: C.primaryFg, letterSpacing: 0.5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planLabel: { fontSize: 17, fontWeight: '700', color: C.foreground },
  planLabelPopular: { color: C.primary },
  planSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  planPrice: { fontSize: 24, fontWeight: '700', color: C.foreground, marginTop: 8 },
  planPricePopular: { color: C.primary },
  planPer: { fontSize: 13, fontWeight: '400', color: C.muted },
  planCaption: { fontSize: 11, color: C.muted, marginTop: 4 },
  gstSplit: { fontSize: 11, color: C.muted, marginTop: 2, marginBottom: 6 },
  inspectPill: {
    alignSelf: 'flex-start', backgroundColor: C.warningBg,
    borderColor: C.warning, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, marginTop: 10, marginBottom: 8,
  },
  inspectPillText: { fontSize: 11, color: C.warning, fontWeight: '700' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  featureText: { fontSize: 13, color: C.muted },
  enrollBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 14, paddingVertical: 12, borderRadius: 12,
    backgroundColor: C.primaryBg,
  },
  enrollBtnPopular: { backgroundColor: C.primary },
  enrollText: { fontSize: 14, fontWeight: '700', color: C.primary },
  enrollTextPopular: { color: C.primaryFg },
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
