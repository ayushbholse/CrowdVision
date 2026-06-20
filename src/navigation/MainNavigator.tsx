// src/navigation/MainNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { theme } from '../styles/theme';
import { Text } from 'react-native';

// Import Screens
import DashboardScreen from '../screens/DashboardScreen';
import CameraScreen from '../screens/CameraScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import ReportScreen from '../screens/ReportScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

// Simple Icon placeholder component
const TabIcon = ({ name, focused }: { name: string, focused: boolean }) => {
    const icons: Record<string, string> = {
        Dashboard: '🏠',
        Scanner: '📷',
        Charts: '📈',
        Reports: '📄',
        Settings: '⚙️',
    };
    return (
        <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
            {icons[name] || '•'}
        </Text>
    );
};

export default function MainNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.secondary,
                    borderTopColor: theme.colors.border,
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: theme.colors.accent,
                tabBarInactiveTintColor: theme.colors.textMuted,
                tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: theme.fontWeight.medium,
                },
            })}
        >
            <Tab.Screen name="Dashboard" component={DashboardScreen} />
            <Tab.Screen name="Scanner" component={CameraScreen} />
            <Tab.Screen name="Charts" component={AnalyticsScreen} />
            <Tab.Screen name="Reports" component={ReportScreen} />
            <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
    );
}
