import React, { useEffect } from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import useAuthStore from '../store/auth.store';
import AuthNavigator from './AuthNavigator';
import CustomerNavigator from './CustomerNavigator';
import FieldNavigator from './FieldNavigator';
import AdminNavigator from './AdminNavigator';
import { COLORS } from '../utils/constants';
import { navigationRef } from './navigationRef';

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