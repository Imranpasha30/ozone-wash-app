import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Modal, Platform, Linking, Keyboard, BackHandler,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useBookingStore from '../../store/booking.store';
import usePremiumStore from '../../store/premium.store';
import { bookingAPI, paymentAPI, funnelAPI, invalidateCache } from '../../services/api';
import { API_URL, SERVICE_PLANS } from '../../utils/constants';
import { useTheme } from '../../hooks/useTheme';
import { useWebScrollFix } from '../../utils/useWebScrollFix';

// react-native-webview is native-only
let WebView: any = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}
import {
  ArrowLeft, CheckCircle, CreditCard, Wallet, CurrencyInr,
  Phone, X, House, Wrench, Drop, Receipt, ShieldCheck,
} from '../../components/Icons';
import WebContainer from '../../components/WebContainer';

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
  sectionTitle: { fontSize: 14, fontWeight: '700', color: C.foreground, marginBottom: 10, marginTop: 16 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, marginBottom: 10 },
  summaryCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#0b1220', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  row: { flexDirection: 'row', marginBottom: 10 },
  rowLabel: { width: 100, fontSize: 13, color: C.muted, fontWeight: '600' },
  rowValueWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 13, color: C.foreground, fontWeight: '600', flexShrink: 1 },
  priceCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#0b1220', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  priceLabel: { fontSize: 14, color: C.muted },
  priceValue: { fontSize: 14, color: C.foreground, fontWeight: '600' },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 8 },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: C.foreground },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: C.primary },
  payMethodCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
    shadowColor: '#0b1220', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  payMethodText: { fontSize: 16, fontWeight: 'bold', color: C.foreground },
  confirmBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  confirmBtnDisabled: { backgroundColor: C.surfaceElevated, borderWidth: 1, borderColor: C.border },
  confirmInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirmText: { color: C.primaryFg, fontWeight: 'bold', fontSize: 17 },
  pgNoteRow: { marginTop: 12, paddingHorizontal: 4 },
  pgNote: { fontSize: 11, color: C.muted, textAlign: 'center', lineHeight: 16 },
  disclaimerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 16, justifyContent: 'center' },
  disclaimer: { fontSize: 11, color: C.muted, textAlign: 'center', lineHeight: 16, flex: 1 },
  razorpayOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: C.background, zIndex: 1000, elevation: 1000,
  },
  razorpayContainer: { flex: 1, backgroundColor: C.background, paddingTop: 44 },
  razorpayClose: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  razorpayCloseText: { color: C.danger, fontSize: 16, fontWeight: '600' },
  holdBanner: {
    backgroundColor: C.primaryBg, paddingVertical: 10, paddingHorizontal: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  holdBannerText: { fontSize: 13, color: C.foreground, fontWeight: '600' },
  holdBannerTime: { fontWeight: '800', color: C.primary },
  holdBannerUrgent: { color: C.danger },
  upsellCard: {
    backgroundColor: C.primaryBg, borderRadius: 16, padding: 14,
    borderWidth: 1.5, borderColor: C.borderActive,
  },
  upsellRow: { flexDirection: 'row', gap: 8 },
  upsellChip: {
    flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: C.borderActive,
    backgroundColor: C.surface, paddingVertical: 10, paddingHorizontal: 8,
    alignItems: 'center',
  },
  upsellChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  upsellChipLabel: { fontSize: 13, fontWeight: '800', color: C.foreground },
  upsellChipSub: { fontSize: 10, color: C.muted, marginTop: 2 },
  upsellNote: { fontSize: 12, color: C.success, fontWeight: '600', marginTop: 10, lineHeight: 17 },
  upsellHint: { fontSize: 11, color: C.muted, marginTop: 10 },
  savingsPill: {
    backgroundColor: C.successBg, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start', marginTop: 6,
  },
  savingsText: { fontSize: 12, fontWeight: '800', color: C.success },
});

