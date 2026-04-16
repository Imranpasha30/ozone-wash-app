import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ScrollView, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RootNavigator from './src/navigation/RootNavigator';

console.log('[3] App.tsx module loaded');

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 60 }}>
          <Text style={{ color: 'red', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>
            APP CRASH — copy this error:
          </Text>
          <Text style={{ color: '#000', fontSize: 14, marginBottom: 8 }}>{err.message}</Text>
          <Text style={{ color: '#555', fontSize: 11 }}>{err.stack}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const NOTIF_STORAGE_KEY = 'ozone_notifications';

const saveNotification = async (title: string, body: string, data?: Record<string, any>) => {
  try {
    const stored = await AsyncStorage.getItem(NOTIF_STORAGE_KEY);
    const list = stored ? JSON.parse(stored) : [];
    list.unshift({
      id: Date.now().toString(),
      title,
      body,
      timestamp: new Date().toISOString(),
      read: false,
      data,
    });
    // Keep last 100 notifications
    if (list.length > 100) list.length = 100;
    await AsyncStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(list));
  } catch (_) {}
};

export default function App() {
  console.log('[4] App() render called');

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Fix viewport so content scrolls above the software keyboard on mobile web.
    // interactive-widget=resizes-content shrinks the layout viewport (not just visual
    // viewport) when the keyboard appears, pushing content up automatically.
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      const content = viewport.getAttribute('content') || '';
      if (!content.includes('interactive-widget')) {
        viewport.setAttribute('content', content + ',interactive-widget=resizes-content');
      }
    }

    // Inject web-specific CSS
    const style = document.createElement('style');
    style.id = 'ozone-web-fixes';
    style.textContent = `
      html { height: 100%; }
      body { height: 100%; overflow: hidden; }
      #root { height: 100%; }
      /* Smooth momentum scrolling inside scroll containers */
      [style*="overflow"] { -webkit-overflow-scrolling: touch; }
    `;
    document.head.appendChild(style);

    return () => {
      document.getElementById('ozone-web-fixes')?.remove();
    };
  }, []);

  useEffect(() => {
    // Listen for notifications received while app is in foreground
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification.request.content;
      saveNotification(title || 'Notification', body || '', data);
    });

    // Listen for notification taps (app was in background)
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const { title, body, data } = response.notification.request.content;
      saveNotification(title || 'Notification', body || '', data);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootNavigator />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}