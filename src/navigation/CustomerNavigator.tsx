import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';
import { COLORS } from '../utils/constants';

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
import NotificationsScreen from '../screens/customer/NotificationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TabIcon = ({ emoji, focused }: { emoji: string; focused: boolean }) => (
  <Text style={{ fontSize: focused ? 26 : 22 }}>{emoji}</Text>
);

const CustomerTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.muted,
      tabBarStyle: {
        backgroundColor: COLORS.surface,
        borderTopColor: COLORS.border,
        borderTopWidth: 1,
        paddingBottom: 5,
        height: 60,
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600',
      },
    }}
  >
    <Tab.Screen
      name="Home"
      component={BookingHomeScreen}
      options={{
        tabBarLabel: 'Book',
        tabBarIcon: ({ focused }) => <TabIcon emoji="🚿" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="MyBookings"
      component={MyBookingsScreen}
      options={{
        tabBarLabel: 'Bookings',
        tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="Certificates"
      component={CertificatesScreen}
      options={{
        tabBarLabel: 'Certs',
        tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarLabel: 'Profile',
        tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
      }}
    />
  </Tab.Navigator>
);

const CustomerNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    {/* Main tabs */}
    <Stack.Screen name="CustomerTabs" component={CustomerTabs} />
    {/* Booking flow */}
    <Stack.Screen name="TankDetails" component={TankDetailsScreen} />
    <Stack.Screen name="DateTimeSelect" component={DateTimeScreen} />
    <Stack.Screen name="AddonsSelect" component={AddonsScreen} />
    <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
    <Stack.Screen name="BookingConfirmed" component={BookingConfirmedScreen} />
    {/* Detail views */}
    <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
    <Stack.Screen name="CertificateView" component={CertificateScreen} />
    <Stack.Screen name="AmcPlans" component={AmcPlansScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

export default CustomerNavigator;
