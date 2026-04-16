import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { COLORS } from '../utils/constants';
import { Wrench, ChartBar, UserCircle, MagnifyingGlass } from '../components/Icons';
import WebSidebarBar from '../components/WebSidebarBar';
import { useResponsive, SIDEBAR_WIDTH } from '../utils/responsive';

// Tab screens
import JobListScreen from '../screens/field/JobListScreen';
import AvailableJobsScreen from '../screens/field/AvailableJobsScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';

// Stack screens
import JobDetailScreen from '../screens/field/JobDetailScreen';
import ChecklistScreen from '../screens/field/ChecklistScreen';
import ComplianceStepScreen from '../screens/field/ComplianceStepScreen';
import OtpEntryScreen from '../screens/field/OtpEntryScreen';
import IncidentReportScreen from '../screens/field/IncidentReportScreen';
import JobTransferScreen from '../screens/field/JobTransferScreen';
import PerformanceScreen from '../screens/field/PerformanceScreen';
import QrScannerScreen from '../screens/shared/QrScannerScreen';
import CertVerifyResultScreen from '../screens/shared/CertVerifyResultScreen';
import LiveStreamScreen from '../screens/field/LiveStreamScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const FieldTabs = () => {
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
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
      },
    }}
  >
    <Tab.Screen
      name="Jobs"
      component={JobListScreen}
      options={{
        tabBarLabel: 'My Jobs',
        tabBarIcon: ({ focused }) => (
          <Wrench size={24} weight={focused ? 'fill' : 'regular'} color={focused ? COLORS.primary : COLORS.muted} />
        ),
      }}
    />
    <Tab.Screen
      name="Available"
      component={AvailableJobsScreen}
      options={{
        tabBarLabel: 'Available',
        tabBarIcon: ({ focused }) => (
          <MagnifyingGlass size={24} weight={focused ? 'fill' : 'regular'} color={focused ? COLORS.primary : COLORS.muted} />
        ),
      }}
    />
    <Tab.Screen
      name="Performance"
      component={PerformanceScreen}
      options={{
        tabBarLabel: 'Stats',
        tabBarIcon: ({ focused }) => (
          <ChartBar size={24} weight={focused ? 'fill' : 'regular'} color={focused ? COLORS.primary : COLORS.muted} />
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

const FieldNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    {/* Main tabs */}
    <Stack.Screen name="FieldTabs" component={FieldTabs} />
    {/* Job flow */}
    <Stack.Screen name="JobDetail" component={JobDetailScreen} />
    <Stack.Screen name="Checklist" component={ChecklistScreen} />
    <Stack.Screen name="ComplianceStep" component={ComplianceStepScreen} />
    <Stack.Screen name="OtpEntry" component={OtpEntryScreen} />
    <Stack.Screen name="IncidentReport" component={IncidentReportScreen} />
    <Stack.Screen name="JobTransfer" component={JobTransferScreen} />
    <Stack.Screen name="QrScanner" component={QrScannerScreen} />
    <Stack.Screen name="CertVerifyResult" component={CertVerifyResultScreen} />
    <Stack.Screen name="LiveStream" component={LiveStreamScreen} />
  </Stack.Navigator>
);

export default FieldNavigator;
