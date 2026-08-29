import React, { useEffect } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { ActivityIndicator, Alert, View } from 'react-native';
import useAuthStore from '../store/auth.store';
import AuthNavigator from './AuthNavigator';
import CustomerNavigator from './CustomerNavigator';
import FieldNavigator from './FieldNavigator';
import AdminNavigator from './AdminNavigator';
import { COLORS } from '../utils/constants';
import { navigationRef } from './navigationRef';

/**
 * Captured ONCE at import time — before React Navigation's linking can rewrite
 * window.location — so a PayU web redirect back into the app
 * (?ozw_payment=…&booking_id=…) is never lost. null on native or when absent.
 */
const WEB_PAYMENT_RETURN: { status: string; bookingId: string } | null = (() => {
  try {
    if (typeof window === 'undefined' || !window.location || !window.location.search) return null;
    const q = new URLSearchParams(window.location.search);
    const status = q.get('ozw_payment');
    const bookingId = q.get('booking_id');
    if (status && bookingId) return { status, bookingId };
  } catch { /* ignore */ }
  return null;
})();

/**
 * Web URL → screen mapping. The auth-state branch picks one of these screens
 * to render, so the same path can mean different things based on login:
 *   • /admin-login  → AdminLogin (only when NOT logged in)
 *   • /admin        → super_admin's account-management screen (only when logged in as super_admin)
 *
 * Admin URLs are kept short + clean for shareability (super_admin sends a
 * direct link). They are NOT linked from any public surface.
 */
const linking: LinkingOptions<any> = {
  prefixes: ['https://ozonewash.in', 'https://www.ozonewash.in', 'ozonewash://'],
  config: {
    screens: {
      // Public (unauthenticated) routes
      Landing:       '',
      PhoneInput:    'login',
      OTPVerify:     'verify',
      Faq:           'faq',
      About:         'about',
      Policy:        'policy/:type',
      CarWash:       'car-wash',
      CarWashArea:   'car-wash/:slug',
      Blog:          'blog/:slug?',
      AdminLogin:    'admin-login',

      // Customer (authenticated) routes
      CustomerTabs: {
        screens: { Home: 'home', MyBookings: 'bookings', Certificates: 'certificates', Profile: 'profile' },
      },
      AutoWashBooking:       'book-car-wash',
      AutoWashBookingDetail: 'booking/:id',
      AutoWashCertificate:   'certificate/:id',
      AddVehicle:            'add-vehicle',

      // Admin (authenticated) routes
      AdminTabs:             'admin',
      AdminAutoWash:         'admin/auto-wash',
      AdminCreateAccount:    'admin/accounts',
    },
  },
};

const RootNavigator = () => {
  const { isAuthenticated, isInitializing, user, loadStoredAuth } = useAuthStore();

  console.log('[5] RootNavigator render — isInitializing:', isInitializing, 'isAuthenticated:', isAuthenticated);

  // Check for stored login on app start
  useEffect(() => {
    console.log('[6] RootNavigator useEffect — calling loadStoredAuth');
    loadStoredAuth();
  }, []);

  // Web only: after a PayU full-page redirect back into the app, wait for the
  // session to restore (loadStoredAuth, above) then route to the booking
  // confirmation — the web equivalent of the mobile WebView postMessage path.
  const paymentReturnHandled = React.useRef(false);
  useEffect(() => {
    if (!WEB_PAYMENT_RETURN || paymentReturnHandled.current) return;
    if (isInitializing || !isAuthenticated) return;                    // wait for session restore
    if (user?.role === 'admin' || user?.role === 'field_team') return; // customer screens only
    paymentReturnHandled.current = true;

    const { status, bookingId } = WEB_PAYMENT_RETURN;
    let addons: string[] = [];
    try {
      const raw = window.localStorage.getItem('ozw_pending_payment');
      if (raw) {
        const pp = JSON.parse(raw);
        if (pp && pp.booking_id === bookingId) addons = pp.addons || [];
      }
    } catch { /* ignore */ }
    try { window.localStorage.removeItem('ozw_pending_payment'); } catch { /* ignore */ }
    // Strip the query so a manual refresh doesn't replay the confirmation.
    try { window.history.replaceState({}, '', window.location.pathname); } catch { /* ignore */ }

    let tries = 0;
    const go = () => {
      if (navigationRef.isReady()) {
        if (status === 'success') {
          navigationRef.resetRoot({ index: 0, routes: [{ name: 'CustomerTabs' }, { name: 'BookingConfirmed', params: { booking_id: bookingId, addons } }] });
        } else {
          // Payment failed on web — the booking was not placed (hold released).
          navigationRef.resetRoot({ index: 0, routes: [{ name: 'CustomerTabs' }] });
          setTimeout(() => Alert.alert(
            'Payment failed',
            'Your payment didn’t go through, so the booking wasn’t placed. Please try booking again.',
          ), 500);
        }
      } else if (tries++ < 50) {
        setTimeout(go, 100);
      }
    };
    go();
  }, [isInitializing, isAuthenticated, user]);

  // Show spinner only during the initial stored-auth check (not during OTP verification)
  if (isInitializing) {
    console.log('[7] Showing loading spinner (isInitializing=true)');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  console.log('[8] Rendering NavigationContainer — user role:', user?.role);
  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : user?.role === 'field_team' ? (
        <FieldNavigator />
      ) : user?.role === 'admin' ? (
        <AdminNavigator />
      ) : (
        <CustomerNavigator />
      )}
    </NavigationContainer>
  );
};

export default RootNavigator;