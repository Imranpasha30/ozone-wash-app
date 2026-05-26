/**
 * AppPromoBanner — web-only banner that nudges mobile browser users to
 * either open the existing app via its deep-link scheme or download it.
 *
 *   - Mobile browser + Android → "Open in App" button tries ozonewash://,
 *     falls back to Play Store after 1.5s if the app isn't installed.
 *   - Mobile browser + iOS → tries the scheme; iOS shows its own prompt
 *     if the app isn't there.
 *   - Desktop → renders nothing.
 *   - Dismissable; choice persisted in localStorage.
 *
 * Drop into App.tsx or any screen that should advertise the native app.
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { ArrowRight, X } from './Icons';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=in.ozonewash.app';
const APP_STORE_URL  = 'https://apps.apple.com/in/app/ozone-wash/id0000000000';
const APP_SCHEME     = 'ozonewash://';
const DISMISS_KEY    = 'ozone_app_promo_dismissed_at';
const DISMISS_HOURS  = 24;

type DeviceKind = 'desktop' | 'android' | 'ios';

const detectDevice = (): DeviceKind => {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || navigator.vendor || '';
  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  return 'desktop';
};

const AppPromoBanner: React.FC = () => {
  const C = useTheme();
  const styles = React.useMemo(() => makeStyles(C), [C]);
  const [device, setDevice] = useState<DeviceKind>('desktop');
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    setDevice(detectDevice());
    // Honour a prior dismissal for 24 h so we don't pester users.
    try {
      const ts = window.localStorage.getItem(DISMISS_KEY);
      if (ts) {
        const age = Date.now() - Number(ts);
        if (age < DISMISS_HOURS * 60 * 60 * 1000) setDismissed(true);
        else setDismissed(false);
      } else setDismissed(false);
    } catch (_) { setDismissed(false); }
  }, []);

  // Render nothing on native (we ARE the app) or desktop or when dismissed.
  if (Platform.OS !== 'web') return null;
  if (device === 'desktop') return null;
  if (dismissed) return null;

  const storeUrl = device === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;

  const openInApp = () => {
    // Try the custom scheme. If the app isn't installed, the browser stays
    // on the page; 1.5 s later we redirect to the store as a fallback.
    const start = Date.now();
    window.location.href = APP_SCHEME;
    setTimeout(() => {
      // If the document is still visible we never left → app wasn't there.
      if (document.visibilityState === 'visible' && Date.now() - start < 2500) {
        window.location.href = storeUrl;
      }
    }, 1500);
  };

  const dismiss = () => {
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (_) {}
    setDismissed(true);
  };

  return (
    <View style={styles.banner}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Get the Ozone Wash app</Text>
        <Text style={styles.sub}>
          Faster booking, push reminders, live job tracking.
        </Text>
      </View>
      <TouchableOpacity style={styles.cta} onPress={openInApp} activeOpacity={0.85}>
        <Text style={styles.ctaText}>{device === 'ios' ? 'Open in App' : 'Open / Install'}</Text>
        <ArrowRight size={14} weight="bold" color={C.primaryFg} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.close} onPress={dismiss} hitSlop={8} activeOpacity={0.7}>
        <X size={14} weight="bold" color={C.muted} />
      </TouchableOpacity>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.primaryBg, borderBottomWidth: 1, borderBottomColor: C.primary,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  title: { fontSize: 13, fontWeight: '700', color: C.primary },
  sub:   { fontSize: 11, color: C.primary, opacity: 0.85, marginTop: 1 },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    backgroundColor: C.primary,
  },
  ctaText: { fontSize: 12, fontWeight: '800', color: C.primaryFg },
  close: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
});

export default AppPromoBanner;
