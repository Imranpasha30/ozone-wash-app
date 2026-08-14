import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { COLORS } from '../utils/constants';
import { ChartBar, ClipboardText, Wrench, UserCircle, ChartPie } from '../components/Icons';
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
import MisHubScreen from '../screens/admin/MisHubScreen';
import MisOperationalScreen from '../screens/admin/MisOperationalScreen';
import MisEcoScoreScreen from '../screens/admin/MisEcoScoreScreen';
import MisRevenueScreen from '../screens/admin/MisRevenueScreen';
import MisEngagementScreen from '../screens/admin/MisEngagementScreen';
import MisSalesScreen from '../screens/admin/MisSalesScreen';
import MisReferralsScreen from '../screens/admin/MisReferralsScreen';
import AdminPricingScreen from '../screens/admin/AdminPricingScreen';
import AdminPayoutsScreen from '../screens/admin/AdminPayoutsScreen';
import AdminAgentCreditsScreen from '../screens/admin/AdminAgentCreditsScreen';
import AdminEcoScoreScreen from '../screens/admin/AdminEcoScoreScreen';
import AdminAutoWashScreen from '../screens/admin/AdminAutoWashScreen';
import AdminCreateAccountScreen from '../screens/admin/AdminCreateAccountScreen';
import AdminFieldTeamsScreen from '../screens/admin/AdminFieldTeamsScreen';
import AdminFieldTeamDetailScreen from '../screens/admin/AdminFieldTeamDetailScreen';
import EarningsStatsScreen from '../screens/shared/EarningsStatsScreen';
import AdminCustomerDetailScreen from '../screens/admin/AdminCustomerDetailScreen';
import AdminAbandonedScreen from '../screens/admin/AdminAbandonedScreen';
import AdminSchedulingScreen from '../screens/admin/AdminSchedulingScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const AdminTabs = () => {
  const { isLarge, SIDEBAR_WIDTH } = useResponsive();
  return (
  <Tab.Navigator
    tabBar={(props) =>
      isLarge ? <WebSidebarBar {...props} /> : <BottomTabBar {...props} />
    }
    screenOptions={{
      tabBarPosition: isLarge ? 'left' : 'bottom',
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
      name="AdminMis"
      component={MisHubScreen}
      options={{
        tabBarLabel: 'MIS',
        tabBarIcon: ({ focused }) => (
          <ChartPie size={24} weight={focused ? 'fill' : 'regular'} color={focused ? COLORS.primary : COLORS.muted} />
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
    {/* MIS Dashboards */}
    <Stack.Screen name="MisHub" component={MisHubScreen} />
    <Stack.Screen name="MisOperational" component={MisOperationalScreen} />
    <Stack.Screen name="MisEcoScore" component={MisEcoScoreScreen} />
    <Stack.Screen name="MisRevenue" component={MisRevenueScreen} />
    <Stack.Screen name="MisEngagement" component={MisEngagementScreen} />
    <Stack.Screen name="MisSales" component={MisSalesScreen} />
    <Stack.Screen name="MisReferrals" component={MisReferralsScreen} />
    <Stack.Screen name="AdminPricing" component={AdminPricingScreen} />
    <Stack.Screen name="AdminPayouts" component={AdminPayoutsScreen} />
    <Stack.Screen name="AdminAgentCredits" component={AdminAgentCreditsScreen} />
    <Stack.Screen name="AdminEcoScore" component={AdminEcoScoreScreen} />
    {/* Auto Wash (Phase 3) — admin dashboard */}
    <Stack.Screen name="AdminAutoWash" component={AdminAutoWashScreen} />
    {/* Admin account management — super_admin only (gated client + server side) */}
    <Stack.Screen name="AdminCreateAccount" component={AdminCreateAccountScreen} />
    {/* Field-team management — create teams of agents, assign leader, manage shares */}
    <Stack.Screen name="AdminFieldTeams" component={AdminFieldTeamsScreen} />
    <Stack.Screen name="AdminFieldTeamDetail" component={AdminFieldTeamDetailScreen} />
    {/* Detailed agent earnings dashboard — admin drill-in */}
    <Stack.Screen name="EarningsStats" component={EarningsStatsScreen} />
    {/* Customer profile drill-in — lifetime stats, AMC, services, recent activity */}
    <Stack.Screen name="AdminCustomerDetail" component={AdminCustomerDetailScreen} />
    {/* Lost leads — abandoned checkouts with follow-up workflow */}
    <Stack.Screen name="AdminAbandoned" component={AdminAbandonedScreen} />
    {/* Scheduling settings — vans, workday, slot step, cleaning minutes */}
    <Stack.Screen name="AdminScheduling" component={AdminSchedulingScreen} />
  </Stack.Navigator>
);

export default AdminNavigator;
