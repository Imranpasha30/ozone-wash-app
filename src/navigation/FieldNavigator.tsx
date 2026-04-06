import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';
import { COLORS } from '../utils/constants';

// Tab screens
import JobListScreen from '../screens/field/JobListScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';

// Stack screens
import JobDetailScreen from '../screens/field/JobDetailScreen';
import ChecklistScreen from '../screens/field/ChecklistScreen';
import ComplianceStepScreen from '../screens/field/ComplianceStepScreen';
import OtpEntryScreen from '../screens/field/OtpEntryScreen';
import IncidentReportScreen from '../screens/field/IncidentReportScreen';
import JobTransferScreen from '../screens/field/JobTransferScreen';
import PerformanceScreen from '../screens/field/PerformanceScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const TabIcon = ({ emoji, focused }: { emoji: string; focused: boolean }) => (
  <Text style={{ fontSize: focused ? 26 : 22 }}>{emoji}</Text>
);

const FieldTabs = () => (
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
      name="Jobs"
      component={JobListScreen}
      options={{
        tabBarLabel: 'My Jobs',
        tabBarIcon: ({ focused }) => <TabIcon emoji="🔧" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="Performance"
      component={PerformanceScreen}
      options={{
        tabBarLabel: 'Stats',
        tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} />,
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
  </Stack.Navigator>
);

export default FieldNavigator;
