import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useBookingStore from '../../store/booking.store';
import { bookingAPI } from '../../services/api';
import { COLORS, ADDONS, AMC_PLANS, PAYMENT_METHODS } from '../../utils/constants';

const AddonsScreen = () => {
  const navigation = useNavigation<any>();
  const { draft, setStep3 } = useBookingStore();

  const [selectedAddons, setSelectedAddons] = useState<string[]>(draft.addons || []);
  const [amcPlan, setAmcPlan] = useState(draft.amc_plan || '');
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
  }, [selectedAddons, amcPlan]);

  const fetchPrice = async () => {
    if (!draft.tank_type || !draft.tank_size_litres) return;
    setLoading(true);
    try {
      const res = await bookingAPI.getPrice(
        draft.tank_type,
        draft.tank_size_litres,
        selectedAddons,
        amcPlan || undefined
      ) as any;
      setPricing(res.data?.pricing || res.data);
    } catch (_) {} finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!pricing) return Alert.alert('Calculating price...', 'Please wait');
    setStep3({ addons: selectedAddons, amc_plan: amcPlan, payment_method: paymentMethod, pricing });
    navigation.navigate('PaymentScreen');
  };

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add-ons & Payment</Text>
        <Text style={styles.stepText}>Step 3 / 4</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '75%' }]} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Add-ons */}
        <Text style={styles.label}>Optional Add-ons</Text>
        {ADDONS.map((a) => {
          const selected = selectedAddons.includes(a.value);
          return (
            <TouchableOpacity
              key={a.value}
              style={[styles.addonRow, selected && styles.addonRowActive]}
              onPress={() => toggleAddon(a.value)}
            >
              <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                {selected && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.addonInfo}>
                <Text style={styles.addonName}>{a.label}</Text>
              </View>
              <Text style={styles.addonPrice}>+₹{a.price}</Text>
            </TouchableOpacity>
          );
        })}

        {/* AMC Plan */}
        <Text style={styles.label}>AMC Plan (Optional)</Text>
        <Text style={styles.hint}>Get up to 25% off on your base price</Text>
        <TouchableOpacity
          style={[styles.addonRow, amcPlan === '' && styles.addonRowActive]}
          onPress={() => setAmcPlan('')}
        >
          <View style={[styles.radio, amcPlan === '' && styles.radioActive]} />
          <Text style={styles.addonName}>No AMC (one-time booking)</Text>
        </TouchableOpacity>
        {AMC_PLANS.map((p) => (
          <TouchableOpacity
            key={p.value}
            style={[styles.addonRow, amcPlan === p.value && styles.addonRowActive]}
            onPress={() => setAmcPlan(p.value)}
          >
            <View style={[styles.radio, amcPlan === p.value && styles.radioActive]} />
            <View style={styles.addonInfo}>
              <Text style={styles.addonName}>{p.label}</Text>
            </View>
            <Text style={styles.addonPrice}>₹{p.price}/yr</Text>
          </TouchableOpacity>
        ))}

        {/* Payment Method */}
        <Text style={styles.label}>Payment Method</Text>
        <View style={styles.payRow}>
          {PAYMENT_METHODS.map((m) => (
            <TouchableOpacity
              key={m.value}
              style={[styles.payBtn, paymentMethod === m.value && styles.payBtnActive]}
              onPress={() => setPaymentMethod(m.value as any)}
            >
              <Text style={styles.payIcon}>
                {m.value === 'upi' ? '📱' : m.value === 'card' ? '💳' : m.value === 'wallet' ? '👛' : '💵'}
              </Text>
              <Text style={[styles.payLabel, paymentMethod === m.value && styles.payLabelActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Price Breakdown */}
        <View style={styles.priceCard}>
          <Text style={styles.priceTitle}>Price Breakdown</Text>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 12 }} />
          ) : pricing ? (
            <>
              <View style={styles.priceRow}>
                <Text style={styles.priceKey}>Base Price</Text>
                <Text style={styles.priceVal}>{fmt(pricing.base_price)}</Text>
              </View>
              {pricing.addon_total > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceKey}>Add-ons</Text>
                  <Text style={styles.priceVal}>{fmt(pricing.addon_total)}</Text>
                </View>
              )}
              {pricing.discount_amount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceKey, { color: COLORS.primary }]}>AMC Discount</Text>
                  <Text style={[styles.priceVal, { color: COLORS.primary }]}>-{fmt(pricing.discount_amount)}</Text>
                </View>
              )}
              <View style={styles.priceRow}>
                <Text style={styles.priceKey}>GST (18%)</Text>
                <Text style={styles.priceVal}>{fmt(pricing.gst)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.priceRow}>
                <Text style={styles.totalKey}>Total</Text>
                <Text style={styles.totalVal}>{fmt(pricing.grand_total)}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.calcText}>Calculating...</Text>
          )}
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextText}>Proceed to Payment →</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface,
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { marginRight: 12 },
  backText: { fontSize: 24, color: COLORS.primary },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.foreground, flex: 1 },
  stepText: { fontSize: 13, color: COLORS.muted },
  progressBar: { height: 4, backgroundColor: COLORS.border },
  progressFill: { height: 4, backgroundColor: COLORS.primary },
  body: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.foreground, marginBottom: 10, marginTop: 16 },
  hint: { fontSize: 12, color: COLORS.muted, marginBottom: 10, marginTop: -6 },
  addonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  addonRowActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  checkmark: { color: COLORS.primaryFg, fontSize: 13, fontWeight: 'bold' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 12,
  },
  radioActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  addonInfo: { flex: 1 },
  addonName: { fontSize: 14, color: COLORS.foreground, fontWeight: '600' },
  addonPrice: { fontSize: 14, color: COLORS.primary, fontWeight: 'bold' },
  payRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  payBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
  payIcon: { fontSize: 18, marginRight: 6 },
  payLabel: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  payLabelActive: { color: COLORS.primary },
  priceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.foreground, marginBottom: 12 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceKey: { fontSize: 14, color: COLORS.muted },
  priceVal: { fontSize: 14, color: COLORS.foreground, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  totalKey: { fontSize: 16, fontWeight: 'bold', color: COLORS.foreground },
  totalVal: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  calcText: { color: COLORS.muted, textAlign: 'center', marginVertical: 8 },
  nextBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  nextText: { color: COLORS.primaryFg, fontWeight: 'bold', fontSize: 16 },
});

export default AddonsScreen;
