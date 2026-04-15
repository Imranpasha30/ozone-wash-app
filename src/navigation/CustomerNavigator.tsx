import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../hooks/useTheme';
import { Drop, ClipboardText, Trophy, UserCircle } from '../components/Icons';

// Tab screens
import BookingHomeScreen from '../screens/customer/BookingHomeScreen';
import MyBookingsScreen from '../screens/customer/MyBookingsScreen';
import CertificatesScreen from '../screens/customer/CertificatesScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';

// Stack screens — booking flow
import TankDetailsScreen from '../screens/customer/TankDetailsScreen';
import DateTimeScreen from '../screens/customer/DateTimeScreen';
import AddonsScreen from '../screens/customer/AddonsScreen';
import PaymentScreen from '../screens/customer/PaymentScreen';
import BookingConfirmedScreen from '../screens/customer/BookingConfirmedScreen';
import BookingDetailScreen from '../screens/customer/BookingDetailScreen';
import CertificateScreen from '../screens/customer/CertificateScreen';
import AmcPlansScreen from '../screens/customer/AmcPlansScreen';
import AmcEnrollmentScreen from '../screens/customer/AmcEnrollmentScreen';
import AmcConfirmedScreen from '../screens/customer/AmcConfirmedScreen';
import NotificationsScreen from '../screens/customer/NotificationsScreen';
import QrScannerScreen from '../screens/shared/QrScannerScreen';
import CertVerifyResultScreen from '../screens/shared/CertVerifyResultScreen';
import LiveWatchScreen from '../screens/customer/LiveWatchScreen';
import AddressPickerScreen from '../screens/customer/AddressPickerScreen';
import PolicyScreen from '../screens/shared/PolicyScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const CustomerTabs = () => {
  const C = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: {
          backgroundColor: C.surface,
          borderTopColor: C.border,
          borderTopWidth: 0.5,
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
          elevation: 12,
          shadowColor: C.shadow,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 1,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={BookingHomeScreen}
        options={{
          tabBarLabel: 'Book',
          tabBarIcon: ({ focused }) => (
            <Drop size={24} weight={focused ? 'fill' : 'regular'} color={focused ? C.primary : C.muted} />
          ),
        }}
      />
      <Tab.Screen
        name="MyBookings"
        component={MyBookingsScreen}
        options={{
          tabBarLabel: 'Bookings',
          tabBarIcon: ({ focused }) => (
            <ClipboardText size={24} weight={focused ? 'fill' : 'regular'} color={focused ? C.primary : C.muted} />
          ),
        }}
      />
      <Tab.Screen
        name="Certificates"
        component={CertificatesScreen}
        options={{
          tabBarLabel: 'Certs',
          tabBarIcon: ({ focused }) => (
            <Trophy size={24} weight={focused ? 'fill' : 'regular'} color={focused ? C.primary : C.muted} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => (
            <UserCircle size={24} weight={focused ? 'fill' : 'regular'} color={focused ? C.primary : C.muted} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const BOOKING_FLOW_OPTIONS = {
  gestureEnabled: true,
  gestureDirection: 'horizontal' as const,
  cardStyleInterpolator: ({ current, next, layouts }: any) => ({
    cardStyle: {
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.width, 0],
          }),
        },
      ],
    },
    overlayStyle: {
      opacity: current.progress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }),
    },
  }),
};

const CustomerNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    {/* Main tabs */}
    <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
    {/* Booking flow — gesture swipe enabled */}
    <Stack.Screen name="TankDetails" component={TankDetailsScreen} options={BOOKING_FLOW_OPTIONS} />
    <Stack.Screen name="DateTimeSelect" component={DateTimeScreen} options={BOOKING_FLOW_OPTIONS} />
    <Stack.Screen name="AddonsSelect" component={AddonsScreen} options={BOOKING_FLOW_OPTIONS} />
    <Stack.Screen name="PaymentScreen" component={PaymentScreen} options={BOOKING_FLOW_OPTIONS} />
    <Stack.Screen name="BookingConfirmed" component={BookingConfirmedScreen} />
    {/* Detail views */}
    <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
    <Stack.Screen name="CertificateView" component={CertificateScreen} />
    <Stack.Screen name="AmcPlans" component={AmcPlansScreen} />
    <Stack.Screen name="AmcEnrollment" component={AmcEnrollmentScreen} />
    <Stack.Screen name="AmcConfirmed" component={AmcConfirmedScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="QrScanner" component={QrScannerScreen} />
    <Stack.Screen name="CertVerifyResult" component={CertVerifyResultScreen} />
    <Stack.Screen name="LiveWatch" component={LiveWatchScreen} />
    <Stack.Screen
      name="AddressPicker"
      component={AddressPickerScreen}
      options={{
        gestureEnabled: true,
        gestureDirection: 'horizontal' as const,
        cardStyleInterpolator: ({ current, next, layouts }: any) => ({
          cardStyle: {
            transform: [
              {
                translateX: current.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [layouts.screen.width, 0],
                }),
              },
            ],
          },
        }),
      }}
    />
    <Stack.Screen name="Policy" component={PolicyScreen} />
  </Stack.Navigator>
);

export default CustomerNavigator;
