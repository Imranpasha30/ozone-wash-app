import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, AMC_PLANS } from '../../utils/constants';
import {
  ArrowLeft, Crown, ShieldCheck, Star, Envelope, CheckCircle,
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

  return (
    <View style={styles.root}>
      {/* Header — dark premium */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={COLORS.premiumGold} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AMC Plans</Text>
        <Crown size={20} weight="fill" color={COLORS.premiumGold} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <ShieldCheck size={32} weight="fill" color={COLORS.premiumGold} />
          </View>
          <Text style={styles.heroTitle}>Premium Protection</Text>
          <Text style={styles.heroSub}>
            Annual Maintenance Contracts give you scheduled cleanings, priority service, and discounts on every booking.
          </Text>
        </View>

        {/* Plan Cards */}
        {AMC_PLANS.map((plan, index) => {
          const isPopular = plan.value === 'yearly';
          const features = PLAN_FEATURES[plan.value] || [];
          return (
            <View
              key={plan.value}
              style={[
                styles.card,
                isPopular && styles.cardPopular,
              ]}
            >
              {isPopular && (
                <View style={styles.popularBadge}>
                  <Star size={12} weight="fill" color={COLORS.premiumBg} />
                  <Text style={styles.popularText}>BEST VALUE</Text>
                </View>
              )}
              <View style={styles.cardHeader}>
                <Crown size={18} weight="fill" color={isPopular ? COLORS.premiumGold : COLORS.premiumMuted} />
                <Text style={[styles.planLabel, isPopular && styles.planLabelPopular]}>
                  {plan.label}
                </Text>
              </View>
              <Text style={[styles.planPrice, isPopular && styles.planPricePopular]}>
                ₹{plan.price.toLocaleString('en-IN')}
                <Text style={styles.planPer}> /year</Text>
              </Text>
              {features.map((feat) => (
                <View key={feat} style={styles.featureRow}>
                  <CheckCircle size={14} weight="fill" color={isPopular ? COLORS.premiumGold : COLORS.accent} />
                  <Text style={styles.featureText}>{feat}</Text>
                </View>
              ))}
              <TouchableOpacity style={[styles.enrollBtn, isPopular && styles.enrollBtnPopular]}>
                <Envelope size={14} weight="regular" color={isPopular ? COLORS.premiumBg : COLORS.premiumGold} />
                <Text style={[styles.enrollText, isPopular && styles.enrollTextPopular]}>
                  Contact to Enroll
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <Text style={styles.footer}>
          For enrollment, contact support@ozonewash.in or call us.
        </Text>
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.premiumBg },
  header: {
    backgroundColor: COLORS.premiumSurface,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.premiumGoldLight,
  },
  backBtn: { marginRight: 12 },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.premiumText,
    flex: 1,
  },
  body: { padding: 16 },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 8,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.premiumGoldLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.premiumGold,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 13,
    color: COLORS.premiumMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },

  // Cards
  card: {
    backgroundColor: COLORS.premiumSurface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
  },
  cardPopular: {
    borderColor: COLORS.premiumGold,
    borderWidth: 1.5,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.premiumGold,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 10,
  },
  popularText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.premiumBg,
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planLabel: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.premiumText,
  },
  planLabelPopular: {
    color: COLORS.premiumGold,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.premiumText,
    marginTop: 6,
    marginBottom: 10,
  },
  planPricePopular: {
    color: COLORS.premiumGold,
  },
  planPer: {
    fontSize: 13,
    fontWeight: 'normal',
    color: COLORS.premiumMuted,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },
  featureText: {
    fontSize: 13,
    color: COLORS.premiumMuted,
  },
  enrollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.premiumGold,
  },
  enrollBtnPopular: {
    backgroundColor: COLORS.premiumGold,
    borderColor: COLORS.premiumGold,
  },
  enrollText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.premiumGold,
  },
  enrollTextPopular: {
    color: COLORS.premiumBg,
  },
  footer: {
    fontSize: 12,
    color: COLORS.premiumMuted,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default AmcPlansScreen;
