import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LandingScreen from '../screens/auth/LandingScreen';
import PhoneInputScreen from '../screens/auth/PhoneInputScreen';
import OTPVerifyScreen from '../screens/auth/OTPVerifyScreen';
import FaqScreen from '../screens/auth/FaqScreen';
import AboutScreen from '../screens/auth/AboutScreen';
import PolicyScreen from '../screens/shared/PolicyScreen';

type AuthStackParamList = {
  Landing: undefined;
  PhoneInput: undefined;
  OTPVerify: { phone: string };
  Faq: undefined;
  About: undefined;
  Policy: { type: 'terms' | 'privacy' | 'refund' };
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
    </Stack.Navigator>
  );
};

export default AuthNavigator;