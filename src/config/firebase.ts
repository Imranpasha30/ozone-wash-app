/**
 * Firebase Web SDK initialization
 * Used only on web platform (Platform.OS === 'web').
 * Mobile (Android/iOS) uses firebase-admin on the backend + expo-notifications client-side.
 */

import { Platform } from 'react-native';

// Lazy-initialized — only runs on web
let firebaseApp: any = null;
let messagingInstance: any = null;

const webConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId:     process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate required Firebase config before init — missing/empty keys would
// otherwise throw inside initializeApp and crash the web bundle.
const isFirebaseConfigValid = (): boolean => {
  const required = [webConfig.apiKey, webConfig.projectId, webConfig.appId];
  return required.every((v) => typeof v === 'string' && v.length > 5 && !v.startsWith('your-'));
};

export const initFirebaseWeb = async () => {
  if (Platform.OS !== 'web') return null;
  if (firebaseApp) return firebaseApp;
  if (!isFirebaseConfigValid()) {
    console.warn('[Firebase] Config missing/invalid — skipping web init.');
    return null;
  }

  try {
    const { initializeApp, getApps } = await import('firebase/app');
    if (getApps().length === 0) {
      firebaseApp = initializeApp(webConfig);
    } else {
      firebaseApp = getApps()[0];
    }
    return firebaseApp;
  } catch (e) {
    console.warn('[Firebase] Web init failed:', e);
    return null;
  }
};

export const getWebMessaging = async () => {
  if (Platform.OS !== 'web') return null;
  if (messagingInstance) return messagingInstance;

  try {
    const app = await initFirebaseWeb();
    if (!app) return null;
    const { getMessaging, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    if (!supported) return null;
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (e) {
    console.warn('[Firebase] Messaging not supported on this browser:', e);
    return null;
  }
};

export const getWebAnalytics = async () => {
  if (Platform.OS !== 'web') return null;

  try {
    const app = await initFirebaseWeb();
    if (!app) return null;
    const { getAnalytics } = await import('firebase/analytics');
    return getAnalytics(app);
  } catch (e) {
    console.warn('[Firebase] Analytics init failed:', e);
    return null;
  }
};
