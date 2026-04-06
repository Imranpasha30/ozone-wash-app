import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import useBookingStore from '../../store/booking.store';
import { bookingAPI, paymentAPI } from '../../services/api';
import { COLORS, API_URL } from '../../utils/constants';

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
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [razorpayHtml, setRazorpayHtml] = useState('');
  const bookingIdRef = useRef<string | null>(null);

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

  const buildRazorpayHtml = (orderId: string, keyId: string, amount: number, bookingId: string) => `
    <!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <style>body{background:#0B0C18;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;color:#F1F2F8;}
    .loading{font-size:18px;}</style>
    </head><body><p class="loading">Opening payment...</p><script>
    var options = {
      key: "${keyId}",
      amount: ${amount},
      currency: "INR",
      name: "Ozone Wash",
      description: "Tank Cleaning Service",
      order_id: "${orderId}",
      handler: function(response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: "success",
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          booking_id: "${bookingId}"
        }));
      },
      modal: { ondismiss: function() { window.ReactNativeWebView.postMessage(JSON.stringify({type:"dismissed"})); } },
      theme: { color: "#2DD4BF" }
    };
    var rzp = new Razorpay(options);
    rzp.on("payment.failed", function(resp) {
      window.ReactNativeWebView.postMessage(JSON.stringify({type:"failed", error: resp.error.description}));
    });
    rzp.open();
    </script></body></html>`;

  const handleRazorpayMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      setShowRazorpay(false);

      if (data.type === 'success') {
        // Verify payment on backend
        await paymentAPI.verifyPayment({
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
          booking_id: data.booking_id,
        });
        goToConfirmed(data.booking_id);
      } else if (data.type === 'failed') {
        Alert.alert('Payment Failed', data.error || 'Payment was unsuccessful. Please try again.');
      } else if (data.type === 'dismissed') {
        Alert.alert('Payment Cancelled', 'You can try again or choose a different payment method.');
      }
    } catch (err: any) {
      setShowRazorpay(false);
      Alert.alert('Payment Error', err.message || 'Could not verify payment.');
    }
  };

  const goToConfirmed = (bookingId: string) => {
    reset();
    navigation.reset({
      index: 0,
      routes: [{ name: 'CustomerTabs' }, { name: 'BookingConfirmed', params: { booking_id: bookingId } }],
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
      bookingIdRef.current = bookingId;

      // COD — go straight to confirmed
      if (draft.payment_method === 'cod') {
        goToConfirmed(bookingId);
        return;
      }

      // Online payment — create Razorpay order and open checkout
      const orderRes = await paymentAPI.createOrder(bookingId) as any;
      const { order_id, key_id, amount } = orderRes.data || orderRes;

      if (!order_id || !key_id) {
        // If Razorpay not configured, proceed without payment (dev mode)
        goToConfirmed(bookingId);
        return;
      }

      const html = buildRazorpayHtml(order_id, key_id, amount || draft.amount_paise, bookingId);
      setRazorpayHtml(html);
      setShowRazorpay(true);
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

      {/* Razorpay WebView Checkout Modal */}
      <Modal visible={showRazorpay} animationType="slide" onRequestClose={() => setShowRazorpay(false)}>
        <View style={styles.razorpayContainer}>
          <TouchableOpacity style={styles.razorpayClose} onPress={() => setShowRazorpay(false)}>
            <Text style={styles.razorpayCloseText}>✕ Close</Text>
          </TouchableOpacity>
          <WebView
            originWhitelist={['*']}
            source={{ html: razorpayHtml }}
            onMessage={handleRazorpayMessage}
            javaScriptEnabled
            domStorageEnabled
            style={{ flex: 1, backgroundColor: COLORS.background }}
          />
        </View>
      </Modal>
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
  razorpayContainer: { flex: 1, backgroundColor: COLORS.background, paddingTop: 44 },
  razorpayClose: { padding: 16, alignItems: 'flex-end' },
  razorpayCloseText: { color: COLORS.danger, fontSize: 16, fontWeight: '600' },
});

export default PaymentScreen;
