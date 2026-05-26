import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LandingScreen from '../screens/auth/LandingScreen';
import PhoneInputScreen from '../screens/auth/PhoneInputScreen';
import OTPVerifyScreen from '../screens/auth/OTPVerifyScreen';
import FaqScreen from '../screens/auth/FaqScreen';
import AboutScreen from '../screens/auth/AboutScreen';
import PolicyScreen from '../screens/shared/PolicyScreen';
import CarWashLandingScreen from '../screens/auth/CarWashLandingScreen';
import CarWashAreaScreen from '../screens/auth/CarWashAreaScreen';
import BlogPostScreen from '../screens/auth/BlogPostScreen';
import AdminLoginScreen from '../screens/auth/AdminLoginScreen';

type AuthStackParamList = {
  Landing: undefined;
  PhoneInput: undefined;
  OTPVerify: { phone: string };
  Faq: undefined;
  About: undefined;
  Policy: { type: 'terms' | 'privacy' | 'refund' };
  CarWash: undefined;
  CarWashArea: { slug: string };
  Blog: { slug?: string };
  AdminLogin: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="PhoneInput" component={PhoneInputScreen} />
      <Stack.Screen name="OTPVerify" component={OTPVerifyScreen} />
      <Stack.Screen name="Faq" component={FaqScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="Policy" component={PolicyScreen} />
      <Stack.Screen name="CarWash" component={CarWashLandingScreen} />
      <Stack.Screen name="CarWashArea" component={CarWashAreaScreen} />
      <Stack.Screen name="Blog" component={BlogPostScreen} />
      {/* Admin login — hidden screen reachable ONLY via direct URL /admin-login.
          Do NOT add a UI link to this screen from any public surface. */}
      <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;