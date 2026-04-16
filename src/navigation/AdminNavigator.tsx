import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { COLORS } from '../utils/constants';
import { ChartBar, ClipboardText, Wrench, UserCircle } from '../components/Icons';
import WebSidebarBar from '../components/WebSidebarBar';
import { useResponsive, SIDEBAR_WIDTH } from '../utils/responsive';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminBookingsScreen from '../screens/admin/AdminBookingsScreen';
import AdminJobsScreen from '../screens/admin/AdminJobsScreen';
import AdminTeamsScreen from '../screens/admin/AdminTeamsScreen';
import AdminCustomersScreen from '../screens/admin/AdminCustomersScreen';
import AdminIncidentsScreen from '../screens/admin/AdminIncidentsScreen';
import AdminRevenueScreen from '../screens/admin/AdminRevenueScreen';
import AdminAmcScreen from '../screens/admin/AdminAmcScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import QrScannerScreen from '../screens/shared/QrScannerScreen';
import CertVerifyResultScreen from '../screens/shared/CertVerifyResultScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const AdminTabs = () => {
  const { isLarge } = useResponsive();
  return (
  <Tab.Navigator
    tabBar={(props) =>
      isLarge ? <WebSidebarBar {...props} /> : <BottomTabBar {...props} />
    }
    sceneContainerStyle={isLarge ? { marginLeft: SIDEBAR_WIDTH } : undefined}
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.muted,
      tabBarStyle: {
        backgroundColor: COLORS.surface,
        borderTopColor: COLORS.border,
        borderTopWidth: 0.5,
        paddingBottom: 8,
        paddingTop: 8,
        height: 64,
        elevation: 12,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 1,
        shadowRadius: 12,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
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
};

const AdminNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AdminTabs" component={AdminTabs} />
    <Stack.Screen name="AdminTeams" component={AdminTeamsScreen} />
    <Stack.Screen name="AdminCustomers" component={AdminCustomersScreen} />
    <Stack.Screen name="AdminIncidents" component={AdminIncidentsScreen} />
    <Stack.Screen name="AdminRevenue" component={AdminRevenueScreen} />
    <Stack.Screen name="AdminAmc" component={AdminAmcScreen} />
    <Stack.Screen name="QrScanner" component={QrScannerScreen} />
    <Stack.Screen name="CertVerifyResult" component={CertVerifyResultScreen} />
  </Stack.Navigator>
);

export default AdminNavigator;
