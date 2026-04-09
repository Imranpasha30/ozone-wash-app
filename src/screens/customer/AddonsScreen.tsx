import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useBookingStore from '../../store/booking.store';
import usePremiumStore from '../../store/premium.store';
import { bookingAPI } from '../../services/api';
import { ADDONS, PAYMENT_METHODS } from '../../utils/constants';
import { useTheme } from '../../hooks/useTheme';
import {
  ArrowLeft, ArrowRight, Check, CreditCard, Wallet, CurrencyInr,
  Receipt, Phone, Star, ShieldCheck,
} from '../../components/Icons';

const PaymentMethodIcon = ({ method, active, C }: { method: string; active: boolean; C: any }) => {
  const color = active ? C.primary : C.muted;
  switch (method) {
    case 'upi': return <Phone size={18} weight="regular" color={color} />;
    case 'card': return <CreditCard size={18} weight="regular" color={color} />;
    case 'wallet': return <Wallet size={18} weight="regular" color={color} />;
    case 'cod': return <CurrencyInr size={18} weight="regular" color={color} />;
    default: return <CreditCard size={18} weight="regular" color={color} />;
  }
};

const AddonsScreen = () => {
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);

  const navigation = useNavigation<any>();
  const { draft, setStep3 } = useBookingStore();
  const isPremium = usePremiumStore((s) => s.isPremium);

  const [selectedAddons, setSelectedAddons] = useState<string[]>(draft.addons || []);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'wallet' | 'cod'>(
    draft.payment_method || 'upi'
  );
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const toggleAddon = (val: string) => {
    setSelectedAddons((prev) =>
      prev.includes(val) ? prev.filter((a) => a !== val) : [...prev, val]
    );
  };

  useEffect(() => {
    fetchPrice();
  }, [selectedAddons]);

  const fetchPrice = async () => {
    if (!draft.tank_type || !draft.tank_size_litres) return;
    setLoading(true);
    try {
      const res = await bookingAPI.getPrice(
        draft.tank_type,
        draft.tank_size_litres,
        selectedAddons,
      ) as any;
      setPricing(res.data?.pricing || res.data);
    } catch (_) {} finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!pricing) return Alert.alert('Calculating price...', 'Please wait');
    setStep3({ addons: selectedAddons, amc_plan: pricing.amc_plan || '', payment_method: paymentMethod, pricing });

    // AMC-covered with no addons = ₹0, skip payment
    if (pricing.grand_total === 0) {
      navigation.navigate('PaymentScreen', { skipPayment: true });
    } else {
      navigation.navigate('PaymentScreen');
    }
  };

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={C.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hygiene Upgrades</Text>
        <Text style={styles.stepText}>Step 3 / 4</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '75%' }]} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* AMC Upsell Banner — only shown to non-AMC customers */}
        {!isPremium && (
          <TouchableOpacity
            style={styles.amcBanner}
            onPress={() => navigation.navigate('AmcPlans')}
            activeOpacity={0.85}
          >
            <View style={styles.amcBannerIcon}>
              <ShieldCheck size={22} weight="fill" color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.amcBannerTitle}>Save with an AMC Plan</Text>
              <Text style={styles.amcBannerSub}>Get FREE tank cleanings year-round. Tap to explore plans →</Text>
            </View>
            <Star size={16} weight="fill" color={C.warning} />
          </TouchableOpacity>
        )}

        {/* Hygiene Upgrades */}
        <Text style={styles.label}>Hygiene Upgrades</Text>
        <Text style={styles.labelSub}>Optional add-ons for deeper hygiene protection</Text>
        {ADDONS.map((a, index) => {
          const selected = selectedAddons.includes(a.value);
          return (
            <TouchableOpacity
              key={a.value}
              style={[styles.addonRow, selected && styles.addonRowActive]}
              onPress={() => toggleAddon(a.value)}
            >
              <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                {selected && <Check size={14} weight="bold" color={C.primaryFg} />}
              </View>
              <View style={styles.addonInfo}>
                <Text style={styles.addonName}>{index + 1}. {a.label}</Text>
              </View>
              <Text style={styles.addonPrice}>+₹{a.price}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Payment Method — hide when AMC covers everything */}
        {(!pricing || pricing.grand_total > 0) && (
          <>
            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.payRow}>
              {PAYMENT_METHODS.map((m) => {
                const active = paymentMethod === m.value;
                return (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.payBtn, active && styles.payBtnActive]}
                    onPress={() => setPaymentMethod(m.value as any)}
                  >
                    <PaymentMethodIcon method={m.value} active={active} C={C} />
                    <Text style={[styles.payLabel, active && styles.payLabelActive]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Price Breakdown */}
        <View style={styles.priceCard}>
          <View style={styles.priceTitleRow}>
            <Receipt size={18} weight="regular" color={C.foreground} />
            <Text style={styles.priceTitle}>Price Breakdown</Text>
          </View>
          {loading ? (
            <ActivityIndicator color={C.primary} style={{ marginVertical: 12 }} />
          ) : pricing ? (
            <>
              <View style={styles.priceRow}>
                <Text style={styles.priceKey}>Base Price</Text>
                <Text style={pricing.amc_covered ? [styles.priceVal, styles.strikethrough] : styles.priceVal}>
                  {fmt(pricing.base_price)}
                </Text>
              </View>
              {pricing.amc_covered && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceKey, { color: C.success }]}>
                    Covered by AMC ({pricing.amc_plan?.toUpperCase()})
                  </Text>
                  <Text style={[styles.priceVal, { color: C.success }]}>FREE</Text>
                </View>
              )}
              {pricing.addon_total > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceKey}>Hygiene Upgrades</Text>
                  <Text style={styles.priceVal}>{fmt(pricing.addon_total)}</Text>
                </View>
              )}
              {pricing.eco_discount_amount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceKey, { color: '#10B981' }]}>
                    {pricing.eco_discount_label || `EcoLoyalty ${pricing.eco_discount_pct}% off`}
                  </Text>
                  <Text style={[styles.priceVal, { color: '#10B981' }]}>-{fmt(pricing.eco_discount_amount)}</Text>
                </View>
              )}
              {pricing.grand_total > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceKey}>GST (18%)</Text>
                  <Text style={styles.priceVal}>{fmt(pricing.gst)}</Text>
                </View>
              )}
              <View style={styles.divider} />
              <View style={styles.priceRow}>
                <Text style={styles.totalKey}>Total</Text>
                <Text style={styles.totalVal}>
                  {pricing.grand_total === 0 ? 'FREE' : fmt(pricing.grand_total)}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.calcText}>Calculating...</Text>
          )}
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextText}>
            {pricing?.grand_total === 0 ? 'Confirm Booking' : 'Proceed to Payment'}
          </Text>
          <ArrowRight size={18} weight="bold" color={C.primaryFg} />
        </TouchableOpacity>
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
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: C.foreground, flex: 1 },
  stepText: { fontSize: 13, color: C.muted },
  progressBar: { height: 4, backgroundColor: C.border },
  progressFill: { height: 4, backgroundColor: C.primary },
  body: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '700', color: C.foreground, marginBottom: 4, marginTop: 16 },
  labelSub: { fontSize: 12, color: C.muted, marginBottom: 10 },
  addonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: C.border,
  },
  addonRowActive: { borderColor: C.primary, backgroundColor: C.primaryBg },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { borderColor: C.primary, backgroundColor: C.primary },
  addonInfo: { flex: 1 },
  addonName: { fontSize: 14, color: C.foreground, fontWeight: '600' },
  addonPrice: { fontSize: 14, color: C.primary, fontWeight: 'bold' },
  payRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: C.surfaceElevated,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
    gap: 6,
  },
  payBtnActive: { borderColor: C.primary, backgroundColor: C.primaryBg },
  payLabel: { fontSize: 13, color: C.muted, fontWeight: '600' },
  payLabelActive: { color: C.primary },
  priceCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  priceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  priceTitle: { fontSize: 15, fontWeight: 'bold', color: C.foreground },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceKey: { fontSize: 14, color: C.muted },
  priceVal: { fontSize: 14, color: C.foreground, fontWeight: '600' },
  strikethrough: { textDecorationLine: 'line-through', color: C.muted },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 8 },
  totalKey: { fontSize: 16, fontWeight: 'bold', color: C.foreground },
  totalVal: { fontSize: 20, fontWeight: 'bold', color: C.primary },
  calcText: { color: C.muted, textAlign: 'center', marginVertical: 8 },
  amcBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.primaryBg, borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: C.primary, marginBottom: 4,
  },
  amcBannerIcon: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  amcBannerTitle: { fontSize: 13, fontWeight: '700', color: C.primary },
  amcBannerSub: { fontSize: 11, color: C.muted, marginTop: 2 },
  nextBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
  },
  nextText: { color: C.primaryFg, fontWeight: 'bold', fontSize: 16 },
});

export default AddonsScreen;
