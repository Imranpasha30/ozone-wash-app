import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ScrollView, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RootNavigator from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';

// Initialise Sentry as early as possible (no-op in dev so it doesn't spam local testing).
// Guarded: missing/empty DSN must NOT crash. Skip init entirely if absent.
let sentryInitialized = false;
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
try {
  if (SENTRY_DSN && SENTRY_DSN.length > 10 && !__DEV__) {
    Sentry.init({
      dsn: SENTRY_DSN,
      enabled: true,
      tracesSampleRate: 0.2,
      sendDefaultPii: false,
    });
    sentryInitialized = true;
  }
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('[Sentry] init failed - continuing without crash reporting:', e);
}

console.log('[3] App.tsx module loaded');

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Forward caught errors to Sentry so we still see them with the React stack
    // even when the boundary's fallback UI swallows the crash.
    // No-op silently when Sentry isn't initialised.
    if (!sentryInitialized) return;
    try {
      Sentry.captureException(error, {
        contexts: { react: { componentStack: info.componentStack } },
      });
    } catch (_) {}
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 60 }}>
          <Text style={{ color: 'red', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>
            APP CRASH - copy this error:
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

// Routes a tapped notification to the right screen based on its `data` payload.
// Kept outside the component so both the cold-start and warm-app paths share it.
const routeNotification = (data: any) => {
  if (!data || typeof data !== 'object') return;
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[notif-deeplink]', data);
  }
  if (!navigationRef.isReady()) return;

  const type = data.type as string | undefined;
  try {
    switch (type) {
      case 'booking':
        if (data.booking_id) {
          navigationRef.navigate('BookingDetail', { booking_id: data.booking_id });
        }
        break;
      case 'job':
        if (data.job_id) {
          navigationRef.navigate('JobDetail', { job_id: data.job_id });
        }
        break;
      case 'incident':
        navigationRef.navigate('AdminIncidents');
        break;
      case 'amc':
        navigationRef.navigate('AmcPlans');
        break;
      case 'certificate':
        if (data.certificate_id) {
          navigationRef.navigate('CertificateView', { certificate_id: data.certificate_id });
        }
        break;
      default:
        // No-op - notification just opens the app.
        break;
    }
  } catch (err) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[notif-deeplink] navigation failed', err);
    }
  }
};

// Cold-start handler: extracted into its own component so the
// expo-notifications hook only runs on native. Calling
// `useLastNotificationResponse()` on web throws an UnavailabilityError
// (no notification module on the platform), which crashes the whole tree.
function NotificationColdStart() {
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  const handledColdStartRef = useRef<string | null>(null);
  useEffect(() => {
    if (!lastNotificationResponse) return;
    const id = lastNotificationResponse.notification.request.identifier;
    if (handledColdStartRef.current === id) return;
    handledColdStartRef.current = id;
    routeNotification(lastNotificationResponse.notification.request.content.data);
  }, [lastNotificationResponse]);
  return null;
}

function App() {
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
    // expo-notifications native module is unavailable on web - skip entirely.
    if (Platform.OS === 'web') return;

    // Listen for notifications received while app is in foreground.
    // We persist them in AsyncStorage but DO NOT deep-link - user hasn't tapped yet.
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification.request.content;
      saveNotification(title || 'Notification', body || '', data);
    });

    // Listen for notification taps (warm-app case: app was in background or foreground).
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const { title, body, data } = response.notification.request.content;
      saveNotification(title || 'Notification', body || '', data);
      routeNotification(data);
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
          {Platform.OS !== 'web' && <NotificationColdStart />}
          <RootNavigator />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

// Only apply Sentry.wrap if Sentry actually initialised - otherwise the HOC
// could log noise or interfere with React Refresh in dev. Falls through to
// the unwrapped component when Sentry is disabled/missing.
let WrappedApp: React.ComponentType<any> = App;
if (sentryInitialized) {
  try {
    WrappedApp = Sentry.wrap(App);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[Sentry] wrap failed - using unwrapped App:', e);
    WrappedApp = App;
  }
}

export default WrappedApp;