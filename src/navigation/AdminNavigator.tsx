import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';
import { COLORS } from '../utils/constants';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminBookingsScreen from '../screens/admin/AdminBookingsScreen';
import AdminJobsScreen from '../screens/admin/AdminJobsScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TabIcon = ({ emoji, focused }: { emoji: string; focused: boolean }) => (
  <Text style={{ fontSize: focused ? 26 : 22 }}>{emoji}</Text>
);

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
        tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="AdminBookings"
      component={AdminBookingsScreen}
      options={{
        tabBarLabel: 'Bookings',
        tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="AdminJobs"
      component={AdminJobsScreen}
      options={{
        tabBarLabel: 'Jobs',
        tabBarIcon: ({ focused }) => <TabIcon emoji="🔧" focused={focused} />,
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

const AdminNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AdminTabs" component={AdminTabs} />
  </Stack.Navigator>
);

export default AdminNavigator;
