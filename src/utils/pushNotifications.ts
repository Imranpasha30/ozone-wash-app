import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure how notifications appear when app is in foreground.
// Wrapped in try/catch — must never crash if expo-notifications module
// is missing/misconfigured (e.g. on Expo Go web, or unsupported envs).
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('[notifications] setNotificationHandler failed:', e);
}

/**
 * Request notification permissions and return the native FCM device token.
 * Returns null if running on emulator, permissions denied, or any error.
 * This token is sent to the backend on login and stored in users.fcm_token.
 */
export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  try {
    if (!Device.isDevice) {
      // Emulators cannot receive real push notifications
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // Android needs a notification channel for FCM
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Ozone Wash',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    // getDevicePushTokenAsync returns the native FCM token (Android) or APNs token (iOS)
    // This is what Firebase Admin SDK expects — NOT the Expo push token
    const tokenData = await Notifications.getDevicePushTokenAsync();
    return tokenData.data as string;
  } catch (_) {
    return null;
  }
};
