import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { COLORS } from '../utils/constants';
import { ChartBar, ClipboardText, Wrench, UserCircle } from '../components/Icons';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminBookingsScreen from '../screens/admin/AdminBookingsScreen';
import AdminJobsScreen from '../screens/admin/AdminJobsScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const AdminTabs = () => (
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
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    }}
  >
    <Tab.Screen
      name="AdminDashboard"
      component={AdminDashboardScreen}
      options={{
        tabBarLabel: 'Dashboard',
        tabBarIcon: ({ focused }) => (
          <ChartBar size={24} weight={focused ? 'fill' : 'regular'} color={focused ? COLORS.primary : COLORS.muted} />
        ),
      }}
    />
    <Tab.Screen
      name="AdminBookings"
      component={AdminBookingsScreen}
      options={{
        tabBarLabel: 'Bookings',
        tabBarIcon: ({ focused }) => (
          <ClipboardText size={24} weight={focused ? 'fill' : 'regular'} color={focused ? COLORS.primary : COLORS.muted} />
        ),
      }}
    />
    <Tab.Screen
      name="AdminJobs"
      component={AdminJobsScreen}
      options={{
        tabBarLabel: 'Jobs',
        tabBarIcon: ({ focused }) => (
          <Wrench size={24} weight={focused ? 'fill' : 'regular'} color={focused ? COLORS.primary : COLORS.muted} />
        ),
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarLabel: 'Profile',
        tabBarIcon: ({ focused }) => (
          <UserCircle size={24} weight={focused ? 'fill' : 'regular'} color={focused ? COLORS.primary : COLORS.muted} />
        ),
      }}
    />
  </Tab.Navigator>
);

const AdminNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AdminTabs" component={AdminTabs} />
  </Stack.Navigator>
);

export default AdminNavigator;
