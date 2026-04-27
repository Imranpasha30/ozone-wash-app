/**
 * LiveWatchScreen — customer watches the live service stream.
 * Opens Agora RTC channel as subscriber.
 * NOTE: react-native-agora requires a native build (EAS). Will show a
 * fallback UI when running in Expo Go.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { livestreamAPI } from '../../services/api';
import { useTheme } from '../../hooks/useTheme';
import { ArrowLeft, Warning } from '../../components/Icons';

// Lazy-load Agora — not available in Expo Go (native module)
let RtcEngine: any = null;
let RtcRemoteView: any = null;
let ChannelProfile: any = null;
let ClientRole: any = null;
let agoraAvailable = false;

try {
  const agora = require('react-native-agora');
  RtcEngine = agora.default;
  RtcRemoteView = agora.RtcRemoteView;
  ChannelProfile = agora.ChannelProfile;
  ClientRole = agora.ClientRole;
  agoraAvailable = true;
} catch {
  agoraAvailable = false;
}

const APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';
const APP_ID_VALID = !!APP_ID && APP_ID.length > 10 && !APP_ID.startsWith('your-');

const LiveWatchScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const C = useTheme();

  const jobId: string = route.params?.job_id || '';
  const channel = `job_${jobId.slice(0, 8)}`;

  const engineRef = useRef<any>(null);
  const [remoteUid, setRemoteUid] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [streamEnded, setStreamEnded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agoraAvailable) {
      setError('Live cleaning preview is unavailable on this build.');
      setLoading(false);
      return;
    }
    if (!APP_ID_VALID) {
      setError('Live cleaning preview is unavailable on this build');
      setLoading(false);
      return;
    }
    initAgora();
    return () => {
      try { engineRef.current?.destroy(); } catch (_) {}
    };
  }, []);

  const initAgora = async () => {
    try {
      const res = await livestreamAPI.getToken(channel, 'subscriber') as any;
      const { app_id, token } = res.data || res;

      const engine = await RtcEngine.create(app_id || APP_ID);
      engineRef.current = engine;

      await engine.setChannelProfile(ChannelProfile.LiveBroadcasting);
      await engine.setClientRole(ClientRole.Audience);
      await engine.enableVideo();

      engine.addListener('UserJoined', (uid: number) => {
        setRemoteUid(uid);
        setLoading(false);
      });
      engine.addListener('UserOffline', () => {
        setRemoteUid(null);
        setStreamEnded(true);
      });
      engine.addListener('Error', (code: number) => setError(`Stream error: ${code}`));

      await engine.joinChannel(token, channel, null, 0);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to stream');
      setLoading(false);
    }
  };

  const leave = async () => {
    await engineRef.current?.leaveChannel();
    navigation.goBack();
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Video area */}
      {remoteUid !== null && RtcRemoteView ? (
        <RtcRemoteView.SurfaceView
          style={styles.video}
          uid={remoteUid}
          channelId={channel}
          renderMode={1}
        />
      ) : (
        <View style={styles.waiting}>
          {error ? (
            <>
              <Warning size={36} weight="fill" color="#F87171" />
              <Text style={styles.waitText}>{error}</Text>
            </>
          ) : streamEnded ? (
            <>
              <Text style={styles.waitEmoji}>📴</Text>
              <Text style={styles.waitText}>Stream has ended</Text>
              <Text style={styles.waitSub}>The technician has stopped broadcasting</Text>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color="#2DD4BF" />
              <Text style={styles.waitText}>Waiting for technician to go live...</Text>
              <Text style={styles.waitSub}>Channel: {channel}</Text>
            </>
          )}
        </View>
      )}

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={leave} style={styles.backBtn}>
          <ArrowLeft size={22} weight="regular" color="#fff" />
        </TouchableOpacity>
        <View style={styles.titleBox}>
          <Text style={styles.title}>Live Service</Text>
          <Text style={styles.subtitle}>Job #{jobId.slice(0, 8).toUpperCase()}</Text>
        </View>
        {remoteUid !== null && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Leave button */}
      {(streamEnded || error) && (
        <View style={styles.leaveWrap}>
          <TouchableOpacity style={styles.leaveBtn} onPress={leave}>
            <Text style={styles.leaveBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  video: { ...StyleSheet.absoluteFillObject },
  waiting: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  waitEmoji: { fontSize: 48 },
  waitText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  waitSub: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: Platform.OS === 'ios' ? 56 : 40, paddingHorizontal: 16, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backBtn: { padding: 4 },
  titleBox: { flex: 1, marginHorizontal: 12 },
  title: { color: '#fff', fontWeight: '700', fontSize: 15 },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DC2626', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, gap: 5 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 1 },
  leaveWrap: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  leaveBtn: { backgroundColor: '#2DD4BF', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12 },
  leaveBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
});

export default LiveWatchScreen;
