import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, Platform, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { amcAPI, paymentAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { useWebScrollFix } from '../../utils/useWebScrollFix';

// react-native-webview is native-only
let WebView: any = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}
import {
  ArrowLeft, Crown, ShieldCheck, CheckCircle, CreditCard,
  Calendar, Receipt, X,
} from '../../components/Icons';

const PLAN_FEATURES: Record<string, string[]> = {
  monthly: ['1 cleaning/month', 'Priority scheduling', '10% off add-ons'],
  bimonthly: ['1 cleaning/2 months', 'Priority scheduling', '12% off add-ons'],
  quarterly: ['1 cleaning/quarter', 'Priority scheduling', '15% off add-ons'],
  '4month': ['1 cleaning/4 months', 'Priority scheduling', '18% off add-ons'],
  halfyearly: ['2 cleanings/year', 'Priority scheduling', '20% off add-ons', 'Free water test'],
  yearly: ['4 cleanings/year', 'Priority scheduling', '25% off add-ons', 'Free water test', 'Dedicated team'],
};

const PLAN_DURATIONS: Record<string, number> = {
  monthly: 1, bimonthly: 2, quarterly: 3, '4month': 4, halfyearly: 6, yearly: 12,
};

const AmcEnrollmentScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();

  const { plan_type, plan_label, plan_price } = route.params || {};
  const features = PLAN_FEATURES[plan_type] || [];
  const durationMonths = PLAN_DURATIONS[plan_type] || 1;

  const [loading, setLoading] = useState(false);
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [razorpayHtml, setRazorpayHtml] = useState('');
  const contractIdRef = useRef<string | null>(null);

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + durationMonths);

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const fmt = (n: number) => `\u20B9${n.toLocaleString('en-IN')}`;

  const buildRazorpayHtml = (orderId: string, keyId: string, amount: number, contractId: string) => `
    <!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <style>body{background:${C.background};display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;color:${C.foreground};}
    .loading{font-size:18px;}</style>
    </head><body><p class="loading">Opening payment...</p><script>
    var options = {
      key: "${keyId}",
      amount: ${amount},
      currency: "INR",
      name: "Ozone Wash",
      description: "AMC ${plan_label} Plan",
      order_id: "${orderId}",
      handler: function(response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: "success",
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          contract_id: "${contractId}"
        }));
      },
      modal: { ondismiss: function() { window.ReactNativeWebView.postMessage(JSON.stringify({type:"dismissed"})); } },
      theme: { color: "${C.primary}" }
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
        await paymentAPI.verifyAmcPayment({
          contract_id: data.contract_id,
          razorpay_order_id: data.razorpay_order_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_signature: data.razorpay_signature,
        });
        navigation.reset({
          index: 0,
          routes: [
            { name: 'CustomerTabs' },
            { name: 'AmcConfirmed', params: { plan_label, plan_type, contract_id: data.contract_id } },
          ],
        });
      } else if (data.type === 'failed') {
        Alert.alert('Payment Failed', data.error || 'Payment was unsuccessful. Please try again.');
      } else if (data.type === 'dismissed') {
        Alert.alert('Payment Cancelled', 'You can try again when ready.');
      }
    } catch (err: any) {
      setShowRazorpay(false);
      Alert.alert('Payment Error', err.message || 'Could not verify payment.');
    }
  };

  const handleEnroll = async () => {
    setLoading(true);
    try {
      // Step 1: Create AMC contract (pending_payment)
      const contractRes = await amcAPI.createContract({ plan_type }) as any;
      const contract = contractRes.data?.contract;
      if (!contract?.id) throw new Error('Contract creation failed');
      contractIdRef.current = contract.id;

      // Step 2: Create Razorpay payment order
      const orderRes = await paymentAPI.createAmcOrder(contract.id) as any;
      const { order_id, key_id, amount } = orderRes.data || orderRes;

      if (!order_id || !key_id) {
        // Dev mode — no Razorpay keys, go straight to confirmed
        navigation.reset({
          index: 0,
          routes: [
            { name: 'CustomerTabs' },
            { name: 'AmcConfirmed', params: { plan_label, plan_type, contract_id: contract.id } },
          ],
        });
        return;
      }

      // Step 3: Open Razorpay checkout
      const html = buildRazorpayHtml(order_id, key_id, amount || plan_price * 100, contract.id);
      setRazorpayHtml(html);
      setShowRazorpay(true);
    } catch (err: any) {
      Alert.alert('Enrollment Failed', err?.response?.data?.message || err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={C.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enroll in AMC</Text>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.body}>
        {/* Plan Summary Card */}
        <View style={styles.planCard}>
          <View style={styles.planCardHeader}>
            <View style={styles.planIconWrap}>
              <Crown size={24} weight="fill" color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planName}>{plan_label} Plan</Text>
              <Text style={styles.planType}>Annual Maintenance Contract</Text>
            </View>
            <Text style={styles.planAmount}>{fmt(plan_price)}</Text>
          </View>

          <View style={styles.divider} />

          {/* Features */}
          {features.map((feat) => (
            <View key={feat} style={styles.featureRow}>
              <CheckCircle size={16} weight="fill" color={C.success} />
              <Text style={styles.featureText}>{feat}</Text>
            </View>
          ))}
        </View>

        {/* Contract Details */}
        <Text style={styles.sectionTitle}>Contract Details</Text>
        <View style={styles.detailCard}>
          <View style={styles.detailRow}>
            <Calendar size={16} weight="regular" color={C.muted} />
            <Text style={styles.detailLabel}>Start Date</Text>
            <Text style={styles.detailValue}>{formatDate(startDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Calendar size={16} weight="regular" color={C.muted} />
            <Text style={styles.detailLabel}>End Date</Text>
            <Text style={styles.detailValue}>{formatDate(endDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <ShieldCheck size={16} weight="regular" color={C.muted} />
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{durationMonths} month{durationMonths > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Price Breakdown */}
        <Text style={styles.sectionTitle}>Price Summary</Text>
        <View style={styles.detailCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{plan_label} Plan</Text>
            <Text style={styles.priceValue}>{fmt(plan_price)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>GST (Inclusive)</Text>
            <Text style={[styles.priceValue, { color: C.success }]}>Included</Text>
          </View>
          <View style={[styles.divider, { marginVertical: 10 }]} />
          <View style={styles.priceRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{fmt(plan_price)}</Text>
          </View>
        </View>

        {/* SLA Terms */}
        <Text style={styles.sectionTitle}>SLA Terms</Text>
        <View style={styles.detailCard}>
          <Text style={styles.slaText}>• Response within 24 hours of service request</Text>
          <Text style={styles.slaText}>• Cleaning frequency: every {durationMonths} month{durationMonths > 1 ? 's' : ''}</Text>
          <Text style={styles.slaText}>• Incident resolution within 48 hours</Text>
          <Text style={styles.slaText}>• Priority scheduling over non-AMC customers</Text>
        </View>

        {/* Pay Button */}
        <TouchableOpacity
          style={[styles.payBtn, loading && styles.payBtnDisabled]}
          onPress={handleEnroll}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={C.primaryFg} />
          ) : (
            <View style={styles.payBtnInner}>
              <CreditCard size={20} weight="regular" color={C.primaryFg} />
              <Text style={styles.payBtnText}>Pay {fmt(plan_price)} & Enroll</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.disclaimerRow}>
          <ShieldCheck size={14} weight="regular" color={C.muted} />
          <Text style={styles.disclaimer}>
            Secure payment via Razorpay. By enrolling, you agree to the AMC terms and conditions.
          </Text>
        </View>
      </ScrollView>

      {/* Razorpay WebView Modal — native only */}
      {Platform.OS !== 'web' && WebView && (
        <Modal visible={showRazorpay} animationType="slide" onRequestClose={() => setShowRazorpay(false)}>
          <View style={styles.razorpayContainer}>
            <TouchableOpacity style={styles.razorpayClose} onPress={() => setShowRazorpay(false)}>
              <X size={20} weight="bold" color={C.danger} />
              <Text style={styles.razorpayCloseText}>Close</Text>
            </TouchableOpacity>
            <WebView
              originWhitelist={['*']}
              source={{ html: razorpayHtml }}
              onMessage={handleRazorpayMessage}
              javaScriptEnabled
              domStorageEnabled
              style={{ flex: 1, backgroundColor: C.background }}
            />
          </View>
        </Modal>
      )}
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  header: {
    backgroundColor: C.surface, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center',
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },
  body: { padding: 20, paddingBottom: 40 },

  // Plan Card
  planCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },
  planCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planIconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: C.primaryBg,
    justifyContent: 'center', alignItems: 'center',
  },
  planName: { fontSize: 18, fontWeight: '700', color: C.foreground },
  planType: { fontSize: 12, color: C.muted, marginTop: 2 },
  planAmount: { fontSize: 20, fontWeight: '700', color: C.primary },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  featureText: { fontSize: 13, color: C.muted },

  // Sections
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.foreground, marginTop: 20, marginBottom: 10 },
  detailCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16,
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  detailLabel: { flex: 1, fontSize: 13, color: C.muted },
  detailValue: { fontSize: 13, fontWeight: '600', color: C.foreground },

  // Price
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  priceLabel: { fontSize: 14, color: C.muted },
  priceValue: { fontSize: 14, color: C.foreground, fontWeight: '600' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: C.foreground },
  totalValue: { fontSize: 20, fontWeight: '700', color: C.primary },

  // SLA
  slaText: { fontSize: 13, color: C.muted, lineHeight: 22 },

  // Pay Button
  payBtn: {
    backgroundColor: C.primary, borderRadius: 16, padding: 18,
    alignItems: 'center', marginTop: 24,
  },
  payBtnDisabled: { opacity: 0.5 },
  payBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  payBtnText: { color: C.primaryFg, fontWeight: '700', fontSize: 17 },

  disclaimerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 16, justifyContent: 'center' },
  disclaimer: { fontSize: 11, color: C.muted, textAlign: 'center', lineHeight: 16, flex: 1 },

  // Razorpay Modal
  razorpayContainer: { flex: 1, backgroundColor: C.background, paddingTop: 44 },
  razorpayClose: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  razorpayCloseText: { color: C.danger, fontSize: 16, fontWeight: '600' },
});

export default AmcEnrollmentScreen;