const PaymentScreen = () => {
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);
  const scrollRef = useWebScrollFix();

  const navigation = useNavigation<any>();
  const { draft, reset, setUpsellPlan } = useBookingStore();
  const isPremium = usePremiumStore((s) => s.isPremium);
  const [loading, setLoading] = useState(false);
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [razorpayHtml, setRazorpayHtml] = useState('');
  // Easebuzz checkout renders a hosted page URL instead of injected HTML
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  // baseUrl for the inline-HTML WebView (PayU needs a real origin so its
  // cross-origin form-POST to the hosted checkout is allowed).
  const [webBaseUrl, setWebBaseUrl] = useState<string | null>(null);
  // Keyboard height — the checkout WebView lives in a Modal, whose window does
  // NOT resize for the keyboard on Android; we shrink the WebView by this amount
  // so the focused card/OTP field stays visible above the keyboard.
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKbHeight(e.endCoordinates?.height || 0));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const [upsellLoading, setUpsellLoading] = useState(false);
  const bookingIdRef = useRef<string | null>(null);
  const paymentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Payment-hold countdown (RedBus-style) ─────────────────────────────────
  // The van slot is reserved until holdEndsAt (ms epoch, from create-order's
  // hold_expires_at). While the in-app checkout is open we tick a MM:SS badge;
  // at zero the reservation has lapsed server-side — close checkout, tell the
  // user, and send them back to rebook.
  const [holdEndsAt, setHoldEndsAt] = useState<number | null>(null);
  const [holdLeft, setHoldLeft] = useState<number>(0);
  useEffect(() => {
    if (!showRazorpay || !holdEndsAt) return;
    const tick = () => {
      const left = Math.max(0, Math.round((holdEndsAt - Date.now()) / 1000));
      setHoldLeft(left);
      if (left <= 0) {
        clearPaymentTimeout();
        setShowRazorpay(false);
        setHoldEndsAt(null);
        Alert.alert(
          'Reservation expired',
          'Your slot was held for 8 minutes and the payment wasn’t completed in time, so the slot has been released. Please book again.',
          [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'CustomerTabs' }] }) }],
        );
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [showRazorpay, holdEndsAt]);

  // Android hardware-back closes the in-window checkout overlay. (A real <Modal>
  // did this for free; our overlay — which we use to keep WebView keyboard input
  // working — must intercept back itself.)
  useEffect(() => {
    if (Platform.OS === 'web' || !showRazorpay) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setShowRazorpay(false); return true; });
    return () => sub.remove();
  }, [showRazorpay]);

  // One-shot guard for the payment-return handler; reset when a checkout opens.
  const paymentReturnedRef = useRef(false);
  useEffect(() => { if (showRazorpay) paymentReturnedRef.current = false; }, [showRazorpay]);

  // BULLETPROOF return: while the checkout is open, poll the backend. The PayU
  // callback settles the booking server-side; the instant payment_status flips to
  // 'paid' we route in-app — independent of any WebView postMessage/redirect,
  // which are unreliable on Android. (Cache is busted each poll so it reads live.)
  useEffect(() => {
    if (!showRazorpay) return;
    const bId = bookingIdRef.current;
    if (!bId) return;
    let stop = false;
    const poll = async () => {
      if (stop || paymentReturnedRef.current) return;
      try {
        invalidateCache(`/bookings/${bId}`);
        const res: any = await bookingAPI.getBooking(bId);
        const b = res?.data?.booking || res?.data || res?.booking || res;
        const ps = b?.payment_status;
        console.log('[pay-poll]', bId, 'payment_status=', ps);
        if (ps === 'paid' && !paymentReturnedRef.current) {
          paymentReturnedRef.current = true;
          clearPaymentTimeout();
          setHoldEndsAt(null);
          setShowRazorpay(false);
          goToConfirmed(bId);
        }
      } catch (e: any) {
        console.log('[pay-poll] err', e?.message);
      }
    };
    const id = setInterval(poll, 2500);
    poll();
    return () => { stop = true; clearInterval(id); };
  }, [showRazorpay]);

  const tankSizes = (draft.tanks?.length ? draft.tanks : [{ tank_size_litres: draft.tank_size_litres }])
    .map((t: any) => Number(t.tank_size_litres) || 1000);

  // Funnel: customer reached the payment step
  React.useEffect(() => {
    funnelAPI.track(4, { plan: draft.plan, total: draft.grand_total });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AMC upsell at checkout ────────────────────────────────────────────────
  // One-time customers can add an AMC while paying: the bill switches to the
  // annual plan invoice and today's service becomes visit #1 of the plan.
  const showUpsell = !isPremium && draft.plan === 'one_time' && !draft.pricing?.amc_covered;
  const applyUpsell = async (plan: '' | 'half_yearly' | 'quarterly' | 'monthly') => {
    if (upsellLoading) return;
    setUpsellLoading(true);
    try {
      const res: any = await bookingAPI.getQuote(tankSizes, plan || 'one_time', draft.addons || []);
      const p = res.data?.pricing || res.data;
      if (p) setUpsellPlan(plan as any, p);
    } catch {
      Alert.alert('Could not update bill', 'Please try again.');
    } finally {
      setUpsellLoading(false);
    }
  };
  const upsellMeta = draft.purchase_amc_plan
    ? SERVICE_PLANS.find((p) => p.value === draft.purchase_amc_plan)
    : null;

  // Detect placeholder / unconfigured Razorpay key
  const isPlaceholderKey = (k: any): boolean => {
    if (!k || typeof k !== 'string') return true;
    const s = k.trim();
    if (s.length < 10) return true;
    if (s.startsWith('your-')) return true;
    if (s.toLowerCase().includes('placeholder')) return true;
    return false;
  };

  const clearPaymentTimeout = () => {
    if (paymentTimeoutRef.current) {
      clearTimeout(paymentTimeoutRef.current);
      paymentTimeoutRef.current = null;
    }
  };

  const PaymentMethodIcon = ({ method }: { method: string }) => {
    switch (method) {
      case 'upi': return <Phone size={24} weight="regular" color={C.primary} />;
      case 'card': return <CreditCard size={24} weight="regular" color={C.primary} />;
      case 'wallet': return <Wallet size={24} weight="regular" color={C.primary} />;
      case 'cod': return <CurrencyInr size={24} weight="regular" color={C.primary} />;
      default: return <CreditCard size={24} weight="regular" color={C.primary} />;
    }
  };

  const TankIcon = ({ type }: { type: string }) => {
    if (type === 'overhead') return <House size={16} weight="regular" color={C.primary} />;
    if (type === 'underground') return <Wrench size={16} weight="regular" color={C.primary} />;
    return <Drop size={16} weight="fill" color={C.primary} />;
  };

  const Row = ({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValueWrap}>
        {icon}
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );

  const PriceRow = ({ label, value, isTotal }: { label: string; value: string; isTotal?: boolean }) => (
    <View style={styles.priceRow}>
      <Text style={[styles.priceLabel, isTotal && styles.totalLabel]}>{label}</Text>
      <Text style={[styles.priceValue, isTotal && styles.totalValue]}>{value}</Text>
    </View>
  );

  const fmt = (n: number) => `\u20B9${n.toLocaleString('en-IN')}`;

  const tankLabel = draft.tank_type === 'overhead'
    ? 'Overhead Tank'
    : draft.tank_type === 'underground'
    ? 'Underground Tank'
    : 'Sump';

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
    <style>body{background:${C.background};display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;color:#F1F2F8;}
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

  // PayU hosted checkout: auto-submit a signed form POST to {payment_url}.
  // The result returns via the surl/furl callback page which postMessages
  // { source:'payu', status } to this WebView (backend already settled).
  const buildPayuHtml = (actionUrl: string, params: Record<string, any>) => {
    const inputs = Object.entries(params || {})
      .map(([k, v]) => `<input type="hidden" name="${k}" value="${String(v).replace(/"/g, '&quot;')}"/>`)
      .join('');
    return `<!DOCTYPE html><html><head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>body{background:${C.background};display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;color:#F1F2F8;}</style>
      </head><body><p>Opening payment...</p>
      <form id="payuForm" method="post" action="${actionUrl}">${inputs}</form>
      <script>document.getElementById("payuForm").submit();</script>
      </body></html>`;
  };

  // Reliable payment-return handler. The PayU callback navigates the WebView to
  // {APP_URL}/payu-app-return?ozw_payment=…&booking_id=… . We catch that from
  // EITHER onShouldStartLoadWithRequest OR onNavigationStateChange (Android is
  // inconsistent about which fires for a JS redirect) and route in-app once.
  const handlePaymentReturnUrl = (url: string): boolean => {
    if (!url || url.indexOf('ozw_payment=') === -1) return false;
    if (paymentReturnedRef.current) return true;
    paymentReturnedRef.current = true;
    const st = (url.match(/[?&]ozw_payment=([^&]+)/) || [])[1];
    const bId = (url.match(/[?&]booking_id=([^&]+)/) || [])[1];
    clearPaymentTimeout();
    setHoldEndsAt(null);
    setShowRazorpay(false);
    if (st === 'success') {
      goToConfirmed(decodeURIComponent(bId || '') || bookingIdRef.current || '');
    } else {
      Alert.alert(
        'Payment failed',
        'Your payment didn’t go through, so the booking isn’t placed. Your slot is held for a few minutes — tap Pay to try again, or pick another time.',
      );
    }
    return true;
  };

  const handleRazorpayMessage = async (event: any) => {
    clearPaymentTimeout();
    let data: any;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch (parseErr) {
      setShowRazorpay(false);
      Alert.alert('Payment Error', 'Received an invalid response from payment gateway. Please try again.');
      return;
    }
    setShowRazorpay(false);

    try {
      if (data.source === 'easebuzz' || data.source === 'payu') {
        // Hosted-checkout callback page relayed the result. The backend already
        // hash-verified + settled the booking in the callback handler.
        if (data.status === 'success') {
          goToConfirmed(bookingIdRef.current || '');
        } else {
          setHoldEndsAt(null);
          Alert.alert(
            'Payment failed',
            'Your payment didn’t go through, so the booking isn’t placed. Your slot is held for a few minutes — tap Pay to try again, or pick another time.',
          );
        }
        return;
      }
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
      Alert.alert('Payment Error', err.message || 'Could not verify payment.');
    }
  };

  const handleWebViewError = (e?: any) => {
    clearPaymentTimeout();
    const ne = e?.nativeEvent;
    console.log('[payment] WebView onError:', JSON.stringify(ne));
    setShowRazorpay(false);
    const bookingId = bookingIdRef.current;
    const detail = ne ? `\n\n[${ne.code ?? '?'}] ${String(ne.description ?? '').slice(0, 80)}\n${String(ne.url ?? '').slice(0, 60)}` : '';
    Alert.alert(
      'Payment Unavailable',
      'Could not load the payment screen. You can retry, or your booking has been saved — pay Cash on Delivery instead.' + detail,
      [
        { text: 'Retry', onPress: () => { if (bookingId) retryRazorpay(bookingId); } },
        {
          text: 'Use COD',
          onPress: () => { if (bookingId) goToConfirmed(bookingId); },
        },
      ],
    );
  };

  // Hosted checkout pages (PayU/Razorpay) load many sub-resources; a stray
  // 4xx/5xx on one of them must NOT tear down the payment. Log only — genuine
  // navigation failures still surface via onError, and the 30s timeout backs it up.
  const handleWebViewHttpError = (e: any) => {
    console.log('[payment] webview http status', e?.nativeEvent?.statusCode, e?.nativeEvent?.url);
  };

  const armPaymentTimeout = (bookingId: string) => {
    clearPaymentTimeout();
    // Only a safety net for a checkout page that NEVER loads. It is cleared the
    // moment the page loads (WebView onLoadEnd), so it can't interrupt someone
    // actively entering card/OTP details.
    paymentTimeoutRef.current = setTimeout(() => {
      setShowRazorpay(false);
      Alert.alert(
        'Payment Timed Out',
        'No response from payment gateway. Please try again or use Cash on Delivery.',
        [
          { text: 'Retry', onPress: () => retryRazorpay(bookingId) },
          { text: 'Use COD', onPress: () => goToConfirmed(bookingId) },
        ],
      );
    }, 90000);
  };

  const retryRazorpay = async (bookingId: string) => {
    try {
      const orderRes = await paymentAPI.createOrder(bookingId, Platform.OS === 'web' ? 'web' : undefined) as any;
      const { order_id, key_id, amount } = orderRes.data || orderRes;
      if (!order_id || isPlaceholderKey(key_id)) {
        Alert.alert(
          'Online Payment Not Configured',
          'Online payment is unavailable. Your booking will proceed as Cash on Delivery.',
          [{ text: 'OK', onPress: () => goToConfirmed(bookingId) }],
        );
        return;
      }
      const html = buildRazorpayHtml(order_id, key_id, amount || draft.amount_paise, bookingId);
      setRazorpayHtml(html);
      setShowRazorpay(true);
      armPaymentTimeout(bookingId);
    } catch (err: any) {
      Alert.alert('Payment Error', err.message || 'Could not start payment. Booking will proceed as COD.', [
        { text: 'OK', onPress: () => goToConfirmed(bookingId) },
      ]);
    }
  };

  // Cleanup timeout on unmount
  React.useEffect(() => () => clearPaymentTimeout(), []);

  const goToConfirmed = (bookingId: string) => {
    const addons = draft.addons || [];
    reset();
    navigation.reset({
      index: 0,
      routes: [{ name: 'CustomerTabs' }, { name: 'BookingConfirmed', params: { booking_id: bookingId, addons } }],
    });
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Create booking (billing v2 — plan + multi-tank + optional AMC upsell)
      const bookingRes = await bookingAPI.createBooking({
        tank_type: draft.tank_type,
        tank_size_litres: draft.tank_size_litres,
        tanks: draft.tanks?.length ? draft.tanks : undefined,
        property_type: draft.property_type || undefined,
        contact_name: draft.contact_name || undefined,
        contact_phone: draft.contact_phone || undefined,
        address: draft.address,
        lat: draft.lat || undefined,
        lng: draft.lng || undefined,
        slot_time: draft.slot_time,
        addons: draft.addons,
        amc_plan: draft.amc_plan || undefined,
        payment_method: draft.payment_method,
        plan: draft.plan || 'one_time',
        purchase_amc_plan: draft.purchase_amc_plan || undefined,
      }) as any;

      const bookingId = bookingRes.data?.booking?.id;
      if (!bookingId) throw new Error('Booking creation failed');
      bookingIdRef.current = bookingId;

      // AMC-covered (₹0) or COD — go straight to confirmed, no payment needed
      if (draft.grand_total === 0 || draft.payment_method === 'cod') {
        goToConfirmed(bookingId);
        return;
      }

      // Online payment — create Razorpay order and open checkout
      let orderRes: any;
      try {
        orderRes = await paymentAPI.createOrder(bookingId, Platform.OS === 'web' ? 'web' : undefined) as any;
      } catch (orderErr: any) {
        // Backend payment endpoint failed — fall back to COD gracefully.
        Alert.alert(
          'Online Payment Unavailable',
          'Could not initiate online payment. Your booking has been saved and will proceed as Cash on Delivery.',
          [{ text: 'OK', onPress: () => goToConfirmed(bookingId) }],
        );
        return;
      }

      const { order_id, key_id, amount, gateway, payment_url, payment_params, hold_expires_at } = orderRes.data || orderRes;
      // Start the RedBus-style hold countdown — the slot is reserved until this instant.
      setHoldEndsAt(hold_expires_at ? Date.parse(hold_expires_at) : null);

      // Gateway readiness — PayU needs payment_url + signed form params; Easebuzz
      // a payment_url; Razorpay a real key.
      const gatewayReady = gateway === 'payu'
        ? (!!payment_url && !!payment_params && payment_params.hash !== 'dev')
        : gateway === 'easebuzz'
          ? !!payment_url
          : (!!order_id && !isPlaceholderKey(key_id));
      if (!gatewayReady) {
        Alert.alert(
          'Online Payment Not Configured',
          'Online payment is not configured for this build. Please choose Cash on Delivery — your booking has been saved.',
          [{ text: 'OK', onPress: () => goToConfirmed(bookingId) }],
        );
        return;
      }

      // Web: there's no WebView. PayU still works via a normal full-page browser
      // form-POST to the hosted checkout — PayU settles server-side through the
      // callback, and the user returns to the app afterward (booking is already
      // confirmed + invoiced). Other gateways fall back to COD on web.
      if (Platform.OS === 'web' || !WebView) {
        if (gateway === 'payu' && payment_url && payment_params && typeof document !== 'undefined') {
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = payment_url;
          Object.entries(payment_params).forEach(([k, v]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = k;
            input.value = String(v);
            form.appendChild(input);
          });
          // Full-page redirect wipes React state — persist the addons so the
          // return handler (RootNavigator) can pass them to BookingConfirmed.
          // The booking_id itself comes back in the callback's return URL.
          try {
            window.localStorage.setItem('ozw_pending_payment', JSON.stringify({
              booking_id: bookingId,
              addons: draft.addons || [],
              txnid: order_id,
              ts: Date.now(),
            }));
          } catch { /* localStorage unavailable — addons default to [] on return */ }
          document.body.appendChild(form);
          form.submit();
          return;
        }
        Alert.alert(
          'Use Mobile App to Pay',
          'Online payment is only available in the mobile app. Your booking has been saved.',
          [{ text: 'OK', onPress: () => goToConfirmed(bookingId) }],
        );
        return;
      }

      if (gateway === 'payu') {
        // Auto-submit the signed PayU form inside the WebView; result relays
        // back via the surl/furl callback page ({ source:'payu', status }).
        // baseUrl = the PayU origin (e.g. https://test.payu.in) so the form POST
        // is treated as same-origin instead of a blocked null-origin request.
        setRazorpayHtml(buildPayuHtml(payment_url, payment_params));
        setCheckoutUrl(null);
        setWebBaseUrl(String(payment_url).split('/').slice(0, 3).join('/'));
      } else if (gateway === 'easebuzz') {
        // Hosted checkout page — result comes back via the surl/furl callback
        // page which postMessages { source:'easebuzz', status } to the WebView.
        setCheckoutUrl(payment_url);
        setRazorpayHtml('');
        setWebBaseUrl(null);
      } else {
        const html = buildRazorpayHtml(order_id, key_id, amount || draft.amount_paise, bookingId);
        setRazorpayHtml(html);
        setCheckoutUrl(null);
        setWebBaseUrl(null);
      }
      setShowRazorpay(true);
      armPaymentTimeout(bookingId);
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
          <ArrowLeft size={22} weight="regular" color={C.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{draft.grand_total === 0 ? 'Review & Confirm' : 'Review & Pay'}</Text>
        <Text style={styles.stepText}>Step 4 / 4</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: '100%' }]} />
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.body}>
        <WebContainer variant="narrow">
        {/* Booking Summary */}
        <Text style={styles.sectionTitle}>Booking Summary</Text>
        <View style={styles.summaryCard}>
          <Row label="Tank Type" value={tankLabel} icon={<TankIcon type={draft.tank_type} />} />
          <Row label="Size" value={`${draft.tank_size_litres} Litres`} />
          <Row label="Address" value={draft.address} />
          <Row label="Date & Time" value={formatSlot(draft.slot_time)} />
          {draft.addons.length > 0 && (
            <Row label="Upgrades" value={draft.addons.map((a, i) => `${i + 1}. ${a.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}`).join('\n')} />
          )}
          {draft.amc_plan && <Row label="AMC Plan" value={draft.amc_plan.toUpperCase()} />}
        </View>

        {/* AMC upsell — one-time customers can join a plan while paying.
            Selecting a plan swaps the bill for the annual invoice and makes
            today's service visit #1 of the plan. */}
        {showUpsell && (
          <>
            <View style={styles.sectionTitleRow}>
              <ShieldCheck size={16} weight="fill" color={C.primary} />
              <Text style={styles.sectionTitle}>Add an AMC plan & save on every visit</Text>
            </View>
            <View style={styles.upsellCard}>
              <View style={styles.upsellRow}>
                {SERVICE_PLANS.filter((p) => p.value !== 'one_time').map((p) => {
                  const active = draft.purchase_amc_plan === p.value;
                  return (
                    <TouchableOpacity
                      key={p.value}
                      style={[styles.upsellChip, active && styles.upsellChipActive]}
                      onPress={() => applyUpsell(active ? '' : (p.value as any))}
                      disabled={upsellLoading}
                    >
                      <Text style={[styles.upsellChipLabel, active && { color: C.primaryFg }]}>{p.label}</Text>
                      <Text style={[styles.upsellChipSub, active && { color: C.primaryFg }]}>
                        {p.visitsPerYear} visits · {p.discountPct}% off
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {upsellLoading && <ActivityIndicator size="small" color={C.primary} style={{ marginTop: 8 }} />}
              {upsellMeta && !upsellLoading && (
                <Text style={styles.upsellNote}>
                  ✓ {upsellMeta.label} AMC added — {upsellMeta.visitsPerYear} services/year, billed annually.
                  Today's service counts as visit 1 of {upsellMeta.visitsPerYear}.
                </Text>
              )}
              {!upsellMeta && !upsellLoading && (
                <Text style={styles.upsellHint}>Tap a plan to see your updated bill — deselect anytime.</Text>
              )}
            </View>
          </>
        )}

        {/* Price Breakdown */}
        <View style={styles.sectionTitleRow}>
          <Receipt size={16} weight="regular" color={C.foreground} />
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
        </View>
        <View style={styles.priceCard}>
          {draft.pricing?.billing_version === 2 && draft.pricing?.lines ? (
            <>
              {/* Itemized invoice — per-tank lines, discounts, tax split */}
              {(draft.pricing.tanks || []).map((t: any, i: number) => (
                <PriceRow key={`t${i}`} label={`Tank ${i + 1} · ${t.tier_label}`} value={fmt(Math.round(t.per_tank_per_service_paise / 100))} />
              ))}
              {draft.pricing.lines.tank_discount_per_service_paise > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: C.success }]}>Multi-tank discount ({draft.pricing.lines.tank_discount_pct}%)</Text>
                  <Text style={[styles.priceValue, { color: C.success }]}>−{fmt(Math.round(draft.pricing.lines.tank_discount_per_service_paise / 100))}</Text>
                </View>
              )}
              {draft.pricing.lines.plan_discount_per_service_paise > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: C.success }]}>Plan discount ({draft.pricing.lines.plan_discount_pct}%)</Text>
                  <Text style={[styles.priceValue, { color: C.success }]}>−{fmt(Math.round(draft.pricing.lines.plan_discount_per_service_paise / 100))}</Text>
                </View>
              )}
              <PriceRow label={`Per service visit (${draft.pricing.tank_count} tank${draft.pricing.tank_count > 1 ? 's' : ''})`} value={fmt(draft.pricing.per_service_price)} />
              {draft.pricing.services_per_year > 1 && (
                <PriceRow label={`× ${draft.pricing.services_per_year} visits/year (annual plan)`} value={fmt(Math.round(draft.pricing.annual_service_total_paise / 100))} />
              )}
              {(draft.pricing.addons || []).map((a: any) => (
                <PriceRow key={a.code} label={`+ ${a.name}`} value={a.custom_quote ? 'On quote' : fmt(Math.round(a.price_paise / 100))} />
              ))}
              <View style={styles.divider} />
              <PriceRow label="Taxable value" value={fmt(Math.round(draft.pricing.lines.taxable_value_paise / 100))} />
              <PriceRow label="CGST (9%)" value={fmt(Math.round(draft.pricing.lines.cgst_paise / 100))} />
              <PriceRow label="SGST (9%)" value={fmt(Math.round(draft.pricing.lines.sgst_paise / 100))} />
              {draft.pricing.lines.annual_savings_paise > 0 && (
                <View style={styles.savingsPill}>
                  <Text style={styles.savingsText}>You save {fmt(Math.round(draft.pricing.lines.annual_savings_paise / 100))}/year vs one-time visits</Text>
                </View>
              )}
            </>
          ) : (
            <>
              <PriceRow
                label={draft.pricing?.billing_version === 2 && draft.pricing?.services_per_year > 1
                  ? `Service Plan (${draft.pricing.services_per_year} visits/yr)`
                  : 'Base Price'}
                value={draft.pricing?.amc_covered ? `${fmt(draft.base_price)}  →  FREE` : fmt(draft.base_price)}
              />
              {draft.pricing?.amc_covered && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: C.success }]}>Covered by AMC ({draft.amc_plan?.toUpperCase()})</Text>
                  <Text style={[styles.priceValue, { color: C.success }]}>✓</Text>
                </View>
              )}
              {draft.addon_total > 0 && <PriceRow label="Hygiene Upgrades" value={fmt(draft.addon_total)} />}
              {draft.grand_total > 0 && <PriceRow label="GST (18%, included)" value={fmt(draft.gst)} />}
            </>
          )}
          <View style={styles.divider} />
          <PriceRow label="Total (incl. GST)" value={draft.grand_total === 0 ? 'FREE' : fmt(draft.grand_total)} isTotal />
        </View>

        {/* Payment Method — hide when nothing to pay */}
        {draft.grand_total > 0 && (
          <>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.payMethodCard}>
              <PaymentMethodIcon method={draft.payment_method} />
              <Text style={styles.payMethodText}>{draft.payment_method.toUpperCase()}</Text>
            </View>
          </>
        )}

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
          onPress={() => {
            // COD has no payment step to gate it, so confirm explicitly first.
            if (draft.payment_method === 'cod' && draft.grand_total > 0) {
              Alert.alert(
                'Confirm Cash-on-Service booking',
                `You'll pay ${fmt(draft.grand_total)} in cash after the service is completed. Confirm this booking?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Confirm Booking', onPress: () => handleConfirm() },
                ],
              );
              return;
            }
            handleConfirm();
          }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={C.primaryFg} />
          ) : (
            <View style={styles.confirmInner}>
              {draft.grand_total === 0 || draft.payment_method === 'cod' ? (
                <CheckCircle size={20} weight="fill" color={C.primaryFg} />
              ) : (
                <CreditCard size={20} weight="regular" color={C.primaryFg} />
              )}
              <Text style={styles.confirmText}>
                {draft.grand_total === 0
                  ? 'Confirm Booking'
                  : draft.payment_method === 'cod'
                  ? 'Confirm Booking'
                  : `Pay ${fmt(draft.grand_total)}`}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {draft.grand_total > 0 && draft.payment_method !== 'cod' && (
          <View style={styles.pgNoteRow}>
            <Text style={styles.pgNote}>
              No extra charges from us — standard bank/UPI processing fees may apply per your bank's policy.
            </Text>
          </View>
        )}

        <View style={styles.disclaimerRow}>
          <ShieldCheck size={14} weight="regular" color={C.muted} />
          <Text style={styles.disclaimer}>
            By confirming, you agree to our terms of service. Cancellations must be made 24 hours in advance.
          </Text>
        </View>
        </WebContainer>
      </ScrollView>

      {/* PayU/Razorpay WebView checkout — native only. Rendered as a full-screen
          absolute OVERLAY, NOT a React Native <Modal>: on Android a WebView inside
          a Modal loses its keyboard input connection, so text fields (card-holder
          name, 3-D-Secure OTP) accept focus but drop every keystroke. A normal
          in-window overlay keeps typing working. */}
      {Platform.OS !== 'web' && WebView && showRazorpay && (
        <View style={styles.razorpayOverlay}>
          <View style={[styles.razorpayContainer, { paddingBottom: kbHeight }]}>
            <TouchableOpacity style={styles.razorpayClose} onPress={() => setShowRazorpay(false)}>
              <X size={20} weight="bold" color={C.danger} />
              <Text style={styles.razorpayCloseText}>Close</Text>
            </TouchableOpacity>
            {holdLeft > 0 && (
              <View style={styles.holdBanner}>
                <Text style={styles.holdBannerText}>
                  ⏳ Slot reserved · complete payment in{' '}
                  <Text style={[styles.holdBannerTime, holdLeft <= 60 && styles.holdBannerUrgent]}>
                    {Math.floor(holdLeft / 60)}:{String(holdLeft % 60).padStart(2, '0')}
                  </Text>
                </Text>
              </View>
            )}
            <WebView
              originWhitelist={['*']}
              source={checkoutUrl ? { uri: checkoutUrl } : { html: razorpayHtml, ...(webBaseUrl ? { baseUrl: webBaseUrl } : {}) }}
              onMessage={handleRazorpayMessage}
              onError={handleWebViewError}
              onHttpError={handleWebViewHttpError}
              mixedContentMode="always"
              setSupportMultipleWindows={false}
              javaScriptEnabled
              domStorageEnabled
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
              userAgent="Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
              startInLoadingState
              onLoadEnd={() => clearPaymentTimeout()}
              keyboardDisplayRequiresUserAction={false}
              nestedScrollEnabled
              // Android often does NOT fire onShouldStartLoadWithRequest for a JS
              // location.replace, so we ALSO watch onNavigationStateChange — the
              // first to report the return URL routes in-app (guarded, runs once).
              onNavigationStateChange={(s: any) => { console.log('[pay-nav]', s?.url); handlePaymentReturnUrl(s?.url || ''); }}
              onShouldStartLoadWithRequest={(req: any) => {
                const url = req?.url || '';
                console.log('[pay-should]', url);
                // Payment-return sentinel — intercept it, don't load it.
                if (handlePaymentReturnUrl(url)) return false;
                // Normal web pages load in the WebView.
                if (/^(https?|data|about|blob):/i.test(url)) return true;
                // UPI / bank-app deep links (upi://, tez://, phonepe://,
                // paytmmp://, intent://, …) — hand off to the installed app.
                Linking.openURL(url).catch(() => {});
                return false;
              }}
              style={{ flex: 1, backgroundColor: C.background }}
            />
          </View>
        </View>
      )}
    </View>
  );
};

export default PaymentScreen;
