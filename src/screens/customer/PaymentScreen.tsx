import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useBookingStore from '../../store/booking.store';
import { bookingAPI, paymentAPI } from '../../services/api';
import { COLORS } from '../../utils/constants';

const PAYMENT_ICONS: Record<string, string> = {
  upi: '📱',
  card: '💳',
  wallet: '👛',
  cod: '💵',
};

const PaymentScreen = () => {
  const navigation = useNavigation<any>();
  const { draft, reset } = useBookingStore();
  const [loading, setLoading] = useState(false);

  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  const tankLabel = draft.tank_type === 'overhead'
    ? '🏠 Overhead Tank'
    : draft.tank_type === 'underground'
    ? '🏗️ Underground Tank'
    : '🏊 Sump';

  const formatSlot = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Create booking
      const bookingRes = await bookingAPI.createBooking({
        tank_type: draft.tank_type,
        tank_size_litres: draft.tank_size_litres,
        address: draft.address,
        slot_time: draft.slot_time,
        addons: draft.addons,
        amc_plan: draft.amc_plan || undefined,
        payment_method: draft.payment_method,
      }) as any;

      const bookingId = bookingRes.data?.booking?.id;

      if (!bookingId) throw new Error('Booking creation failed');

      // For UPI / card / wallet — create Razorpay order
      if (draft.payment_method !== 'cod') {
        try {
          await paymentAPI.createOrder(bookingId);
          // In prod: open Razorpay SDK here with order_id
          // For now we treat it as paid and go to confirmed screen
        } catch (_) {
          // Order creation may fail with placeholder creds — still proceed
        }
      }

      reset();
      navigation.reset({
        index: 0,
        routes: [{ name: 'CustomerTabs' }, { name: 'BookingConfirmed', params: { booking_id: bookingId } }],
      });
    } catch (err: any) {
      Alert.alert('Booking Failed', err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review & Pay</Text>
        <Text style={styles.stepText}>Step 4 / 4</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '100%' }]} />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Booking Summary */}
        <Text style={styles.sectionTitle}>Booking Summary</Text>
        <View style={styles.summaryCard}>
          <Row label="Tank Type" value={tankLabel} />
          <Row label="Size" value={`${draft.tank_size_litres} Litres`} />
          <Row label="Address" value={draft.address} />
          <Row label="Date & Time" value={formatSlot(draft.slot_time)} />
          {draft.addons.length > 0 && (
            <Row label="Add-ons" value={draft.addons.map((a) => a.replace(/_/g, ' ')).join(', ')} />
          )}
          {draft.amc_plan && <Row label="AMC Plan" value={draft.amc_plan.toUpperCase()} />}
        </View>

        {/* Price Breakdown */}
        <Text style={styles.sectionTitle}>Price Breakdown</Text>
        <View style={styles.priceCard}>
          <PriceRow label="Base Price" value={fmt(draft.base_price)} />
          {draft.addon_total > 0 && <PriceRow label="Add-ons" value={fmt(draft.addon_total)} />}
          <PriceRow label="GST (18%)" value={fmt(draft.gst)} />
          <View style={styles.divider} />
          <PriceRow label="Total" value={fmt(draft.grand_total)} isTotal />
        </View>

        {/* Payment Method */}
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.payMethodCard}>
          <Text style={styles.payIcon}>{PAYMENT_ICONS[draft.payment_method]}</Text>
          <Text style={styles.payMethodText}>{draft.payment_method.toUpperCase()}</Text>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.primaryFg} />
          ) : (
            <Text style={styles.confirmText}>
              {draft.payment_method === 'cod' ? '✅ Confirm Booking' : `💳 Pay ${fmt(draft.grand_total)}`}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By confirming, you agree to our terms of service. Cancellations must be made 24 hours in advance.
        </Text>
      </ScrollView>
    </View>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const PriceRow = ({ label, value, isTotal }: { label: string; value: string; isTotal?: boolean }) => (
  <View style={styles.priceRow}>
    <Text style={[styles.priceLabel, isTotal && styles.totalLabel]}>{label}</Text>
    <Text style={[styles.priceValue, isTotal && styles.totalValue]}>{value}</Text>
  </View>
);

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
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.foreground, marginBottom: 10, marginTop: 16 },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: { flexDirection: 'row', marginBottom: 10 },
  rowLabel: { width: 100, fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  rowValue: { flex: 1, fontSize: 13, color: COLORS.foreground, fontWeight: '600' },
  priceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontSize: 14, color: COLORS.muted },
  priceValue: { fontSize: 14, color: COLORS.foreground, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: COLORS.foreground },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: COLORS.primary },
  payMethodCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  payIcon: { fontSize: 28, marginRight: 12 },
  payMethodText: { fontSize: 16, fontWeight: 'bold', color: COLORS.foreground },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  confirmBtnDisabled: { backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border },
  confirmText: { color: COLORS.primaryFg, fontWeight: 'bold', fontSize: 17 },
  disclaimer: { fontSize: 11, color: COLORS.muted, textAlign: 'center', marginTop: 16, lineHeight: 16 },
});

export default PaymentScreen;
