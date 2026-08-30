import React, { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ScrollView, Platform, Alert } from 'react-native';
import { confirm as showConfirm, alert as showAlert } from './src/services/dialog';
import * as Notifications from 'expo-notifications';
import * as Sentry from '@sentry/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RootNavigator from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import DialogHost from './src/components/DialogHost';
import { CameraCaptureHost } from './src/services/cameraCapture';
import AppPromoBanner from './src/components/AppPromoBanner';

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

    // Monkey-patch Alert.alert on web so every existing usage in the codebase
    // (Alert.alert('title', 'message', [{text, onPress}, ...])) routes through
    // our themed ConfirmDialog instead of the system window.alert. Native is
    // untouched. The native Alert API supports up to 3 buttons; we map common
    // 1-button (info) and 2-button (cancel/confirm) shapes.
    Alert.alert = (title: string, message?: string, buttons?: any[]) => {
      const list = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
      // Single-button info → themed alert (no cancel option).
      if (list.length === 1) {
        const only = list[0];
        showAlert({
          title,
          message,
          confirmText: only.text || 'OK',
        }).then(() => { only.onPress?.(); });
        return;
      }
      // Two-button or more → take the cancel + the non-cancel as confirm.
      const cancelBtn = list.find((b) => b.style === 'cancel') || list[0];
      const confirmBtn = list.find((b) => b !== cancelBtn) || list[list.length - 1];
      showConfirm({
        title,
        message,
        cancelText: cancelBtn.text || 'Cancel',
        confirmText: confirmBtn.text || 'OK',
        destructive: confirmBtn.style === 'destructive',
      }).then((ok) => {
        if (ok) confirmBtn.onPress?.();
        else cancelBtn.onPress?.();
      });
    };

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
      /*
       * Flex chain fix: RN-Web's flex:1 wrappers (.r-flex-13awgt0) inherit
       * default min-height:auto, which makes them grow to fit their content
       * instead of shrinking to fit their parent. That's why ScrollViews on
       * pushed Stack screens end up taller than the viewport and the bottom
       * gets clipped (body has overflow:hidden). min-height:0 lets the flex
       * chain honour the viewport-bounded ancestor.
       */
      .r-flex-13awgt0 { min-height: 0 !important; min-width: 0 !important; }
      /*
       * HASH-INDEPENDENT flex-chain fix. RNW generates atomic class names like
       * r-flex-<hash> at runtime, and the hash changes across RNW/Expo versions
       * — which is why the pinned rule above silently went stale on upgrade and
       * broke scrolling app-wide. This partial match covers every RNW flex
       * utility whatever its hash, so it can't rot again. min-height/width:0 lets
       * flex children shrink below content height so a viewport-bounded ancestor
       * actually bounds them (default min-height:auto is what blows past the
       * viewport and gets clipped by body overflow:hidden).
       */
      [class*="r-flex-"] { min-height: 0 !important; min-width: 0 !important; }
      /*
       * React Navigation's Card wrapper uses .r-minHeight-2llsf (min-height:100%)
       * which combined with content-natural-height blows up the height above the
       * viewport. Force min-height:0 so the card respects its bounded parent.
       */
      .r-minHeight-2llsf { min-height: 0 !important; height: 100% !important; }
      /* Force RN-Web ScrollView (overflowY: scroll) to honour parent height. */
      .r-overflowY-1rnoaur {
        max-height: 100%;
        flex: 1 1 0% !important;
        /* Avoid scroll-anchor jumps when content height changes (lists, etc). */
        overflow-anchor: none;
      }
      /*
       * Remove the browser's blue focus ring on text inputs / textareas /
       * select. RN-Web uses native <input> elements under the hood; the
       * default focus glow looks out of place against our custom borders.
       * We keep keyboard focus visually traceable via the existing custom
       * border styles in each screen.
       */
      input, textarea, select { outline: none !important; }
      input:focus, textarea:focus, select:focus,
      input:focus-visible, textarea:focus-visible, select:focus-visible {
        outline: none !important;
        box-shadow: none !important;
      }
      /* Disable iOS Safari tap highlight + WebKit text-fill colour quirks. */
      input, textarea { -webkit-tap-highlight-color: transparent; }
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
          <AppPromoBanner />
          <RootNavigator />
          <DialogHost />
          <CameraCaptureHost />
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