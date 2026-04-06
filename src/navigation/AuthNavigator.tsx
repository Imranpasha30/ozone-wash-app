import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PhoneInputScreen from '../screens/auth/PhoneInputScreen';
import OTPVerifyScreen from '../screens/auth/OTPVerifyScreen';

type AuthStackParamList = {
  PhoneInput: undefined;
  OTPVerify: { phone: string };
};

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PhoneInput" component={PhoneInputScreen} />
      <Stack.Screen name="OTPVerify" component={OTPVerifyScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;