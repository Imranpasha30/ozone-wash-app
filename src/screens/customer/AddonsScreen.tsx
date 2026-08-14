import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useBookingStore from '../../store/booking.store';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import usePremiumStore from '../../store/premium.store';
import { bookingAPI, funnelAPI } from '../../services/api';
import { ADDONS, PAYMENT_METHODS, SERVICE_PLANS } from '../../utils/constants';
import { useTheme } from '../../hooks/useTheme';
import {
  ArrowLeft, ArrowRight, Check, CreditCard, Wallet, CurrencyInr,
  Receipt, Phone, Star, ShieldCheck,
} from '../../components/Icons';
import WebContainer from '../../components/WebContainer';

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
  const scrollRef = useWebScrollFix();

  const navigation = useNavigation<any>();
  const { draft, setStep3 } = useBookingStore();
  const isPremium = usePremiumStore((s) => s.isPremium);

  const [selectedAddons, setSelectedAddons] = useState<string[]>(draft.addons || []);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'wallet' | 'cod'>(
    draft.payment_method || 'upi'
  );
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  // Add-on catalogue with bucket prices for this booking's largest tank
  const [catalog, setCatalog] = useState<any[]>([]);

  const tankSizes = (draft.tanks?.length ? draft.tanks : [{ tank_size_litres: draft.tank_size_litres }])
    .map((t: any) => Number(t.tank_size_litres) || 1000);
  const maxLitres = Math.max(...tankSizes);
  const planMeta = SERVICE_PLANS.find((p) => p.value === draft.plan);

  const toggleAddon = (val: string) => {
    setSelectedAddons((prev) =>
      prev.includes(val) ? prev.filter((a) => a !== val) : [...prev, val]
    );
  };

  useEffect(() => {
    // Funnel: customer reached step 3
    funnelAPI.track(3, { plan: draft.plan, tanks: tankSizes });
    bookingAPI.getAddons(maxLitres)
      .then((res: any) => setCatalog(res.data?.addons || []))
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchPrice();
  }, [selectedAddons]);

  const fetchPrice = async () => {
    setLoading(true);
    try {
      if (isPremium) {
        // Active AMC members: base covered — legacy endpoint handles that
        const res = await bookingAPI.getPrice(
          draft.tank_type,
          draft.tank_size_litres,
          selectedAddons,
        ) as any;
        setPricing(res.data?.pricing || res.data);
      } else {
        // Billing v2 — spec master formula (per-tank tiers × plan × add-on buckets)
        const res = await bookingAPI.getQuote(tankSizes, draft.plan || 'one_time', selectedAddons) as any;
        setPricing(res.data?.pricing || res.data);
      }
    } catch (_) {} finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!pricing) return Alert.alert('Calculating price...', 'Please wait');
    setStep3({ addons: selectedAddons, amc_plan: pricing.amc_plan || '', payment_method: paymentMethod, pricing });

    // Funnel: customer reached step 4 (payment)
    funnelAPI.track(4, { plan: draft.plan, addons: selectedAddons, total: pricing.grand_total });

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

      <ScrollView ref={scrollRef} contentContainerStyle={styles.body}>
        <WebContainer variant="narrow">
        {/* Chosen plan summary — AMC selection moved to Step 1 + payment step */}
        {!isPremium && planMeta && (
          <View style={styles.planSummary}>
            <ShieldCheck size={18} weight="fill" color={C.primary} />
            <Text style={styles.planSummaryText}>
              Plan: <Text style={{ fontWeight: '800' }}>{planMeta.label}</Text>
              {planMeta.discountPct > 0
                ? ` · ${planMeta.visitsPerYear} visits/yr · ${planMeta.discountPct}% off per service`
                : ' · single service'}
            </Text>
          </View>
        )}

        {/* Hygiene Upgrades — bucket-priced for this booking's largest tank */}
        <Text style={styles.label}>Hygiene Upgrades</Text>
        <Text style={styles.labelSub}>Optional add-ons for deeper hygiene protection</Text>
        {(catalog.length ? catalog : ADDONS.map(a => ({
          code: a.value, name: a.label, price_paise: a.price * 100,
          coming_soon: (a as any).comingSoon || false, available: !(a as any).comingSoon, custom_quote: false,
        }))).map((a: any, index: number) => {
          const selected = selectedAddons.includes(a.code);
          const disabled = !a.available;
          return (
            <TouchableOpacity
              key={a.code}
              style={[styles.addonRow, selected && styles.addonRowActive, disabled && { opacity: 0.45 }]}
              onPress={() => !disabled && toggleAddon(a.code)}
              disabled={disabled}
            >
              <View style={[styles.checkbox, selected && styles.checkboxActive]}>
                {selected && <Check size={14} weight="bold" color={C.primaryFg} />}
              </View>
              <View style={styles.addonInfo}>
                <Text style={styles.addonName}>{index + 1}. {a.name}</Text>
                {a.coming_soon && <Text style={styles.addonSoon}>Coming soon</Text>}
                {a.custom_quote && <Text style={styles.addonSoon}>Custom quote after inspection</Text>}
              </View>
              <Text style={styles.addonPrice}>
                {a.custom_quote ? 'On quote' : a.price_paise != null ? `+₹${Math.round(a.price_paise / 100).toLocaleString('en-IN')}` : '—'}
              </Text>
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
              {/* ── Itemized bill (billing v2) ── */}
              {pricing.billing_version === 2 && pricing.lines ? (
                <>
                  {/* Per-tank service lines */}
                  {(pricing.tanks || []).map((t: any, i: number) => (
                    <View style={styles.priceRow} key={`t${i}`}>
                      <Text style={styles.priceKey}>Tank {i + 1} · {t.tier_label}</Text>
                      <Text style={styles.priceVal}>{fmt(Math.round(t.per_tank_per_service_paise / 100))}</Text>
                    </View>
                  ))}
                  {pricing.lines.tank_discount_per_service_paise > 0 && (
                    <View style={styles.priceRow}>
                      <Text style={[styles.priceKey, { color: C.success }]}>
                        Multi-tank discount ({pricing.lines.tank_discount_pct}% · {pricing.tank_count} tanks)
                      </Text>
                      <Text style={[styles.priceVal, { color: C.success }]}>
                        −{fmt(Math.round(pricing.lines.tank_discount_per_service_paise / 100))}
                      </Text>
                    </View>
                  )}
                  {pricing.lines.plan_discount_per_service_paise > 0 && (
                    <View style={styles.priceRow}>
                      <Text style={[styles.priceKey, { color: C.success }]}>
                        Plan discount ({pricing.lines.plan_discount_pct}% · {planMeta?.label})
                      </Text>
                      <Text style={[styles.priceVal, { color: C.success }]}>
                        −{fmt(Math.round(pricing.lines.plan_discount_per_service_paise / 100))}
                      </Text>
                    </View>
                  )}
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceKey, { fontWeight: '700', color: C.foreground }]}>
                      Per service visit ({pricing.tank_count} tank{pricing.tank_count > 1 ? 's' : ''})
                    </Text>
                    <Text style={[styles.priceVal, { fontWeight: '700' }]}>{fmt(pricing.per_service_price)}</Text>
                  </View>
                  {pricing.services_per_year > 1 && (
                    <View style={styles.priceRow}>
                      <Text style={styles.priceKey}>× {pricing.services_per_year} visits/year (annual plan)</Text>
                      <Text style={styles.priceVal}>{fmt(Math.round(pricing.annual_service_total_paise / 100))}</Text>
                    </View>
                  )}
                  {/* Itemized add-ons */}
                  {(pricing.addons || []).map((a: any) => (
                    <View style={styles.priceRow} key={a.code}>
                      <Text style={styles.priceKey}>+ {a.name}</Text>
                      <Text style={styles.priceVal}>{a.custom_quote ? 'On quote' : fmt(Math.round(a.price_paise / 100))}</Text>
                    </View>
                  ))}
                  <View style={styles.divider} />
                  {/* Tax split — Indian invoice style */}
                  <View style={styles.priceRow}>
                    <Text style={styles.priceKey}>Taxable value</Text>
                    <Text style={styles.priceVal}>{fmt(Math.round(pricing.lines.taxable_value_paise / 100))}</Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceKey}>CGST (9%)</Text>
                    <Text style={styles.priceVal}>{fmt(Math.round(pricing.lines.cgst_paise / 100))}</Text>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.priceKey}>SGST (9%)</Text>
                    <Text style={styles.priceVal}>{fmt(Math.round(pricing.lines.sgst_paise / 100))}</Text>
                  </View>
                  {pricing.lines.annual_savings_paise > 0 && (
                    <View style={styles.savingsPill}>
                      <Text style={styles.savingsText}>
                        You save {fmt(Math.round(pricing.lines.annual_savings_paise / 100))}/year vs one-time visits
                      </Text>
                    </View>
                  )}
                </>
              ) : (
              <View style={styles.priceRow}>
                <Text style={styles.priceKey}>
                  {pricing.billing_version === 2 && pricing.services_per_year > 1
                    ? `Service Plan (${pricing.services_per_year} visits/yr, ${pricing.tank_count} tank${pricing.tank_count > 1 ? 's' : ''})`
                    : 'Base Price'}
                </Text>
                <Text style={pricing.amc_covered ? [styles.priceVal, styles.strikethrough] : styles.priceVal}>
                  {fmt(pricing.base_price)}
                </Text>
              </View>
              )}
              {pricing.requires_inspection && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceKey, { color: C.warning, fontSize: 12 }]}>
                    1,00,000+ L — final quote after physical inspection
                  </Text>
                </View>
              )}
              {pricing.amc_covered && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceKey, { color: C.success }]}>
                    Covered by AMC ({pricing.amc_plan?.toUpperCase()})
                  </Text>
                  <Text style={[styles.priceVal, { color: C.success }]}>FREE</Text>
                </View>
              )}
              {pricing.billing_version !== 2 && pricing.addon_total > 0 && (
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
              {pricing.billing_version !== 2 && pricing.grand_total > 0 && (
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
  savingsPill: {
    backgroundColor: C.successBg, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start', marginTop: 6, marginBottom: 2,
  },
  savingsText: { fontSize: 12, fontWeight: '800', color: C.success },
  planSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.primaryBg, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: C.borderActive, marginBottom: 4,
  },
  planSummaryText: { flex: 1, fontSize: 12.5, color: C.foreground },
  addonSoon: { fontSize: 11, color: C.warning, marginTop: 2 },
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
