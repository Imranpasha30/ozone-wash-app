import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Alert, Platform, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { fieldAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useWebScrollFix } from '../../utils/useWebScrollFix';
import ScreenHeader from '../../components/ScreenHeader';
import WebContainer from '../../components/WebContainer';
import {
  CheckCircle, CurrencyInr, Wallet, CreditCard, Star, ShieldCheck, Flask,
} from '../../components/Icons';

type AmcInterest = 'signed_up' | 'interested' | 'not_interested';

const AMC_OPTIONS: { value: AmcInterest; label: string }[] = [
  { value: 'signed_up', label: 'Signed up now' },
  { value: 'interested', label: 'Interested — follow up' },
  { value: 'not_interested', label: 'Not interested' },
];

const CloseoutScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();

  const { jobId, amountPaise, paymentStatus } = route.params || {};
  const knownAmount = Number.isFinite(Number(amountPaise)) && Number(amountPaise) > 0;

  const [paid, setPaid] = useState(paymentStatus === 'paid');
  const [paidMethod, setPaidMethod] = useState<string | null>(paymentStatus === 'paid' ? 'prepaid' : null);
  const [payLoading, setPayLoading] = useState<'upi' | 'cash' | null>(null);
  const [manualAmount, setManualAmount] = useState('');
  const [amc, setAmc] = useState<AmcInterest | null>(null);
  const [review, setReview] = useState<boolean | null>(null);
  const [o2Bar, setO2Bar] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const errInfo = (e: any) => {
    const d = e?.response?.data || e || {};
    return { status: e?.status ?? e?.response?.status, message: d?.message as string | undefined };
  };

  const collect = async (method: 'upi' | 'cash') => {
    const paise = knownAmount ? Number(amountPaise) : Math.round(parseFloat(manualAmount) * 100);
    if (!Number.isFinite(paise) || paise <= 0) {
      Alert.alert('Enter Amount', 'Enter the amount collected in rupees first.');
      return;
    }
    setPayLoading(method);
    try {
      const res = await fieldAPI.collectPayment(jobId, method, paise) as any;
      const d = res.data || {};
      if (d.already_paid) {
        setPaid(true);
        setPaidMethod('prepaid');
        Alert.alert('Already Paid', d.message || 'Booking was pre-paid — nothing to collect.');
      } else {
        setPaid(true);
        setPaidMethod(method);
      }
    } catch (e: any) {
      const { message } = errInfo(e);
      Alert.alert('Payment Issue', message || 'Could not record the payment');
    } finally {
      setPayLoading(null);
    }
  };

  const handleSubmit = async () => {
    if (!amc) {
      Alert.alert('AMC Interest Required', 'Select the customer\'s AMC interest before closing out.');
      return;
    }
    const bar = o2Bar.trim() ? parseFloat(o2Bar) : null;
    if (bar !== null && (!Number.isFinite(bar) || bar < 0 || bar > 300)) {
      Alert.alert('Check O₂ Reading', 'Cylinder pressure must be between 0 and 300 bar.');
      return;
    }
    setSubmitting(true);
    try {
      await fieldAPI.closeout(jobId, amc, review === true);
      if (bar !== null) await fieldAPI.logPostJobO2(bar);
      Alert.alert('Closeout Complete', 'Job closed out. Great work.', [
        { text: 'Done', onPress: () => navigation.navigate('FieldTabs') },
      ]);
    } catch (e: any) {
      const { message } = errInfo(e);
      Alert.alert('Blocked', message || 'Could not complete the closeout');
    } finally {
      setSubmitting(false);
    }
  };

  const amountLabel = knownAmount
    ? `₹${(Number(amountPaise) / 100).toLocaleString('en-IN')}`
    : '—';

  const paidLabel = paidMethod === 'prepaid'
    ? 'Pre-paid ✓'
    : paidMethod === 'upi' ? 'Collected via UPI ✓' : 'Collected in cash ✓';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      <ScreenHeader title="Job Closeout" subtitle="Payment · AMC · Review" />

      <ScrollView ref={scrollRef} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <WebContainer variant="narrow">
        {/* Payment */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <CurrencyInr size={16} weight="bold" color={C.primary} />
            <Text style={styles.cardTitle}>Payment</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Amount due</Text>
            <Text style={styles.amountValue}>{amountLabel}</Text>
          </View>

          {paid ? (
            <View style={styles.paidRow}>
              <CheckCircle size={18} weight="fill" color={C.success} />
              <Text style={styles.paidText}>{paidLabel}</Text>
            </View>
          ) : (
            <>
              {!knownAmount && (
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  placeholder="Amount collected (₹)"
                  placeholderTextColor={C.muted}
                  value={manualAmount}
                  onChangeText={setManualAmount}
                />
              )}
              <View style={styles.payRow}>
                <TouchableOpacity
                  style={[styles.payBtn, payLoading !== null && styles.disabled]}
                  onPress={() => collect('upi')}
                  disabled={payLoading !== null}
                  activeOpacity={0.8}
                >
                  {payLoading === 'upi' ? (
                    <ActivityIndicator color={C.primaryFg} />
                  ) : (
                    <>
                      <CreditCard size={16} weight="fill" color={C.primaryFg} />
                      <Text style={styles.payBtnText}>Collected via UPI</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.payBtn, styles.cashBtn, payLoading !== null && styles.disabled]}
                  onPress={() => collect('cash')}
                  disabled={payLoading !== null}
                  activeOpacity={0.8}
                >
                  {payLoading === 'cash' ? (
                    <ActivityIndicator color={C.primary} />
                  ) : (
                    <>
                      <Wallet size={16} weight="fill" color={C.primary} />
                      <Text style={[styles.payBtnText, { color: C.primary }]}>Collected Cash</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* AMC interest */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <ShieldCheck size={16} weight="fill" color={C.primary} />
            <Text style={styles.cardTitle}>AMC Interest</Text>
            <Text style={styles.required}>Required</Text>
          </View>
          <View style={styles.chipCol}>
            {AMC_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, amc === opt.value && styles.chipActive]}
                onPress={() => setAmc(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, amc === opt.value && styles.chipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {amc === 'signed_up' && (
            <Text style={styles.hint}>
              The customer completes the AMC purchase in their own app — nothing to collect here.
            </Text>
          )}
        </View>

        {/* Google review */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Star size={16} weight="fill" color={C.warning} />
            <Text style={styles.cardTitle}>Review requested?</Text>
          </View>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, review === true && styles.chipActive]}
              onPress={() => setReview(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, review === true && styles.chipTextActive]}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, review === false && styles.chipActive]}
              onPress={() => setReview(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, review === false && styles.chipTextActive]}>No</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Did you ask the customer for a Google review?</Text>
        </View>

        {/* Post-job O2 */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Flask size={16} weight="fill" color={C.primary} />
            <Text style={styles.cardTitle}>O₂ Cylinder After Job</Text>
          </View>
          <TextInput
            style={styles.input}
            keyboardType="decimal-pad"
            placeholder="Pressure (bar)"
            placeholderTextColor={C.muted}
            value={o2Bar}
            onChangeText={setO2Bar}
          />
          <Text style={styles.hint}>Below 20 bar triggers a refill alert automatically.</Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (submitting || !amc) && styles.disabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={C.primaryFg} />
          ) : (
            <View style={styles.submitContent}>
              <CheckCircle size={18} weight="fill" color={C.primaryFg} />
              <Text style={styles.submitText}>Complete Closeout</Text>
            </View>
          )}
        </TouchableOpacity>
        </WebContainer>
      </ScrollView>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  body: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 16,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: C.foreground, flex: 1 },
  required: { fontSize: 11, fontWeight: '700', color: C.warning },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  amountLabel: { fontSize: 13, color: C.muted },
  amountValue: { fontSize: 22, fontWeight: '700', color: C.foreground },
  paidRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.successBg, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  paidText: { fontSize: 14, fontWeight: '700', color: C.success },
  payRow: { flexDirection: 'row', gap: 10 },
  payBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14,
  },
  cashBtn: { backgroundColor: C.primaryBg, borderWidth: 1.5, borderColor: C.primary },
  payBtnText: { fontSize: 13, fontWeight: '700', color: C.primaryFg },
  input: {
    backgroundColor: C.surfaceElevated, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontWeight: '600', color: C.foreground, marginBottom: 10,
  },
  chipCol: { gap: 8 },
  chip: {
    paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
    backgroundColor: C.surfaceElevated, borderWidth: 1.5, borderColor: C.border,
  },
  chipActive: { backgroundColor: C.primaryDim, borderColor: C.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: C.muted },
  chipTextActive: { color: C.primary },
  hint: { fontSize: 12, color: C.muted, marginTop: 10, lineHeight: 18 },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    backgroundColor: C.surfaceElevated, borderWidth: 1.5, borderColor: C.border,
  },
  submitBtn: {
    backgroundColor: C.success, borderRadius: 16,
    padding: 18, alignItems: 'center', marginTop: 4,
  },
  submitContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitText: { color: C.primaryFg, fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.5 },
});

export default CloseoutScreen;
