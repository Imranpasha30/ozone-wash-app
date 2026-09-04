/**
 * AutoWashPaymentScreen — online (PayU) checkout for a car-wash job.
 *
 * The auto-wash job is already created (COD-or-online decided at booking). For
 * online, we come here: create a payment order for the job, open the PayU hosted
 * checkout in a WebView, and let the backend settle server-side via the surl/furl
 * callback (settleByOrderId → auto-wash branch). On the ozw_payment=success
 * return we route to the booking detail (the job is already marked paid).
 *
 * Mirrors the PayU mechanics of the tank PaymentScreen but is self-contained so
 * it can never affect that (working) flow. PayU-only — the active gateway.
 */
import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform, Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { autoWashAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { ShieldCheck, X } from '../../components/Icons';

// Native-only WebView — never pulled into the web bundle.
let WebView: any = null;
if (Platform.OS !== 'web') {
  try { WebView = require('react-native-webview').WebView; } catch (_) { /* not linked */ }
}

const AutoWashPaymentScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useTheme();
  const styles = makeStyles(C);
  const { job_id, amount_paise, summary } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [payuHtml, setPayuHtml] = useState('');
  const [webBaseUrl, setWebBaseUrl] = useState<string | null>(null);
  const returnedRef = useRef(false);

  const rupees = (p: number) => `₹${Math.round((p || 0) / 100).toLocaleString('en-IN')}`;

  const goToDetail = () => {
    navigation.reset({
      index: 1,
      routes: [
        { name: 'CustomerTabs' },
        { name: 'AutoWashBookingDetail', params: { id: job_id } },
      ],
    });
  };

  // Auto-submit a signed PayU form POST inside the WebView. The result returns
  // via the callback page (postMessage {source:'payu', status}) or the app-return
  // URL (?ozw_payment=…); the backend has already hash-verified + settled.
  const buildPayuHtml = (actionUrl: string, params: Record<string, any>) => {
    const inputs = Object.entries(params || {})
      .map(([k, v]) => `<input type="hidden" name="${k}" value="${String(v).replace(/"/g, '&quot;')}"/>`)
      .join('');
    return `<!DOCTYPE html><html><head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>body{background:${C.background};display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;color:#F1F2F8;}</style>
      </head><body><p>Opening payment…</p>
      <form id="payuForm" method="post" action="${actionUrl}">${inputs}</form>
      <script>document.getElementById("payuForm").submit();</script>
      </body></html>`;
  };

  // Route in-app once when the PayU callback redirects to the app-return URL.
  // For auto-wash there's no booking_id in the URL — we use our own job_id.
  const handleReturnUrl = (url: string): boolean => {
    if (!url || url.indexOf('ozw_payment=') === -1) return false;
    if (returnedRef.current) return true;
    returnedRef.current = true;
    const st = (url.match(/[?&]ozw_payment=([^&]+)/) || [])[1];
    setShowCheckout(false);
    if (st === 'success') {
      goToDetail();
    } else {
      Alert.alert('Payment failed', 'Your payment didn’t go through. Your booking is saved — tap Pay to try again.');
    }
    return true;
  };

  const handleMessage = (event: any) => {
    let data: any = {};
    try { data = JSON.parse(event.nativeEvent.data); } catch { /* ignore */ }
    if (data.source === 'payu' || data.source === 'easebuzz') {
      setShowCheckout(false);
      if (data.status === 'success') goToDetail();
      else Alert.alert('Payment failed', 'Your payment didn’t go through. Your booking is saved — tap Pay to try again.');
    }
  };

  const pay = async () => {
    if (!job_id) return;
    setLoading(true);
    try {
      const res: any = await autoWashAPI.createPaymentOrder(job_id, Platform.OS === 'web' ? 'web' : undefined);
      const { gateway, payment_url, payment_params } = res.data || res;

      const ready = gateway === 'payu'
        ? (!!payment_url && !!payment_params && payment_params.hash !== 'dev')
        : (gateway === 'easebuzz' ? !!payment_url : false);
      if (!ready) {
        Alert.alert(
          'Online payment not available',
          'Online payment isn’t configured for this build. Your booking is saved — our team will collect payment on-site.',
          [{ text: 'OK', onPress: goToDetail }],
        );
        return;
      }

      // Web: full-page form POST (no WebView). PayU settles server-side.
      if (Platform.OS === 'web' || !WebView) {
        if (payment_url && payment_params && typeof document !== 'undefined') {
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = payment_url;
          Object.entries(payment_params).forEach(([k, v]) => {
            const input = document.createElement('input');
            input.type = 'hidden'; input.name = k; input.value = String(v);
            form.appendChild(input);
          });
          document.body.appendChild(form);
          form.submit();
          return;
        }
        Alert.alert('Use the mobile app to pay', 'Your booking is saved.', [{ text: 'OK', onPress: goToDetail }]);
        return;
      }

      returnedRef.current = false;
      setPayuHtml(buildPayuHtml(payment_url, payment_params));
      setWebBaseUrl(String(payment_url).split('/').slice(0, 3).join('/'));
      setShowCheckout(true);
    } catch (e: any) {
      if (e?.status === 409) {
        // Already paid — just go to the detail.
        goToDetail();
      } else {
        Alert.alert('Payment error', e?.message || 'Could not start payment. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.card}>
        <View style={styles.iconWrap}><ShieldCheck size={28} weight="fill" color={C.primary} /></View>
        <Text style={styles.title}>Complete payment</Text>
        <Text style={styles.sub}>{summary || 'Car wash booking'}</Text>
        <Text style={styles.amount}>{rupees(amount_paise)}</Text>
        <Text style={styles.note}>Secure payment via PayU. Your booking is confirmed once payment succeeds.</Text>

        <TouchableOpacity style={styles.payBtn} onPress={pay} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color={C.primaryFg} /> : <Text style={styles.payBtnText}>Pay {rupees(amount_paise)}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.laterBtn} onPress={goToDetail} disabled={loading}>
          <Text style={styles.laterText}>Pay later / view booking</Text>
        </TouchableOpacity>
      </View>

      {Platform.OS !== 'web' && WebView && showCheckout && (
        <View style={styles.overlay}>
          <View style={styles.overlayInner}>
            <TouchableOpacity style={styles.close} onPress={() => setShowCheckout(false)}>
              <X size={20} weight="bold" color={C.danger} />
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
            <WebView
              originWhitelist={['*']}
              source={{ html: payuHtml, ...(webBaseUrl ? { baseUrl: webBaseUrl } : {}) }}
              onMessage={handleMessage}
              mixedContentMode="always"
              setSupportMultipleWindows={false}
              javaScriptEnabled
              domStorageEnabled
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
              startInLoadingState
              keyboardDisplayRequiresUserAction={false}
              onNavigationStateChange={(s: any) => handleReturnUrl(s?.url || '')}
              onShouldStartLoadWithRequest={(req: any) => {
                const url = req?.url || '';
                if (handleReturnUrl(url)) return false;
                if (/^(https?|data|about|blob):/i.test(url)) return true;
                Linking.openURL(url).catch(() => {});
                return false;
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 24, alignItems: 'center' },
  iconWrap: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: C.primaryBg,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  title: { fontSize: 20, fontWeight: '800', color: C.foreground },
  sub: { fontSize: 13, color: C.muted, marginTop: 4, textAlign: 'center' },
  amount: { fontSize: 34, fontWeight: '900', color: C.foreground, marginTop: 14 },
  note: { fontSize: 12, color: C.muted, textAlign: 'center', marginTop: 10, lineHeight: 17 },
  payBtn: {
    backgroundColor: C.primary, borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', alignSelf: 'stretch', marginTop: 22,
  },
  payBtnText: { color: C.primaryFg, fontSize: 16, fontWeight: '800' },
  laterBtn: { paddingVertical: 12, marginTop: 4 },
  laterText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.background },
  overlayInner: { flex: 1, paddingTop: Platform.OS === 'android' ? 24 : 44 },
  close: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12, alignSelf: 'flex-end' },
  closeText: { color: C.danger, fontSize: 14, fontWeight: '700' },
});

export default AutoWashPaymentScreen;
