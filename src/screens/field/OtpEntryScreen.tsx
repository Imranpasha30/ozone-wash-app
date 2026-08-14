import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, Vibration, Platform, StatusBar, Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';
import { capturePhoto } from '../../services/cameraCapture';
import api, { jobAPI, ecoScoreAPI, certificateAPI, uploadAPI, invalidateCache } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { ArrowLeft, Key, Lock, Camera, CheckCircle } from '../../components/Icons';

// Grab a one-shot GPS fix for the geofence gate (G-1). Returns null when the
// user denies permission or the fix times out — the backend will then ask for
// GPS explicitly instead of us blocking the verify attempt client-side.
const getGpsFix = async (): Promise<{ gps_lat: number; gps_lng: number } | null> => {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ gps_lat: pos.coords.latitude, gps_lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { gps_lat: loc.coords.latitude, gps_lng: loc.coords.longitude };
  } catch (_) {
    return null;
  }
};

const OtpEntryScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const { jobId, type } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Arrival photo (spec 1.3) — mandatory before the start OTP verifies
  const [arrivalPhoto, setArrivalPhoto] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const captureArrival = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      // Live camera on every platform (web opens the webcam modal).
      const uri = await capturePhoto();
      if (!uri) return; // cancelled
      const up: any = await uploadAPI.uploadPhoto(uri, 'arrival');
      const url = up?.data?.url || up?.url;
      if (url) setArrivalPhoto(url);
      else Alert.alert('Upload failed', 'Could not upload the arrival photo. Try again.');
    } catch (e: any) {
      Alert.alert('Camera error', e?.message || 'Could not capture the photo.');
    } finally {
      setCapturing(false);
    }
  };

  const isStart = type === 'start';
  const title = isStart ? 'Enter Start OTP' : 'Enter End OTP';
  const subtitle = isStart
    ? 'Ask the customer to show you the Start OTP from their app'
    : 'Ask the customer to show you the End OTP from their app';
  const accentColor = isStart ? C.primary : C.success;

  const handleDigit = (digit: string) => {
    setError('');
    setOtp(prev => (prev.length >= 6 ? prev : prev + digit));
  };

  const handleDelete = () => {
    setOtp(prev => prev.slice(0, -1));
    setError('');
  };

  // Web: the numpad is tap-only, so wire the physical keyboard too —
  // digits type, Backspace deletes, Enter submits when all 6 are in.
  const otpRef = React.useRef(otp);
  const loadingRef = React.useRef(loading);
  // Live ref to the latest submit handler — the keydown listener is registered
  // once, so calling handleSubmit directly would capture a stale otp closure.
  const submitRef = React.useRef<() => void>(() => {});
  React.useEffect(() => { otpRef.current = otp; }, [otp]);
  React.useEffect(() => { loadingRef.current = loading; }, [loading]);
  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: any) => {
      if (loadingRef.current) return;
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter' && otpRef.current.length === 6) {
        submitRef.current();
      }
    };
    (window as any).addEventListener('keydown', onKey);
    return () => (window as any).removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    if (otp.length !== 6) {
      setError('Enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (isStart) {
        if (!arrivalPhoto) {
          setLoading(false);
          setError('Capture the arrival photo first');
          Alert.alert('Arrival photo required', 'Capture the van + building photo before verifying the OTP.');
          return;
        }
        // Geofence gate G-1 needs our GPS — same endpoint jobAPI.verifyStartOtp
        // uses, but with gps_lat/gps_lng included in the body.
        const gps = await getGpsFix();
        invalidateCache('/jobs');
        await api.post(`/jobs/${jobId}/verify-start-otp`, { otp, arrival_photo_url: arrivalPhoto, ...(gps || {}) });
        Alert.alert('Job Started', 'OTP verified successfully. The checklist is now unlocked.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await jobAPI.verifyEndOtp(jobId, otp);
        await jobAPI.completeJob(jobId);
        await ecoScoreAPI.calculateScore(jobId);
        await certificateAPI.generate(jobId);
        Alert.alert('Job Completed!', 'End OTP verified. EcoScore calculated and hygiene certificate generated.', [
          { text: 'Done', onPress: () => navigation.navigate('FieldTabs') },
        ]);
      }
    } catch (err: any) {
      if (Platform.OS !== 'web') Vibration.vibrate(200);
      // The api interceptor rejects with { message, status }; raw axios errors
      // carry e.response instead — handle both shapes.
      const d = err?.response?.data || err || {};
      const status = err?.status ?? err?.response?.status;
      const msg = d?.message || 'Invalid OTP';
      if (status === 423) {
        // Safety gate (geofence / van check) — keep the OTP, they can retry
        // once they've moved closer or finished the van check.
        const retry = d?.retry_after_minutes
          ? `\n\nTry again in ${d.retry_after_minutes} min.` : '';
        Alert.alert('Blocked', `${msg}${retry}`);
        setError(msg);
      } else if (status === 429) {
        Alert.alert('Attempts Exhausted', msg);
        setError(msg);
        setOtp('');
      } else {
        // 400 — wrong OTP (shows attempts remaining) or missing GPS
        Alert.alert('Verification Failed', msg);
        setError(msg);
        setOtp('');
      }
    } finally {
      setLoading(false);
    }
  };

  // Keep the keyboard listener pointed at the freshest submit handler.
  submitRef.current = handleSubmit;

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'DEL'];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color={C.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      {/* Centered narrow column — keeps the numpad phone-sized on web */}
      <View style={styles.content}>

      {/* Icon + Subtitle */}
      <View style={styles.subtitleSection}>
        <View style={[styles.otpIconContainer, { backgroundColor: isStart ? C.primaryBg : C.successBg }]}>
          <Key size={24} weight="fill" color={accentColor} />
        </View>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* Arrival photo (spec 1.3) — required before the start OTP */}
      {isStart && (
        <TouchableOpacity
          style={[styles.arrivalCard, arrivalPhoto ? styles.arrivalCardDone : null]}
          onPress={captureArrival}
          activeOpacity={0.8}
          disabled={capturing}
        >
          {arrivalPhoto ? (
            <>
              <Image source={{ uri: arrivalPhoto }} style={styles.arrivalThumb} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.arrivalTitle, { color: C.success }]}>Arrival photo captured</Text>
                <Text style={styles.arrivalSub}>Tap to retake</Text>
              </View>
              <CheckCircle size={20} weight="fill" color={C.success} />
            </>
          ) : (
            <>
              <View style={styles.arrivalIconWrap}>
                {capturing
                  ? <ActivityIndicator size="small" color={C.primaryFg} />
                  : <Camera size={20} weight="fill" color={C.primaryFg} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.arrivalTitle}>Arrival photo required</Text>
                <Text style={styles.arrivalSub}>Van + building at the site</Text>
              </View>
              <View style={styles.arrivalCta}>
                <Text style={styles.arrivalCtaText}>Capture</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* OTP Display */}
      <View style={styles.otpContainer}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <View
            key={i}
            style={[
              styles.otpBox,
              otp.length === i && styles.otpBoxActive,
              error ? styles.otpBoxError : null,
              { borderColor: otp[i] ? accentColor : error ? C.danger : C.border },
            ]}
          >
            <Text style={[styles.otpDigit, { color: otp[i] ? accentColor : C.muted }]}>
              {otp[i] || '\u2014'}
            </Text>
          </View>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Numpad */}
      <View style={styles.numpad}>
        {digits.map((d, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.numKey, !d && styles.numKeyEmpty]}
            disabled={!d || loading}
            onPress={() => {
              if (d === 'DEL') handleDelete();
              else handleDigit(d);
            }}
            activeOpacity={0.6}
          >
            <Text style={[styles.numKeyText, d === 'DEL' && styles.delText]}>
              {d === 'DEL' ? '\u232B' : d}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: accentColor }, otp.length < 6 && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={otp.length < 6 || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={C.primaryFg} />
        ) : (
          <View style={styles.submitContent}>
            <Lock size={18} weight="fill" color={C.primaryFg} />
            <Text style={styles.submitText}>
              {isStart ? 'Verify & Start Job' : 'Verify & Complete'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      </View>
    </View>
  );
};

