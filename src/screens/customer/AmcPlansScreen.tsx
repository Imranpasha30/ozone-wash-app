import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AMC_PLANS } from '../../utils/constants';
import { useTheme } from '../../hooks/useTheme';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import {
  ArrowLeft, Crown, ShieldCheck, Star, CheckCircle, ArrowRight,
} from '../../components/Icons';

const PLAN_FEATURES: Record<string, string[]> = {
  monthly: ['1 cleaning/month', 'Priority scheduling', '10% off add-ons'],
  bimonthly: ['1 cleaning/2 months', 'Priority scheduling', '12% off add-ons'],
  quarterly: ['1 cleaning/quarter', 'Priority scheduling', '15% off add-ons'],
  '4month': ['1 cleaning/4 months', 'Priority scheduling', '18% off add-ons'],
  halfyearly: ['2 cleanings/year', 'Priority scheduling', '20% off add-ons', 'Free water test'],
  yearly: ['4 cleanings/year', 'Priority scheduling', '25% off add-ons', 'Free water test', 'Dedicated team'],
};

const AmcPlansScreen = () => {
  const navigation = useNavigation<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();

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
            Annual Maintenance Contracts give you scheduled cleanings, priority service, and discounts on every booking.
          </Text>
        </View>

        {/* Plan Cards */}
        {AMC_PLANS.map((plan) => {
          const isPopular = plan.value === 'yearly';
          const features = PLAN_FEATURES[plan.value] || [];
          return (
            <View
              key={plan.value}
              style={[styles.card, isPopular && styles.cardPopular]}
            >
              {isPopular && (
                <View style={styles.popularBadge}>
                  <Star size={12} weight="fill" color={C.primaryFg} />
                  <Text style={styles.popularText}>BEST VALUE</Text>
                </View>
              )}
              <View style={styles.cardHeader}>
                <Crown size={18} weight="fill" color={isPopular ? C.primary : C.muted} />
                <Text style={[styles.planLabel, isPopular && styles.planLabelPopular]}>
                  {plan.label}
                </Text>
              </View>
              <Text style={[styles.planPrice, isPopular && styles.planPricePopular]}>
                ₹{plan.price.toLocaleString('en-IN')}
                <Text style={styles.planPer}> /{plan.value === 'monthly' ? 'mo' : plan.label.toLowerCase()}</Text>
              </Text>
              {features.map((feat) => (
                <View key={feat} style={styles.featureRow}>
                  <CheckCircle size={14} weight="fill" color={isPopular ? C.primary : C.success} />
                  <Text style={styles.featureText}>{feat}</Text>
                </View>
              ))}
              <TouchableOpacity
                style={[styles.enrollBtn, isPopular && styles.enrollBtnPopular]}
                onPress={() => navigation.navigate('AmcEnrollment', { plan_type: plan.value, plan_label: plan.label, plan_price: plan.price })}
                activeOpacity={0.7}
              >
                <Text style={[styles.enrollText, isPopular && styles.enrollTextPopular]}>
                  Enroll Now
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
  planPrice: { fontSize: 24, fontWeight: '700', color: C.foreground, marginTop: 6, marginBottom: 10 },
  planPricePopular: { color: C.primary },
  planPer: { fontSize: 13, fontWeight: '400', color: C.muted },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  featureText: { fontSize: 13, color: C.muted },
  enrollBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 12, paddingVertical: 12, borderRadius: 12,
    backgroundColor: C.primaryBg,
  },
  enrollBtnPopular: { backgroundColor: C.primary },
  enrollText: { fontSize: 14, fontWeight: '700', color: C.primary },
  enrollTextPopular: { color: C.primaryFg },
});

export default AmcPlansScreen;
