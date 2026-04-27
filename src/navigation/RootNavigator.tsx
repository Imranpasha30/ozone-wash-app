import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import useAuthStore from '../store/auth.store';
import AuthNavigator from './AuthNavigator';
import CustomerNavigator from './CustomerNavigator';
import FieldNavigator from './FieldNavigator';
import AdminNavigator from './AdminNavigator';
import { COLORS } from '../utils/constants';
import { navigationRef } from './navigationRef';

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
    <NavigationContainer ref={navigationRef}>
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