const makeStyles = (C: any) => StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  // Phone-width column, centered on web so the numpad doesn't stretch
  content: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center' },
  header: {
    backgroundColor: C.surface,
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadowMedium, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.foreground },
  subtitleSection: { alignItems: 'center', marginTop: 32 },
  otpIconContainer: {
    width: 64, height: 64, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  subtitle: {
    fontSize: 14, color: C.muted, textAlign: 'center',
    marginHorizontal: 32, lineHeight: 20,
  },
  otpContainer: {
    flexDirection: 'row', justifyContent: 'center',
    marginTop: 24, marginBottom: 8, gap: 10,
  },
  otpBox: {
    width: 48, height: 56, borderRadius: 12,
    borderWidth: 2, borderColor: C.border,
    backgroundColor: C.surface,
    justifyContent: 'center', alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: C.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  otpBoxActive: { borderColor: C.primary },
  otpBoxError: { borderColor: C.danger },
  otpDigit: { fontSize: 24, fontWeight: '700' },
  errorText: { color: C.danger, textAlign: 'center', marginTop: 8, fontSize: 14 },
  arrivalCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 32, marginTop: 16,
    backgroundColor: C.primaryBg, borderRadius: 14,
    borderWidth: 1.5, borderColor: C.primary, borderStyle: 'dashed',
    paddingVertical: 12, paddingHorizontal: 14,
  },
  arrivalCardDone: {
    borderStyle: 'solid', borderColor: C.success, backgroundColor: C.successBg,
  },
  arrivalIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  arrivalThumb: { width: 40, height: 40, borderRadius: 10 },
  arrivalTitle: { fontSize: 14, fontWeight: '800', color: C.primary },
  arrivalSub: { fontSize: 11.5, color: C.muted, marginTop: 1 },
  arrivalCta: {
    backgroundColor: C.primary, borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  arrivalCtaText: { color: C.primaryFg, fontSize: 13, fontWeight: '800' },
  numpad: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', marginTop: 24,
    paddingHorizontal: 40,
  },
  numKey: {
    width: '33.33%', paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  numKeyEmpty: { opacity: 0 },
  numKeyText: { fontSize: 28, fontWeight: '600', color: C.foreground },
  delText: { fontSize: 24, color: C.muted },
  submitBtn: {
    marginHorizontal: 32, marginTop: 16,
    borderRadius: 16, padding: 18, alignItems: 'center',
  },
  submitDisabled: { opacity: 0.4 },
  submitContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  submitText: { color: C.primaryFg, fontWeight: '700', fontSize: 17 },
});

export default OtpEntryScreen;
